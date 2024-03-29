'use strict';

const net = require('net');
const through = require('through2');
const debug = require('debug')('tcp-proxy');
const EventEmitter = require('events').EventEmitter;
const assert = require('assert');
let seqId = 0;

function genThrough(interceptor, connection) {
  return through.obj(function(chunk, enc, done) {
    const context = {
      connId: connection.id,
      client: {
        ip: connection.client.address().address,
        port: connection.client.address().port,
      },
      server: {
        ip: connection.server.address().address,
        port: connection.server.address().port,
      },
      self: {
        ip: connection.forwardHost,
        port: connection.forwardPort,
      },
      size: chunk.length,
    };

    const result = interceptor(chunk, enc, context);

    const handle = data => {
      if (data && !Buffer.isBuffer(data)) {
        data = Buffer.from(data);
      }

      done(null, data || chunk);
    };

    if (result) {
      if (typeof result.then === 'function') {
        result.then(handle).catch(e => {
          console.error(e);
          handle();
        });
      } else {
        handle(result);
      }
    } else {
      handle();
    }
  });
}

module.exports = class TCPProxy extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host;
    this.port = options.port;
    this.clients = [];
  }

  createProxy({ host, port, forwardPort, forwardHost, getForwardInfo, interceptor }) {
    const proxyHost = host || this.host;
    const proxyPort = port || this.port;
    interceptor = interceptor || {};

    const baseForwardInfo = {
      port: forwardPort,
      host: forwardHost || '127.0.0.1',
    };

    if (this.server) {
      const args = [].slice.call(arguments);
      return this.end().then(() => {
        return this.createProxy.apply(this, args);
      });
    }

    return new Promise((resolve, reject) => {
      this.server = net
        .createServer(client => {
          let interceptorClient;
          let interceptorServer;
          debug('new connection from %o', client.address());

          // support get forward info dynamically
          const forwardInfo = typeof getForwardInfo === 'function'
            ? getForwardInfo()
            : baseForwardInfo;

          assert(forwardInfo.host, 'host in forwardInfo is required');
          const server = net.connect(forwardInfo, () => {
            let _client = client;
            let _server = server;

            const conn = {
              id: seqId++,
              client,
              server,
              forwardHost: forwardInfo.host,
              forwardPort: forwardInfo.port,
            };

            // client interceptor
            if (interceptor.client) {
              interceptorClient = genThrough(interceptor.client, conn);
              _client = _client.pipe(interceptorClient);
            }

            // server interceptor
            if (interceptor.server) {
              interceptorServer = genThrough(interceptor.server, conn);
              _server = _server.pipe(interceptorServer);
            }

            _client.pipe(server);
            _server.pipe(client);
            debug(`proxy ${proxyHost}:${proxyPort} connect to ${forwardInfo.host}:${forwardInfo.port}`);
            this.emit('connection', _client, _server);
          });

          const onClose = err => {
            client.destroy();
            server.destroy();
            interceptorClient && interceptorClient.end();
            interceptorServer && interceptorServer.end();
            debug(`${forwardInfo.host}:${forwardInfo.port} disconnect [${err ? `error: ${err.message}` : 'close'}]`);
            this.removeListener('close', onClose);
          };

          server.once('close', onClose);
          server.once('error', onClose);
          client.once('close', onClose);
          client.once('error', onClose);
          this.once('close', onClose);
        })
        .listen(proxyPort, proxyHost);

      this.server.once('error', e => {
        debug(`proxy server error: ${e.message}`);
        reject(e);
      });

      this.server.once('listening', () => {
        debug(`proxy server listening on ${proxyPort}`);
        this.server.removeListener('error', reject);
        resolve(this.server);
      });
    });
  }

  end() {
    if (!this.server) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.emit('close');
      this.server.close(() => {
        debug('proxy server closed');
        this.server = null;
        resolve();
      });
    });
  }
};

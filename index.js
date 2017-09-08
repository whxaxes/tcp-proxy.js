'use strict';

const net = require('net');
const through = require('through2');
const EventEmitter = require('events').EventEmitter;

function genThrough(interceptor) {
  return through.obj(function(chunk, enc, done) {
    const result = interceptor(chunk, enc);
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
    this.port = options.port;
  }

  createProxy({ port, forwardPort, forwardHost, interceptor }) {
    const proxyPort = port || this.port;
    interceptor = interceptor || {};

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
          const server = net.connect({
            port: forwardPort,
            host: forwardHost,
          }, () => {
            let _client = client;
            let _server = server;

            // client interceptor
            if (interceptor.client) {
              interceptorClient = genThrough(interceptor.client);
              _client = _client.pipe(interceptorClient);
            }

            // server interceptor
            if (interceptor.server) {
              interceptorServer = genThrough(interceptor.server);
              _server = _server.pipe(interceptorServer);
            }

            _client.pipe(server);
            _server.pipe(client);
            this.emit('connection', _client, _server);
          });

          const onClose = () => {
            client.destroy();
            server.destroy();
            interceptorClient && interceptorClient.end();
            interceptorServer && interceptorServer.end();
          };

          server.once('close', onClose);
          server.once('error', onClose);
          client.once('close', onClose);
          client.once('error', onClose);
        })
        .listen(proxyPort);

      this.server.once('close', () => {
        this.server = null;
      });

      this.server.once('error', reject);
      this.server.once('listening', () => {
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
      this.server.close(resolve);
    });
  }
};

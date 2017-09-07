'use strict';

const net = require('net');
const through = require('through2');
const EventEmitter = require('events').EventEmitter;

module.exports = class TCPProxy extends EventEmitter {
  constructor(options) {
    super();
    this.port = options.port;
  }

  createProxy({ port, forwardPort, forwardHost, interceptor }) {
    this.port = port || this.port;
    interceptor = interceptor || {};

    if (this.server) {
      const args = [].slice.call(arguments);
      return this.end().then(() => {
        return this.createProxy.apply(this, args);
      });
    }

    const onClose = () => {
      this.proxyClient && this.proxyClient.destroy();
      this.proxyServer && this.proxyServer.destroy();
      this.proxyClient = null;
      this.proxyServer = null;
    };

    return new Promise((resolve, reject) => {
      this.server = net
        .createServer(client => {
          const server = net.connect({
            port: forwardPort,
            host: forwardHost,
          }, () => {
            let _client = client;
            let _server = server;

            // client interceptor
            if (interceptor.client) {
              _client = _client.pipe(
                through.obj(function(chunk, enc, done) {
                  done(null, interceptor.client(chunk, enc) || chunk);
                })
              );
            }

            // server interceptor
            if (interceptor.server) {
              _server = _server.pipe(
                through.obj(function(chunk, enc, done) {
                  done(null, interceptor.server(chunk, enc) || chunk);
                })
              );
            }

            _client.pipe(server);
            _server.pipe(client);
          });

          this.proxyClient = client;
          this.proxyServer = server;

          server.once('close', onClose);
          server.once('error', onClose);
          client.once('close', onClose);
          client.once('error', onClose);
          this.emit('connection');
        })
        .listen(this.port);

      this.server.once('close', () => {
        this.server = null;
        onClose();
      });

      this.server.once('error', reject);
      this.server.once('listening', () => {
        this.server.removeListener('error', reject);
        resolve(this.server);
      });
    });
  }

  end() {
    return new Promise(resolve => {
      this.server.close(resolve);
    });
  }
};

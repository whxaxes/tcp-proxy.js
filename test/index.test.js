'use strict';

const exec = require('child_process').exec;
const path = require('path');
const TCPProxy = require('../');
const urllib = require('urllib');
const assert = require('assert');
const co = require('co');
const proxyPort = 9600;
const proxy = new TCPProxy({ port: proxyPort });

function createServer() {
  const server = path.resolve(__dirname, './server.js');
  const proc = exec(`node ${server}`);
  return new Promise((resolve, reject) => {
    proc.stdout.once('data', port => {
      resolve({ process: proc, port: +port.trim() });
    });
    proc.stderr.once('data', reject);
  });
}

describe('test/index.test.js', () => {
  let data;
  afterEach(function* () {
    data.process.kill();
    yield proxy.end();
  });

  it('proxy should work correctly', function* () {
    data = yield createServer();
    yield proxy.createProxy({ forwardPort: data.port });
    const response = yield urllib.request(`http://localhost:${proxyPort}/`);
    assert(response.data.toString() === `hello world ${data.port}`);
  });

  it('proxy should work correctly without options', function* () {
    const newProxy = new TCPProxy();
    data = yield createServer();
    yield newProxy.createProxy({ port: 9800, forwardPort: data.port });
    const response = yield urllib.request('http://localhost:9800/');
    assert(response.data.toString() === `hello world ${data.port}`);
    yield newProxy.end();
  });

  it('proxy should not throw error with executing end function multiple times', function* () {
    data = yield createServer();
    yield proxy.createProxy({ forwardPort: data.port });
    yield proxy.end();
    yield proxy.end();
    yield proxy.end();
  });

  it('proxy should start only one server', done => {
    co(function* () {
      data = yield createServer();
      const server = yield proxy.createProxy({ forwardPort: data.port });
      server.once('close', done);
      yield proxy.createProxy({ forwardPort: data.port });
    });
  });

  it('proxy should work correctly when appoint a new port', function* () {
    const newPort = 9700;
    data = yield createServer();
    yield proxy.createProxy({ port: newPort, forwardPort: data.port });
    const response = yield urllib.request(`http://localhost:${newPort}/`);
    assert(response.data.toString() === `hello world ${data.port}`);
  });

  it('should support interceptor', function* () {
    data = yield createServer();
    yield proxy.createProxy({
      forwardPort: data.port,
      interceptor: {
        client(chunk) {
          const data = chunk.toString();
          if (data.includes('GET / ')) {
            const newData = data.replace('GET / ', 'GET /tom ');
            return Buffer.from(newData);
          }
        },
        server(chunk) {
          const data = chunk.toString();
          if (data.includes('hello tom')) {
            const newData = data.replace('hello tom', 'bello tom');
            return Buffer.from(newData);
          }
        },
      },
    });

    const response = yield {
      result: urllib.request(`http://localhost:${proxyPort}/`),
      result2: urllib.request(`http://localhost:${proxyPort}/123`),
    };

    assert(response.result.data.toString() === `bello tom ${data.port}`);
    assert(response.result2.data.toString() === `hello world ${data.port}`);
  });

  it('should reject while proxy server error occurs', done => {
    const httpServer = require('http')
      .createServer()
      .listen(proxyPort, () => {
        proxy.createProxy({ forwardPort: 1234 })
          .then(() => {
            end(new Error('no error occurs'));
          })
          .catch(() => {
            end();
          });
      });

    function end(err) {
      httpServer.close();
      done(err);
    }
  });

  it('should support async interceptor', function* () {
    data = yield createServer();
    yield proxy.createProxy({
      forwardPort: data.port,
      interceptor: {
        client(chunk) {
          const data = chunk.toString();
          return new Promise(resolve => {
            setTimeout(() => {
              const newData = data.replace('GET / ', 'GET /tom ');
              resolve(newData);
            }, 200);
          });
        },

        server() {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('123'));
            }, 200);
          });
        },
      },
    });

    const response = yield urllib.request(`http://localhost:${proxyPort}/`);
    assert(response.data.toString() === `hello tom ${data.port}`);
  });
});

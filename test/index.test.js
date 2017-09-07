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

  it('interceptor should work correctly', function* () {
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
    const response = yield urllib.request(`http://localhost:${proxyPort}/`);
    assert(response.data.toString() === `bello tom ${data.port}`);

    const response2 = yield urllib.request(`http://localhost:${proxyPort}/123`);
    assert(response2.data.toString() === `hello world ${data.port}`);
  });
});

# tcp-proxy.js

a simple tcp proxy

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Appveyor status][appveyor-image]][appveyor-url]
[![Coverage Status][coveralls-image]][coveralls-url]

[npm-image]: https://img.shields.io/npm/v/tcp-proxy.js.svg?style=flat-square
[npm-url]: https://npmjs.org/package/tcp-proxy.js
[travis-url]: https://travis-ci.org/whxaxes/tcp-proxy.js
[travis-image]: http://img.shields.io/travis/whxaxes/tcp-proxy.js.svg
[appveyor-url]: https://ci.appveyor.com/project/whxaxes/tcp-proxy.js/branch/master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/whxaxes/tcp-proxy.js?branch=master&svg=true
[coveralls-url]: https://coveralls.io/r/whxaxes/tcp-proxy.js
[coveralls-image]: https://img.shields.io/coveralls/whxaxes/tcp-proxy.js.svg

## Usage

```bash
$ npm i tcp-proxy.js --save
```

create proxy

```js
const TCPProxy = require('tcp-proxy.js');
const proxy = new TCPProxy({ port: 9229 });
proxy.createProxy({
  forwardPort: 9999,
  forwardHost: 'localhost',
});
```

end proxy

```js
proxy.end();
```

interceptor

```js
proxy.createProxy({
  forwardPort: 9999,
  interceptor: {
    client(chunk) {
      // request => proxy server => interceptor.client => forward server
      const data = chunk.toString();
      const newData = data.replace('GET / ', 'GET /tom ');
      return Buffer.from(newData);
    },
    server(chunk) {
      // forward server => interceptor.server => proxy server => response
      const data = chunk.toString();
      const newData = data.replace('hello tom', 'bello tom');
      return Buffer.from(newData);
    },
  },
});
```

async interceptor

```js
proxy.createProxy({
  forwardPort: 9999,
  interceptor: {
    client(chunk) {
      // request => proxy server => interceptor.client => forward server
      const data = chunk.toString();
      return new Promise(resolve => {
        setTimeout(() => {
          const newData = data.replace('GET / ', 'GET /tom ');
          resolve(Buffer.from(newData));
        }, 200);
      });
    },
  },
});
```

## License

MIT
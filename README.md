# tcp-proxy.js

simple tcp proxy

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/tcp-proxy.js.svg?style=flat-square
[npm-url]: https://npmjs.org/package/tcp-proxy.js
[travis-image]: https://img.shields.io/travis/{{org}}/tcp-proxy.js.svg?style=flat-square
[travis-url]: https://travis-ci.org/{{org}}/tcp-proxy.js
[codecov-image]: https://codecov.io/gh/{{org}}/tcp-proxy.js/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/{{org}}/tcp-proxy.js
[david-image]: https://img.shields.io/david/{{org}}/tcp-proxy.js.svg?style=flat-square
[david-url]: https://david-dm.org/{{org}}/tcp-proxy.js
[snyk-image]: https://snyk.io/test/npm/tcp-proxy.js/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/tcp-proxy.js
[download-image]: https://img.shields.io/npm/dm/tcp-proxy.js.svg?style=flat-square
[download-url]: https://npmjs.org/package/tcp-proxy.js

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

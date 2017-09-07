'use strict';

const http = require('http');
const url = require('url');

const server = http
  .createServer((req, res) => {
    const urlObj = url.parse(req.url);
    if (urlObj.path === '/tom') {
      res.end(`hello tom ${server.address().port}`);
    } else {
      res.end(`hello world ${server.address().port}`);
    }
  })
  .listen(0, () => {
    console.log(server.address().port);
  });

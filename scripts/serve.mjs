// Static QA server only. The game itself never calls a server API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist/client');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.rsc': 'text/x-component',
  '.json': 'application/json',
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    const file = resolve(
      root,
      '.' + (pathname === '/' ? '/index.html' : pathname),
    );
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('No encontrado');
  }
}).listen(4173, '127.0.0.1', () =>
  console.log('Static demo: http://localhost:4173/'),
);

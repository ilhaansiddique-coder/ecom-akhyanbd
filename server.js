/**
 * Next.js Custom Server Entry Point with CORS Support
 *
 * For Flutter Web or any cross-origin requests, CORS is configured here.
 * For Flutter Mobile (iOS/Android), CORS is not needed.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Add CORS headers for API routes (before any other handling)
      if (req.url.startsWith('/api/v1')) {
        const origin = req.headers.origin || '*';

        // Handle preflight requests FIRST, before Next.js sees them
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          });
          res.end();
          console.log(`CORS preflight OK: ${req.url} from ${origin}`);
          return;
        }

        // Set CORS headers for actual requests
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(
        `> Server listening at http://${hostname}:${port} as ${
          dev ? 'development' : process.env.NODE_ENV
        }`
      );
      console.log(`> CORS enabled for API routes (/api/v1/*)`);
    });
});

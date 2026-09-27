import { createServer } from 'node:http';
import { verifySignature, processEvent } from './saleor.mjs';

export function createApp({ verify = verifySignature, handle = processEvent, apiUrl = process.env.SALEOR_API_URL } = {}) {
  return createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/webhook') { res.writeHead(404); res.end(); return; }
    let raw;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 1048576) throw new Error('Payload too large'); chunks.push(chunk); }
      raw = Buffer.concat(chunks);
    } catch { res.writeHead(413); res.end(); return; }
    try { await verify(raw, req.headers['saleor-signature'], apiUrl); }
    catch { res.writeHead(401); res.end(); return; }
    let event;
    try { event = JSON.parse(raw.toString('utf8')); }
    catch { res.writeHead(400); res.end(); return; }
    try {
      const decision = await handle(event);
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, decision }));
    } catch {
      res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{"ok":false}');
    }
  });
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) createApp().listen(Number(process.env.PORT || 8080), process.env.LISTEN_HOST || '127.0.0.1');

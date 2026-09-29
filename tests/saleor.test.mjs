import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPair, exportJWK, FlattenedSign, createLocalJWKSet } from 'jose';
import { decide, decisionIdentity } from '../decision.mjs';
import { verifySignature, processEvent, writeMetadata, productText } from '../saleor.mjs';

test('Jev accepted choice and review threshold', async () => {
  const fetcher = async (_, options) => {
    assert.equal(JSON.parse(options.body).model, 'jev-1.13.0');
    return { ok: true, json: async () => ({ model: 'jev-1.13.0', answers: { catalog_claim: { choice: 'safe', probabilities: { safe: 0.94 } } } }) };
  };
  assert.equal((await decide('Simple product', 'test', { fetcher })).outcome, 'safe');
});

test('Saleor detached JWS is verified and tampering rejected', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey); jwk.kid = 'test'; jwk.alg = 'RS256';
  const signed = await new FlattenedSign(Buffer.from('{"product":{"id":"1"}}')).setProtectedHeader({ alg: 'RS256', kid: 'test', b64: false, crit: ['b64'] }).sign(privateKey);
  const signature = `${signed.protected}..${signed.signature}`;
  const jwks = createLocalJWKSet({ keys: [jwk] });
  await verifySignature(Buffer.from('{"product":{"id":"1"}}'), signature, 'https://shop.example/graphql/', { jwks });
  await assert.rejects(() => verifySignature(Buffer.from('{}'), signature, 'https://shop.example/graphql/', { jwks }));
});

test('Product event writes decision metadata once', async () => {
  const calls=[];
  const event={ product:{ id:'UHJvZHVjdDox', name:'Vitamin', description:'{"blocks":[{"data":{"text":"Cures everything"}}]}' } };
  const decision={ outcome:'review', choice:'review', probability:0.95, ...decisionIdentity(productText(event.product)) };
  await processEvent(event,{ evaluate:async()=>decision, write:async (...args)=>calls.push(args), key:'test' });
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],event.product.id);
  event.product.privateMetadata=[{key:'jev_input_sha256',value:decision.inputSha256},{key:'jev_policy_version',value:decision.policyVersion}];
  const result=await processEvent(event,{ evaluate:async()=>{ throw new Error('Jev must not run on replay'); }, write:async (...args)=>calls.push(args), key:'test' });
  assert.equal(result.skipped,'already reviewed');
  assert.equal(calls.length,1);
});

import { createApp } from '../server.mjs';
test('HTTP webhook rejects an invalid signature before processing', async () => {
  let processed = false;
  const server = createApp({ verify: async () => { throw new Error('bad signature'); }, handle: async () => { processed = true; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/webhook`, { method: 'POST', body: '{}' });
    assert.equal(response.status, 401);
    assert.equal(processed, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('Saleor GraphQL mutation carries review metadata', async () => {
  let request;
  await writeMetadata('UHJvZHVjdDox', { outcome:'review', choice:'review', probability:0.95, policyVersion:'0.1.0', inputSha256:'abc' }, { apiUrl:'https://shop.example/graphql/', token:'test', fetcher:async (url, options) => { request={url,options}; return { ok:true, json:async()=>({data:{updatePrivateMetadata:{errors:[]}}}) }; } });
  assert.equal(request.url,'https://shop.example/graphql/');
  assert.equal(JSON.parse(request.options.body).variables.input[0].key,'jev_outcome');
});

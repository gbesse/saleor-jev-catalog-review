import { createRemoteJWKSet, flattenedVerify } from 'jose';
import { decide, decisionIdentity } from './decision.mjs';

export async function verifySignature(raw, signature, apiUrl, { jwks } = {}) {
  if (typeof signature !== 'string' || !/^[A-Za-z0-9_-]+\.\.[A-Za-z0-9_-]+$/.test(signature)) throw new Error('Missing Saleor JWS');
  const url = new URL(apiUrl);
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  const [protectedHeader, , sig] = signature.split('.');
  const keySet = jwks || createRemoteJWKSet(new URL('/.well-known/jwks.json', url.origin));
  await flattenedVerify({ protected: protectedHeader, payload: raw.toString('utf8'), signature: sig }, keySet, { algorithms: ['RS256'] });
}

export function productText(product) {
  const description = product.description;
  let parsed = description;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { /* plain text */ }
  }
  const parts = [];
  function visit(value) {
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, val]) => { if (!['id', 'type', 'version'].includes(key)) visit(val); });
  }
  visit(parsed);
  return [product.name || '', ...parts].join(' ').trim();
}

export async function processEvent(event, { evaluate = decide, write = writeMetadata, key = process.env.TYPESAFE_API_KEY } = {}) {
  const product = event.product || event?.event?.product;
  if (!product?.id) return { skipped: 'not a product event' };
  const text = productText(product);
  if (!text) return { skipped: 'empty product text' };
  const prior = Object.fromEntries((product.privateMetadata || []).map(({ key, value }) => [key, value]));
  const identity = decisionIdentity(text);
  if (prior.jev_input_sha256 === identity.inputSha256 && prior.jev_policy_version === identity.policyVersion) return { skipped: 'already reviewed' };
  const result = await evaluate(text, key);
  await write(product.id, result);
  return result;
}

export async function writeMetadata(id, decision, { fetcher = fetch, apiUrl = process.env.SALEOR_API_URL, token = process.env.SALEOR_APP_TOKEN } = {}) {
  if (!apiUrl || new URL(apiUrl).protocol !== 'https:' || !token) throw new Error('Saleor API configuration required');
  const input = [['jev_outcome', decision.outcome], ['jev_choice', decision.choice], ['jev_probability', String(decision.probability)], ['jev_policy_version', decision.policyVersion], ['jev_input_sha256', decision.inputSha256]].map(([key, value]) => ({ key, value }));
  const query = 'mutation JevReview($id: ID!, $input: [MetadataInput!]!) { updatePrivateMetadata(id: $id, input: $input) { errors { field message } } }';
  const response = await fetcher(apiUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { id, input } }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Saleor metadata request failed');
  const body = await response.json();
  if (body.errors?.length || body.data?.updatePrivateMetadata?.errors?.length || !body.data?.updatePrivateMetadata) throw new Error('Saleor metadata rejected');
}

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const policy = JSON.parse(readFileSync(new URL('./policy.json', import.meta.url)));

export function decisionIdentity(text) {
  return { inputSha256: createHash('sha256').update(text).digest('hex'), policyVersion: policy.version };
}

export async function decide(text, key, { fetcher = fetch } = {}) {
  if (typeof text !== 'string' || !text.trim() || text.length > 16000) throw new Error('Invalid text');
  if (!key) throw new Error('TYPESAFE_API_KEY is required');
  const body = { model: policy.model, questions: { [policy.question]: { type: 'choice', instructions: policy.instructions, criteria: policy.criteria } }, state: { text } };
  const response = await fetcher('https://api.typesafe.ai/v1/systemone', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Jev request failed');
  const result = await response.json();
  if (result.model !== policy.model) throw new Error('Jev model mismatch');
  const answer = result.answers?.[policy.question];
  const choice = answer?.choice;
  const probability = answer?.probabilities?.[choice];
  if (!Object.hasOwn(policy.criteria, choice) || typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error('Invalid Jev choice');
  return { schemaVersion: 1, outcome: choice !== 'other' && probability >= policy.threshold ? choice : 'review', choice, probability, threshold: policy.threshold, model: policy.model, ...decisionIdentity(text) };
}

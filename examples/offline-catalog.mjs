import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decide } from '../decision.mjs';

const policy = JSON.parse(readFileSync(new URL('../policy.json', import.meta.url)));
const text = 'A ceramic mug is described by material, capacity, and care instructions.';
const choice = 'safe';

function fixture(probability) {
  return async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(JSON.parse(options.body).state.text, text);
    return {
      ok: true,
      async json() {
        return { model: policy.model, answers: { [policy.question]: { choice, probabilities: { [choice]: probability } } } };
      },
    };
  };
}

const high = await decide(text, 'offline-fixture', { fetcher: fixture(0.96) });
const low = await decide(text, 'offline-fixture', { fetcher: fixture(0.52) });
assert.equal(high.outcome, 'safe');
assert.equal(low.outcome, 'review');
assert.equal(high.inputSha256, low.inputSha256);
console.log(JSON.stringify({ highConfidence: high, lowConfidence: low }, null, 2));

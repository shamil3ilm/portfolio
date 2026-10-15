// WhatsApp alerts (api/alert.js): which requests are accepted and what the message says.
// Run: node --test "scripts/test/*.test.mjs"
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../../api/alert.js');
const ORIGIN = 'https://mohamed3shamil.vercel.app';
const ENV = { WA_TOKEN: 't', WA_PHONE_NUMBER_ID: '123', WA_TO: '971500000000' };

let sent;
let ipCounter = 0;
const realFetch = globalThis.fetch;

beforeEach(() => {
  sent = [];
  Object.assign(process.env, ENV);
  globalThis.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body).template.components[0].parameters.map((p) => p.text));
    return new Response('{}', { status: 200 });
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(ENV)) delete process.env[key];
});

async function call(body, origin = ORIGIN) {
  ipCounter += 1; // a fresh IP per call keeps the per-IP rate limit out of these tests
  const res = { code: 0, headers: {}, setHeader() {}, status(c) { this.code = c; return this; }, end() { return this; } };
  await handler({ method: 'POST', headers: { origin, 'x-forwarded-for': `10.0.0.${ipCounter}` }, body }, res);
  return res.code;
}

test('alerts work from the new domain and the old address, and nowhere else', async () => {
  const visit = { type: 'visit', ref: 'acme', page: '/' };
  assert.equal(await call(visit, 'https://mohamed3shamil.justletmeknow.app'), 204);
  assert.equal(await call(visit, 'https://mohamed3shamil.vercel.app'), 204);
  assert.equal(await call(visit, 'https://justletmeknow.app'), 403);
  assert.equal(await call(visit, 'https://evil.example'), 403);
  assert.equal(sent.length, 2);
});

test('a tagged link open still alerts with its tag', async () => {
  assert.equal(await call({ type: 'visit', ref: 'acme', page: '/' }), 204);
  assert.deepEqual(sent, [['Tagged link opened: acme', 'Page /']]);
});

test('an untagged visitor on a case study alerts with the page and where they came from', async () => {
  assert.equal(await call({ type: 'interest', page: '/case-delegated-access.html', from: 'linkedin.com' }), 204);
  assert.deepEqual(sent, [['Untagged visitor on a key page', 'Page /case-delegated-access.html, from linkedin.com']]);
});

test('the résumé and tailored résumé pages count as key pages; an unknown source reads as direct', async () => {
  assert.equal(await call({ type: 'interest', page: '/resume.html' }), 204);
  assert.equal(await call({ type: 'interest', page: '/resume/acme.html', from: '' }), 204);
  assert.deepEqual(sent, [
    ['Untagged visitor on a key page', 'Page /resume.html, direct'],
    ['Untagged visitor on a key page', 'Page /resume/acme.html, direct'],
  ]);
});

test('other pages and malformed sources are refused, so the alert cannot be used to send arbitrary text', async () => {
  assert.equal(await call({ type: 'interest', page: '/' }), 400);
  assert.equal(await call({ type: 'interest', page: '/playground.html' }), 400);
  assert.equal(await call({ type: 'interest', page: '/case-x.html', from: 'evil.com/<script>' }), 400);
  assert.equal(await call({ type: 'interest', page: '/case-x.html', from: 'Buy now at example.com' }), 400);
  assert.deepEqual(sent, []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminHandler, OWNER_ID } from '../supabase/functions/admin-console/handler.ts';
import { containsPrivateCredential } from './checkPublicSecrets.mjs';

const otherId = '11111111-1111-4111-8111-111111111111';
const request = (token, method = 'GET', body, origin = 'https://mixingmusic.ai') => new Request('https://example.invalid/admin-console', {
  method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Origin: origin },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
function setup(user) {
  const calls = [];
  const handler = createAdminHandler({
    authenticate: async () => user,
    listUsers: async page => { calls.push(['list', page]); return { users: [], nextPage: null }; },
    updateAccess: async (...args) => { calls.push(['update', ...args]); },
  });
  return { handler, calls };
}
test('missing, invalid and ordinary sessions cannot read or mutate accounts', async () => {
  for (const [token, user, expected] of [
    [null, { id: OWNER_ID, email_confirmed_at: '2026-01-01' }, 401],
    ['invalid', null, 401],
    ['member', { id: otherId, email_confirmed_at: '2026-01-01', user_metadata: { role: 'admin' } }, 403],
    ['unconfirmed', { id: OWNER_ID }, 403],
  ]) {
    const { handler, calls } = setup(user);
    for (const method of ['GET', 'PUT']) {
      assert.equal((await handler(request(token, method, method === 'PUT' ? { userId: otherId, isPro: true } : undefined))).status, expected);
    }
    assert.deepEqual(calls, []);
  }
});
test('verified owner can list and manage only validated manual access', async () => {
  const { handler, calls } = setup({ id: OWNER_ID, email_confirmed_at: '2026-01-01' });
  assert.equal((await handler(request('owner'))).status, 200);
  assert.equal((await handler(request('owner', 'PUT', { userId: otherId, isPro: true }))).status, 200);
  assert.deepEqual(calls, [['list', 1], ['update', otherId, true]]);
});
test('untrusted origins, deletion, privilege fields and owner revocation are rejected', async () => {
  const { handler, calls } = setup({ id: OWNER_ID, email_confirmed_at: '2026-01-01' });
  assert.equal((await handler(request('owner', 'GET', undefined, 'https://attacker.invalid'))).status, 403);
  assert.equal((await handler(request('owner', 'DELETE'))).status, 405);
  assert.equal((await handler(request('owner', 'PUT', { userId: otherId, isPro: 'true' }))).status, 400);
  assert.equal((await handler(request('owner', 'PUT', { userId: otherId, isPro: true, role: 'admin' }))).status, 400);
  assert.equal((await handler(request('owner', 'PUT', { userId: OWNER_ID, isPro: false }))).status, 409);
  assert.deepEqual(calls, []);
});
test('paid-access refusal and provider failures never become success or leak details', async () => {
  for (const [message, status] of [['PAID_ACCESS_PROTECTED', 409], ['private provider detail', 503]]) {
    const handler = createAdminHandler({
      authenticate: async () => ({ id: OWNER_ID, email_confirmed_at: '2026-01-01' }),
      listUsers: async () => ({}), updateAccess: async () => { throw new Error(message); },
    });
    const response = await handler(request('owner', 'PUT', { userId: otherId, isPro: false }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    if (status === 503) assert.equal((await response.text()).includes(message), false);
  }
});
test('artifact guard rejects privileged tokens but permits public keys', () => {
  const token = role => `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.synthetic`;
  assert.equal(containsPrivateCredential(token('service_role')), true);
  assert.equal(containsPrivateCredential(token('anon')), false);
  assert.equal(containsPrivateCredential('sb_secret_' + 'x'.repeat(30)), true);
  assert.equal(containsPrivateCredential('sbp_' + 'a'.repeat(40)), true);
  assert.equal(containsPrivateCredential('sb_publishable_' + 'x'.repeat(30)), false);
});

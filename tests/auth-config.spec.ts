import { expect, test } from '@playwright/test';
import { configurationIssues } from '../lib/auth-config';

const valid = {
  ADMIN_USERNAME: 'admin-test',
  ADMIN_PASSWORD_HASH: `${'a'.repeat(32)}:${'b'.repeat(128)}`,
  SESSION_SECRET: 'session-fixture-'.repeat(3),
  MANAGEMENT_API_KEY: 'management-fixture-private',
};

test('accepts complete configuration and identifies every missing field', () => {
  expect(configurationIssues(valid)).toEqual([]);
  for (const name of Object.keys(valid)) {
    const issues = configurationIssues({ ...valid, [name]: undefined });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(name);
  }
});

test('rejects plaintext or quoted hashes without exposing their values', () => {
  for (const hash of ['private-password-fixture', `"${valid.ADMIN_PASSWORD_HASH}"`]) {
    const issues = configurationIssues({ ...valid, ADMIN_PASSWORD_HASH: hash });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('ADMIN_PASSWORD_HASH');
    expect(issues.join()).not.toContain(hash);
    expect(issues.join()).not.toContain(valid.SESSION_SECRET);
    expect(issues.join()).not.toContain(valid.MANAGEMENT_API_KEY);
  }
});

test('rejects empty secrets and short session keys', () => {
  expect(configurationIssues({ ...valid, SESSION_SECRET: 'short', MANAGEMENT_API_KEY: '   ' })).toHaveLength(2);
});

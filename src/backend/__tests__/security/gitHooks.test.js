const fs = require('fs');
const path = require('path');

describe('Git hook enforcement', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const readHook = hookName => fs.readFileSync(path.join(repoRoot, '.husky', hookName), 'utf8');

  test('pre-commit runs lint-staged and git-secrets', () => {
    const script = readHook('pre-commit');
    expect(script).toContain('npx lint-staged');
    expect(script).toContain('git secrets --scan');
  });

  test('pre-push runs vitest and eslint', () => {
    const script = readHook('pre-push');
    expect(script).toContain('npx vitest --run');
    expect(script).toContain('npx eslint .');
  });
});

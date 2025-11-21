/**
 * Unit tests for cross-repo-helper.js
 */
const {
  parseIssueUrl,
  isSameRepo,
  getIssueTypeFromTitle,
  filterInheritableLabels,
  delay
} = require('../../.github/scripts/cross-repo-helper');

describe('parseIssueUrl', () => {
  test('should parse valid GitHub issue URL', () => {
    const url = 'https://github.com/owner/repo/issues/123';
    const result = parseIssueUrl(url);

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 123
    });
  });

  test('should return null for invalid URL', () => {
    expect(parseIssueUrl('not-a-url')).toBeNull();
    expect(parseIssueUrl('')).toBeNull();
    expect(parseIssueUrl(null)).toBeNull();
  });

  test('should handle different GitHub URL formats', () => {
    const url = 'https://github.com/my-org/my-project/issues/456';
    const result = parseIssueUrl(url);

    expect(result).toEqual({
      owner: 'my-org',
      repo: 'my-project',
      number: 456
    });
  });
});

describe('isSameRepo', () => {
  test('should return true for same repository', () => {
    const issueRef = { owner: 'owner', repo: 'repo', number: 1 };
    expect(isSameRepo(issueRef, 'owner', 'repo')).toBe(true);
  });

  test('should return false for different owner', () => {
    const issueRef = { owner: 'different', repo: 'repo', number: 1 };
    expect(isSameRepo(issueRef, 'owner', 'repo')).toBe(false);
  });

  test('should return false for different repo', () => {
    const issueRef = { owner: 'owner', repo: 'different', number: 1 };
    expect(isSameRepo(issueRef, 'owner', 'repo')).toBe(false);
  });
});

describe('getIssueTypeFromTitle', () => {
  test('should detect Epic type', () => {
    expect(getIssueTypeFromTitle('[EPIC] Build authentication system')).toBe('Epic');
  });

  test('should detect Feature type', () => {
    expect(getIssueTypeFromTitle('[FEATURE] Add login page')).toBe('Feature');
  });

  test('should detect User Story type', () => {
    expect(getIssueTypeFromTitle('[STORY] As a user, I want to login')).toBe('User Story');
    expect(getIssueTypeFromTitle('[USER STORY] As a user, I want to logout')).toBe('User Story');
  });

  test('should detect Task type', () => {
    expect(getIssueTypeFromTitle('[TASK] Update documentation')).toBe('Task');
  });

  test('should detect Bug type', () => {
    expect(getIssueTypeFromTitle('[BUG] Login button not working')).toBe('Bug');
  });

  test('should return null for unrecognized type', () => {
    expect(getIssueTypeFromTitle('No prefix here')).toBeNull();
    expect(getIssueTypeFromTitle('[UNKNOWN] Something')).toBeNull();
  });
});

describe('filterInheritableLabels', () => {
  test('should filter labels with inheritable prefixes', () => {
    const labels = [
      { name: 'priority:high' },
      { name: 'team:backend' },
      { name: 'component:auth' },
      { name: 'size:large' },
      { name: 'bug' },
      { name: 'documentation' }
    ];

    const result = filterInheritableLabels(labels);

    expect(result).toEqual([
      'priority:high',
      'team:backend',
      'component:auth',
      'size:large'
    ]);
  });

  test('should return empty array when no inheritable labels', () => {
    const labels = [
      { name: 'bug' },
      { name: 'documentation' },
      { name: 'help-wanted' }
    ];

    const result = filterInheritableLabels(labels);
    expect(result).toEqual([]);
  });

  test('should handle empty array', () => {
    expect(filterInheritableLabels([])).toEqual([]);
  });
});

describe('delay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should delay execution', async () => {
    const promise = delay(1000);

    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });
});

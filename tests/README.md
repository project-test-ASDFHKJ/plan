# Test Suite Documentation

This directory contains comprehensive tests for the GitHub issue automation workflows.

## Test Structure

```
tests/
├── unit/                          # Unit tests for individual functions
│   ├── cross-repo-helper.test.js      # Tests for helper utilities
│   └── cross-repo-helper-api.test.js  # Tests for API functions with mocks
├── integration/                   # Integration tests for workflow logic
│   └── workflow-logic.test.js         # Tests for business logic
└── e2e/                          # End-to-end tests for complete flows
    └── complete-workflows.test.js     # Tests for full automation scenarios
```

## Test Categories

### Unit Tests (`tests/unit/`)

Tests individual functions in isolation with mocked dependencies.

**What's tested:**
- URL parsing functions
- Issue type detection
- Label filtering logic
- Basic utility functions

**Example:**
```javascript
test('should parse valid GitHub issue URL', () => {
  const url = 'https://github.com/owner/repo/issues/123';
  const result = parseIssueUrl(url);
  expect(result).toEqual({ owner: 'owner', repo: 'repo', number: 123 });
});
```

### Integration Tests (`tests/integration/`)

Tests business logic that interacts with multiple components, with mocked external dependencies (GitHub API).

**What's tested:**
- Issue type detection and setting
- Parent-child relationship logic
- Estimate rollup calculations
- Label cascade logic
- Iteration inheritance
- Auto-close/reopen logic

**Example:**
```javascript
test('should calculate sum of children estimates', async () => {
  // Mock GitHub API responses
  const { totalEstimate, totalRemaining } = await calculateChildrenSums(...);
  expect(totalEstimate).toBe(13);
});
```

### End-to-End Tests (`tests/e2e/`)

Tests complete automation workflows from start to finish.

**What's tested:**
- Complete issue creation flow (type setting, project addition, inheritance)
- Label cascade through entire hierarchy
- Estimate rollup through parent chain
- Auto-close/reopen scenarios
- Full synchronization with sync label

**Example:**
```javascript
test('should set type, add to project, and inherit parent properties', async () => {
  // Simulate full issue creation
  const results = await runIssueAutomation(mockGithub, mockContext);
  expect(results.typeSet).toBe('Task');
  expect(results.iterationInherited).toBe('Sprint 1');
});
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage.

## Writing New Tests

### Adding Unit Tests

1. Create a new file in `tests/unit/`
2. Import the functions you want to test
3. Write test cases using Jest

```javascript
const { myFunction } = require('../../.github/scripts/my-module');

describe('myFunction', () => {
  test('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Adding Integration Tests

1. Create test file in `tests/integration/`
2. Create mock GitHub client
3. Mock API responses
4. Test business logic

```javascript
const createMockGitHub = () => ({
  rest: { issues: { get: jest.fn() } },
  graphql: jest.fn()
});

test('should handle workflow logic', async () => {
  const mockGithub = createMockGitHub();
  mockGithub.rest.issues.get.mockResolvedValue({ data: { ... } });

  const result = await workflowFunction(mockGithub);
  expect(result).toMatchObject({ ... });
});
```

### Adding E2E Tests

1. Create test file in `tests/e2e/`
2. Mock complete context and GitHub client
3. Test full automation flow

```javascript
test('should run complete automation', async () => {
  const mockContext = createMockContext('issues', { ... });
  const mockGithub = createMockGitHub();

  // Setup all necessary mocks
  mockGithub.graphql.mockResolvedValue({ ... });

  const result = await runCompleteFlow(mockGithub, mockContext);

  expect(result.success).toBe(true);
});
```

## Test Coverage Goals

| Metric | Target |
|--------|--------|
| Lines | 80% |
| Statements | 80% |
| Functions | 80% |
| Branches | 80% |

## Continuous Integration

Tests run automatically on:
- Every push to `main` branch
- Every pull request
- Manual workflow dispatch

See `.github/workflows/test.yml` for CI configuration.

## Troubleshooting

### Tests Failing Locally

1. Ensure dependencies are installed: `npm install`
2. Clear Jest cache: `npx jest --clearCache`
3. Check Node.js version: `node --version` (should be v20+)

### Mock Issues

If mocks aren't working:
- Verify mock setup in `beforeEach()` hooks
- Check that mocks are reset between tests
- Use `jest.clearAllMocks()` in `afterEach()`

### Debugging Tests

Run tests with verbose output:
```bash
npm test -- --verbose
```

Run a single test file:
```bash
npm test tests/unit/cross-repo-helper.test.js
```

Run tests matching a pattern:
```bash
npm test -- --testNamePattern="should parse"
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Always mock external dependencies (GitHub API)
3. **Clarity**: Use descriptive test names
4. **Coverage**: Aim for high coverage but focus on critical paths
5. **Maintainability**: Keep tests simple and readable

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [GitHub Actions Testing Guide](https://docs.github.com/en/actions/automating-builds-and-tests/about-continuous-integration)
- [Mocking with Jest](https://jestjs.io/docs/mock-functions)

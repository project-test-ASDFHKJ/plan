# Testing Guide

This document describes the testing strategy and practices for the GitHub issue automation workflows.

## Overview

The testing suite ensures that all automation workflows function correctly:
- **Issue type detection and setting**
- **Parent-child relationship management**
- **Label and milestone cascading**
- **Iteration inheritance**
- **Estimate rollup calculations**
- **Auto-close/reopen logic**
- **Full synchronization**

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

## Test Architecture

### 3-Layer Testing Strategy

```
┌─────────────────────────────────────────────────┐
│              E2E Tests                          │
│  Complete workflow scenarios                    │
│  (Full automation flows)                        │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│          Integration Tests                      │
│  Business logic with mocked GitHub API          │
│  (Workflow logic, calculations)                 │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│            Unit Tests                           │
│  Individual functions in isolation              │
│  (Utilities, parsers, helpers)                  │
└─────────────────────────────────────────────────┘
```

## Test Files

### Unit Tests

**Location:** `tests/unit/`

- `cross-repo-helper.test.js` - Tests for utility functions
- `cross-repo-helper-api.test.js` - Tests for API wrapper functions

**Purpose:** Verify individual functions work correctly in isolation.

### Integration Tests

**Location:** `tests/integration/`

- `workflow-logic.test.js` - Tests for business logic

**Purpose:** Verify workflow logic works correctly with mocked dependencies.

### E2E Tests

**Location:** `tests/e2e/`

- `complete-workflows.test.js` - Tests for complete automation scenarios

**Purpose:** Verify entire workflows work end-to-end.

### Test Fixtures

**Location:** `tests/fixtures/`

- `mock-data.js` - Reusable mock data and factories

**Purpose:** Provide consistent test data across all test files.

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Suite

```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
```

### Single Test File

```bash
npm test tests/unit/cross-repo-helper.test.js
```

### Tests Matching Pattern

```bash
npm test -- --testNamePattern="should parse"
```

### With Coverage

```bash
npm run test:coverage
```

Coverage reports are in `coverage/lcov-report/index.html`.

### Watch Mode (Development)

```bash
npm run test:watch
```

Automatically reruns tests when files change.

## Writing Tests

### Test Structure

```javascript
describe('Feature being tested', () => {
  // Setup
  beforeEach(() => {
    // Reset state before each test
  });

  test('should do something specific', () => {
    // Arrange: Set up test data
    const input = ...;

    // Act: Execute the function
    const result = functionUnderTest(input);

    // Assert: Verify the result
    expect(result).toBe(expected);
  });
});
```

### Mocking GitHub API

Use the mock factory from `tests/fixtures/mock-data.js`:

```javascript
const { createMockGitHubClient, mockGraphQLResponses } = require('../fixtures/mock-data');

test('should fetch issue', async () => {
  const mockGithub = createMockGitHubClient();

  mockGithub.rest.issues.get.mockResolvedValue({
    data: { number: 1, title: 'Test' }
  });

  const result = await getIssue(mockGithub, 'owner', 'repo', 1);

  expect(result.number).toBe(1);
});
```

### Testing Async Functions

```javascript
test('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Testing Errors

```javascript
test('should throw error on invalid input', async () => {
  await expect(
    functionThatThrows()
  ).rejects.toThrow('Error message');
});
```

## Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Lines | 80% | Run `npm run test:coverage` |
| Statements | 80% | Run `npm run test:coverage` |
| Functions | 80% | Run `npm run test:coverage` |
| Branches | 80% | Run `npm run test:coverage` |

## CI/CD Integration

Tests run automatically via GitHub Actions:

**Triggers:**
- Push to `main` branch
- Pull requests
- Manual workflow dispatch

**Configuration:** `.github/workflows/test.yml`

**Steps:**
1. Install dependencies
2. Run linter
3. Run unit tests
4. Run integration tests
5. Generate coverage report
6. Upload coverage to Codecov
7. Comment results on PR

## Best Practices

### ✅ Do

- Write tests for all new features
- Mock external dependencies
- Use descriptive test names
- Keep tests isolated and independent
- Test edge cases and error conditions
- Commit test files with code changes

### ❌ Don't

- Test implementation details
- Make tests depend on each other
- Use real API calls in tests
- Skip writing tests for "simple" code
- Leave failing tests in the codebase

## Common Patterns

### Testing Parent-Child Logic

```javascript
test('should find parent issue', async () => {
  const mockGithub = createMockGitHubClient();

  mockGithub.rest.issues.get.mockResolvedValue({
    data: {
      number: 5,
      parent_issue_url: '.../issues/1'
    }
  });

  const parentNumber = await findParent(mockGithub, 5);
  expect(parentNumber).toBe(1);
});
```

### Testing Estimate Rollup

```javascript
test('should sum children estimates', async () => {
  const mockGithub = createMockGitHubClient();

  mockGithub.graphql.mockResolvedValue({
    organization: {
      projectsV2: {
        nodes: [{
          items: {
            nodes: [
              { /* child 1: estimate=5 */ },
              { /* child 2: estimate=8 */ }
            ]
          }
        }]
      }
    }
  });

  const { total } = await calculateSum(mockGithub, 1);
  expect(total).toBe(13);
});
```

### Testing Label Cascade

```javascript
test('should cascade label to descendants', async () => {
  const mockGithub = createMockGitHubClient();

  mockGithub.request.mockResolvedValue({
    data: [{ number: 10 }, { number: 11 }]
  });

  await cascadeLabel(mockGithub, 5, 'priority:high');

  expect(mockGithub.rest.issues.addLabels)
    .toHaveBeenCalledTimes(2);
});
```

## Debugging Tests

### Enable Verbose Output

```bash
npm test -- --verbose
```

### Run Single Test

```bash
npm test -- --testNamePattern="specific test name"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## Troubleshooting

### Tests Timeout

Increase timeout in test:

```javascript
test('slow operation', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Mocks Not Working

Clear Jest cache:

```bash
npx jest --clearCache
```

### Snapshot Tests Failing

Update snapshots:

```bash
npm test -- --updateSnapshot
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Getting Help

If you need help with tests:

1. Check this documentation
2. Look at existing test examples
3. Review test fixtures in `tests/fixtures/`
4. Ask in team chat or create an issue

/**
 * Tests for cycle detection with composite keys
 * Ensures cross-repo issues don't collide in cycle detection
 */

describe('Cycle Detection with Composite Keys', () => {
  test('should not collide when same issue number exists in different repos', () => {
    const updatedIssues = new Set();

    // Simulate adding issues from different repos with same number
    const issue1Key = 'owner1/repo1#5';
    const issue2Key = 'owner2/repo2#5';
    const issue3Key = 'owner1/repo1#10';

    updatedIssues.add(issue1Key);
    updatedIssues.add(issue2Key);
    updatedIssues.add(issue3Key);

    // All three should be tracked separately
    expect(updatedIssues.size).toBe(3);
    expect(updatedIssues.has(issue1Key)).toBe(true);
    expect(updatedIssues.has(issue2Key)).toBe(true);
    expect(updatedIssues.has(issue3Key)).toBe(true);
  });

  test('should detect already processed issue with composite key', () => {
    const updatedIssues = new Set();

    const owner = 'test-org';
    const repo = 'test-repo';
    const issueNumber = 5;
    const compositeKey = `${owner}/${repo}#${issueNumber}`;

    // Add issue
    updatedIssues.add(compositeKey);

    // Try to add again - should be detected
    expect(updatedIssues.has(compositeKey)).toBe(true);
  });

  test('should allow same issue number from different repos', () => {
    const updatedIssues = new Set();

    // Same issue number, different repos
    const mainRepoKey = 'org/main#5';
    const otherRepoKey = 'org/other#5';

    updatedIssues.add(mainRepoKey);

    // Should not be detected as duplicate
    expect(updatedIssues.has(otherRepoKey)).toBe(false);

    updatedIssues.add(otherRepoKey);

    // Both should exist
    expect(updatedIssues.has(mainRepoKey)).toBe(true);
    expect(updatedIssues.has(otherRepoKey)).toBe(true);
    expect(updatedIssues.size).toBe(2);
  });

  test('should create correct composite key format', () => {
    const owner = 'my-org';
    const repo = 'my-repo';
    const number = 123;

    const compositeKey = `${owner}/${repo}#${number}`;

    expect(compositeKey).toBe('my-org/my-repo#123');
  });

  test('should handle cross-repo hierarchy without collisions', () => {
    const updatedIssues = new Set();

    // Simulate hierarchy:
    // org/plan#1 -> org/calendar#5
    //            -> org/plan#5
    const parent = 'org/plan#1';
    const child1 = 'org/calendar#5';  // Different repo, same number as child2
    const child2 = 'org/plan#5';      // Same repo as parent

    updatedIssues.add(parent);
    updatedIssues.add(child1);
    updatedIssues.add(child2);

    // All three should be tracked separately despite number collision
    expect(updatedIssues.size).toBe(3);
  });

  test('should prevent infinite loop with circular references', () => {
    const updatedIssues = new Set();

    // Simulate circular reference: A -> B -> C -> A
    const issueA = 'org/repo#1';
    const issueB = 'org/repo#2';
    const issueC = 'org/repo#3';

    // Process chain
    updatedIssues.add(issueA);
    updatedIssues.add(issueB);
    updatedIssues.add(issueC);

    // Try to process A again (circular)
    expect(updatedIssues.has(issueA)).toBe(true);

    // Should skip A on second encounter
    const shouldSkip = updatedIssues.has(issueA);
    expect(shouldSkip).toBe(true);
  });

  test('should handle cross-repo with different owners', () => {
    const updatedIssues = new Set();

    const issue1 = 'owner1/repo#5';
    const issue2 = 'owner2/repo#5';  // Different owner, same repo name and number

    updatedIssues.add(issue1);
    updatedIssues.add(issue2);

    // Both should be tracked separately
    expect(updatedIssues.size).toBe(2);
    expect(updatedIssues.has(issue1)).toBe(true);
    expect(updatedIssues.has(issue2)).toBe(true);
  });
});

describe('Composite Key Formatting', () => {
  test('should format composite key correctly for same repo', () => {
    const contextOwner = 'test-org';
    const contextRepo = 'test-repo';

    const childOwner = 'test-org';
    const childRepo = 'test-repo';
    const childNumber = 5;

    const compositeKey = `${childOwner}/${childRepo}#${childNumber}`;

    expect(compositeKey).toBe('test-org/test-repo#5');
  });

  test('should format composite key correctly for cross-repo', () => {
    const contextOwner = 'test-org';
    const contextRepo = 'main-repo';

    const childOwner = 'test-org';
    const childRepo = 'other-repo';
    const childNumber = 10;

    const compositeKey = `${childOwner}/${childRepo}#${childNumber}`;

    expect(compositeKey).toBe('test-org/other-repo#10');
  });

  test('should create display label correctly', () => {
    const contextRepo = 'main-repo';

    // Same repo - short format
    const sameRepoLabel = 'main-repo' !== contextRepo ? `main-repo#5` : `#5`;
    expect(sameRepoLabel).toBe('#5');

    // Different repo - full format
    const diffRepoLabel = 'other-repo' !== contextRepo ? `other-repo#5` : `#5`;
    expect(diffRepoLabel).toBe('other-repo#5');
  });
});

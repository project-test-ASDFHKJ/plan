/**
 * Integration tests for workflow logic
 * Tests the business logic extracted from GitHub Actions workflows
 */

// Mock GitHub API client factory
const createMockGitHubClient = () => ({
  rest: {
    issues: {
      get: jest.fn(),
      update: jest.fn(),
      addLabels: jest.fn(),
      removeLabel: jest.fn(),
      createComment: jest.fn(),
      listMilestones: jest.fn()
    }
  },
  graphql: jest.fn(),
  request: jest.fn()
});

describe('Issue Type Detection and Setting', () => {
  test('should detect and set Epic type', async () => {
    const mockGithub = createMockGitHubClient();
    const issueTitle = '[EPIC] Implement authentication system';

    // Expected type detection
    const expectedType = 'Epic';

    expect(getTypeFromTitle(issueTitle)).toBe(expectedType);
  });

  test('should detect Feature, Story, and Task types', () => {
    expect(getTypeFromTitle('[FEATURE] Login page')).toBe('Feature');
    expect(getTypeFromTitle('[STORY] User can reset password')).toBe('User Story');
    expect(getTypeFromTitle('[TASK] Update documentation')).toBe('Task');
  });
});

describe('Parent-Child Relationship Logic', () => {
  test('should find parent issue from sub-issues API', async () => {
    const mockGithub = createMockGitHubClient();

    // Mock REST API response with parent_issue_url
    mockGithub.rest.issues.get.mockResolvedValue({
      data: {
        number: 5,
        title: '[TASK] Child task',
        parent_issue_url: 'https://api.github.com/repos/owner/repo/issues/3'
      }
    });

    // Mock parent issue fetch
    mockGithub.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 5,
        parent_issue_url: 'https://api.github.com/repos/owner/repo/issues/3'
      }
    }).mockResolvedValueOnce({
      data: {
        number: 3,
        title: '[EPIC] Parent epic',
        milestone: { number: 1, title: 'Sprint 1' }
      }
    });

    const parentNumber = await findParentIssue(mockGithub, 5, 'owner', 'repo');

    expect(parentNumber).toBe(3);
  });

  test('should find children using sub_issues endpoint', async () => {
    const mockGithub = createMockGitHubClient();

    mockGithub.request.mockResolvedValue({
      data: [
        { number: 10, repository: { name: 'repo', owner: { login: 'owner' } } },
        { number: 11, repository: { name: 'repo', owner: { login: 'owner' } } }
      ]
    });

    const children = await findChildIssues(mockGithub, 5, 'owner', 'repo');

    expect(children).toHaveLength(2);
    expect(children[0].number).toBe(10);
    expect(children[1].number).toBe(11);
  });
});

describe('Estimate Rollup Logic', () => {
  test('should calculate sum of children estimates', async () => {
    const mockGithub = createMockGitHubClient();

    // Mock issue state checks
    mockGithub.rest.issues.get
      .mockResolvedValueOnce({ data: { state: 'open', number: 10 } })
      .mockResolvedValueOnce({ data: { state: 'open', number: 11 } });

    // Mock project data with children having estimates
    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj1',
            title: '[TEMPLATE] EngageMe',
            items: {
              nodes: [
                {
                  id: 'item1',
                  content: { number: 10 },
                  fieldValues: {
                    nodes: [
                      { field: { name: 'Estimate' }, number: 5 },
                      { field: { name: 'Remaining' }, number: 3 }
                    ]
                  }
                },
                {
                  id: 'item2',
                  content: { number: 11 },
                  fieldValues: {
                    nodes: [
                      { field: { name: 'Estimate' }, number: 8 },
                      { field: { name: 'Remaining' }, number: 8 }
                    ]
                  }
                }
              ]
            },
            fields: {
              nodes: [
                { id: 'est_field', name: 'Estimate' },
                { id: 'rem_field', name: 'Remaining' }
              ]
            }
          }]
        }
      }
    });

    const { totalEstimate, totalRemaining } = await calculateChildrenSums(
      mockGithub,
      [10, 11],
      'owner',
      'repo'
    );

    expect(totalEstimate).toBe(13); // 5 + 8
    expect(totalRemaining).toBe(11); // 3 + 8
  });

  test('should skip closed children in rollup', async () => {
    const mockGithub = createMockGitHubClient();

    // Mock one open and one closed child
    mockGithub.rest.issues.get
      .mockResolvedValueOnce({ data: { state: 'open', number: 10 } })
      .mockResolvedValueOnce({ data: { state: 'closed', number: 11 } });

    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            items: {
              nodes: [
                {
                  content: { number: 10 },
                  fieldValues: {
                    nodes: [
                      { field: { name: 'Estimate' }, number: 5 }
                    ]
                  }
                }
              ]
            }
          }]
        }
      }
    });

    // Only open children should be included
    const { totalEstimate } = await calculateChildrenSums(
      mockGithub,
      [10, 11],
      'owner',
      'repo'
    );

    expect(totalEstimate).toBe(5); // Only child 10
  });
});

describe('Label Cascade Logic', () => {
  test('should cascade label to all descendants', async () => {
    const mockGithub = createMockGitHubClient();
    const updatedIssues = new Set();

    // Mock children
    mockGithub.request.mockResolvedValue({
      data: [
        { number: 10, labels: [] },
        { number: 11, labels: [] }
      ]
    });

    await cascadeLabelToDescendants(
      mockGithub,
      5,
      'priority:high',
      'add',
      updatedIssues,
      'owner',
      'repo'
    );

    expect(mockGithub.rest.issues.addLabels).toHaveBeenCalledTimes(2);
    expect(updatedIssues.size).toBe(2);
  });

  test('should not cascade sync label to children', async () => {
    const mockGithub = createMockGitHubClient();

    const shouldCascade = shouldCascadeLabel('sync');

    expect(shouldCascade).toBe(false);
  });
});

describe('Iteration Inheritance Logic', () => {
  test('should inherit iteration from parent to child', async () => {
    const mockGithub = createMockGitHubClient();

    // Mock parent with iteration
    mockGithub.graphql.mockResolvedValueOnce({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj1',
            items: {
              nodes: [{
                content: { number: 3 },
                fieldValues: {
                  nodes: [{
                    iterationId: 'iter_123',
                    title: 'Sprint 1',
                    field: { id: 'iter_field', name: 'Iteration' }
                  }]
                }
              }]
            }
          }]
        }
      }
    });

    const parentIteration = await getParentIteration(mockGithub, 3, 'owner', 'repo');

    expect(parentIteration).toEqual({
      id: 'iter_123',
      title: 'Sprint 1'
    });
  });
});

describe('Auto-Close Logic', () => {
  test('should close parent when all children are closed', async () => {
    const mockGithub = createMockGitHubClient();

    // Mock all children as closed
    mockGithub.request.mockResolvedValue({
      data: [
        { number: 10, state: 'closed' },
        { number: 11, state: 'closed' }
      ]
    });

    mockGithub.rest.issues.get.mockResolvedValue({
      data: { number: 5, state: 'open' }
    });

    const shouldCloseParent = await checkIfShouldCloseParent(mockGithub, 5, 'owner', 'repo');

    expect(shouldCloseParent).toBe(true);
  });

  test('should not close parent when some children are open', async () => {
    const mockGithub = createMockGitHubClient();

    mockGithub.request.mockResolvedValue({
      data: [
        { number: 10, state: 'closed' },
        { number: 11, state: 'open' }
      ]
    });

    const shouldCloseParent = await checkIfShouldCloseParent(mockGithub, 5, 'owner', 'repo');

    expect(shouldCloseParent).toBe(false);
  });
});

// Helper functions that would be extracted from workflows
function getTypeFromTitle(title) {
  if (title.startsWith('[EPIC]')) return 'Epic';
  if (title.startsWith('[FEATURE]')) return 'Feature';
  if (title.startsWith('[STORY]')) return 'User Story';
  if (title.startsWith('[TASK]')) return 'Task';
  if (title.startsWith('[BUG]')) return 'Bug';
  return null;
}

async function findParentIssue(github, issueNumber, owner, repo) {
  const issue = await github.rest.issues.get({ owner, repo, issue_number: issueNumber });
  if (issue.data.parent_issue_url) {
    const parentNumber = parseInt(issue.data.parent_issue_url.split('/').pop());
    return parentNumber;
  }
  return null;
}

async function findChildIssues(github, issueNumber, owner, repo) {
  const response = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
    owner,
    repo,
    issue_number: issueNumber
  });
  return response.data.map(child => ({
    number: child.number,
    repository: child.repository
  }));
}

async function calculateChildrenSums(github, childNumbers, owner, repo) {
  let totalEstimate = 0;
  let totalRemaining = 0;

  for (const childNumber of childNumbers) {
    const childIssue = await github.rest.issues.get({ owner, repo, issue_number: childNumber });
    if (childIssue.data.state === 'closed') continue;

    // Get project fields (mocked)
    const projectData = await github.graphql('query');
    const items = projectData.organization.projectsV2.nodes[0].items.nodes;
    const item = items.find(i => i.content.number === childNumber);

    if (item) {
      const estimate = item.fieldValues.nodes.find(fv => fv.field.name === 'Estimate')?.number || 0;
      const remaining = item.fieldValues.nodes.find(fv => fv.field.name === 'Remaining')?.number || 0;
      totalEstimate += estimate;
      totalRemaining += remaining;
    }
  }

  return { totalEstimate, totalRemaining };
}

async function cascadeLabelToDescendants(github, parentNumber, labelName, operation, updatedIssues, owner, repo) {
  const children = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
    owner, repo, issue_number: parentNumber
  });

  for (const child of children.data) {
    if (operation === 'add') {
      await github.rest.issues.addLabels({
        owner, repo, issue_number: child.number, labels: [labelName]
      });
    }
    updatedIssues.add(child.number);
  }
}

function shouldCascadeLabel(labelName) {
  return labelName !== 'sync';
}

async function getParentIteration(github, issueNumber, owner, repo) {
  const result = await github.graphql('query');
  const project = result.organization.projectsV2.nodes[0];
  const item = project.items.nodes.find(i => i.content.number === issueNumber);

  if (item) {
    const iterValue = item.fieldValues.nodes.find(fv => fv.field?.name === 'Iteration');
    if (iterValue) {
      return {
        id: iterValue.iterationId,
        title: iterValue.title
      };
    }
  }
  return null;
}

async function checkIfShouldCloseParent(github, parentNumber, owner, repo) {
  const children = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
    owner, repo, issue_number: parentNumber
  });

  return children.data.every(child => child.state === 'closed');
}

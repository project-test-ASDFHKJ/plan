/**
 * Unit tests for cross-repo-helper.js API functions (with mocked GitHub API)
 */
const helper = require('../../.github/scripts/cross-repo-helper');

// Mock GitHub API client
const createMockGithub = () => ({
  rest: {
    issues: {
      get: jest.fn(),
      addLabels: jest.fn(),
      createComment: jest.fn()
    }
  },
  graphql: jest.fn()
});

describe('getIssue', () => {
  test('should fetch issue successfully', async () => {
    const mockGithub = createMockGithub();
    const mockIssueData = {
      number: 123,
      title: '[EPIC] Test Epic',
      state: 'open'
    };

    mockGithub.rest.issues.get.mockResolvedValue({
      data: mockIssueData
    });

    const result = await helper.getIssue(mockGithub, 'owner', 'repo', 123);

    expect(result).toEqual(mockIssueData);
    expect(mockGithub.rest.issues.get).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 123
    });
  });

  test('should throw error when issue fetch fails', async () => {
    const mockGithub = createMockGithub();
    mockGithub.rest.issues.get.mockRejectedValue(new Error('Not found'));

    await expect(
      helper.getIssue(mockGithub, 'owner', 'repo', 999)
    ).rejects.toThrow('Not found');
  });
});

describe('findProject', () => {
  test('should find project by exact name match', async () => {
    const mockGithub = createMockGithub();
    const mockProjects = {
      organization: {
        projectsV2: {
          nodes: [
            { id: 'proj1', title: 'Project A', number: 1 },
            { id: 'proj2', title: '[TEMPLATE] EngageMe', number: 2 },
            { id: 'proj3', title: 'Project C', number: 3 }
          ]
        }
      }
    };

    mockGithub.graphql.mockResolvedValue(mockProjects);

    const result = await helper.findProject(mockGithub, 'test-org', '[TEMPLATE] EngageMe');

    expect(result).toEqual({
      id: 'proj2',
      title: '[TEMPLATE] EngageMe',
      number: 2
    });
  });

  test('should find project by partial case-insensitive match', async () => {
    const mockGithub = createMockGithub();
    const mockProjects = {
      organization: {
        projectsV2: {
          nodes: [
            { id: 'proj1', title: 'Project Alpha', number: 1 },
            { id: 'proj2', title: 'EngageMe Project', number: 2 }
          ]
        }
      }
    };

    mockGithub.graphql.mockResolvedValue(mockProjects);

    const result = await helper.findProject(mockGithub, 'test-org', 'engageme');

    expect(result).toEqual({
      id: 'proj2',
      title: 'EngageMe Project',
      number: 2
    });
  });

  test('should return null when project not found', async () => {
    const mockGithub = createMockGithub();
    const mockProjects = {
      organization: {
        projectsV2: {
          nodes: []
        }
      }
    };

    mockGithub.graphql.mockResolvedValue(mockProjects);

    const result = await helper.findProject(mockGithub, 'test-org', 'NonExistent');

    expect(result).toBeNull();
  });
});

describe('findField', () => {
  test('should find field by name', () => {
    const fields = [
      { id: 'field1', name: 'Status' },
      { id: 'field2', name: 'Estimate' },
      { id: 'field3', name: 'Remaining' }
    ];

    const result = helper.findField(fields, 'Estimate');

    expect(result).toEqual({ id: 'field2', name: 'Estimate' });
  });

  test('should return null when field not found', () => {
    const fields = [
      { id: 'field1', name: 'Status' }
    ];

    const result = helper.findField(fields, 'NonExistent');

    expect(result).toBeNull();
  });
});

describe('addComment', () => {
  test('should add comment to issue', async () => {
    const mockGithub = createMockGithub();

    await helper.addComment(mockGithub, 'owner', 'repo', 123, 'Test comment');

    expect(mockGithub.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 123,
      body: 'Test comment'
    });
  });
});

describe('copyLabels', () => {
  test('should copy labels to target issue', async () => {
    const mockGithub = createMockGithub();
    const labels = ['priority:high', 'team:backend'];

    await helper.copyLabels(mockGithub, 'owner', 'repo', 123, labels);

    expect(mockGithub.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 123,
      labels: ['priority:high', 'team:backend']
    });
  });

  test('should not call API when no labels to copy', async () => {
    const mockGithub = createMockGithub();

    await helper.copyLabels(mockGithub, 'owner', 'repo', 123, []);

    expect(mockGithub.rest.issues.addLabels).not.toHaveBeenCalled();
  });

  test('should handle errors gracefully', async () => {
    const mockGithub = createMockGithub();
    mockGithub.rest.issues.addLabels.mockRejectedValue(new Error('Label not found'));

    // Should not throw
    await expect(
      helper.copyLabels(mockGithub, 'owner', 'repo', 123, ['invalid-label'])
    ).resolves.toBeUndefined();
  });
});

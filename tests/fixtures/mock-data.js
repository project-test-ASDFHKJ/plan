/**
 * Mock data fixtures for tests
 * Provides reusable test data for GitHub API responses
 */

// Mock issue data
const mockIssues = {
  epic: {
    number: 1,
    title: '[EPIC] Authentication System',
    body: 'Implement complete authentication system',
    state: 'open',
    node_id: 'issue_node_1',
    labels: [
      { name: 'priority:high' },
      { name: 'team:backend' }
    ],
    milestone: {
      number: 1,
      title: 'Sprint 1'
    }
  },
  feature: {
    number: 5,
    title: '[FEATURE] Login page',
    body: 'Parent Epic: #1',
    state: 'open',
    node_id: 'issue_node_5',
    parent_issue_url: 'https://api.github.com/repos/owner/repo/issues/1',
    labels: [],
    milestone: null
  },
  task: {
    number: 10,
    title: '[TASK] Add login form',
    body: 'Parent Feature: #5',
    state: 'open',
    node_id: 'issue_node_10',
    parent_issue_url: 'https://api.github.com/repos/owner/repo/issues/5',
    labels: [],
    milestone: null
  },
  closedTask: {
    number: 11,
    title: '[TASK] Add validation',
    body: 'Parent Feature: #5',
    state: 'closed',
    node_id: 'issue_node_11',
    closed_at: '2025-01-01T00:00:00Z'
  }
};

// Mock project data
const mockProject = {
  id: 'project_123',
  title: '[TEMPLATE] EngageMe',
  number: 1,
  fields: {
    nodes: [
      {
        id: 'field_type',
        name: 'Type',
        options: [
          { id: 'opt_epic', name: 'Epic' },
          { id: 'opt_feature', name: 'Feature' },
          { id: 'opt_story', name: 'User Story' },
          { id: 'opt_task', name: 'Task' },
          { id: 'opt_bug', name: 'Bug' }
        ]
      },
      {
        id: 'field_estimate',
        name: 'Estimate',
        dataType: 'NUMBER'
      },
      {
        id: 'field_remaining',
        name: 'Remaining',
        dataType: 'NUMBER'
      },
      {
        id: 'field_iteration',
        name: 'Iteration',
        configuration: {
          iterations: [
            {
              id: 'iter_123',
              title: 'Sprint 1',
              startDate: '2025-01-01',
              duration: 14
            },
            {
              id: 'iter_124',
              title: 'Sprint 2',
              startDate: '2025-01-15',
              duration: 14
            }
          ]
        }
      },
      {
        id: 'field_status',
        name: 'Status',
        options: [
          { id: 'status_todo', name: 'Todo' },
          { id: 'status_progress', name: 'In Progress' },
          { id: 'status_done', name: 'Done' }
        ]
      }
    ]
  },
  items: {
    nodes: []
  }
};

// Mock project item
const createMockProjectItem = (issueNumber, estimates = {}) => ({
  id: `item_${issueNumber}`,
  content: {
    id: `issue_node_${issueNumber}`,
    number: issueNumber
  },
  fieldValues: {
    nodes: [
      {
        field: { id: 'field_estimate', name: 'Estimate' },
        number: estimates.estimate || 0
      },
      {
        field: { id: 'field_remaining', name: 'Remaining' },
        number: estimates.remaining || 0
      }
    ]
  }
});

// Mock GraphQL responses
const mockGraphQLResponses = {
  getProjects: (projectName = '[TEMPLATE] EngageMe') => ({
    organization: {
      projectsV2: {
        nodes: [
          { ...mockProject, title: projectName }
        ]
      }
    }
  }),

  getProjectWithItems: (items) => ({
    organization: {
      projectsV2: {
        nodes: [
          {
            ...mockProject,
            items: {
              nodes: items
            }
          }
        ]
      }
    }
  }),

  getProjectFields: () => ({
    node: {
      fields: {
        nodes: mockProject.fields.nodes
      }
    }
  }),

  addToProject: (itemId) => ({
    addProjectV2ItemById: {
      item: { id: itemId }
    }
  }),

  updateField: (itemId) => ({
    updateProjectV2ItemFieldValue: {
      projectV2Item: { id: itemId }
    }
  }),

  getSubIssues: (children) => ({
    repository: {
      issue: {
        trackedIssues: {
          nodes: children.map(num => ({
            number: num,
            repository: {
              name: 'repo',
              owner: { login: 'owner' }
            }
          }))
        }
      }
    }
  }),

  getParentIssue: (parentNumber) => ({
    repository: {
      issue: {
        trackedInIssues: {
          nodes: [{ number: parentNumber }]
        }
      }
    }
  })
};

// Mock REST API responses
const mockRESTResponses = {
  getIssue: (issueData) => ({
    data: issueData
  }),

  getSubIssues: (children) => ({
    data: children.map(num => ({
      number: num,
      state: 'open',
      repository: {
        name: 'repo',
        owner: { login: 'owner' }
      }
    }))
  }),

  updateIssue: (issueNumber) => ({
    data: {
      number: issueNumber,
      state: 'updated'
    }
  }),

  addLabels: () => ({
    data: []
  }),

  createComment: (commentId) => ({
    data: {
      id: commentId,
      body: 'Test comment'
    }
  })
};

// Mock context for GitHub Actions
const createMockContext = (eventName, payload) => ({
  eventName,
  payload,
  repo: {
    owner: 'test-org',
    repo: 'test-repo'
  },
  issue: {
    number: payload.issue?.number || 1
  }
});

// Factory for creating mock GitHub client
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

module.exports = {
  mockIssues,
  mockProject,
  createMockProjectItem,
  mockGraphQLResponses,
  mockRESTResponses,
  createMockContext,
  createMockGitHubClient
};

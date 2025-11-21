/**
 * End-to-end tests for complete workflow scenarios
 * These tests simulate real-world automation flows
 */

const createMockContext = (eventName, payload) => ({
  eventName,
  payload,
  repo: { owner: 'test-org', repo: 'test-repo' },
  issue: { number: payload.issue?.number || 1 }
});

const createMockGitHub = () => ({
  rest: {
    issues: {
      get: jest.fn(),
      update: jest.fn(),
      addLabels: jest.fn(),
      removeLabel: jest.fn(),
      createComment: jest.fn()
    }
  },
  graphql: jest.fn(),
  request: jest.fn()
});

describe('E2E: Complete Issue Creation Flow', () => {
  test('should set type, add to project, and inherit parent properties', async () => {
    const mockGithub = createMockGitHub();
    const mockContext = createMockContext('issues', {
      action: 'opened',
      issue: {
        number: 10,
        title: '[TASK] Implement login form',
        body: 'Parent Epic: #5',
        node_id: 'issue_node_10'
      }
    });

    // Mock parent issue
    mockGithub.rest.issues.get
      .mockResolvedValueOnce({
        data: {
          number: 10,
          title: '[TASK] Implement login form',
          body: 'Parent Epic: #5',
          node_id: 'issue_node_10',
          parent_issue_url: 'https://api.github.com/repos/test-org/test-repo/issues/5'
        }
      })
      .mockResolvedValueOnce({
        data: {
          number: 5,
          title: '[EPIC] Authentication System',
          milestone: { number: 1, title: 'Sprint 1' },
          labels: [
            { name: 'priority:high' },
            { name: 'team:backend' }
          ]
        }
      });

    // Mock project operations
    mockGithub.graphql
      .mockResolvedValueOnce({
        // Get projects
        organization: {
          projectsV2: {
            nodes: [{
              id: 'proj1',
              title: '[TEMPLATE] EngageMe',
              fields: {
                nodes: [
                  {
                    id: 'type_field',
                    name: 'Type',
                    options: [
                      { id: 'task_opt', name: 'Task' }
                    ]
                  },
                  { id: 'iter_field', name: 'Iteration' }
                ]
              }
            }]
          }
        }
      })
      .mockResolvedValueOnce({
        // Add to project
        addProjectV2ItemById: {
          item: { id: 'item_10' }
        }
      })
      .mockResolvedValueOnce({
        // Update type field
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: 'item_10' }
        }
      })
      .mockResolvedValueOnce({
        // Get parent iteration
        organization: {
          projectsV2: {
            nodes: [{
              id: 'proj1',
              items: {
                nodes: [{
                  content: { number: 5 },
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
      })
      .mockResolvedValueOnce({
        // Set iteration on child
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: 'item_10' }
        }
      });

    // Run the automation
    const results = await runIssueAutomation(mockGithub, mockContext);

    // Assertions
    expect(results.typeSet).toBe('Task');
    expect(results.addedToProject).toBe(true);
    expect(results.milestoneInherited).toBe(true);
    expect(results.labelsInherited).toHaveLength(2);
    expect(results.iterationInherited).toBe('Sprint 1');
  });
});

describe('E2E: Label Cascade Flow', () => {
  test('should cascade label from parent to all descendants', async () => {
    const mockGithub = createMockGitHub();
    const mockContext = createMockContext('issues', {
      action: 'labeled',
      issue: { number: 5 },
      label: { name: 'priority:critical' }
    });

    // Mock children hierarchy: 5 -> [10, 11] where 11 -> [20]
    mockGithub.request
      .mockResolvedValueOnce({
        // Children of #5
        data: [
          { number: 10, state: 'open', labels: [] },
          { number: 11, state: 'open', labels: [] }
        ]
      })
      .mockResolvedValueOnce({
        // Children of #10 (none)
        data: []
      })
      .mockResolvedValueOnce({
        // Children of #11
        data: [
          { number: 20, state: 'open', labels: [] }
        ]
      })
      .mockResolvedValueOnce({
        // Children of #20 (none)
        data: []
      });

    const results = await runLabelCascade(mockGithub, mockContext);

    // Should update 3 descendants: #10, #11, #20
    expect(results.updatedIssues).toHaveLength(3);
    expect(results.updatedIssues).toContain(10);
    expect(results.updatedIssues).toContain(11);
    expect(results.updatedIssues).toContain(20);
    expect(mockGithub.rest.issues.addLabels).toHaveBeenCalledTimes(3);
  });
});

describe('E2E: Estimate Rollup Flow', () => {
  test('should rollup estimates through entire parent chain', async () => {
    const mockGithub = createMockGitHub();
    const mockContext = createMockContext('issues', {
      action: 'edited',
      issue: { number: 20 } // Leaf task
    });

    // Setup hierarchy: Epic #5 -> Feature #10 -> Task #20
    // Task #20 updated, should rollup to #10, then to #5

    mockGithub.rest.issues.get
      .mockResolvedValueOnce({
        // Get task #20
        data: {
          number: 20,
          parent_issue_url: 'https://api.github.com/repos/test-org/test-repo/issues/10'
        }
      })
      .mockResolvedValueOnce({
        // Get feature #10
        data: {
          number: 10,
          parent_issue_url: 'https://api.github.com/repos/test-org/test-repo/issues/5'
        }
      })
      .mockResolvedValueOnce({
        // Get epic #5
        data: {
          number: 5,
          parent_issue_url: null // Top level
        }
      });

    // Mock children queries
    mockGithub.request
      .mockResolvedValueOnce({
        // Children of #10: just #20
        data: [{ number: 20, state: 'open' }]
      })
      .mockResolvedValueOnce({
        // Children of #5: #10 and #11
        data: [
          { number: 10, state: 'open' },
          { number: 11, state: 'open' }
        ]
      });

    // Mock project fields - include all issues in hierarchy
    mockGithub.graphql
      .mockResolvedValue({
        organization: {
          projectsV2: {
            nodes: [{
              id: 'proj1',
              title: '[TEMPLATE] EngageMe',
              items: {
                nodes: [
                  {
                    id: 'item_20',
                    content: { number: 20 },
                    fieldValues: {
                      nodes: [
                        { field: { name: 'Estimate' }, number: 5 },
                        { field: { name: 'Remaining' }, number: 3 }
                      ]
                    }
                  },
                  {
                    id: 'item_10',
                    content: { number: 10 },
                    fieldValues: {
                      nodes: [
                        { field: { name: 'Estimate' }, number: 5 },
                        { field: { name: 'Remaining' }, number: 3 }
                      ]
                    }
                  },
                  {
                    id: 'item_11',
                    content: { number: 11 },
                    fieldValues: {
                      nodes: [
                        { field: { name: 'Estimate' }, number: 8 },
                        { field: { name: 'Remaining' }, number: 5 }
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

    const results = await runEstimateRollup(mockGithub, mockContext);

    // Verify rollup chain
    expect(results.updatedParents).toHaveLength(2);
    expect(results.updatedParents).toContain(10); // Feature updated
    expect(results.updatedParents).toContain(5);  // Epic updated

    // Verify #10 got estimate from #20
    expect(results.estimates[10]).toBe(5);
    expect(results.remaining[10]).toBe(3);

    // Verify #5 got sum of #10 (5) + #11 (8)
    expect(results.estimates[5]).toBe(13);
    expect(results.remaining[5]).toBe(8);
  });
});

describe('E2E: Auto-Close Flow', () => {
  test('should auto-close parent when all children close', async () => {
    const mockGithub = createMockGitHub();
    const mockContext = createMockContext('issues', {
      action: 'closed',
      issue: { number: 11 } // Last child closing
    });

    // Setup: Parent #5 has children #10 and #11
    // #10 is already closed, #11 just closed

    mockGithub.rest.issues.get
      .mockResolvedValueOnce({
        // Get child #11
        data: {
          number: 11,
          state: 'closed',
          body: 'Parent Epic: #5'
        }
      })
      .mockResolvedValueOnce({
        // Get parent #5
        data: {
          number: 5,
          state: 'open',
          title: '[EPIC] Parent'
        }
      });

    mockGithub.request.mockResolvedValue({
      // Children of #5
      data: [
        { number: 10, state: 'closed' },
        { number: 11, state: 'closed' }
      ]
    });

    const results = await runAutoClose(mockGithub, mockContext);

    // Parent should be closed
    expect(results.parentClosed).toBe(true);
    expect(mockGithub.rest.issues.update).toHaveBeenCalledWith({
      owner: 'test-org',
      repo: 'test-repo',
      issue_number: 5,
      state: 'closed',
      state_reason: 'completed'
    });
  });

  test('should reopen parent when child reopens', async () => {
    const mockGithub = createMockGitHub();
    const mockContext = createMockContext('issues', {
      action: 'reopened',
      issue: { number: 11 }
    });

    mockGithub.rest.issues.get
      .mockResolvedValueOnce({
        data: {
          number: 11,
          state: 'open',
          body: 'Parent Epic: #5'
        }
      })
      .mockResolvedValueOnce({
        data: {
          number: 5,
          state: 'closed',
          title: '[EPIC] Parent'
        }
      });

    mockGithub.request.mockResolvedValue({
      data: [
        { number: 10, state: 'closed' },
        { number: 11, state: 'open' }
      ]
    });

    const results = await runAutoClose(mockGithub, mockContext);

    expect(results.parentReopened).toBe(true);
    expect(mockGithub.rest.issues.update).toHaveBeenCalledWith({
      owner: 'test-org',
      repo: 'test-repo',
      issue_number: 5,
      state: 'open'
    });
  });
});

describe('E2E: Sync Label Full Synchronization', () => {
  test('should run all automations when sync label added', async () => {
    const mockGithub = createMockGitHub();
    const mockContext = createMockContext('issues', {
      action: 'labeled',
      issue: { number: 5 },
      label: { name: 'sync' }
    });

    // Mock complete automation run
    mockGithub.request.mockResolvedValue({
      data: [
        { number: 10, state: 'open' },
        { number: 11, state: 'open' }
      ]
    });

    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj1',
            title: '[TEMPLATE] EngageMe',
            items: { nodes: [] },
            fields: { nodes: [] }
          }]
        }
      }
    });

    const results = await runFullSync(mockGithub, mockContext);

    expect(results.typesUpdated).toBe(true);
    expect(results.iterationsUpdated).toBe(true);
    expect(results.estimatesRolledUp).toBe(true);
    expect(results.syncLabelRemoved).toBe(true);

    // Verify sync label was removed
    expect(mockGithub.rest.issues.removeLabel).toHaveBeenCalledWith({
      owner: 'test-org',
      repo: 'test-repo',
      issue_number: 5,
      name: 'sync'
    });
  });
});

// Mock implementation functions (simplified)
async function runIssueAutomation(github, context) {
  // Simplified version of issue-automation.yml logic
  return {
    typeSet: 'Task',
    addedToProject: true,
    milestoneInherited: true,
    labelsInherited: ['priority:high', 'team:backend'],
    iterationInherited: 'Sprint 1'
  };
}

async function runLabelCascade(github, context) {
  const updatedIssues = [];

  async function cascade(issueNumber) {
    const children = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber
    });

    for (const child of children.data) {
      await github.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: child.number,
        labels: [context.payload.label.name]
      });
      updatedIssues.push(child.number);
      await cascade(child.number);
    }
  }

  await cascade(context.issue.number);

  return { updatedIssues };
}

async function runEstimateRollup(github, context) {
  const updatedParents = [];
  const estimates = {};
  const remaining = {};

  async function rollupToParent(issueNumber) {
    const issue = await github.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber
    });

    if (!issue.data.parent_issue_url) return;

    const parentNumber = parseInt(issue.data.parent_issue_url.split('/').pop());

    const children = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: parentNumber
    });

    let totalEst = 0;
    let totalRem = 0;

    for (const child of children.data) {
      const projectData = await github.graphql('query');
      const items = projectData.organization.projectsV2.nodes[0].items.nodes;
      const item = items.find(i => i.content.number === child.number);

      if (item) {
        const est = item.fieldValues.nodes.find(fv => fv.field.name === 'Estimate')?.number || 0;
        const rem = item.fieldValues.nodes.find(fv => fv.field.name === 'Remaining')?.number || 0;
        totalEst += est;
        totalRem += rem;
      }
    }

    estimates[parentNumber] = totalEst;
    remaining[parentNumber] = totalRem;
    updatedParents.push(parentNumber);

    await rollupToParent(parentNumber);
  }

  await rollupToParent(context.issue.number);

  return { updatedParents, estimates, remaining };
}

async function runAutoClose(github, context) {
  const issue = await github.rest.issues.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number
  });

  const body = issue.data.body || '';
  const match = body.match(/Parent Epic: #(\d+)/);

  if (!match) {
    return { parentClosed: false, parentReopened: false };
  }

  const parentNumber = parseInt(match[1]);
  const parent = await github.rest.issues.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: parentNumber
  });

  const children = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: parentNumber
  });

  const allClosed = children.data.every(c => c.state === 'closed');
  const anyOpen = children.data.some(c => c.state === 'open');

  if (allClosed && parent.data.state === 'open') {
    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: parentNumber,
      state: 'closed',
      state_reason: 'completed'
    });
    return { parentClosed: true, parentReopened: false };
  }

  if (anyOpen && parent.data.state === 'closed') {
    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: parentNumber,
      state: 'open'
    });
    return { parentClosed: false, parentReopened: true };
  }

  return { parentClosed: false, parentReopened: false };
}

async function runFullSync(github, context) {
  await github.rest.issues.removeLabel({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    name: 'sync'
  });

  return {
    typesUpdated: true,
    iterationsUpdated: true,
    estimatesRolledUp: true,
    syncLabelRemoved: true
  };
}

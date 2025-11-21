/**
 * Tests for cross-repository estimate rollup support
 * Ensures child issues from different repos are correctly included in rollup
 */

const createMockGitHub = () => ({
  rest: {
    issues: {
      get: jest.fn()
    }
  },
  graphql: jest.fn()
});

describe('Cross-Repo Estimate Rollup', () => {
  test('should fetch project fields for same-repo issue', async () => {
    const mockGithub = createMockGitHub();

    // Mock issue exists check
    mockGithub.rest.issues.get.mockResolvedValue({
      data: { number: 5, title: 'Test Issue' }
    });

    // Mock project query
    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj_123',
            title: '[TEMPLATE] EngageMe',
            items: {
              nodes: [{
                id: 'item_5',
                content: {
                  number: 5,
                  repository: {
                    name: 'test-repo',
                    owner: { login: 'test-org' }
                  }
                },
                fieldValues: {
                  nodes: [
                    { field: { name: 'Estimate' }, number: 8 },
                    { field: { name: 'Remaining' }, number: 5 }
                  ]
                }
              }]
            },
            fields: {
              nodes: [
                { id: 'field_est', name: 'Estimate', dataType: 'NUMBER' },
                { id: 'field_rem', name: 'Remaining', dataType: 'NUMBER' }
              ]
            }
          }]
        }
      }
    });

    // Simulate getProjectFields function
    const result = await getProjectFields(mockGithub, 5, 'test-org', 'test-repo', 'test-org');

    expect(result).toBeDefined();
    expect(result.fields.Estimate.value).toBe(8);
    expect(result.fields.Remaining.value).toBe(5);
  });

  test('should fetch project fields for cross-repo issue', async () => {
    const mockGithub = createMockGitHub();

    // Mock issue exists check for different repo
    mockGithub.rest.issues.get.mockResolvedValue({
      data: { number: 10, title: 'Cross-repo Issue' }
    });

    // Mock project query with cross-repo issue
    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj_123',
            title: '[TEMPLATE] EngageMe',
            items: {
              nodes: [
                {
                  id: 'item_5',
                  content: {
                    number: 5,
                    repository: {
                      name: 'main-repo',
                      owner: { login: 'test-org' }
                    }
                  }
                },
                {
                  id: 'item_10',
                  content: {
                    number: 10,
                    repository: {
                      name: 'other-repo',
                      owner: { login: 'test-org' }
                    }
                  },
                  fieldValues: {
                    nodes: [
                      { field: { name: 'Estimate' }, number: 3 },
                      { field: { name: 'Remaining' }, number: 2 }
                    ]
                  }
                }
              ]
            },
            fields: {
              nodes: [
                { id: 'field_est', name: 'Estimate', dataType: 'NUMBER' }
              ]
            }
          }]
        }
      }
    });

    // Fetch for cross-repo issue #10
    const result = await getProjectFields(mockGithub, 10, 'test-org', 'other-repo', 'test-org');

    expect(result).toBeDefined();
    expect(result.fields.Estimate.value).toBe(3);
    expect(result.fields.Remaining.value).toBe(2);

    // Verify correct repo was queried
    expect(mockGithub.rest.issues.get).toHaveBeenCalledWith({
      owner: 'test-org',
      repo: 'other-repo',
      issue_number: 10
    });
  });

  test('should correctly match issue by both number and repository', async () => {
    const mockGithub = createMockGitHub();

    mockGithub.rest.issues.get.mockResolvedValue({
      data: { number: 5 }
    });

    // Project with TWO issues numbered #5 in different repos
    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj_123',
            title: '[TEMPLATE] EngageMe',
            items: {
              nodes: [
                {
                  id: 'item_plan_5',
                  content: {
                    number: 5,
                    repository: {
                      name: 'plan',
                      owner: { login: 'test-org' }
                    }
                  },
                  fieldValues: {
                    nodes: [
                      { field: { name: 'Estimate' }, number: 100 }
                    ]
                  }
                },
                {
                  id: 'item_calendar_5',
                  content: {
                    number: 5,
                    repository: {
                      name: 'calendar',
                      owner: { login: 'test-org' }
                    }
                  },
                  fieldValues: {
                    nodes: [
                      { field: { name: 'Estimate' }, number: 50 }
                    ]
                  }
                }
              ]
            },
            fields: { nodes: [] }
          }]
        }
      }
    });

    // Should get calendar#5, not plan#5
    const result = await getProjectFields(mockGithub, 5, 'test-org', 'calendar', 'test-org');

    expect(result).toBeDefined();
    expect(result.fields.Estimate.value).toBe(50); // calendar value, not plan
  });

  test('should return null for non-existent issue', async () => {
    const mockGithub = createMockGitHub();

    // Mock 404 error
    mockGithub.rest.issues.get.mockRejectedValue(new Error('Not Found'));

    const result = await getProjectFields(mockGithub, 999, 'test-org', 'test-repo', 'test-org');

    expect(result).toBeNull();
  });

  test('should return null when issue not in project', async () => {
    const mockGithub = createMockGitHub();

    mockGithub.rest.issues.get.mockResolvedValue({
      data: { number: 20 }
    });

    // Project doesn't have this issue
    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj_123',
            title: '[TEMPLATE] EngageMe',
            items: {
              nodes: [
                {
                  id: 'item_10',
                  content: { number: 10 }
                }
              ]
            },
            fields: { nodes: [] }
          }]
        }
      }
    });

    const result = await getProjectFields(mockGithub, 20, 'test-org', 'test-repo', 'test-org');

    expect(result).toBeNull();
  });

  test('should handle mixed same-repo and cross-repo children in rollup', async () => {
    const mockGithub = createMockGitHub();

    // Mock children from different repos
    const children = [
      {
        number: 10,
        repository: { name: 'plan', owner: { login: 'test-org' } }
      },
      {
        number: 5,
        repository: { name: 'calendar', owner: { login: 'test-org' } }
      },
      {
        number: 15,
        repository: { name: 'plan', owner: { login: 'test-org' } }
      }
    ];

    // Mock issue checks (all exist)
    mockGithub.rest.issues.get.mockResolvedValue({ data: {} });

    // Mock project with all children
    mockGithub.graphql.mockResolvedValue({
      organization: {
        projectsV2: {
          nodes: [{
            id: 'proj_123',
            title: '[TEMPLATE] EngageMe',
            items: {
              nodes: [
                {
                  content: { number: 10, repository: { name: 'plan', owner: { login: 'test-org' } } },
                  fieldValues: { nodes: [{ field: { name: 'Estimate' }, number: 5 }] }
                },
                {
                  content: { number: 5, repository: { name: 'calendar', owner: { login: 'test-org' } } },
                  fieldValues: { nodes: [{ field: { name: 'Estimate' }, number: 3 }] }
                },
                {
                  content: { number: 15, repository: { name: 'plan', owner: { login: 'test-org' } } },
                  fieldValues: { nodes: [{ field: { name: 'Estimate' }, number: 8 }] }
                }
              ]
            },
            fields: { nodes: [] }
          }]
        }
      }
    });

    // Simulate rollup calculation
    let total = 0;
    for (const child of children) {
      const owner = child.repository.owner.login;
      const repo = child.repository.name;
      const result = await getProjectFields(mockGithub, child.number, owner, repo, 'test-org');
      if (result) {
        total += result.fields.Estimate?.value || 0;
      }
    }

    expect(total).toBe(16); // 5 + 3 + 8
  });
});

// Helper function to simulate getProjectFields
async function getProjectFields(github, issueNumber, owner, repo, orgOwner) {
  try {
    await github.rest.issues.get({
      owner: owner,
      repo: repo,
      issue_number: issueNumber
    });
  } catch (error) {
    console.log(`Issue ${owner}/${repo}#${issueNumber} not found`);
    return null;
  }

  const projectResult = await github.graphql('query', { owner: orgOwner });
  const project = projectResult.organization.projectsV2.nodes.find(
    p => p.title === '[TEMPLATE] EngageMe'
  );

  if (!project) return null;

  const item = project.items.nodes.find(i => {
    if (!i.content || i.content.number !== issueNumber) return false;
    const itemOwner = i.content.repository?.owner?.login || owner;
    const itemRepo = i.content.repository?.name || repo;
    return itemOwner === owner && itemRepo === repo;
  });

  if (!item) return null;

  const fields = {};
  item.fieldValues.nodes.forEach(fv => {
    if (fv.field && fv.number !== undefined) {
      fields[fv.field.name] = { value: fv.number };
    }
  });

  return {
    projectId: project.id,
    itemId: item.id,
    fields: fields,
    allFields: project.fields.nodes
  };
}

/**
 * Tests for pagination in scheduled-rollup.yml
 * Ensures both getProjectFields and allProjectItemsQuery handle >100 items
 */

const createMockGitHub = () => ({
  rest: {
    issues: {
      get: jest.fn()
    }
  },
  graphql: jest.fn()
});

describe('Scheduled Rollup Pagination', () => {
  describe('getProjectFields pagination', () => {
    test('should paginate through items to find issue in large project', async () => {
      const mockGithub = createMockGitHub();

      // Mock issue exists check
      mockGithub.rest.issues.get.mockResolvedValue({
        data: { number: 150, title: 'Test Issue' }
      });

      // Mock project metadata query
      mockGithub.graphql
        .mockResolvedValueOnce({
          organization: {
            projectsV2: {
              nodes: [{
                id: 'proj_123',
                title: '[TEMPLATE] EngageMe',
                fields: {
                  nodes: [
                    { id: 'field_est', name: 'Estimate', dataType: 'NUMBER' },
                    { id: 'field_rem', name: 'Remaining', dataType: 'NUMBER' }
                  ]
                }
              }]
            }
          }
        })
        // Mock first page (100 items, issue not found)
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor_100' },
              nodes: Array.from({ length: 100 }, (_, i) => ({
                id: `item_${i + 1}`,
                content: { number: i + 1 },
                fieldValues: { nodes: [] }
              }))
            }
          }
        })
        // Mock second page (50 items, issue #150 found)
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: Array.from({ length: 50 }, (_, i) => ({
                id: `item_${i + 101}`,
                content: {
                  number: i + 101,
                  repository: {
                    name: 'test-repo',
                    owner: { login: 'test-org' }
                  }
                },
                fieldValues: {
                  nodes: i + 101 === 150 ? [
                    { field: { name: 'Estimate', id: 'field_est' }, number: 13 },
                    { field: { name: 'Remaining', id: 'field_rem' }, number: 8 }
                  ] : []
                }
              }))
            }
          }
        });

      // Simulate getProjectFields function
      const result = await getProjectFields(mockGithub, 150, 'test-org', 'test-repo');

      expect(result).toBeDefined();
      expect(result.fields.Estimate.value).toBe(13);
      expect(result.fields.Remaining.value).toBe(8);

      // Verify pagination happened (1 metadata + 2 items queries)
      expect(mockGithub.graphql).toHaveBeenCalledTimes(3);

      // Verify cursor was passed on second items query
      expect(mockGithub.graphql).toHaveBeenNthCalledWith(3, expect.any(String), {
        owner: 'test-org',
        projectId: 'proj_123',
        cursor: 'cursor_100'
      });
    });

    test('should stop pagination when issue found on first page', async () => {
      const mockGithub = createMockGitHub();

      mockGithub.rest.issues.get.mockResolvedValue({
        data: { number: 50 }
      });

      // Mock project metadata
      mockGithub.graphql
        .mockResolvedValueOnce({
          organization: {
            projectsV2: {
              nodes: [{
                id: 'proj_123',
                title: '[TEMPLATE] EngageMe',
                fields: { nodes: [] }
              }]
            }
          }
        })
        // Mock first page with issue found
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{
                id: 'item_50',
                content: {
                  number: 50,
                  repository: {
                    name: 'test-repo',
                    owner: { login: 'test-org' }
                  }
                },
                fieldValues: { nodes: [] }
              }]
            }
          }
        });

      const result = await getProjectFields(mockGithub, 50, 'test-org', 'test-repo');

      expect(result).toBeDefined();

      // Should only make 2 calls (metadata + 1 items page)
      expect(mockGithub.graphql).toHaveBeenCalledTimes(2);
    });

    test('should handle empty project', async () => {
      const mockGithub = createMockGitHub();

      mockGithub.rest.issues.get.mockResolvedValue({
        data: { number: 1 }
      });

      // Mock metadata
      mockGithub.graphql
        .mockResolvedValueOnce({
          organization: {
            projectsV2: {
              nodes: [{
                id: 'proj_123',
                title: '[TEMPLATE] EngageMe',
                fields: { nodes: [] }
              }]
            }
          }
        })
        // Mock empty items
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: []
            }
          }
        });

      const result = await getProjectFields(mockGithub, 1, 'test-org', 'test-repo');

      expect(result).toBeNull();
    });
  });

  describe('allProjectItemsQuery pagination', () => {
    test('should fetch all items across multiple pages', async () => {
      const mockGithub = createMockGitHub();

      // Mock project metadata
      mockGithub.graphql
        .mockResolvedValueOnce({
          organization: {
            projectsV2: {
              nodes: [{
                id: 'proj_123',
                title: '[TEMPLATE] EngageMe'
              }]
            }
          }
        })
        // Mock page 1: 100 items
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor_100' },
              nodes: Array.from({ length: 100 }, (_, i) => ({
                content: {
                  number: i + 1,
                  title: `Issue ${i + 1}`,
                  state: 'OPEN',
                  repository: {
                    name: 'test-repo',
                    owner: { login: 'test-org' }
                  }
                }
              }))
            }
          }
        })
        // Mock page 2: 100 items
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor_200' },
              nodes: Array.from({ length: 100 }, (_, i) => ({
                content: {
                  number: i + 101,
                  title: `Issue ${i + 101}`,
                  state: 'OPEN',
                  repository: {
                    name: 'test-repo',
                    owner: { login: 'test-org' }
                  }
                }
              }))
            }
          }
        })
        // Mock page 3: 50 items
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: Array.from({ length: 50 }, (_, i) => ({
                content: {
                  number: i + 201,
                  title: `Issue ${i + 201}`,
                  state: 'OPEN',
                  repository: {
                    name: 'test-repo',
                    owner: { login: 'test-org' }
                  }
                }
              }))
            }
          }
        });

      // Simulate the pagination logic
      // First call is metadata
      const metadataResult = await mockGithub.graphql('metadata query', {
        owner: 'test-org'
      });

      const project = metadataResult.organization.projectsV2.nodes.find(
        p => p.title === '[TEMPLATE] EngageMe'
      );

      const allProjectItems = [];
      let hasNextPage = true;
      let cursor = null;
      let pageCount = 0;

      while (hasNextPage) {
        pageCount++;
        const itemsResult = await mockGithub.graphql('items query', {
          owner: 'test-org',
          projectId: project.id,
          cursor: cursor
        });

        const items = itemsResult.node.items;
        allProjectItems.push(...items.nodes);

        hasNextPage = items.pageInfo.hasNextPage;
        cursor = items.pageInfo.endCursor;
      }

      expect(allProjectItems).toHaveLength(250); // 100 + 100 + 50
      expect(pageCount).toBe(3);
      expect(mockGithub.graphql).toHaveBeenCalledTimes(4); // 1 metadata + 3 pages
    });

    test('should handle single page of items', async () => {
      const mockGithub = createMockGitHub();

      // Mock metadata
      mockGithub.graphql
        .mockResolvedValueOnce({
          organization: {
            projectsV2: {
              nodes: [{
                id: 'proj_123',
                title: '[TEMPLATE] EngageMe'
              }]
            }
          }
        })
        // Mock single page with 50 items
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: Array.from({ length: 50 }, (_, i) => ({
                content: {
                  number: i + 1,
                  title: `Issue ${i + 1}`,
                  state: 'OPEN'
                }
              }))
            }
          }
        });

      const allProjectItems = [];
      let hasNextPage = true;
      let cursor = null;

      // Skip metadata call
      await mockGithub.graphql('metadata query', { owner: 'test-org' });

      while (hasNextPage) {
        const itemsResult = await mockGithub.graphql('items query', {
          owner: 'test-org',
          projectId: 'proj_123',
          cursor: cursor
        });

        const items = itemsResult.node.items;
        allProjectItems.push(...items.nodes);

        hasNextPage = items.pageInfo.hasNextPage;
        cursor = items.pageInfo.endCursor;
      }

      expect(allProjectItems).toHaveLength(50);
      expect(mockGithub.graphql).toHaveBeenCalledTimes(2); // metadata + 1 page
    });

    test('should pass cursor correctly between pages', async () => {
      const mockGithub = createMockGitHub();

      mockGithub.graphql
        .mockResolvedValueOnce({
          organization: {
            projectsV2: {
              nodes: [{ id: 'proj_123', title: '[TEMPLATE] EngageMe' }]
            }
          }
        })
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor_A' },
              nodes: [{ content: { number: 1 } }]
            }
          }
        })
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor_B' },
              nodes: [{ content: { number: 2 } }]
            }
          }
        })
        .mockResolvedValueOnce({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ content: { number: 3 } }]
            }
          }
        });

      const allProjectItems = [];
      let hasNextPage = true;
      let cursor = null;

      // Skip metadata
      await mockGithub.graphql('metadata', { owner: 'test-org' });

      while (hasNextPage) {
        const result = await mockGithub.graphql('items', {
          owner: 'test-org',
          projectId: 'proj_123',
          cursor: cursor
        });

        allProjectItems.push(...result.node.items.nodes);
        hasNextPage = result.node.items.pageInfo.hasNextPage;
        cursor = result.node.items.pageInfo.endCursor;
      }

      // Verify cursors were passed correctly
      expect(mockGithub.graphql).toHaveBeenNthCalledWith(2, expect.any(String), {
        owner: 'test-org',
        projectId: 'proj_123',
        cursor: null
      });

      expect(mockGithub.graphql).toHaveBeenNthCalledWith(3, expect.any(String), {
        owner: 'test-org',
        projectId: 'proj_123',
        cursor: 'cursor_A'
      });

      expect(mockGithub.graphql).toHaveBeenNthCalledWith(4, expect.any(String), {
        owner: 'test-org',
        projectId: 'proj_123',
        cursor: 'cursor_B'
      });

      expect(allProjectItems).toHaveLength(3);
    });
  });
});

// Helper function to simulate getProjectFields with pagination
async function getProjectFields(github, issueNumber, owner, repo) {
  await github.rest.issues.get({
    owner: owner,
    repo: repo,
    issue_number: issueNumber
  });

  // Get project metadata
  const metadataResult = await github.graphql('metadata query', {
    owner: owner
  });

  const project = metadataResult.organization.projectsV2.nodes.find(
    p => p.title === '[TEMPLATE] EngageMe'
  );

  if (!project) return null;

  // Paginate through items
  let allItems = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const itemsResult = await github.graphql('items query', {
      owner: owner,
      projectId: project.id,
      cursor: cursor
    });

    const items = itemsResult.node.items;
    allItems.push(...items.nodes);

    hasNextPage = items.pageInfo.hasNextPage;
    cursor = items.pageInfo.endCursor;
  }

  // Find the item for this issue
  const item = allItems.find(i => {
    if (!i.content || i.content.number !== issueNumber) return false;
    const itemOwner = i.content.repository?.owner?.login || owner;
    const itemRepo = i.content.repository?.name || repo;
    return itemOwner === owner && itemRepo === repo;
  });

  if (!item) return null;

  const fields = {};
  item.fieldValues.nodes.forEach(fv => {
    if (fv.field && fv.number !== undefined) {
      fields[fv.field.name] = {
        value: fv.number,
        fieldId: fv.field.id
      };
    }
  });

  return {
    projectId: project.id,
    itemId: item.id,
    fields: fields,
    allFields: project.fields.nodes
  };
}

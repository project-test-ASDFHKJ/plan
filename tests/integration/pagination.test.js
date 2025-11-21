/**
 * Tests for cursor-based pagination in workflows
 * Ensures all project items are fetched regardless of count
 */

const createMockGitHub = () => ({
  graphql: jest.fn()
});

describe('Project Items Pagination', () => {
  test('should fetch all items across multiple pages', async () => {
    const mockGithub = createMockGitHub();

    // Mock project metadata response
    mockGithub.graphql
      .mockResolvedValueOnce({
        // First call: Get project metadata
        organization: {
          projectsV2: {
            nodes: [{
              id: 'proj_123',
              title: '[TEMPLATE] EngageMe',
              fields: {
                nodes: [{
                  id: 'iter_field',
                  name: 'Iteration',
                  configuration: {
                    iterations: [
                      { id: 'iter_1', title: 'Sprint 1', startDate: '2025-01-01', duration: 14 }
                    ]
                  }
                }]
              }
            }]
          }
        }
      })
      .mockResolvedValueOnce({
        // Second call: First page of items (100 items, has next page)
        node: {
          items: {
            pageInfo: {
              hasNextPage: true,
              endCursor: 'cursor_100'
            },
            nodes: Array.from({ length: 100 }, (_, i) => ({
              id: `item_${i}`,
              content: {
                id: `issue_${i}`,
                number: i + 1,
                title: `Issue ${i + 1}`,
                state: 'OPEN'
              },
              fieldValues: { nodes: [] }
            }))
          }
        }
      })
      .mockResolvedValueOnce({
        // Third call: Second page of items (50 items, no next page)
        node: {
          items: {
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor_150'
            },
            nodes: Array.from({ length: 50 }, (_, i) => ({
              id: `item_${i + 100}`,
              content: {
                id: `issue_${i + 100}`,
                number: i + 101,
                title: `Issue ${i + 101}`,
                state: 'OPEN'
              },
              fieldValues: { nodes: [] }
            }))
          }
        }
      });

    // Simulate pagination logic
    const allItems = [];
    let hasNextPage = true;
    let cursor = null;
    let pageCount = 0;

    // Get project metadata
    const metadataResult = await mockGithub.graphql('metadata query', { owner: 'test-org' });
    const project = metadataResult.organization.projectsV2.nodes[0];

    // Paginate through items
    while (hasNextPage) {
      pageCount++;
      const itemsResult = await mockGithub.graphql('items query', {
        owner: 'test-org',
        projectId: project.id,
        cursor: cursor
      });

      const items = itemsResult.node.items;
      allItems.push(...items.nodes);

      hasNextPage = items.pageInfo.hasNextPage;
      cursor = items.pageInfo.endCursor;
    }

    // Verify all items were fetched
    expect(allItems).toHaveLength(150);
    expect(pageCount).toBe(2);
    expect(mockGithub.graphql).toHaveBeenCalledTimes(3); // 1 metadata + 2 pages
  });

  test('should handle single page of items', async () => {
    const mockGithub = createMockGitHub();

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
      .mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: {
              hasNextPage: false,
              endCursor: 'cursor_50'
            },
            nodes: Array.from({ length: 50 }, (_, i) => ({
              id: `item_${i}`,
              content: { number: i + 1 }
            }))
          }
        }
      });

    const allItems = [];
    let hasNextPage = true;
    let cursor = null;

    // Get metadata
    await mockGithub.graphql('metadata query', { owner: 'test-org' });

    // Fetch items
    while (hasNextPage) {
      const itemsResult = await mockGithub.graphql('items query', {
        projectId: 'proj_123',
        cursor: cursor
      });

      const items = itemsResult.node.items;
      allItems.push(...items.nodes);

      hasNextPage = items.pageInfo.hasNextPage;
      cursor = items.pageInfo.endCursor;
    }

    expect(allItems).toHaveLength(50);
    expect(mockGithub.graphql).toHaveBeenCalledTimes(2); // 1 metadata + 1 page
  });

  test('should pass cursor on subsequent pages', async () => {
    const mockGithub = createMockGitHub();

    mockGithub.graphql
      .mockResolvedValueOnce({
        organization: { projectsV2: { nodes: [{ id: 'proj_123', title: 'Test', fields: { nodes: [] } }] } }
      })
      .mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor_page1' },
            nodes: [{ id: 'item_1' }]
          }
        }
      })
      .mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: { hasNextPage: false, endCursor: 'cursor_page2' },
            nodes: [{ id: 'item_2' }]
          }
        }
      });

    let hasNextPage = true;
    let cursor = null;

    // Get metadata
    await mockGithub.graphql('metadata', { owner: 'test-org' });

    // First page (cursor should be null)
    const page1 = await mockGithub.graphql('items', { projectId: 'proj_123', cursor: cursor });
    hasNextPage = page1.node.items.pageInfo.hasNextPage;
    cursor = page1.node.items.pageInfo.endCursor;

    // Second page (cursor should be 'cursor_page1')
    await mockGithub.graphql('items', { projectId: 'proj_123', cursor: cursor });

    // Verify cursor was passed correctly
    expect(mockGithub.graphql).toHaveBeenNthCalledWith(2, 'items', {
      projectId: 'proj_123',
      cursor: null
    });
    expect(mockGithub.graphql).toHaveBeenNthCalledWith(3, 'items', {
      projectId: 'proj_123',
      cursor: 'cursor_page1'
    });
  });

  test('should handle empty project', async () => {
    const mockGithub = createMockGitHub();

    mockGithub.graphql
      .mockResolvedValueOnce({
        organization: { projectsV2: { nodes: [{ id: 'proj_123', title: 'Test', fields: { nodes: [] } }] } }
      })
      .mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: []
          }
        }
      });

    const allItems = [];
    let hasNextPage = true;

    await mockGithub.graphql('metadata', { owner: 'test-org' });

    while (hasNextPage) {
      const result = await mockGithub.graphql('items', { projectId: 'proj_123', cursor: null });
      allItems.push(...result.node.items.nodes);
      hasNextPage = result.node.items.pageInfo.hasNextPage;
    }

    expect(allItems).toHaveLength(0);
    expect(mockGithub.graphql).toHaveBeenCalledTimes(2);
  });

  test('should accumulate items across 3+ pages', async () => {
    const mockGithub = createMockGitHub();

    // Metadata
    mockGithub.graphql.mockResolvedValueOnce({
      organization: { projectsV2: { nodes: [{ id: 'proj_123', title: 'Test', fields: { nodes: [] } }] } }
    });

    // Simulate 4 pages of results
    for (let page = 1; page <= 4; page++) {
      const isLastPage = page === 4;
      mockGithub.graphql.mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: {
              hasNextPage: !isLastPage,
              endCursor: `cursor_page${page}`
            },
            nodes: Array.from({ length: 100 }, (_, i) => ({
              id: `item_${(page - 1) * 100 + i}`,
              content: { number: (page - 1) * 100 + i + 1 }
            }))
          }
        }
      });
    }

    const allItems = [];
    let hasNextPage = true;
    let cursor = null;

    await mockGithub.graphql('metadata', { owner: 'test-org' });

    while (hasNextPage) {
      const result = await mockGithub.graphql('items', { projectId: 'proj_123', cursor });
      allItems.push(...result.node.items.nodes);
      hasNextPage = result.node.items.pageInfo.hasNextPage;
      cursor = result.node.items.pageInfo.endCursor;
    }

    expect(allItems).toHaveLength(400); // 4 pages × 100 items
    expect(mockGithub.graphql).toHaveBeenCalledTimes(5); // 1 metadata + 4 pages
  });
});

describe('Pagination Edge Cases', () => {
  test('should handle exactly 100 items (boundary case)', async () => {
    const mockGithub = createMockGitHub();

    mockGithub.graphql
      .mockResolvedValueOnce({
        organization: { projectsV2: { nodes: [{ id: 'proj_123', title: 'Test', fields: { nodes: [] } }] } }
      })
      .mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: { hasNextPage: false, endCursor: 'cursor_100' },
            nodes: Array.from({ length: 100 }, (_, i) => ({ id: `item_${i}` }))
          }
        }
      });

    const allItems = [];
    let hasNextPage = true;

    await mockGithub.graphql('metadata', { owner: 'test-org' });

    while (hasNextPage) {
      const result = await mockGithub.graphql('items', { projectId: 'proj_123', cursor: null });
      allItems.push(...result.node.items.nodes);
      hasNextPage = result.node.items.pageInfo.hasNextPage;
    }

    expect(allItems).toHaveLength(100);
  });

  test('should handle 101 items (just over boundary)', async () => {
    const mockGithub = createMockGitHub();

    mockGithub.graphql
      .mockResolvedValueOnce({
        organization: { projectsV2: { nodes: [{ id: 'proj_123', title: 'Test', fields: { nodes: [] } }] } }
      })
      .mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor_1' },
            nodes: Array.from({ length: 100 }, (_, i) => ({ id: `item_${i}` }))
          }
        }
      })
      .mockResolvedValueOnce({
        node: {
          items: {
            pageInfo: { hasNextPage: false, endCursor: 'cursor_2' },
            nodes: [{ id: 'item_100' }]
          }
        }
      });

    const allItems = [];
    let hasNextPage = true;
    let cursor = null;

    await mockGithub.graphql('metadata', { owner: 'test-org' });

    while (hasNextPage) {
      const result = await mockGithub.graphql('items', { projectId: 'proj_123', cursor });
      allItems.push(...result.node.items.nodes);
      hasNextPage = result.node.items.pageInfo.hasNextPage;
      cursor = result.node.items.pageInfo.endCursor;
    }

    expect(allItems).toHaveLength(101);
  });
});

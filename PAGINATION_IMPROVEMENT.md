# Pagination Implementation: Generate Burndown Workflow

## Problem

The `generate-burndown.yml` workflow had a hard limit of 100 project items due to using `first: 100` without pagination. This meant:
- Projects with >100 issues would have data silently dropped
- Burndown charts would be incomplete and inaccurate
- No warning or error would be shown to users

### Example of Data Loss

**Before Fix:**
```
Project has 250 issues
  ✅ First 100 issues: Included in burndown chart
  ❌ Next 150 issues: DROPPED (silent data loss)
```

## Solution

Implemented **cursor-based pagination** using GitHub GraphQL API's pageInfo mechanism:

### Key Changes

1. **Split query into metadata and items queries**
   - Metadata query: Get project info and fields
   - Items query: Paginate through all project items

2. **Pagination loop**
   ```javascript
   while (hasNextPage) {
     // Fetch page with cursor
     const result = await github.graphql(query, { cursor });

     // Accumulate items
     allItems.push(...result.nodes);

     // Update pagination state
     hasNextPage = result.pageInfo.hasNextPage;
     cursor = result.pageInfo.endCursor;
   }
   ```

3. **PageInfo tracking**
   - `hasNextPage`: Boolean indicating if more pages exist
   - `endCursor`: Cursor for next page

## Implementation Details

### File: `.github/workflows/generate-burndown.yml`

#### Before (Limited to 100)

```javascript
const projectQuery = `
  query($owner: String!) {
    organization(login: $owner) {
      projectsV2(first: 10) {
        nodes {
          items(first: 100) {  // ❌ Hard limit
            nodes {
              // ...
            }
          }
        }
      }
    }
  }
`;
```

#### After (Fully Paginated)

```javascript
// 1. Get project metadata
const projectMetadataQuery = `
  query($owner: String!) {
    organization(login: $owner) {
      projectsV2(first: 10) {
        nodes {
          id
          title
          fields(first: 20) { /* ... */ }
        }
      }
    }
  }
`;

// 2. Paginate through items
const allItems = [];
let hasNextPage = true;
let cursor = null;

while (hasNextPage) {
  const itemsQuery = `
    query($projectId: ID!, $cursor: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100, after: $cursor) {  // ✅ Paginated
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes { /* ... */ }
          }
        }
      }
    }
  `;

  const result = await github.graphql(itemsQuery, { projectId, cursor });
  allItems.push(...result.node.items.nodes);

  hasNextPage = result.node.items.pageInfo.hasNextPage;
  cursor = result.node.items.pageInfo.endCursor;
}
```

### Pagination Flow

```
┌─────────────────────────────────────────┐
│ 1. Fetch Project Metadata              │
│    (ID, title, fields)                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Initialize Pagination                │
│    - allItems = []                      │
│    - hasNextPage = true                 │
│    - cursor = null                      │
└──────────────┬──────────────────────────┘
               │
               ▼
         ┌─────────────┐
         │ While loop  │
         └──────┬──────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 3. Fetch Page (100 items)               │
│    - Pass cursor for position           │
│    - Get pageInfo in response           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Accumulate Items                     │
│    - allItems.push(...nodes)            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 5. Update Pagination State              │
│    - hasNextPage = pageInfo.hasNextPage │
│    - cursor = pageInfo.endCursor        │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Has more?    │
        │ (hasNextPage)│
        └──┬───────┬───┘
     Yes   │       │ No
           │       │
           └───────┴──────────────┐
                                  │
                                  ▼
                    ┌──────────────────────┐
                    │ All items collected  │
                    └──────────────────────┘
```

## Performance Characteristics

### API Calls

**Before:**
- 1 query (gets max 100 items)

**After:**
- 1 metadata query
- N item queries (where N = ceil(totalItems / 100))

**Example for 250 items:**
- Before: 1 call (100 items returned, 150 dropped)
- After: 3 calls (100 + 100 + 50 = 250 items)

### Time Complexity

- **Per-page fetch:** O(1) - constant time per page
- **Total items:** O(n) - linear with number of items
- **Merging pages:** O(n) - linear accumulation

### Memory

- Accumulates all items in memory: O(n)
- For large projects (1000+ items), consider streaming if needed

## Testing

### Test File: `tests/integration/pagination.test.js`

**7 comprehensive tests:**

1. ✅ **Multiple pages** - Handles 150 items across 2 pages
2. ✅ **Single page** - Handles 50 items in 1 page
3. ✅ **Cursor passing** - Verifies correct cursor usage
4. ✅ **Empty project** - Handles 0 items gracefully
5. ✅ **3+ pages** - Handles 400 items across 4 pages
6. ✅ **Boundary (100)** - Exactly 100 items
7. ✅ **Over boundary (101)** - 101 items requiring 2 pages

**All tests pass!**

```bash
npm test tests/integration/pagination.test.js

Test Suites: 1 passed
Tests:       7 passed
```

## Remaining Limitations

### Documented at Top of Workflow

```yaml
# PAGINATION IMPLEMENTATION:
# - Project items: Fully paginated (handles >100 items)
# - Project fields: Limited to first 20
# - Field values per item: Limited to first 20
```

### Why These Limits Are Acceptable

1. **Project fields (20 limit)**
   - Typical projects have 5-10 fields
   - 20 is sufficient for most use cases
   - Easy to extend if needed

2. **Field values per item (20 limit)**
   - Each item typically has 5-10 field values
   - 20 covers all standard fields
   - Easy to extend if needed

### How to Extend If Needed

If your project exceeds these limits, implement similar pagination:

```javascript
// Example: Paginate through fields
let allFields = [];
let hasNextPage = true;
let cursor = null;

while (hasNextPage) {
  const result = await github.graphql(`
    query($projectId: ID!, $cursor: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { /* field data */ }
          }
        }
      }
    }
  `, { projectId, cursor });

  allFields.push(...result.node.fields.nodes);
  hasNextPage = result.node.fields.pageInfo.hasNextPage;
  cursor = result.node.fields.pageInfo.endCursor;
}
```

## Benefits

### Before This Fix

❌ Silent data loss for large projects
❌ Incomplete burndown charts
❌ Inaccurate metrics
❌ No indication of missing data
❌ User confusion about missing issues

### After This Fix

✅ **All items fetched** regardless of project size
✅ **Accurate burndown charts** with complete data
✅ **Logging shows progress** during pagination
✅ **No silent failures** or data loss
✅ **Scalable** to projects of any size
✅ **Well-tested** with comprehensive test coverage

## Logging Output

### Small Project (<100 items)

```
Found project: [TEMPLATE] EngageMe (ID: proj_123)
Fetching project items page 1...
  Fetched 45 items (total so far: 45)
✅ Fetched all 45 project items across 1 page(s)
```

### Large Project (>100 items)

```
Found project: [TEMPLATE] EngageMe (ID: proj_123)
Fetching project items page 1...
  Fetched 100 items (total so far: 100)
Fetching project items page 2...
  Fetched 100 items (total so far: 200)
Fetching project items page 3...
  Fetched 50 items (total so far: 250)
✅ Fetched all 250 project items across 3 page(s)
```

## Best Practices Applied

1. ✅ **Cursor-based pagination** - Industry standard for GraphQL
2. ✅ **PageInfo usage** - Proper use of hasNextPage and endCursor
3. ✅ **Page accumulation** - Merge results across pages
4. ✅ **Progress logging** - Show pagination progress
5. ✅ **Comprehensive testing** - Edge cases covered
6. ✅ **Documentation** - Limitations clearly stated
7. ✅ **Backward compatible** - No breaking changes

## Migration Notes

### For Existing Deployments

✅ **No migration required** - automatically works with existing projects

### Performance Impact

- **Small projects (<100 items):** Negligible (1 extra metadata query)
- **Large projects (>100 items):** Additional API calls, but necessary for correctness
- **Rate limiting:** Minimal impact (1 extra call per 100 items)

### Monitoring

After deployment, check workflow logs for:
- Number of pages fetched
- Total items collected
- Any GraphQL errors

## Related Issues

This same pattern should be applied to other workflows:
- ⚠️ `scheduled-rollup.yml` - Uses `items(first: 100)`
- ⚠️ `rollup-estimates.yml` - May have similar limitations
- ⚠️ Other workflows that fetch project items

**Recommendation:** Audit all workflows for hard pagination limits and implement similar cursor-based pagination where needed.

## References

- **GraphQL Pagination:** https://graphql.org/learn/pagination/
- **GitHub GraphQL API:** https://docs.github.com/en/graphql
- **PageInfo specification:** https://relay.dev/graphql/connections.htm#sec-undefined.PageInfo

---

**Status:** ✅ Implemented and tested
**Test Coverage:** 7 new pagination tests (all passing)
**Total Tests:** 61/61 passing
**Ready for Production:** Yes

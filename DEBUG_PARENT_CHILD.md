# Debugging Parent-Child Relationships

## Problem

The workflow shows:
```
trackedInIssues.totalCount: 0
```

This means GitHub's API does NOT see #76 as being tracked by #75, even though the UI shows a parent relationship.

## How GitHub Tracked Issues Work

GitHub has two GraphQL fields:
- `trackedIssues` - Issues that THIS issue tracks (children)
- `trackedInIssues` - Issues that track THIS issue (parents)

When you create a parent-child relationship in GitHub:
- Parent issue gets child in its `trackedIssues` list
- Child issue gets parent in its `trackedInIssues` list

## Diagnosis Steps

### 1. Check Issue #75 (Parent)

Go to issue #75 and check:
- Is there a "Sub-issues" section?
- Does it list #76 and #77?
- Did you use the "Convert to sub-issue" feature or manual markdown checkboxes?

### 2. Query #75's Children

Let's manually run this GraphQL query to see what GitHub thinks:

```graphql
query {
  repository(owner: "YOUR_ORG", name: "project-test-ASDFHKJ") {
    issue(number: 75) {
      number
      title
      trackedIssues(first: 10) {
        totalCount
        nodes {
          number
          title
        }
      }
    }
  }
}
```

You can run this at: https://docs.github.com/en/graphql/overview/explorer

### 3. How the Relationship Should Be Created

**Option A: Using GitHub's Native Feature (Recommended)**
1. Go to issue #75
2. Click the "..." menu → "Convert to sub-issue"
3. Or use the "Add sub-issue" button in the sub-issues section
4. Link #76 as a sub-issue

**Option B: Using Task Lists (Legacy, may not work with API)**
Some task list formats like:
```markdown
- [ ] #76
- [ ] #77
```

These create visual connections but may not register in the tracked issues API.

### 4. Verify the Relationship

After creating the relationship properly:
1. Go to #76 → Should show "Tracked by #75" at the top
2. Go to #75 → Should show "Sub-issues" section with #76, #77
3. Add 'sync' label to #76 → Workflow should now find parent

## If Relationships Are Already Set

If the relationships appear correct in the UI but the API returns 0:

1. **Try re-creating the relationship**:
   - Remove #76 from #75's sub-issues
   - Add it back

2. **Check permissions**:
   - Ensure the GitHub App has permission to read tracked issues
   - Check if organization-level permissions are needed

3. **Test with a new issue**:
   - Create a test parent and child
   - See if those work with the workflow

## Alternative: Use Description-Based Approach

If GitHub's tracked issues API doesn't work reliably, we can add back the description parsing as a fallback:

```javascript
// In the issue description, add:
Parent Feature: #75

// Workflow will parse this if tracked issues API fails
```

But this defeats the purpose of using GitHub's native feature.

## Recommended Action

Please check issue #75 and let me know:
1. Does it have a "Sub-issues" section?
2. Does that section list #76 and #77?
3. How were the sub-issues added (manually in markdown vs GitHub's UI feature)?

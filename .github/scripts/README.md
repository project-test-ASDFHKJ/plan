# Automation Helper Scripts

This directory contains reusable JavaScript modules for GitHub Actions workflows.

## 📁 Files

### `cross-repo-helper.js`

Provides helper functions for cross-repository issue automation.

**Key Functions:**

#### Issue and URL Parsing
- `parseIssueUrl(url)` - Parse GitHub issue URL into components
- `isSameRepo(issueRef, owner, repo)` - Check if issue is in current repo
- `getIssue(github, owner, repo, number)` - Fetch issue from any repository

#### Project Management
- `findProject(github, org, projectName)` - Find project by name
- `getProjectFields(github, projectId)` - Get all fields for a project
- `findField(fields, fieldName)` - Find specific field by name
- `findProjectItem(github, projectId, issueNodeId)` - Check if issue is in project
- `addIssueToProject(github, projectId, issueNodeId)` - Add issue to project

#### Field Updates
- `updateSingleSelectField(github, projectId, itemId, fieldId, optionId)` - Update dropdown field
- `updateIterationField(github, projectId, itemId, fieldId, iterationId)` - Update iteration/sprint
- `getProjectItemFields(github, projectId, itemId)` - Get current field values

#### Metadata Helpers
- `getIssueTypeFromTitle(title)` - Determine issue type from title prefix
- `filterInheritableLabels(labels)` - Filter labels to copy
- `copyLabels(github, targetOwner, targetRepo, targetNumber, labels)` - Copy labels to issue
- `copyMilestone(github, targetOwner, targetRepo, targetNumber, sourceMilestone)` - Copy milestone

#### Utilities
- `addComment(github, owner, repo, number, body)` - Add comment to issue
- `delay(ms)` - Rate limiting delay

## 🔧 Usage

In a GitHub Actions workflow:

```yaml
- name: My Automation Step
  uses: actions/github-script@v7
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const helper = require('./.github/scripts/cross-repo-helper.js');

      // Parse an issue URL
      const issueRef = helper.parseIssueUrl('https://github.com/owner/repo/issues/123');
      // Returns: { owner: 'owner', repo: 'repo', number: 123 }

      // Get issue details
      const issue = await helper.getIssue(github, issueRef.owner, issueRef.repo, issueRef.number);

      // Find project
      const project = await helper.findProject(github, 'my-org', 'EngageMe');

      // Add issue to project
      if (project) {
        const itemId = await helper.addIssueToProject(github, project.id, issue.node_id);
      }
```

## 📝 Function Reference

### parseIssueUrl(url)

Parses a GitHub issue URL into its components.

**Parameters:**
- `url` (string) - GitHub issue URL

**Returns:**
- Object with `{owner, repo, number}` or `null` if invalid

**Example:**
```javascript
const ref = helper.parseIssueUrl('https://github.com/octocat/hello-world/issues/42');
// Returns: { owner: 'octocat', repo: 'hello-world', number: 42 }
```

### findProject(github, org, projectName)

Finds a GitHub Project (v2) by name with fuzzy matching.

**Parameters:**
- `github` - GitHub API client
- `org` (string) - Organization login
- `projectName` (string) - Project name to search for

**Returns:**
- Project object with `{id, title, number}` or `null`

**Example:**
```javascript
const project = await helper.findProject(github, 'my-org', 'EngageMe');
if (project) {
  console.log(`Found project: ${project.title} (${project.id})`);
}
```

### addIssueToProject(github, projectId, issueNodeId)

Adds an issue to a GitHub Project.

**Parameters:**
- `github` - GitHub API client
- `projectId` (string) - Project node ID
- `issueNodeId` (string) - Issue node ID

**Returns:**
- Project item ID (string)

**Example:**
```javascript
const itemId = await helper.addIssueToProject(
  github,
  project.id,
  issue.node_id
);
```

### updateSingleSelectField(github, projectId, itemId, fieldId, optionId)

Updates a single-select field (like Type, Status, Priority) on a project item.

**Parameters:**
- `github` - GitHub API client
- `projectId` (string) - Project node ID
- `itemId` (string) - Project item ID
- `fieldId` (string) - Field ID
- `optionId` (string) - Option ID to set

**Example:**
```javascript
// Get field and find option
const fields = await helper.getProjectFields(github, project.id);
const typeField = helper.findField(fields, 'Type');
const taskOption = typeField.options.find(o => o.name === 'Task');

// Update field
await helper.updateSingleSelectField(
  github,
  project.id,
  itemId,
  typeField.id,
  taskOption.id
);
```

### filterInheritableLabels(labels)

Filters labels to only those that should be inherited from parent issues.

**Parameters:**
- `labels` (array) - Array of label objects from GitHub API

**Returns:**
- Array of label names (strings)

**Inheritable Prefixes:**
- `priority:*`
- `team:*`
- `component:*`
- `size:*`

**Example:**
```javascript
const allLabels = [
  { name: 'priority: high' },
  { name: 'team: frontend' },
  { name: 'bug' },  // Not inherited
  { name: 'good first issue' }  // Not inherited
];

const inherited = helper.filterInheritableLabels(allLabels);
// Returns: ['priority: high', 'team: frontend']
```

### copyMilestone(github, targetOwner, targetRepo, targetNumber, sourceMilestone)

Copies a milestone from source issue to target issue by finding matching milestone title.

**Parameters:**
- `github` - GitHub API client
- `targetOwner` (string) - Target repository owner
- `targetRepo` (string) - Target repository name
- `targetNumber` (number) - Target issue number
- `sourceMilestone` (object) - Source milestone object

**Notes:**
- Milestone must exist in target repository with same title
- Fails silently if milestone not found

**Example:**
```javascript
if (parentIssue.milestone) {
  await helper.copyMilestone(
    github,
    childRef.owner,
    childRef.repo,
    childRef.number,
    parentIssue.milestone
  );
}
```

## 🛠️ Development

### Adding New Functions

1. Add function to `cross-repo-helper.js`
2. Export it in `module.exports` at bottom
3. Document it in this README
4. Use it in workflow scripts

### Testing

Test helper functions by:
1. Using `workflow_dispatch` triggers with test data
2. Checking Action run logs
3. Adding `console.log()` statements for debugging
4. Verifying API calls in GitHub's API request logs

### Error Handling

Helper functions include basic error handling:
- Functions that might fail use try/catch
- Errors are logged to console
- Functions return null/empty values on error
- Calling code should handle errors gracefully

## 📚 Related Documentation

- [Cross-Repo Automation Guide](../CROSS_REPO_AUTOMATION.md)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Projects V2 API](https://docs.github.com/en/graphql/reference/objects#projectv2)
- [actions/github-script](https://github.com/actions/github-script)

---

*Helper scripts for the plan repository automation system*

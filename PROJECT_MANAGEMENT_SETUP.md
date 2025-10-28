# GitHub Project Management Setup

This repository includes automated project management workflows for GitHub Issues and Projects (v2).

## Features

### 1. Automatic Type Assignment
When you create an issue using one of the templates, the GitHub Action will automatically:
- Detect the issue type from the title prefix (`[EPIC]`, `[FEATURE]`, `[STORY]`, `[Task]`)
- Set the GitHub **Issue Type** field (organizational issue types)
- Add the issue to your GitHub Project
- Set the "Type" field in the project board to match the issue type

### 2. Cascading Milestone Inheritance
Child issues automatically inherit milestones from their parent issues, and this inheritance **cascades down the entire hierarchy**:
- **Task** → inherits milestone from parent **Feature** or **User Story**
- **User Story** → inherits milestone from parent **Feature**
- **Feature** → inherits milestone from parent **Epic**

**Cascading behavior:** When you change a milestone on any issue, the automation will:
1. Find all direct children (Features under an Epic, Stories under a Feature, Tasks under a Story)
2. Recursively find all descendants (grandchildren, great-grandchildren, etc.)
3. Update the milestone on ALL descendants automatically

This ensures consistent milestone tracking across your entire issue hierarchy, no matter how deep.

## Setup Requirements

### 1. Create GitHub Project (v2)

1. Go to your repository → **Projects** tab
2. Click **New project**
3. Choose **Table** or **Board** view
4. Create your project

### 2. Configure Organizational Issue Types

GitHub organizations support custom issue types. You need to configure these in your organization settings:

1. Go to your **Organization settings**
2. Navigate to **Issues** → **Issue types**
3. Create the following issue types:
   - `Epic`
   - `Feature`
   - `User Story`
   - `Task`

**To check your existing issue types:**
```bash
gh api orgs/:org/issue-types
```

**Note:** Only users with push access to the repository can set issue types. The automation requires the workflow to have appropriate permissions.

### 3. Add Project Board Fields

In your GitHub Project (v2), create a **Single Select** field named **"Type"** with the following options:
- Epic
- Feature
- User Story
- Task

To add this field:
1. Open your project
2. Click the **+** icon in the column headers
3. Select **New field**
4. Name it **"Type"**
5. Choose **Single select**
6. Add the four options listed above

### 4. Enable GitHub Actions

The workflow is located at `.github/workflows/issue-automation.yml` and will automatically run when:
- A new issue is **created** (`opened`)
- An existing issue is **edited** (`edited`)
- An issue is **reopened** (`reopened`)
- A milestone is **assigned** (`milestoned`)
- A milestone is **removed** (`demilestoned`)
- An issue is **assigned** to someone (`assigned`)
- An issue is **unassigned** (`unassigned`)
- A label is **added** (`labeled`)
- A label is **removed** (`unlabeled`)

This comprehensive set of triggers ensures that:
- Type fields stay synchronized when issues are edited
- Milestones cascade immediately when changed
- All descendants update when a parent's milestone changes

No additional configuration is needed - the workflow uses the default `GITHUB_TOKEN`.

## Usage

### Creating an Epic

1. Go to **Issues** → **New issue**
2. Choose **Epic** template
3. Fill in the epic details
4. Create the issue
5. Assign a milestone to the epic (optional, but recommended)

### Creating a Feature

1. Choose **Feature** template
2. Link to parent epic: `Epic: #123` (replace 123 with epic number)
3. The feature will automatically:
   - Get type set to "Feature"
   - Inherit the milestone from the parent epic
   - Get added to the project board

### Creating a User Story

1. Choose **User Story** template
2. Link to parent feature: `Feature: #456`
3. Follow the "As a... I want... So that..." format
4. Automatic inheritance applies

### Creating a Task

1. Choose **Task** template
2. Link to parent feature or story: `Feature: #789`
3. List acceptance criteria
4. Automatic inheritance applies

## Issue Hierarchy

```
Epic (#100) [Milestone: Q1 2025]
├── Feature (#101) [Milestone: Q1 2025] ← inherited from Epic
│   ├── User Story (#102) [Milestone: Q1 2025] ← inherited from Feature
│   │   └── Task (#103) [Milestone: Q1 2025] ← inherited from Story
│   └── User Story (#104) [Milestone: Q1 2025]
└── Feature (#105) [Milestone: Q1 2025]
```

## Automation Details

When an issue is created, edited, or has a milestone changed, the workflow:

1. **Detects Type** from title prefix (`[EPIC]`, `[FEATURE]`, `[STORY]`, `[Task]`)
2. **Sets GitHub Issue Type** using the organizational issue type system
3. **Finds Parent Issue** by parsing the issue body for parent references
4. **Fetches Parent Milestone** if a parent is found
5. **Sets Milestone** on the current issue (inherited from parent)
6. **Adds to Project** if not already added
7. **Updates Project Type Field** in the project board
8. **Cascades Milestone Changes** recursively to ALL descendants:
   - Searches all issues for those that reference this issue as a parent
   - Updates each child's milestone
   - Recursively updates grandchildren, great-grandchildren, etc.
   - Prevents infinite loops by tracking already-updated issues
9. **Posts Summary Comment** showing:
   - Issue type assignment
   - Milestone inheritance from parent
   - List of all descendants updated with the new milestone

## Troubleshooting

### Issue Type not being set
- Verify your organization has configured the issue types: Epic, Feature, User Story, Task
- Check issue types with: `gh api orgs/:org/issue-types`
- Ensure the GitHub Action has push access to the repository
- View the GitHub Actions logs for detailed error messages
- Note: Issue types are an organizational feature and require organization-level configuration

### Project Type field not being set
- Verify your project has a **Single Select** field named exactly "Type"
- Check that the field has options matching: Epic, Feature, User Story, Task
- View the GitHub Actions logs for detailed error messages

### Milestone not being inherited
- Ensure the parent issue number is correct
- Verify the parent issue has a milestone assigned
- The format should be: `Epic: #123` or `Feature: #456`

### Issue not being added to project
- Make sure your project is associated with the repository
- Check that GitHub Actions has the necessary permissions
- View the Actions log for detailed error messages

## Creating Issues Manually with Issue Types

You can also create issues with issue types directly using the GitHub CLI:

```bash
echo '{
  "title": "[Task] Your issue title",
  "body": "Feature: #123\n\nIssue description...",
  "type": "Task"
}' | gh api repos/:owner/:repo/issues --method POST --input -
```

**Key points:**
- The `type` field sets the organizational issue type
- Only users with push access can set the type field
- The `:owner/:repo` placeholders are automatically resolved by `gh` when run from within a git repo

**Example creating a Feature:**
```bash
echo '{
  "title": "[FEATURE] OAuth Integration",
  "body": "Epic: #100\n\n## Feature Description\nIntegrate OAuth authentication...",
  "type": "Feature"
}' | gh api repos/:owner/:repo/issues --method POST --input -
```

## Customization

### Adding More Issue Types

1. **Add to organization issue types** - Configure the new type in your organization settings
2. **Create template** - Add a new template in `.github/ISSUE_TEMPLATE/`
3. **Use unique prefix** - Use a unique title prefix (e.g., `[BUG]`)
4. **Update workflow** - Update the workflow at line 111-121 to detect the new prefix:
   ```javascript
   } else if (issueTitle.startsWith('[BUG]')) {
     issueType = 'Bug';
   ```
5. **Update project field** - Add the new type to your project's "Type" field options

### Changing Parent Reference Format

Edit the regex pattern at line 126 in `issue-automation.yml`:
```javascript
const parentMatch = issueBody.match(/(?:Epic|Feature|Parent Feature|Parent Epic):\s*#(\d+)/i);
```

Add your custom parent keywords to the regex pattern.

## Files

- `.github/workflows/issue-automation.yml` - Main automation workflow
- `.github/ISSUE_TEMPLATE/epic.md` - Epic template
- `.github/ISSUE_TEMPLATE/feature.md` - Feature template
- `.github/ISSUE_TEMPLATE/user-story.md` - User Story template
- `.github/ISSUE_TEMPLATE/task.md` - Task template

## Benefits

- **Consistency**: Automatic type setting prevents manual errors
- **Efficiency**: Save time by automating repetitive tasks - update one epic and cascade to hundreds of descendants
- **Traceability**: Clear parent-child relationships with milestone inheritance at every level
- **Visibility**: Project boards stay up-to-date automatically across the entire hierarchy
- **Scalability**: Works seamlessly as your project grows - handles deep hierarchies without performance issues
- **Reliability**: Prevents orphaned issues with different milestones from their parents
- **Zero Maintenance**: Set it up once and let automation handle milestone synchronization forever

## Example Workflow

### Initial Setup
1. Create Epic #100: "User Authentication System" (assign Milestone: "v1.0")
2. Create Feature #101: "[FEATURE] OAuth Integration" with `Epic: #100`
   - Automatically gets Milestone "v1.0"
   - Type set to "Feature"
3. Create Story #102: "[STORY] Google Sign-In" with `Feature: #101`
   - Automatically gets Milestone "v1.0"
   - Type set to "User Story"
4. Create Task #103: "[Task] Implement OAuth callback" with `Feature: #101`
   - Automatically gets Milestone "v1.0"
   - Type set to "Task"
5. Create Task #104: "[Task] Add Google OAuth credentials" with `Feature: #101`
   - Automatically gets Milestone "v1.0"
   - Type set to "Task"

All issues are automatically organized in your project board with proper types and milestones!

### Cascading Updates Example
Now, imagine you need to move the entire Epic to a different milestone:

1. **Update Epic #100** milestone from "v1.0" to "v2.0"
2. **Automation triggers** and finds all descendants:
   - Feature #101 (direct child)
   - Story #102 (grandchild via Feature #101)
   - Task #103 (grandchild via Feature #101)
   - Task #104 (grandchild via Feature #101)
3. **All descendants are automatically updated** to milestone "v2.0"
4. **Summary comment posted** on Epic #100:
   ```
   🤖 Automation Summary

   🔄 Cascaded Updates: Milestone propagated to 4 descendant(s): #101, #102, #103, #104
   ```

This saves you from manually updating each issue individually - the entire hierarchy stays synchronized!

# GitHub Project Management Setup

This repository includes automated project management workflows for GitHub Issues and Projects (v2).

## Features

### 1. Automatic Type Assignment
When you create an issue using one of the templates, the GitHub Action will automatically:
- Detect the issue type from the title prefix (`[EPIC]`, `[FEATURE]`, `[STORY]`, `[Task]`)
- Add the issue to your GitHub Project
- Set the "Type" field in the project board to match the issue type
- Add the corresponding label to the issue

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

### 2. Add Required Fields

In your project, create a **Single Select** field named **"Type"** with the following options:
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

### 3. Create Labels

Create the following labels in your repository:
1. Go to **Issues** → **Labels**
2. Create these labels:
   - `Epic`
   - `Feature`
   - `User Story`
   - `Task`

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
2. **Finds Parent Issue** by parsing the issue body for parent references
3. **Fetches Parent Milestone** if a parent is found
4. **Sets Milestone** on the current issue (inherited from parent)
5. **Adds to Project** if not already added
6. **Updates Type Field** in the project board
7. **Adds Label** matching the type
8. **Cascades Milestone Changes** recursively to ALL descendants:
   - Searches all issues for those that reference this issue as a parent
   - Updates each child's milestone
   - Recursively updates grandchildren, great-grandchildren, etc.
   - Prevents infinite loops by tracking already-updated issues
9. **Posts Summary Comment** showing:
   - Type assignment
   - Milestone inheritance from parent
   - List of all descendants updated with the new milestone

## Troubleshooting

### Type field not being set
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

## Customization

### Adding More Issue Types

1. Create a new template in `.github/ISSUE_TEMPLATE/`
2. Use a unique title prefix (e.g., `[BUG]`)
3. Update the workflow at line 20-30 to detect the new prefix
4. Add the new type to your project's "Type" field
5. Create a matching label

### Changing Parent Reference Format

Edit the regex pattern at line 39 in `issue-automation.yml`:
```javascript
const parentMatch = issueBody.match(/(?:Epic|Feature|Parent Feature|Parent Epic):\s*#(\d+)/i);
```

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

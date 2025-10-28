# GitHub Project Management Setup

This repository includes automated project management workflows for GitHub Issues and Projects (v2).

## Features

### 1. Automatic Type Assignment
When you create an issue using one of the templates, the GitHub Action will automatically:
- Detect the issue type from the title prefix (`[EPIC]`, `[FEATURE]`, `[STORY]`, `[Task]`)
- Add the issue to your GitHub Project
- Set the "Type" field in the project board to match the issue type
- Add the corresponding label to the issue

### 2. Milestone Inheritance
Child issues automatically inherit milestones from their parent issues:
- **Task** → inherits milestone from parent **Feature** or **User Story**
- **User Story** → inherits milestone from parent **Feature**
- **Feature** → inherits milestone from parent **Epic**

This ensures consistent milestone tracking across your issue hierarchy.

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
- A new issue is created
- An existing issue is edited

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

When an issue is created or edited, the workflow:

1. **Detects Type** from title prefix
2. **Finds Parent Issue** by parsing the issue body
3. **Fetches Parent Milestone** if a parent is found
4. **Sets Milestone** on the current issue
5. **Adds to Project** if not already added
6. **Updates Type Field** in the project
7. **Adds Label** matching the type
8. **Posts Summary Comment** showing what was automated

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
- **Efficiency**: Save time by automating repetitive tasks
- **Traceability**: Clear parent-child relationships with milestone inheritance
- **Visibility**: Project boards stay up-to-date automatically
- **Scalability**: Works seamlessly as your project grows

## Example Workflow

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

All issues are automatically organized in your project board with proper types and milestones!

# GitHub Project Management Setup

This repository includes automated project management workflows for GitHub Issues and Projects (v2).

## Features

### 1. Automatic Type Assignment
When you create an issue using one of the templates, the GitHub Action will automatically:
- Detect the issue type from the title prefix (`[EPIC]`, `[FEATURE]`, `[STORY]`, `[Task]`)
- Set the GitHub **Issue Type** field (organizational issue types)
- Add the issue to your GitHub Project
- Set the "Type" field in the project board to match the issue type

### 2. Cascading Milestone & Iteration Inheritance
Child issues automatically inherit **milestones** and **iterations** from their parent issues, and this inheritance **cascades down the entire hierarchy**:
- **Task** → inherits from parent **Feature** or **User Story**
- **User Story** → inherits from parent **Feature**
- **Feature** → inherits from parent **Epic**

**Cascading behavior:** When you change a milestone or iteration on any issue, the automation will:
1. Find all direct children (Features under an Epic, Stories under a Feature, Tasks under a Story)
2. Recursively find all descendants (grandchildren, great-grandchildren, etc.)
3. Update the milestone/iteration on ALL descendants automatically

This ensures consistent milestone and iteration tracking across your entire issue hierarchy, no matter how deep.

### 3. Automatic Estimate & Remaining Work Rollup
Parent issues automatically calculate their **Estimate** and **Remaining** work by summing values from all child issues:
- When you update a Task's remaining work, the parent Feature/Story automatically updates
- When a Feature's estimate changes, the parent Epic automatically recalculates
- This **rolls up the entire hierarchy** recursively

**Example:**
- Epic #100 has two Features:
  - Feature #101: Estimate=8h, Remaining=3h
  - Feature #102: Estimate=5h, Remaining=2h
- Epic #100 automatically shows: Estimate=13h, Remaining=5h

**Key benefits:**
- Always accurate project metrics at every level
- No manual calculation needed
- Real-time progress tracking across the entire hierarchy
- Perfect for sprint planning and burndown charts

## Setup Requirements

### 0. Configure Personal Access Token (Required for Organization Projects)

**If your project is at the organization level** (like `[TEMPLATE] EngageMe`), you **must** create a Personal Access Token because GitHub's default `GITHUB_TOKEN` cannot access organization-level projects.

1. **Generate a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click **"Generate new token (classic)"**
   - Name it: `GitHub Actions - Project Access`
   - Select these scopes:
     - ✅ `project` - Full access to projects
     - ✅ `read:org` - Read organization data
     - ✅ `repo` - Full control of repositories
   - Click **"Generate token"**
   - **Copy the token immediately** (you won't see it again!)

2. **Add the token as a repository secret:**
   - Go to: `https://github.com/YOUR-ORG/YOUR-REPO/settings/secrets/actions`
   - Click **"New repository secret"**
   - Name: `PAT_WITH_PROJECT_ACCESS`
   - Value: *paste your copied token*
   - Click **"Add secret"**

**Without this PAT, the workflows cannot access your organization-level project and rollup will not work.**

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

In your GitHub Project (v2), create the following fields:

#### Type Field (Single Select)
1. Open your project
2. Click the **+** icon in the column headers
3. Select **New field**
4. Name it **"Type"**
5. Choose **Single select**
6. Add these options:
   - Epic
   - Feature
   - User Story
   - Task

#### Estimate Field (Number)
1. Click the **+** icon in the column headers
2. Select **New field**
3. Name it **"Estimate"**
4. Choose **Number**
5. This will store estimated hours/story points

#### Remaining Field (Number)
1. Click the **+** icon in the column headers
2. Select **New field**
3. Name it **"Remaining"**
4. Choose **Number**
5. This will store remaining work

#### Iteration Field (Iteration)
1. Click the **+** icon in the column headers
2. Select **New field**
3. Name it **"Iteration"**
4. Choose **Iteration**
5. Configure your sprint/iteration schedule (e.g., 2-week sprints)

**Note:**
- The Estimate and Remaining fields are required for the automatic rollup feature to work
- The Iteration field is required for iteration inheritance to work

### 4. Enable GitHub Actions

Three workflows work together to automate your project management:

#### Issue Automation Workflow
Location: `.github/workflows/issue-automation.yml`

Triggers on:
- A new issue is **created** (`opened`)
- An existing issue is **edited** (`edited`)
- An issue is **reopened** (`reopened`)
- A milestone is **assigned** (`milestoned`)
- A milestone is **removed** (`demilestoned`)
- An issue is **assigned** to someone (`assigned`)
- An issue is **unassigned** (`unassigned`)
- A label is **added** (`labeled`)
- A label is **removed** (`unlabeled`)

This workflow handles:
- Setting issue types
- Setting project board fields
- Inheriting milestones from parents
- Cascading milestone changes to descendants

#### Scheduled Rollup Workflow
Location: `.github/workflows/scheduled-rollup.yml`

Triggers on:
- **Automatically every minute**: Runs on a schedule to keep all estimates in sync
- **Manual dispatch**: Can be triggered manually if needed

This workflow handles:
- Scanning ALL issues in the repository
- Calculating sum of all children's estimates for each parent
- Calculating sum of all children's remaining work
- Updating parent issues with rolled-up values
- Only updates when values have changed (efficient)

**How It Works:**
1. Update Estimate/Remaining fields in the project board for any child issue
2. Wait up to 1 minute - the scheduled workflow runs automatically
3. Parent estimates update automatically across the entire hierarchy
4. **No manual intervention needed!**

**Manual Trigger (optional):**
```bash
# Trigger immediately instead of waiting for the schedule:
gh workflow run scheduled-rollup.yml
```

Or via GitHub UI: Actions → Scheduled Rollup → Run workflow

**Benefits:**
- Fully automatic - no need to edit issues or add labels
- Updates ALL parent issues in one run
- Efficient - only updates when values change
- Reliable - runs every minute on schedule

### Manual Rollup Workflow (Legacy)
Location: `.github/workflows/rollup-estimates.yml`

This workflow is still available for manual triggering of specific issues:
```bash
gh workflow run rollup-estimates.yml -f issue_number=123
```

#### Cascade Iteration Workflow
Location: `.github/workflows/cascade-iteration.yml`

Triggers on:
- **Manual dispatch**: Run manually after changing an iteration
- **Issue events**: Automatically on issue edits (as a fallback)

This workflow handles:
- Detecting iteration changes on parent issues
- Finding all child and descendant issues
- Updating iteration field on all descendants
- Recursively cascading through the entire hierarchy

**Manual Trigger:**
```bash
# After setting an epic/feature's iteration, cascade to children:
gh workflow run cascade-iteration.yml -f issue_number=100
```

Or via GitHub UI: Actions → Cascade Iteration → Run workflow → Enter issue number

**Note:** GitHub Actions doesn't yet support direct triggers on project field changes (`projects_v2_item` event). These workflows can be triggered manually or will run automatically on issue edits as a workaround. For full automation, you would need to set up GitHub Apps with webhooks.

No additional configuration is needed - all workflows use the default `GITHUB_TOKEN`.

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

### Issue Automation Workflow

When an issue is created, edited, or has a milestone changed:

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

### Rollup Estimates Workflow

When a project item's Estimate or Remaining field is updated:

1. **Detects the change** to Estimate or Remaining field
2. **Identifies the issue** from the project item
3. **Finds the parent** issue from the issue body
4. **Collects all children** of the parent issue
5. **Reads each child's values** for Estimate and Remaining from the project
6. **Calculates totals**:
   - Sum of all children's Estimate values
   - Sum of all children's Remaining values
7. **Updates parent's fields** in the project with the totals
8. **Posts comment on parent** showing breakdown by child
9. **Recursively updates ancestors**:
   - Finds grandparent and repeats the process
   - Continues up the hierarchy to the root Epic
   - Ensures all ancestors have accurate rolled-up values

**Result:** Any change to a leaf task automatically propagates up through the entire hierarchy, keeping all parent estimates accurate.

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

- `.github/workflows/issue-automation.yml` - Main automation workflow (type, milestone, cascading)
- `.github/workflows/rollup-estimates.yml` - Rollup automation (estimate, remaining work)
- `.github/workflows/cascade-iteration.yml` - Iteration cascade automation (sprint/iteration inheritance)
- `.github/ISSUE_TEMPLATE/epic.md` - Epic template
- `.github/ISSUE_TEMPLATE/feature.md` - Feature template
- `.github/ISSUE_TEMPLATE/user-story.md` - User Story template
- `.github/ISSUE_TEMPLATE/task.md` - Task template

## Benefits

- **Consistency**: Automatic type setting prevents manual errors
- **Efficiency**: Save time by automating repetitive tasks - update one epic and cascade to hundreds of descendants
- **Traceability**: Clear parent-child relationships with milestone inheritance at every level
- **Visibility**: Project boards stay up-to-date automatically across the entire hierarchy
- **Accurate Metrics**: Real-time rollup of estimates and remaining work at every level
- **Scalability**: Works seamlessly as your project grows - handles deep hierarchies without performance issues
- **Reliability**: Prevents orphaned issues with different milestones from their parents
- **Zero Maintenance**: Set it up once and let automation handle synchronization forever
- **Agile-Ready**: Perfect for sprint planning, burndown charts, and velocity tracking

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

### Cascading Milestone Updates Example
Now, imagine you need to move the entire Epic to a different milestone:

1. **Update Epic #100** milestone from "v1.0" to "v2.0"
2. **Automation triggers automatically** and finds all descendants:
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

### Iteration Assignment Example

1. **Set Epic #100** to iteration "Sprint 3" in your project board
2. **Trigger the cascade workflow**:
   ```bash
   gh workflow run cascade-iteration.yml -f issue_number=100
   ```
   Or go to GitHub UI: Actions → Cascade Iteration to Children → Run workflow → Enter `100`
3. **All descendants automatically updated** to "Sprint 3":
   - Feature #101, #102
   - Story #103, #104
   - Task #105, #106
4. **Comment posted** on Epic #100 showing all updated issues

### Estimate Rollup Example (Bottom-Up)

**Important:** Always trigger the rollup from the **Task level** (the child that was updated), not the parent!

#### Scenario: You've just updated estimates on a Task

1. **Create/Update Task #103** in your project:
   - Set Estimate=5 hours
   - Set Remaining=2 hours
   - Ensure the body has: `Feature: #101`

2. **Trigger the rollup FROM THE TASK**:
   ```bash
   gh workflow run rollup-estimates.yml -f issue_number=103
   ```
   Or via GitHub UI: Actions → Rollup Estimates → Run workflow → Enter `103`

3. **What happens (bottom-up cascade)**:
   ```
   Task #103 (Estimate=5, Remaining=2)
      ↓ Triggers rollup for parent
   Feature #101 (Sum of all its Tasks)
      ↓ Triggers rollup for its parent
   Epic #100 (Sum of all its Features)
      ↓ No more parents, done!
   ```

4. **Results**:
   - Feature #101 shows the **sum** of all its child Tasks
   - Epic #100 shows the **sum** of all its child Features
   - Comments posted on each parent showing the detailed breakdown

#### Example with Multiple Tasks:

```
Epic #100
├── Feature #101
│   ├── Task #103: Estimate=5, Remaining=2
│   ├── Task #104: Estimate=3, Remaining=1
│   └── Task #105: Estimate=8, Remaining=5
└── Feature #102
    └── Task #106: Estimate=4, Remaining=4
```

**After updating Task #103 and running rollup**:
- Feature #101: Estimate=16 (5+3+8), Remaining=8 (2+1+5)
- Epic #100: Estimate=20 (16+4), Remaining=12 (8+4)

**Key Point:** Run the workflow **once per Task update**, and it cascades up automatically!

# Cross-Repository Issue Automation

This repository includes advanced automation that extends issue management capabilities across multiple repositories within your organization.

## 🌟 Overview

The cross-repo automation system allows issues from different repositories (like `calendar`, `backend`, `frontend`, etc.) to be linked as children to parent issues in the `plan` repository, while automatically inheriting project settings, milestones, labels, and other metadata.

### Key Benefits

- **Unified Planning**: Manage high-level Epics and Features in the `plan` repo, while implementation tasks live in their respective project repos
- **Automatic Synchronization**: Child issues automatically inherit settings from parent issues
- **Cross-Repo Progress Tracking**: See progress across all repositories in one place
- **Consistent Organization**: All issues added to the same project board with correct settings

## 🏗️ Architecture

### Components

1. **Helper Script** (`.github/scripts/cross-repo-helper.js`)
   - Reusable functions for cross-repo operations
   - Handles GitHub API interactions
   - Manages project fields, labels, and milestones

2. **Core Automation** (`.github/workflows/cross-repo-automation.yml`)
   - Triggers when parent-child relationships are created
   - Applies all automations to external child issues

3. **Enhanced Workflows**
   - `epic-progress-tracker.yml` - Includes cross-repo children in reports
   - `issue-checklist-generator.yml` - Lists cross-repo children
   - `issue-hierarchy-validator.yml` - Validates cross-repo references

4. **Scheduled Sync** (`.github/workflows/sync-cross-repo-issues.yml`)
   - Periodic checks to ensure all cross-repo children are properly configured
   - Runs every 6 hours by default

## 🚀 How It Works

### Workflow

1. **Create an issue in any repository** (e.g., `calendar`)
   - Use appropriate title prefix: `[TASK]`, `[FEATURE]`, etc.

2. **Link it to a parent issue in the plan repository**
   - Use GitHub's native parent-child relationship feature
   - Assign the external issue as a child to the plan issue

3. **Automation triggers automatically**
   - The `cross-repo-automation.yml` workflow detects the new relationship
   - Applies all necessary configurations to the external issue

4. **External issue is configured**
   - Added to the EngageMe project (or your configured project)
   - Type field set based on title prefix
   - Milestone copied from parent
   - Iteration/Sprint copied from parent
   - Labels copied (priority, team, component)
   - Confirmation comment posted on both issues

### Example Scenario

```
1. Create Epic in plan repo:
   plan#100: [EPIC] User Authentication System

2. Create Feature in plan repo:
   plan#101: [FEATURE] Social Login
   → Link to Epic: plan#100

3. Create Task in calendar repo:
   calendar#50: [TASK] Add OAuth calendar sync
   → Link as child to Feature: plan#101

4. Automation runs automatically:
   ✅ calendar#50 added to EngageMe project
   ✅ Type set to "Task"
   ✅ Milestone copied from plan#101
   ✅ Iteration copied from plan#101
   ✅ Labels copied (priority, team, component)

5. Progress tracking includes calendar#50:
   - Run `/progress` on plan#101 to see calendar#50 in task list
   - Run `/checklist` on plan#101 to see calendar#50 in checklist
```

## 📝 What Gets Inherited

When a cross-repo child issue is linked to a parent in the plan repo:

| Attribute | Behavior |
|-----------|----------|
| **Project Assignment** | Child added to same project as parent |
| **Type Field** | Set based on child's title prefix ([TASK], [FEATURE], etc.) |
| **Milestone** | Copied from parent (if parent has one) |
| **Iteration/Sprint** | Copied from parent's project item |
| **Labels** | Copied: `priority:*`, `team:*`, `component:*`, `size:*` |
| **Assignees** | NOT copied (issue-specific) |
| **Status** | NOT copied (workflow-specific) |

## 🔧 Setup Requirements

### 1. Token Configuration

The automation requires a GitHub token with cross-repo access. You have two options:

#### Option A: Personal Access Token (PAT)

1. Create a PAT with these scopes:
   - `repo` (full control)
   - `project` (read/write)
   - `org:read` (read organization data)

2. Add to repository secrets as `GITHUB_TOKEN` (or use the default token if it has sufficient permissions)

#### Option B: GitHub App (Recommended)

1. Create a GitHub App with these permissions:
   - Issues: Read & Write
   - Projects: Read & Write
   - Metadata: Read-only

2. Install app in your organization

3. Add app credentials to repository secrets

### 2. Project Configuration

Edit `.github/workflows/cross-repo-automation.yml` and set your project name:

```javascript
const PROJECT_NAME = 'EngageMe';  // Change to your project name
```

Also update this in:
- `.github/workflows/sync-cross-repo-issues.yml`

### 3. Repository Access

Ensure the token/app has access to ALL repositories that may contain child issues.

## 📊 Enhanced Features

### Progress Tracking

Run `/progress` on any Epic or Feature to see a comprehensive report:

```markdown
## 📊 Progress Report

**[EPIC] User Authentication System**

### Features
Progress: ████████░░ 80% (4/5)

✅ plan#101 - Social Login
  └─ Tasks: 3/3 completed
🔄 calendar#50 - Calendar Integration 🔗
  └─ Tasks: 1/2 completed
✅ #102 - Two-Factor Authentication
  └─ Tasks: 2/2 completed

---
🔗 indicates cross-repository issue
```

### Checklist Generation

Run `/checklist` on any Epic or Feature to generate an interactive checklist:

```markdown
## 📋 Child Issues Checklist

**Progress:** 5/8 completed
**Cross-Repo:** 2 issue(s) from other repositories 🔗

### Tasks

- [x] #103 - Setup OAuth provider
- [ ] #104 - Create login UI
- [x] #105 - Add session management

**From owner/calendar** 🔗
- [ ] calendar#50 - Add OAuth calendar sync
- [x] calendar#51 - Sync calendar events

### Statistics
- **Total:** 8 items
- **Completed:** 5
- **In Progress:** 3
- **Cross-Repository:** 2 🔗
- **Completion Rate:** 62%
```

### Hierarchy Validation

The validator now supports cross-repo parent references:

**Same-repo reference:**
```
Feature: #100
```

**Cross-repo reference:**
```
Feature: owner/calendar#50
```

The validator will:
- Check if the referenced issue exists
- Verify it has the correct type (Epic, Feature, etc.)
- Warn if GitHub's native parent link differs from the body reference
- Provide helpful error messages

## 🔄 Scheduled Sync

The sync workflow runs every 6 hours to ensure all cross-repo children stay synchronized:

- Checks all open Epics and Features
- Verifies cross-repo children are in the project
- Syncs Type field, Iteration, and Milestone
- Logs all actions to an automation log issue

### Manual Sync

Trigger a manual sync:

1. Go to Actions → Sync Cross-Repo Issues
2. Click "Run workflow"
3. Choose sync type:
   - **Incremental**: Only open issues
   - **Full**: All issues (open and closed)

## 🎯 Best Practices

### 1. Use Consistent Title Prefixes

Always use the correct prefix in issue titles:
- `[EPIC]` for Epics
- `[FEATURE]` for Features
- `[TASK]` for Tasks
- `[STORY]` for User Stories
- `[BUG]` for Bugs

### 2. Link Issues Promptly

Link child issues to parents as soon as possible to ensure automations run before work begins.

### 3. Keep Parent Issues Updated

When you update milestones or iterations on parent issues, the scheduled sync will propagate changes to children within 6 hours (or run manual sync).

### 4. Monitor Automation Logs

Check the "🔄 Cross-Repo Automation Log" issue periodically for any errors or warnings.

### 5. Use Cross-Repo References Sparingly

While you CAN reference parents across repos (e.g., `Feature: owner/other-repo#123`), it's cleaner to keep the hierarchy rooted in the plan repo:
- ✅ Epic in `plan` → Feature in `plan` → Task in `calendar`
- ⚠️ Epic in `calendar` → Feature in `plan` → Task in `backend`

## 🐛 Troubleshooting

### Issue Not Added to Project

**Symptom:** Cross-repo child issue doesn't appear in project board

**Solutions:**
1. Check workflow run logs in Actions tab
2. Verify token has access to both repositories
3. Manually trigger sync workflow
4. Check that project name is configured correctly

### Labels Not Copied

**Symptom:** Labels from parent not appearing on child

**Solutions:**
1. Ensure labels exist in child repository (create them if needed)
2. Only `priority:*`, `team:*`, `component:*`, `size:*` labels are copied
3. Other labels are repository-specific

### Milestone Not Copied

**Symptom:** Milestone not set on child issue

**Solutions:**
1. Ensure milestone with same name exists in child repository
2. Create matching milestones across repositories if needed
3. Check workflow logs for errors

### Validation Errors

**Symptom:** Hierarchy validator shows errors

**Solutions:**
1. Check issue body has correct parent reference format
2. Verify parent issue exists and is accessible
3. Use `/checklist` to see actual linked children vs. body references

## 📈 Monitoring

### Key Metrics to Track

1. **Automation Success Rate**
   - Check "Cross-Repo Automation Summary" comments on parent issues
   - Review sync log issue for errors

2. **Cross-Repo Coverage**
   - Use `/progress` to see what percentage of tasks are cross-repo
   - Check automation log for skipped issues

3. **Response Time**
   - Workflow typically completes in 10-30 seconds
   - Longer times may indicate rate limiting

### Workflow Runs

Monitor workflow runs in the Actions tab:
- `Cross-Repo Issue Automation` - Runs on each parent-child link
- `Sync Cross-Repo Issues` - Runs every 6 hours
- `Epic Progress Tracker` - Runs weekly + on-demand
- `Issue Checklist Generator` - Runs on Epic/Feature creation + on-demand

## 🔐 Security Considerations

### Token Permissions

The automation token has write access to multiple repositories. To minimize risk:

1. Use a GitHub App instead of PAT (better auditability)
2. Limit app installations to necessary repositories
3. Use organization-level tokens, not personal accounts
4. Rotate tokens periodically

### Rate Limiting

The automation includes delays to avoid hitting rate limits:
- 500ms delay between API calls
- Respects GitHub's secondary rate limits
- Automatic backoff on rate limit errors

## 🎓 Advanced Usage

### Custom Field Mapping

To add custom field synchronization, edit `.github/scripts/cross-repo-helper.js` and add functions for your custom fields.

### Workflow Customization

Each workflow can be customized:
- Change delay times in `DELAY_MS` constants
- Modify which labels are inherited in `filterInheritableLabels()`
- Adjust sync schedule in `sync-cross-repo-issues.yml`

### Extending Automations

Add custom automations by:
1. Adding functions to `cross-repo-helper.js`
2. Calling them in `cross-repo-automation.yml`
3. Testing with manual workflow dispatch

## 📚 Related Documentation

- [Issue Management System](./ISSUE_MANAGEMENT.md) - Overview of issue hierarchy
- [Workflow Documentation](../workflows/) - Individual workflow details
- [GitHub Projects API](https://docs.github.com/en/graphql/reference/objects#projectv2) - API reference

## 🤝 Support

If you encounter issues:

1. Check workflow run logs in Actions tab
2. Review the automation log issue
3. Run manual sync to force updates
4. Check token permissions
5. Verify project and repository access

---

*Generated for the plan repository issue management system*

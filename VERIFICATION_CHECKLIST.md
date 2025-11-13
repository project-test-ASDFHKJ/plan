# Cross-Repo Automation Verification Checklist

Use this checklist to verify that cross-repository automation is working correctly.

## 📋 Pre-Deployment Verification (plan-test)

### Setup
- [ ] Helper script exists: `.github/scripts/cross-repo-helper.js`
- [ ] Main workflow exists: `.github/workflows/cross-repo-automation.yml`
- [ ] Sync workflow exists: `.github/workflows/sync-cross-repo-issues.yml`
- [ ] Enhanced progress tracker: `.github/workflows/epic-progress-tracker.yml`
- [ ] Enhanced checklist generator: `.github/workflows/issue-checklist-generator.yml`
- [ ] Enhanced hierarchy validator: `.github/workflows/issue-hierarchy-validator.yml`
- [ ] Documentation exists: `.github/CROSS_REPO_AUTOMATION.md`
- [ ] Setup guide exists: `.github/SETUP_CROSS_REPO.md`

### Configuration
- [ ] Project name set in `cross-repo-automation.yml`
- [ ] Project name set in `sync-cross-repo-issues.yml`
- [ ] Token configured in repository secrets (if needed)

### Basic Functionality Test

#### 1. Create Test Epic
- [ ] Create Epic in plan-test: `[EPIC] Cross-Repo Test Epic`
- [ ] Epic automatically added to project
- [ ] Epic Type field set to "Epic"

#### 2. Create External Test Task
- [ ] Create Task in another repo: `[TASK] External Test Task`
- [ ] Task has title prefix `[TASK]`

#### 3. Link Task to Epic
- [ ] Go to Task issue
- [ ] Use GitHub's parent-child feature to link to Epic
- [ ] Confirm link created successfully

#### 4. Verify Automation Triggered
- [ ] Go to Actions tab in plan-test repo
- [ ] Find "Cross-Repo Issue Automation" workflow run
- [ ] Workflow run shows as successful (green checkmark)
- [ ] Workflow took <1 minute to complete

#### 5. Verify Task Configuration
- [ ] Task added to EngageMe project (check project board)
- [ ] Task Type field set to "Task"
- [ ] Task has automation comment (from cross-repo-automation)
- [ ] Epic has summary comment (listing processed children)

#### 6. Test Progress Tracking
- [ ] Go to Epic issue
- [ ] Add comment: `/progress`
- [ ] Wait for bot response (~30 seconds)
- [ ] Progress report includes external Task
- [ ] External Task shown with 🔗 indicator
- [ ] Report shows correct repo name (e.g., `owner/repo#123`)

#### 7. Test Checklist Generation
- [ ] Go to Epic issue
- [ ] Add comment: `/checklist`
- [ ] Wait for bot response (~30 seconds)
- [ ] Checklist includes external Task
- [ ] External Task grouped under "From owner/repo" section
- [ ] Checklist shows 🔗 indicator
- [ ] Completion stats include cross-repo issues

#### 8. Test Milestone Inheritance (Optional)
- [ ] Create milestone in plan-test repo
- [ ] Set milestone on Epic
- [ ] Create matching milestone in external repo (same name)
- [ ] Link new task from external repo to Epic
- [ ] Verify new task gets milestone automatically

#### 9. Test Label Inheritance
- [ ] Add labels to Epic: `priority: high`, `team: backend`
- [ ] Link new task from external repo to Epic
- [ ] Verify task gets `priority: high` label (if it exists in external repo)
- [ ] Verify task gets `team: backend` label (if it exists in external repo)

#### 10. Test Scheduled Sync
- [ ] Go to Actions tab
- [ ] Find "Sync Cross-Repo Issues" workflow
- [ ] Click "Run workflow"
- [ ] Select "Incremental sync"
- [ ] Verify workflow completes successfully
- [ ] Check for automation log issue with summary

### Advanced Tests

#### Cross-Repo Feature Linking
- [ ] Create Feature in plan-test: `[FEATURE] Cross-Repo Test Feature`
- [ ] Link Feature to Epic
- [ ] Create Task in external repo: `[TASK] Feature Child Task`
- [ ] Link Task to Feature
- [ ] Verify automation runs for both relationships
- [ ] Run `/progress` on Feature - shows Task
- [ ] Run `/progress` on Epic - shows Feature AND Task

#### Hierarchy Validation
- [ ] Create Task with body: `Feature: owner/external-repo#123`
- [ ] Verify validator recognizes cross-repo reference
- [ ] Verify validator checks if reference exists
- [ ] Verify validator confirms correct hierarchy

#### Error Handling
- [ ] Link task from repo where token has no access
- [ ] Verify workflow logs show clear error message
- [ ] Verify Epic gets summary comment with error listed
- [ ] Verify workflow doesn't crash (completes with warning)

## 🚀 Production Deployment Verification (plan)

After copying files to production `plan` repository:

### Setup Verification
- [ ] All files copied to plan repo
- [ ] Project name updated in workflows
- [ ] Token/secrets configured
- [ ] Workflows enabled in repository settings

### Production Smoke Test
- [ ] Create production Epic
- [ ] Link external task
- [ ] Verify automation runs
- [ ] Check task appears in project
- [ ] Run `/progress` - includes external task
- [ ] Run `/checklist` - includes external task

### Team Notification
- [ ] Document cross-repo feature for team
- [ ] Share setup guide with relevant stakeholders
- [ ] Announce new capability in team channels
- [ ] Provide example of how to link cross-repo issues

## 📊 Ongoing Monitoring

### Weekly Checks
- [ ] Review automation log issue
- [ ] Check for failed workflow runs
- [ ] Verify scheduled sync is running every 6 hours
- [ ] Spot-check cross-repo issues in project

### Monthly Audits
- [ ] Review token expiration dates
- [ ] Check that all expected repos are accessible
- [ ] Verify project field configurations still correct
- [ ] Review and update documentation if needed

## ❌ Troubleshooting Scenarios

If something doesn't work, check these:

### Workflow Doesn't Trigger
- [ ] Workflows enabled in Settings → Actions
- [ ] Issue was linked using GitHub's native parent-child (not task lists)
- [ ] Workflow file syntax is valid (check for YAML errors)

### Permission Errors
- [ ] Token has `repo` and `project` scopes
- [ ] Token has access to external repository
- [ ] Token has access to organization-level project
- [ ] GitHub App installed on all relevant repos

### Issue Not Added to Project
- [ ] Project name spelled correctly in workflow
- [ ] Project is organization-level (not user-level)
- [ ] External repo is in same organization
- [ ] Check workflow logs for specific error

### Fields Not Set
- [ ] Field names match exactly (case-sensitive)
- [ ] Project has the expected fields (Type, Iteration, etc.)
- [ ] Field options exist (e.g., "Task" option in Type field)
- [ ] Check workflow logs for GraphQL errors

### Labels/Milestones Not Copied
- [ ] Labels exist in external repo
- [ ] Milestone exists with exact same name
- [ ] Labels have inheritable prefixes (priority:, team:, etc.)
- [ ] Check workflow logs for warnings

## ✅ Success Criteria

Your cross-repo automation is working correctly if:

1. ✅ External issues are automatically added to project when linked
2. ✅ External issues have Type field set correctly
3. ✅ External issues inherit milestones from parents (when they exist)
4. ✅ External issues inherit iterations from parents
5. ✅ External issues get relevant labels from parents
6. ✅ Progress reports include external issues with correct indicators
7. ✅ Checklists group external issues by repository
8. ✅ Hierarchy validator recognizes cross-repo references
9. ✅ Scheduled sync runs successfully every 6 hours
10. ✅ Automation log tracks all operations

## 📝 Notes

Use this space to track any customizations or specific issues for your setup:

```
Date: _______________
Tester: _______________

Notes:
-
-
-

Issues Found:
-
-
-

Resolutions:
-
-
-
```

---

**Version**: 1.0
**Last Updated**: November 13, 2025
**Status**: Ready for Testing

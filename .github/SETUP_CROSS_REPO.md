# Cross-Repo Automation Setup Guide

Quick guide to enable cross-repository issue automation in your plan repository.

## 📋 Prerequisites

- [ ] Organization admin access (to create GitHub App or PAT)
- [ ] Access to all repositories that will participate in cross-repo automation
- [ ] A GitHub Project (v2) where issues will be managed

## 🚀 Setup Steps

### Step 1: Create Authentication Token

You need a token with cross-repository access. Choose one option:

#### Option A: Personal Access Token (Quick Setup)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set these scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `project` (Full control of projects)
   - ✅ `read:org` (Read org and team membership)
4. Click "Generate token" and copy it
5. Go to your plan repository → Settings → Secrets and variables → Actions
6. Click "New repository secret"
7. Name: `CROSS_REPO_TOKEN`
8. Value: paste your token
9. Click "Add secret"

**Note:** If your default `GITHUB_TOKEN` already has org-wide permissions, you may be able to skip this step. Test first.

#### Option B: GitHub App (Recommended for Production)

1. Go to Organization Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Set these fields:
   - **Name**: `Cross-Repo Issue Automation`
   - **Homepage URL**: Your organization URL
   - **Webhook**: Uncheck "Active"
   - **Repository permissions**:
     - Issues: Read & Write
     - Metadata: Read-only
   - **Organization permissions**:
     - Projects: Read & Write
4. Click "Create GitHub App"
5. Note the App ID
6. Generate a private key and download it
7. Install the app in your organization (on all relevant repos)
8. Note the Installation ID (from installation URL)
9. Add these secrets to your plan repository:
   - `GH_APP_ID` - The app ID
   - `GH_APP_PRIVATE_KEY` - Contents of the private key file
   - `GH_APP_INSTALLATION_ID` - The installation ID

10. Update workflows to use the app authentication (see below)

### Step 2: Configure Project Name

Edit these workflow files and set your project name:

**`.github/workflows/cross-repo-automation.yml`**
```javascript
const PROJECT_NAME = 'EngageMe';  // Change to YOUR project name
```

**`.github/workflows/sync-cross-repo-issues.yml`**
```javascript
const PROJECT_NAME = 'EngageMe';  // Change to YOUR project name
```

### Step 3: Update Token Reference (if using GitHub App)

If you created a GitHub App in Step 1 Option B, update the workflows to use app authentication:

**In each workflow file**, change:
```yaml
github-token: ${{ secrets.GITHUB_TOKEN }}
```

To:
```yaml
github-token: ${{ secrets.CROSS_REPO_TOKEN }}
```

Or implement GitHub App token generation (more complex, see GitHub docs).

### Step 4: Copy Files to Your Plan Repository

Copy these files from `plan-test` to your actual `plan` repository:

```bash
# Copy helper script
cp plan-test/.github/scripts/cross-repo-helper.js plan/.github/scripts/

# Copy workflows
cp plan-test/.github/workflows/cross-repo-automation.yml plan/.github/workflows/
cp plan-test/.github/workflows/sync-cross-repo-issues.yml plan/.github/workflows/

# Copy enhanced workflows (replace existing ones)
cp plan-test/.github/workflows/epic-progress-tracker.yml plan/.github/workflows/
cp plan-test/.github/workflows/issue-checklist-generator.yml plan/.github/workflows/
cp plan-test/.github/workflows/issue-hierarchy-validator.yml plan/.github/workflows/

# Copy documentation
cp plan-test/.github/CROSS_REPO_AUTOMATION.md plan/.github/
cp plan-test/.github/ISSUE_MANAGEMENT.md plan/.github/
```

### Step 5: Commit and Push

```bash
cd plan
git add .github/
git commit -m "Add cross-repository issue automation"
git push
```

### Step 6: Test the Setup

1. **Create a test Epic in your plan repo**:
   ```
   Title: [EPIC] Cross-Repo Test
   Body: Testing cross-repo automation
   ```

2. **Create a test Task in another repo** (e.g., `calendar`):
   ```
   Title: [TASK] Test cross-repo linking
   Body: Testing automation
   ```

3. **Link the task to the epic**:
   - Go to the task issue in the `calendar` repo
   - Click the "Parents" section (or use the issue sidebar)
   - Search for and select the Epic from the `plan` repo
   - Assign it as a child issue

4. **Check automation results**:
   - Go to Actions tab in `plan` repo
   - Check the "Cross-Repo Issue Automation" workflow run
   - Verify it completed successfully
   - Check the Epic issue for automation summary comment
   - Check the Task issue in `calendar` repo:
     - Should be added to your project
     - Should have Type set to "Task"
     - Should have automation comment

5. **Test progress tracking**:
   - Go to the Epic issue
   - Comment: `/progress`
   - Verify the progress report includes the cross-repo task

6. **Test checklist**:
   - Go to the Epic issue
   - Comment: `/checklist`
   - Verify the checklist includes the cross-repo task

## ✅ Verification Checklist

After setup, verify these items:

- [ ] Cross-repo workflow exists in `.github/workflows/cross-repo-automation.yml`
- [ ] Sync workflow exists in `.github/workflows/sync-cross-repo-issues.yml`
- [ ] Helper script exists in `.github/scripts/cross-repo-helper.js`
- [ ] Enhanced workflows are in place (progress tracker, checklist, validator)
- [ ] Token/App credentials are configured in repository secrets
- [ ] Project name is correctly set in workflows
- [ ] Test Epic and Task are created and linked
- [ ] Automation workflow ran successfully
- [ ] Cross-repo task appears in project board
- [ ] Cross-repo task has correct Type field
- [ ] Progress report includes cross-repo task
- [ ] Checklist includes cross-repo task

## 🐛 Troubleshooting

### Workflow Doesn't Trigger

**Problem:** Workflow doesn't run when linking issues

**Solutions:**
1. Check that workflows are enabled in repository settings
2. Verify the workflow file syntax (use GitHub's workflow editor)
3. Check that `issues: edited` trigger is present
4. Try manual trigger via workflow_dispatch

### Permission Errors

**Problem:** "Resource not accessible by integration" error

**Solutions:**
1. Verify token has `repo` and `project` scopes
2. Check that token/app has access to target repository
3. For GitHub App: verify app is installed on target repo
4. Check organization permissions if using fine-grained PAT

### Issue Not Added to Project

**Problem:** Cross-repo issue not appearing in project

**Solutions:**
1. Check workflow logs for errors
2. Verify project name is correct in workflow
3. Ensure project is organization-level (not user-level)
4. Check that issue's repository is in the same organization

### Labels Not Copying

**Problem:** Labels from parent not on child issue

**Solutions:**
1. Create matching labels in child repository
2. Check that labels have inheritable prefixes (priority:, team:, etc.)
3. Review workflow logs for label-related warnings

### GraphQL Errors

**Problem:** "Field 'sub_issues_summary' doesn't exist" or similar

**Solutions:**
1. Ensure you're using GitHub's native parent-child feature (not task lists)
2. Verify issues are in the same organization
3. Update to latest workflow version

## 📚 Next Steps

After successful setup:

1. **Document for your team**: Let team members know about cross-repo capabilities
2. **Create label standards**: Ensure inheritable labels exist in all repos
3. **Set up milestones**: Create matching milestones across repos if needed
4. **Monitor sync logs**: Check the automation log issue regularly
5. **Customize as needed**: Adjust delays, sync frequency, or inherited fields

## 🔗 Resources

- [Cross-Repo Automation Guide](./CROSS_REPO_AUTOMATION.md) - Full documentation
- [Issue Management System](./ISSUE_MANAGEMENT.md) - Overall system guide
- [GitHub Projects API](https://docs.github.com/en/graphql/reference/objects#projectv2)
- [GitHub Apps Documentation](https://docs.github.com/en/apps)

---

Need help? Check workflow logs in the Actions tab or review error messages in automation comments.

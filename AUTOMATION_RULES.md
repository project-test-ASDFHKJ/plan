# GitHub Project Management Automations

Complete list of all automated rules and workflows for the project management system.

## 🎯 Workflow Files

### 1. **Issue Automation** (`.github/workflows/issue-automation.yml`)
**Triggers:** Issue opened, edited, reopened, closed, milestoned, demilestoned, assigned, unassigned, labeled, unlabeled

**Rules:**
- ✅ **Automatic Type Assignment**
  - Detects type from title prefix: `[EPIC]`, `[FEATURE]`, `[STORY]`, `[Task]`
  - Sets GitHub organizational issue type
  - Sets project board "Type" field
  - Adds issue to `[TEMPLATE] EngageMe` project

- ✅ **Milestone Inheritance (Top-Down Cascade)**
  - Child issues inherit milestone from parent automatically
  - When parent milestone changes, ALL descendants update recursively
  - Example: Change epic milestone → all features, stories, and tasks update

- ✅ **Iteration Inheritance (Automatic)**
  - Child issues inherit iteration from parent automatically on creation
  - Works the same as milestone inheritance
  - Example: Create task under feature with iteration → task gets same iteration

- ✅ **Auto-Close/Reopen Parent Issues**
  - When ALL children close → parent automatically closes
  - When ANY child reopens → parent automatically reopens
  - Cascades up entire hierarchy recursively


- ✅ **Estimate Validation**
  - Applies to: Task and User Story types only
  - If Status = "In Progress" AND Estimate = 0:
    - Adds `needs-estimate` label

  - Removes label once estimate is set

---

### 2. **Scheduled Rollup** (`.github/workflows/scheduled-rollup.yml`)
**Triggers:** Every 5 minutes (cron: `*/5 * * * *`) + manual dispatch

**Rules:**
- ✅ **Automatic Estimate Rollup (Bottom-Up)**
  - Scans ALL issues in repository
  - Builds parent-child relationship map
  - For each parent:
    - Sums all children's Estimate values
    - Sums all children's Remaining values
    - Updates parent fields only if changed
  - Handles deep hierarchies automatically
  - NO manual triggering needed

---

### 3. **Manual Rollup** (`.github/workflows/rollup-estimates.yml`)
**Triggers:** Manual workflow dispatch  OR 'sync' label added to issue

**Rules:**
- ✅ **Single-Issue Rollup (Bottom-Up)**
  - Trigger from specific child issue (via workflow dispatch or 'sync' label)
  - Calculates parent totals
  - Recursively updates entire ancestor chain

  - 'sync' label automatically removed after completion
  - Useful for immediate updates (alternative to scheduled rollup)

---

### 4. **Iteration Cascade** (`.github/workflows/cascade-iteration.yml`)
**Triggers:** Manual workflow dispatch + issue edited

**Rules:**
- ✅ **Iteration Inheritance (Top-Down Cascade)**
  - When parent iteration changes, cascade to ALL descendants
  - Recursively updates grandchildren, great-grandchildren, etc.
 with updated issue list
  - **Note:** Must be triggered manually after setting parent iteration

**Manual Trigger:**
```bash
gh workflow run cascade-iteration.yml -f issue_number=18
```

---

### 5. **Burndown Report** (`.github/workflows/generate-burndown.yml`)
**Triggers:** Every 5 minutes (cron: `*/5 * * * *`) + manual dispatch

**Rules:**
- ✅ **Daily Burndown Chart Generation**
  - Queries all issues and project fields
  - Groups by iteration/sprint
  - Finds active iteration (highest remaining work)
  - Generates PNG chart image (`burndown-chart.png`)
    - Blue filled area: Remaining Work
    - Gray line: Ideal Trend
    - Azure DevOps styling
  - Generates markdown report (`BURNDOWN.md`)
  - Commits both files to repository
  - Single file approach (overwrites daily)

---

## 📋 Automation Summary by Trigger

| Trigger Event | Automations Executed |
|--------------|---------------------|
| **Issue Created** | Type assignment, Milestone inheritance, **Iteration inheritance**, Add to project, Validation |
| **Issue Edited** | Type assignment, Milestone inheritance, **Iteration inheritance**, Validation |
| **Issue Closed** | Auto-close parent (if all siblings closed) |
| **Issue Reopened** | Auto-reopen parent |
| **Milestone Changed** | Cascade to ALL descendants |
| **Every 5 Minutes** | Estimate rollup (all parents), Burndown report generation |
| **Manual** | Single-issue rollup, Manual iteration cascade (for bulk updates), Burndown generation |
| **'sync' Label Added** | Immediate rollup to parents (alternative to manual workflow dispatch) |

---

## 🔄 Inheritance & Propagation Rules

### **Top-Down (Parent → Children):**
1. **Milestone** - ✅ Automatic on issue creation/edit
2. **Iteration** - ✅ **Now automatic on issue creation/edit**

### **Bottom-Up (Children → Parents):**
1. **Estimate** - Automatic every 5 minutes
2. **Remaining** - Automatic every 5 minutes
3. **State** - Automatic on issue close/reopen

---

## 🎨 Field Mappings

| Title Prefix | GitHub Issue Type | Project Type Field |
|-------------|-------------------|-------------------|
| `[EPIC]` | Epic | Epic |
| `[FEATURE]` | Feature | Feature |
| `[STORY]` | User Story | User Story |
| `[Task]` | Task | Task |

---

## ⚙️ Project Fields Used

| Field Name | Type | Auto-Populated By | Updated By |
|-----------|------|------------------|-----------|
| **Type** | Single Select | Issue automation | Issue creation |
| **Estimate** | Number | Rollup (for parents) | Manual (for tasks/stories) |
| **Remaining** | Number | Rollup (for parents) | Manual (for tasks/stories) |
| **Iteration** | Iteration | **Issue automation (inheritance)** | Manual on parent |
| **Status** | Single Select | Manual | Validated by automation |

---

## 🏷️ Labels Created

| Label | When Added | When Removed |
|-------|-----------|-------------|
| `needs-estimate` | Task/Story moves to "In Progress" without Estimate | Estimate is set |
| `sync` | Manually added by user to trigger immediate rollup | Automatically after workflow completes |

---

## 📁 Generated Files

| File | Location | Updated | Purpose |
|------|----------|---------|---------|
| `BURNDOWN.md` | Repository root | Every 5 min | Burndown report with metrics |
| `burndown-chart.png` | Repository root | Every 5 min | Visual burndown chart image |

---

## 🔐 Required Permissions

- **PAT Secret:** `PAT_WITH_PROJECT_ACCESS`
- **Scopes Required:** `project`, `read:org`, `repo`
- **Why:** Organization-level projects require PAT (GITHUB_TOKEN insufficient)

---

## 🚀 Quick Reference

### Automatic (No Action Needed)
- ✅ Type assignment
- ✅ Milestone inheritance
- ✅ **Iteration inheritance** (automatic on issue creation)
- ✅ Estimate/Remaining rollup
- ✅ Auto-close/reopen parents
- ✅ Validation warnings
- ✅ Burndown reports

### Manual Trigger (Optional)
- ⚡ **Bulk iteration cascade** - For updating ALL children after changing parent iteration:
  ```bash
  gh workflow run cascade-iteration.yml -f issue_number=<parent_issue_number>
  ```
  **Note:** New issues automatically inherit iteration, but this is useful for bulk updates
- ⚡ **Immediate rollup** - For urgent updates:
  ```bash
  gh issue edit <issue_number> --add-label "sync"
  ```
  Or add the 'sync' label via GitHub UI - workflow triggers automatically and removes label when done
  ```bash
  gh workflow run rollup-estimates.yml -f issue_number=<child_issue_number>
  ```
- ⚡ **Immediate burndown** - Generate report now:
  ```bash
  gh workflow run generate-burndown.yml
  ```

---

## 💡 Key Benefits

1. **Zero Manual Work** - Most automations run automatically
2. **Real-Time Updates** - 5-minute refresh cycle
3. **Deep Hierarchy Support** - Unlimited nesting depth
4. **Bidirectional Sync** - Top-down inheritance + bottom-up rollups
5. **State Consistency** - Parents close when work completes
6. **Quality Gates** - Validation prevents incomplete planning
7. **Visual Progress** - Professional burndown charts

---

## 📖 Related Documentation

- [Setup Guide](PROJECT_MANAGEMENT_SETUP.md) - Complete setup instructions
- [Issue Templates](.github/ISSUE_TEMPLATE/) - Epic, Feature, Story, Task templates
- [Workflow Files](.github/workflows/) - All automation workflows

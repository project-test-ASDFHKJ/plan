# Issue Automations

All automations run from the `plan` repository only. No workflows needed in other repos.

## Type Setting

**When:** You create or link an issue with `[EPIC]`, `[FEATURE]`, `[STORY]`, or `[TASK]` in the title

**What happens:**
- Type is set automatically based on the title prefix
- Works for all descendants (children, grandchildren, etc.)
- Works across all repositories (plan, calendar, etc.)

**Trigger:** Automatic when editing, or add `sync` label for instant update

## Iteration Inheritance

**When:** A parent issue has an iteration set

**What happens:**
- All descendants inherit the parent's iteration
- Works for all descendants (children, grandchildren, etc.)
- Works across all repositories

**Trigger:** Automatic when editing, or add `sync` label for instant update

## Label Cascade

**When:** You add or remove a label on a parent issue

**What happens:**
- All descendants get the same label added or removed
- Works across all repositories
- `sync` label is not cascaded to children

## Milestone Cascade

**When:** You change the milestone on a parent issue

**What happens:**
- All descendants in the same repository get the updated milestone
- Cross-repository children are skipped (milestones are repo-specific)

## Closing Issues

**When:** You close a parent issue

**What happens:**
- All descendants are closed automatically
- Works across all repositories

**When:** All children of an issue are closed

**What happens:**
- Parent closes automatically

**When:** You reopen a child issue

**What happens:**
- Parent reopens automatically if it was closed

## Estimate Rollup

**When:** Every 15 minutes (automatic) OR when you add `sync` label (instant)

**What happens:**
- Parent's Estimate = sum of all open children's Estimates
- Parent's Remaining = sum of all open children's Remaining
- Works across all repositories
- Closed issues and closed children are ignored
- Rolls up through entire tree (grandchildren → children → parents)

**How to trigger instantly:** Add `sync` label to any parent issue

---

**Note:** All workflows run from the `plan` repository. Other repositories (like `calendar`) don't need any workflows.
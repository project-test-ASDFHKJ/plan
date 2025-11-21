# Bug Fix: Cross-Repo Cycle Detection Issue

## Problem

The cascade-iteration workflow had a critical bug in its cycle-detection logic. The `updatedIssues` Set was storing only issue numbers (`childNumber`) without repository information, causing **collisions across repositories**.

### Example of the Bug

```javascript
// BEFORE (buggy code)
if (updatedIssues.has(childNumber)) {  // ❌ Only checks number
  console.log(`Skipping #${childNumber} (already processed)`);
  continue;
}
updatedIssues.add(childNumber);  // ❌ Only stores number
```

**Problem Scenario:**
- Issue `org/plan#5` is processed and added to Set as `5`
- Issue `org/calendar#5` is encountered later
- The check `updatedIssues.has(5)` returns `true`
- Issue `org/calendar#5` is **incorrectly skipped** thinking it was already processed

### Impact

This bug caused:
1. **Cross-repo issues skipped incorrectly** - Issues with the same number in different repos were treated as duplicates
2. **Incomplete cascading** - Some descendants didn't receive iteration updates
3. **Silent failures** - No error was thrown, just log messages about "already processed"

## Solution

Changed the cycle-detection logic to use **composite keys** that include repository information:

```javascript
// AFTER (fixed code)
const compositeKey = `${childOwner}/${childRepo}#${childNumber}`;  // ✅ Repo-scoped

if (updatedIssues.has(compositeKey)) {  // ✅ Checks with repo info
  console.log(`Skipping ${repoLabel} (already processed)`);
  continue;
}
updatedIssues.add(compositeKey);  // ✅ Stores with repo info
```

### Composite Key Format

```
${owner}/${repo}#${issueNumber}
```

Examples:
- `test-org/plan#5`
- `test-org/calendar#5`
- `other-org/plan#5`

All three are now correctly tracked as separate issues!

## Changes Made

### 1. Updated Function Signature

**File:** `.github/workflows/cascade-iteration.yml`

**Before:**
```javascript
async function updateDescendantsIteration(parentNumber, iteration, depth = 0, updatedIssues = new Set())
```

**After:**
```javascript
async function updateDescendantsIteration(parentNumber, iteration, depth = 0, updatedIssues = new Set(), owner = context.repo.owner, repo = context.repo.repo)
```

**Why:** Function now tracks owner and repo information for proper composite key creation.

### 2. Updated Cycle Detection Logic

**Lines 268-277** (previously 268-273):

**Before:**
```javascript
if (updatedIssues.has(childNumber)) {
  console.log(`${indent}⏭️  Skipping ${repoLabel} (already processed)`);
  continue;
}
updatedIssues.add(childNumber);
```

**After:**
```javascript
// Create composite key for cycle detection (repo-scoped)
const compositeKey = `${childOwner}/${childRepo}#${childNumber}`;

// Avoid infinite loops using composite key
if (updatedIssues.has(compositeKey)) {
  console.log(`${indent}⏭️  Skipping ${repoLabel} (already processed)`);
  continue;
}
updatedIssues.add(compositeKey);
```

### 3. Updated Recursive Call

**Line 313** (previously 309):

**Before:**
```javascript
await updateDescendantsIteration(childNumber, iteration, depth + 1, updatedIssues);
```

**After:**
```javascript
await updateDescendantsIteration(childNumber, iteration, depth + 1, updatedIssues, childOwner, childRepo);
```

**Why:** Passes repository information to recursive calls for proper tracking.

### 4. Updated Initial Function Call

**Line 331** (previously 327):

**Before:**
```javascript
const updatedDescendants = await updateDescendantsIteration(issueNumber, iteration);
```

**After:**
```javascript
const updatedDescendants = await updateDescendantsIteration(issueNumber, iteration, 0, new Set(), context.repo.owner, context.repo.repo);
```

**Why:** Initializes the function with repository context for the root issue.

### 5. Improved Logging

**Line 256-257** (new):

```javascript
const parentRepoLabel = (owner !== context.repo.owner || repo !== context.repo.repo) ? `${owner}/${repo}#${parentNumber}` : `#${parentNumber}`;
console.log(`${indent}Cascading iteration to descendants of ${parentRepoLabel}...`);
```

**Why:** Log messages now show correct repository information for cross-repo issues.

## Test Coverage

Created comprehensive tests in `tests/unit/cycle-detection.test.js`:

✅ **10 tests covering:**
1. No collision when same issue number exists in different repos
2. Detection of already processed issues
3. Allowing same issue number from different repos
4. Correct composite key format
5. Cross-repo hierarchy without collisions
6. Prevention of infinite loops with circular references
7. Cross-repo with different owners
8. Composite key formatting for same repo
9. Composite key formatting for cross-repo
10. Display label formatting

**All tests pass!**

## Verification

```bash
# Run all tests
npm test

# Output:
Test Suites: 5 passed, 5 total
Tests:       54 passed, 54 total (including 10 new cycle detection tests)
```

## Example Scenarios

### Scenario 1: Cross-Repo Hierarchy

**Before Fix:**
```
org/plan#1 cascades to:
  - org/plan#5 ✅ Updated
  - org/calendar#5 ❌ SKIPPED (thought it was org/plan#5)
```

**After Fix:**
```
org/plan#1 cascades to:
  - org/plan#5 ✅ Updated
  - org/calendar#5 ✅ Updated (correctly recognized as different issue)
```

### Scenario 2: Complex Multi-Level Hierarchy

**Before Fix:**
```
org/plan#1 (Epic)
├─ org/plan#5 (Feature) ✅ Updated
├─ org/calendar#5 (Feature) ❌ SKIPPED
└─ org/docs#5 (Feature) ❌ SKIPPED
```

**After Fix:**
```
org/plan#1 (Epic)
├─ org/plan#5 (Feature) ✅ Updated
├─ org/calendar#5 (Feature) ✅ Updated
└─ org/docs#5 (Feature) ✅ Updated
```

### Scenario 3: Circular References (Still Prevented)

**Before and After (both correct):**
```
org/plan#1 -> org/plan#2 -> org/plan#3 -> org/plan#1
                                             ↑
                                    Correctly detected as cycle,
                                    prevents infinite loop
```

## Related Workflows

Other workflows that might have similar issues (to review):
- ⚠️ `issue-automation.yml` - Multiple functions with cycle detection
- ⚠️ `rollup-estimates.yml` - May have similar pattern
- ⚠️ `scheduled-rollup.yml` - May have similar pattern

**Recommendation:** Review these workflows and apply the same composite key pattern if similar cycle-detection logic exists.

## Migration Notes

### For Existing Deployments

This fix is **backward compatible** - no migration needed. The composite keys are only used internally for cycle detection and don't affect:
- Issue metadata
- Project fields
- Database/storage
- API responses

### Monitoring

After deploying this fix, monitor workflow logs for:
1. ✅ Fewer "already processed" skip messages for cross-repo issues
2. ✅ More issues successfully updated in cross-repo hierarchies
3. ✅ No new infinite loop warnings

### Rollback

If issues arise, revert by:
```bash
git revert <commit-hash>
```

The old behavior will resume (with the original bug, but no new issues introduced).

## Lessons Learned

1. **Always scope cycle detection to unique entities** - Issue numbers alone aren't unique across repositories
2. **Test cross-repository scenarios thoroughly** - Same-repo testing missed this bug
3. **Use composite keys for distributed systems** - When entities span multiple contexts, keys must include all identifying information
4. **Add defensive logging** - Show full repo paths in logs to catch issues early

## References

- **Fixed File:** `.github/workflows/cascade-iteration.yml` (lines 254-331)
- **Test File:** `tests/unit/cycle-detection.test.js`
- **Issue:** Cross-repo cycle detection collision
- **Severity:** High (caused silent failures in cross-repo cascading)
- **Status:** ✅ Fixed and tested

---

**Fix Applied:** 2025-01-21
**Tests Added:** 10 new tests
**Total Tests Passing:** 54/54
**Status:** ✅ Production Ready

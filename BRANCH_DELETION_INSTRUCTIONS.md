# Branch Deletion Instructions

## Overview
This document provides instructions for deleting the redundant branches `Main` and `copilot/validate-index-html-and-configure-pages` after confirming that their content has been safely incorporated into the `main` branch.

## Analysis Summary
See [BRANCH_DELETION_ANALYSIS.md](./BRANCH_DELETION_ANALYSIS.md) for detailed analysis of what content exists in each branch.

**Key Finding**: The `main` branch contains the final, working version of the project. The other branches contain either outdated content (Main) or temporary deployment documentation (copilot/validate-index-html-and-configure-pages).

## Manual Deletion (Recommended)

### Option 1: Using GitHub Web Interface
1. Go to https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/branches
2. Find the branch "Main" and click the trash icon to delete it
3. Find the branch "copilot/validate-index-html-and-configure-pages" and click the trash icon to delete it
4. Confirm each deletion

### Option 2: Using Git Command Line
If you have the repository cloned with proper authentication:

```bash
# Delete Main branch
git push origin --delete Main

# Delete copilot/validate-index-html-and-configure-pages branch  
git push origin --delete copilot/validate-index-html-and-configure-pages
```

### Option 3: Using GitHub CLI
If you have `gh` CLI installed and authenticated:

```bash
# Delete Main branch
gh api -X DELETE /repos/ARCPrivus2026/ARCPrivus-AI-Madre/git/refs/heads/Main

# Delete copilot/validate-index-html-and-configure-pages branch
gh api -X DELETE /repos/ARCPrivus2026/ARCPrivus-AI-Madre/git/refs/heads/copilot/validate-index-html-and-configure-pages
```

## Automated Deletion (Requires Manual Trigger)

A GitHub Actions workflow has been created at `.github/workflows/delete-redundant-branches.yml` that can automatically delete these branches.

To use it:
1. Go to https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/actions
2. Click on "Delete Redundant Branches" workflow in the left sidebar
3. Click "Run workflow" button
4. Type "DELETE" in the confirmation field
5. Click "Run workflow" to execute

## Verification After Deletion

After deleting the branches, verify they are gone:

### Using GitHub Web Interface:
- Visit https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/branches
- Confirm that only the following branches remain:
  - `main` (protected)
  - `copilot/remove-redundant-branches` (current working branch)
  - Any other active feature branches

### Using Git Command Line:
```bash
git fetch --prune
git branch -r
```

## Rollback (If Needed)

If you need to restore a deleted branch:

### For Main branch:
```bash
git checkout -b Main 0627bca4111ec4053e90503bc3d4164cf34ef5b1
git push origin Main
```

### For copilot/validate-index-html-and-configure-pages branch:
```bash
git checkout -b copilot/validate-index-html-and-configure-pages c28ff1f14b0d3bc20da20d30ddf0d8cc070e340d
git push origin copilot/validate-index-html-and-configure-pages
```

Note: You have 30 days (by default) to restore deleted branches before they are permanently removed from GitHub.

## Questions or Issues?

If you have concerns about deleting these branches or need to preserve any content from them:
1. Review the [BRANCH_DELETION_ANALYSIS.md](./BRANCH_DELETION_ANALYSIS.md) document
2. Check the file list in each branch to ensure no important content will be lost
3. Consider creating a backup branch if needed before deletion

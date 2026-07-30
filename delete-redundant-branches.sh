#!/bin/bash
# Script to delete redundant branches from the repository
# Run this script with proper GitHub authentication

set -euo pipefail

echo "=========================================="
echo "Branch Deletion Script"
echo "=========================================="
echo ""
echo "This script will delete the following branches:"
echo "  - Main"
echo "  - copilot/validate-index-html-and-configure-pages"
echo ""
echo "These branches have been analyzed and confirmed to be safe for deletion."
echo "See MERGE_AND_DELETION_STATUS.md for detailed analysis."
echo ""

# Confirm deletion
read -p "Are you sure you want to proceed? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Deletion cancelled."
    exit 0
fi

echo ""
echo "Proceeding with branch deletion..."
echo ""

# Delete Main branch
echo "Deleting branch: Main"
if git push origin --delete Main 2>/dev/null; then
    echo "✓ Successfully deleted branch: Main"
else
    echo "✗ Failed to delete branch: Main (may already be deleted or protected)"
fi

echo ""

# Delete copilot/validate-index-html-and-configure-pages branch
echo "Deleting branch: copilot/validate-index-html-and-configure-pages"
if git push origin --delete copilot/validate-index-html-and-configure-pages 2>/dev/null; then
    echo "✓ Successfully deleted branch: copilot/validate-index-html-and-configure-pages"
else
    echo "✗ Failed to delete branch: copilot/validate-index-html-and-configure-pages (may already be deleted or protected)"
fi

echo ""
echo "=========================================="
echo "Branch deletion process completed"
echo "=========================================="
echo ""
echo "To verify, run: git fetch --prune && git branch -r"
echo ""

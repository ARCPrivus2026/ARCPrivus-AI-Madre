#!/bin/bash

################################################################################
# Script: secure-index.sh
# Description: Ensures the index.html file has correct permissions and ownership
#              to maintain its integrity and prevent unauthorized modifications.
#
# Usage:
#   1. Configure the OWNER and GROUP variables below with your desired values
#   2. Make the script executable: chmod +x secure-index.sh
#   3. Run the script: ./secure-index.sh
#      (Note: You may need to run with sudo for ownership changes)
#
# Features:
#   - Checks if index.html exists before applying changes
#   - Sets file permissions to 644 (owner: rw, group: r, others: r)
#   - Changes file ownership to specified user and group
#   - Provides error handling and status messages
################################################################################

# Configuration - Customize these values before running the script
OWNER="www-data"     # Change to your desired owner (e.g., your username or www-data)
GROUP="www-data"     # Change to your desired group (e.g., your group or www-data)

# File to secure
FILE="index.html"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "[INFO] $1"
}

################################################################################
# Main Script
################################################################################

echo "========================================"
echo "  Secure index.html Script"
echo "========================================"
echo ""

# Check if the file exists
if [ ! -f "$FILE" ]; then
    print_error "File '$FILE' does not exist in the current directory."
    echo ""
    echo "Usage: Run this script from the directory containing index.html"
    exit 1
fi

print_info "Found file: $FILE"
echo ""

# Display current permissions and ownership
print_info "Current file status:"
ls -l "$FILE"
echo ""

# Validate that the user and group exist
if ! id "$OWNER" &>/dev/null; then
    print_error "User '$OWNER' does not exist on this system."
    print_info "Please update the OWNER variable in the script to an existing user."
    exit 1
fi

if ! getent group "$GROUP" &>/dev/null; then
    print_error "Group '$GROUP' does not exist on this system."
    print_info "Please update the GROUP variable in the script to an existing group."
    exit 1
fi

# Confirm configuration
print_info "Configuration:"
echo "  Owner: $OWNER"
echo "  Group: $GROUP"
echo "  Permissions: 644 (rw-r--r--)"
echo ""

# Check if running with sufficient privileges for chown
if [ "$EUID" -ne 0 ] && [ "$(stat -c '%U' "$FILE")" != "$(whoami)" ]; then
    print_warning "You may need to run this script with sudo to change ownership."
    echo ""
fi

# Apply permissions (chmod 644)
print_info "Setting permissions to 644..."
if chmod 644 "$FILE"; then
    print_success "Permissions set successfully to 644 (rw-r--r--)"
else
    print_error "Failed to set permissions"
    exit 1
fi

# Apply ownership (chown)
print_info "Setting ownership to $OWNER:$GROUP..."
CHOWN_OUTPUT=$(chown "$OWNER:$GROUP" "$FILE" 2>&1)
CHOWN_RESULT=$?

if [ $CHOWN_RESULT -eq 0 ]; then
    print_success "Ownership changed successfully to $OWNER:$GROUP"
else
    # Check if we need sudo
    if [ "$EUID" -ne 0 ]; then
        print_warning "Permission denied. Trying with sudo..."
        if sudo chown "$OWNER:$GROUP" "$FILE"; then
            print_success "Ownership changed successfully to $OWNER:$GROUP (with sudo)"
        else
            print_error "Failed to change ownership even with sudo"
            print_info "Please check if the user '$OWNER' and group '$GROUP' exist on your system"
            exit 1
        fi
    else
        print_error "Failed to change ownership: $CHOWN_OUTPUT"
        print_info "Please check if the user '$OWNER' and group '$GROUP' exist on your system"
        exit 1
    fi
fi

echo ""
print_info "Final file status:"
ls -l "$FILE"
echo ""

print_success "File security configuration completed successfully!"
echo ""
echo "Summary:"
echo "  ✓ File permissions set to 644 (owner can read/write, others can only read)"
echo "  ✓ File ownership set to $OWNER:$GROUP"
echo "  ✓ Unauthorized modifications prevented"
echo ""
echo "========================================"

exit 0

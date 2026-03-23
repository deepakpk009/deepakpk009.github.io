#!/bin/bash

# Usage
# Save as check_umami.sh in your project root

# Make it executable:

# bash
# chmod +x check_umami.sh
# Run it:

# bash
# ./check_umami.sh
# ./code_analysis_tools/check_umami.sh

# ─── Configuration ───────────────────────────────────────────
# Add or remove file extensions as needed
# FILE_TYPES=("*.html" "*.php" "*.js" "*.ts" "*.jsx" "*.tsx")
FILE_TYPES=("*.html")

TARGET_STRING="umami.is"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"


# ─── Colors for output ───────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Scanning directory: ${SCRIPT_DIR}${NC}"
echo -e "${YELLOW}Looking for files NOT containing: '${TARGET_STRING}'${NC}"
echo -e "${YELLOW}File types: ${FILE_TYPES[*]}${NC}"
echo "──────────────────────────────────────────────────────────"

MISSING_COUNT=0
FOUND_COUNT=0

# ─── Build the find command with multiple -name patterns ─────
FIND_ARGS=()
for i in "${!FILE_TYPES[@]}"; do
    if [ $i -gt 0 ]; then
        FIND_ARGS+=("-o")
    fi
    FIND_ARGS+=("-name" "${FILE_TYPES[$i]}")
done

# ─── Search and check each file ──────────────────────────────
while IFS= read -r -d '' file; do
    if grep -qF "$TARGET_STRING" "$file"; then
        ((FOUND_COUNT++))
    else
        echo -e "${RED}MISSING${NC} → $file"
        ((MISSING_COUNT++))
    fi
done < <(find "$SCRIPT_DIR" -type f \( "${FIND_ARGS[@]}" \) -print0)

# ─── Summary ─────────────────────────────────────────────────
echo "──────────────────────────────────────────────────────────"
echo -e "${GREEN}Files containing '${TARGET_STRING}':${NC}    ${FOUND_COUNT}"
echo -e "${RED}Files missing '${TARGET_STRING}':${NC}       ${MISSING_COUNT}"

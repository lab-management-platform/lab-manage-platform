#!/bin/bash
# Extract JSX sections from App.tsx into component files
SRC="App.tsx"

# 1. InventoryPanel (lines 1183-1426: dashboard + inventory + applications + stock movements)
sed -n '1183,1426p' "$SRC" > /tmp/inv_jsx.txt
echo "Inventory: $(wc -l < /tmp/inv_jsx.txt) lines"

# 2. FilePanel (lines 1427-1663)
sed -n '1427,1663p' "$SRC" > /tmp/file_jsx.txt
echo "File: $(wc -l < /tmp/file_jsx.txt) lines"

# 3. MeetingPanel (lines 1664-1837)
sed -n '1664,1837p' "$SRC" > /tmp/meet_jsx.txt
echo "Meeting: $(wc -l < /tmp/meet_jsx.txt) lines"

# 4. AccountPanel (lines 1838-2128)
sed -n '1838,2128p' "$SRC" > /tmp/acct_jsx.txt
echo "Account: $(wc -l < /tmp/acct_jsx.txt) lines"

# 5. AIPanel (lines 2129-2454)
sed -n '2129,2454p' "$SRC" > /tmp/ai_jsx.txt
echo "AI: $(wc -l < /tmp/ai_jsx.txt) lines"

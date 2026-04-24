#!/usr/bin/env bash
# run.sh — Aammii Tharcharbu Santhai
# Works on: macOS · Linux · WSL / Git Bash on Windows

set -e
cd "$(dirname "$0")"   # always run from project root

echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║   Aammii Tharcharbu Santhai                          ║"
echo "  ║   Natural Lifestyle Products                         ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""

# ── Find Python 3 ─────────────────────────────────────────────────────────────
PYTHON=""
for cmd in python3 python py; do
  if command -v "$cmd" &>/dev/null; then
    ver=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
    major=$(echo "$ver" | cut -d. -f1)
    if [ "$major" -ge 3 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "  ERROR: Python 3.8+ not found. Install from https://python.org"
  exit 1
fi

echo "  Python $($PYTHON --version 2>&1 | awk '{print $2}')"

# ── Install dependencies ──────────────────────────────────────────────────────
echo "  Installing dependencies..."
"$PYTHON" -m pip install flask flask-cors pdfplumber pillow reportlab --quiet \
  --break-system-packages 2>/dev/null || \
"$PYTHON" -m pip install flask flask-cors pdfplumber pillow reportlab --quiet

echo "  Dependencies ready."

# ── Create required directories ───────────────────────────────────────────────
mkdir -p uploads generated_images orders

# ── Open browser (macOS / Linux) ──────────────────────────────────────────────
open_browser() {
  URL="http://localhost:5000"
  sleep 2
  if command -v open  &>/dev/null; then open  "$URL"; fi   # macOS
  if command -v xdg-open &>/dev/null; then xdg-open "$URL"; fi  # Linux
}
open_browser &

# ── Start Flask server ────────────────────────────────────────────────────────
echo ""
echo "  Server starting → http://localhost:5000"
echo "  Press Ctrl+C to stop."
echo ""

cd backend
"$PYTHON" app.py

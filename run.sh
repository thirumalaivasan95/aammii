#!/usr/bin/env bash
# run.sh — Start the Aammii Shop backend
set -e

echo ""
echo "  🌿  Aammii Natural Shop"
echo "  ─────────────────────────────────"

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "  ❌  Python 3 is required."
  exit 1
fi

# Install dependencies
echo "  📦  Checking dependencies..."
pip install flask pdfplumber pillow pdf2image pytesseract flask-cors \
    --break-system-packages -q 2>/dev/null || \
pip install flask pdfplumber pillow pdf2image pytesseract flask-cors \
    --break-system-packages -q

echo "  ✅  Dependencies OK"
echo ""
echo "  🚀  Starting server at http://localhost:5000"
echo "  📄  Open browser → http://localhost:5000"
echo ""
echo "  ⚠️   IMPORTANT: Always open http://localhost:5000"
echo "       (NOT port 5500 — that's VS Code Live Server)"
echo ""

# Run from the backend folder so relative imports work
cd "$(dirname "$0")/backend"
python3 app.py

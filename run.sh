#!/usr/bin/env bash
# run.sh — Aammii Natural Shop · Production Startup
set -e

echo ""
echo "  🌿  Aammii Natural Shop  ·  Production Build"
echo "  ═══════════════════════════════════════════════"

# ── Python check ──────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "  ❌  Python 3.8+ is required.  Install from python.org"
  exit 1
fi

PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "  ✅  Python $PYVER"

# ── Install dependencies ──────────────────────────────────────────────────
echo "  📦  Checking Python dependencies…"
pip install \
  flask \
  flask-cors \
  razorpay \
  pdfplumber \
  pillow \
  pdf2image \
  pytesseract \
  --break-system-packages -q 2>/dev/null || \
pip install \
  flask \
  flask-cors \
  razorpay \
  pdfplumber \
  pillow \
  pdf2image \
  pytesseract \
  -q

echo "  ✅  All dependencies installed"

# ── Razorpay key reminder ─────────────────────────────────────────────────
echo ""
echo "  💳  PAYMENT SETUP"
echo "  ─────────────────────────────────────────────────"
echo "  To accept live payments, set your Razorpay keys:"
echo "  export RAZORPAY_KEY_ID='rzp_live_XXXXXXXXXXXXXXXX'"
echo "  export RAZORPAY_KEY_SECRET='your_secret_here'"
echo ""
echo "  Sign up free at: https://razorpay.com"
echo "  Supports: GPay · Paytm · UPI · Visa · MC · Amex"
echo "  ─────────────────────────────────────────────────"
echo ""

# ── Create required directories ───────────────────────────────────────────
mkdir -p uploads generated_images orders

# ── Start server ──────────────────────────────────────────────────────────
echo "  🚀  Starting server → http://localhost:5000"
echo "  📱  Open http://localhost:5000 in your browser"
echo ""
echo "  ⚠️   Important: Use port 5000 (not 5500 / Live Server)"
echo ""

cd "$(dirname "$0")/backend"
python3 app.py
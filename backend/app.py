"""
app.py — Aammii Tharcharbu Santhai Backend
E-commerce backend: products, PDF catalogue upload, orders, PDF invoices.

Endpoints:
  GET  /                   → frontend index.html
  GET  /<file>             → frontend static
  GET  /images/<name>      → smart image serve (jpg → jpeg → png → webp → svg)
  GET  /api/products       → list of products
  POST /api/upload         → PDF catalogue parser
  POST /api/mark-new       → mark products as newly added
  POST /api/order          → place order · returns PDF invoice
  GET  /api/orders         → list all orders (most recent first)
  GET  /api/orders/<id>    → single order detail
"""

# ═══════════════════════════════════════════════════════════════
# 1. STARTUP / UTF-8 SAFETY (critical for Tamil text on Windows)
# ═══════════════════════════════════════════════════════════════
import sys, os
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ═══════════════════════════════════════════════════════════════
# 2. IMPORTS & PATHS
# ═══════════════════════════════════════════════════════════════
import json, random, string, datetime, io
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS

BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT = os.path.join(BASE, "frontend")
IMGS  = os.path.join(BASE, "generated_images")
UPL   = os.path.join(BASE, "uploads")
ORD   = os.path.join(BASE, "orders")
PJSON = os.path.join(UPL, "products.json")
OJSON = os.path.join(ORD, "orders.json")

for d in [IMGS, UPL, ORD]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__, static_folder=FRONT)
CORS(app, resources={r"/api/*": {"origins": "*"}})

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

# Optional: reportlab for PDF invoices
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False
    print("  [pdf] reportlab not available — installing it enables PDF invoices", flush=True)

# ═══════════════════════════════════════════════════════════════
# 3. SVG PLACEHOLDER GENERATOR (per-category palette & emoji)
# Image-replacement convention: drop <product-id>.jpg (or .png/.webp)
# into generated_images/ — backend serves real photo over the SVG.
# ═══════════════════════════════════════════════════════════════
CAT_PAL = {
    "Millets & Grains":     ("#5C3A1E", "#C8956C", "🌾"),
    "Pulses & Dals":        ("#3D5A26", "#8EBF62", "🫘"),
    "Sweeteners":           ("#B8860B", "#F4C87A", "🍯"),
    "Honey":                ("#C8820A", "#F9E79F", "🍯"),
    "Beverages":            ("#0E7C6B", "#5CC9B8", "🍵"),
    "Spices":               ("#A02020", "#E07070", "🌶"),
    "Oils & Ghee":          ("#7A3B0A", "#D2A679", "🫙"),
    "Pickles":              ("#3D5A26", "#8EBF62", "🥒"),
    "Salt":                 ("#2D4A6E", "#6E9EC0", "🧂"),
    "Dry Fruits & Nuts":    ("#6B3A12", "#C8956C", "🥜"),
    "Health Mix":           ("#1A4A70", "#7EADCF", "💊"),
    "Healthcare":           ("#7A1E18", "#E07070", "🩺"),
    "Personal Care":        ("#6B2E7A", "#B87ACC", "🌸"),
    "Soap":                 ("#1E6A9A", "#70AACF", "🧼"),
    "Herbal Powder":        ("#2E6040", "#6EA882", "🌿"),
    "Noodles & Vermicelli": ("#C05A10", "#E09050", "🍜"),
    "Vadagam & Appalam":    ("#7A3B0A", "#C8956C", "🥙"),
    "Readymade Mix":        ("#B8860B", "#F4C87A", "🍱"),
    "Face Pack":            ("#6B2E7A", "#B87ACC", "✨"),
    "Seeds":                ("#1E6B38", "#62C882", "🌱"),
    "Divine Products":      ("#6B2E7A", "#B87ACC", "🕯"),
    "Copper Products":      ("#B8860B", "#F4C87A", "🥇"),
    "Wellness Tools":       ("#1E6A9A", "#70AACF", "🧘"),
    "Books & DVDs":         ("#2D4A6E", "#7EADCF", "📚"),
    "Home Care":            ("#1E6B38", "#62C882", "🧴"),
}
_DEF_PAL = ("#2E6040", "#6EA882", "🌿")

def make_svg(name: str, pid: str, cat: str = "") -> str:
    """Create (or return existing) SVG placeholder. Returns /images/<id>.svg path."""
    fp = os.path.join(IMGS, f"{pid}.svg")
    if os.path.exists(fp):
        return f"/images/{pid}.svg"

    bg, ac, em = CAT_PAL.get(cat, _DEF_PAL)
    tamil = name.split(" / ")[0] if " / " in name else name
    eng   = name.split(" / ")[1] if " / " in name else ""
    words = tamil.split()
    l1    = " ".join(words[:3])
    l2    = " ".join(words[3:]) if len(words) > 3 else ""
    en    = eng[:30] + ("…" if len(eng) > 30 else "")
    font  = "Noto Sans Tamil,Latha,Tamil MN,Arial Unicode MS,sans-serif"

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="280" height="210" viewBox="0 0 280 210">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0%" stop-color="{bg}"/><stop offset="100%" stop-color="{ac}"/>'
        f'</linearGradient></defs>'
        f'<rect width="280" height="210" fill="url(#g)" rx="10"/>'
        f'<circle cx="140" cy="70" r="36" fill="rgba(255,255,255,0.12)"/>'
        f'<text x="140" y="86" text-anchor="middle" font-size="36">{em}</text>'
        f'<text x="140" y="130" text-anchor="middle" font-size="13" '
        f'fill="rgba(255,255,255,0.95)" font-family="{font}" font-weight="700">{l1}</text>'
        + (f'<text x="140" y="148" text-anchor="middle" font-size="11" '
           f'fill="rgba(255,255,255,0.82)" font-family="{font}">{l2}</text>' if l2 else "")
        + (f'<text x="140" y="175" text-anchor="middle" font-size="10" '
           f'fill="rgba(255,255,255,0.55)">{en}</text>' if en else "")
        + '</svg>'
    )
    try:
        with open(fp, "w", encoding="utf-8") as f:
            f.write(svg)
    except Exception as e:
        print(f"  [svg] Could not write {pid}.svg: {e}", flush=True)
    return f"/images/{pid}.svg"

# ═══════════════════════════════════════════════════════════════
# 4. PRODUCTS I/O
# ═══════════════════════════════════════════════════════════════
def load_products() -> list:
    if not os.path.exists(PJSON):
        return []
    try:
        with open(PJSON, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []

def save_products(products: list) -> None:
    with open(PJSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

def prebuild_images() -> None:
    prods = load_products()
    count = 0
    for p in prods:
        pid = p.get("id") or p.get("code")
        if pid:
            make_svg(p.get("name", ""), str(pid), p.get("category", ""))
            count += 1
    print(f"  [img] {count} product images ready", flush=True)

# ═══════════════════════════════════════════════════════════════
# 5. ORDERS I/O
# ═══════════════════════════════════════════════════════════════
def load_orders() -> list:
    if not os.path.exists(OJSON):
        return []
    try:
        with open(OJSON, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []

def save_orders(orders: list) -> None:
    with open(OJSON, "w", encoding="utf-8") as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)

def append_order(order: dict) -> None:
    orders = load_orders()
    orders.insert(0, order)
    orders = orders[:500]  # cap at 500 most recent
    save_orders(orders)

# ═══════════════════════════════════════════════════════════════
# 6. STATIC ROUTES
# ═══════════════════════════════════════════════════════════════
@app.route("/")
def idx():
    return send_from_directory(FRONT, "index.html")

@app.route("/<path:f>")
def sf(f):
    return send_from_directory(FRONT, f)

@app.route("/images/<path:fname>")
def img(fname):
    """Smart image serving: real JPG/PNG/WebP takes priority over SVG placeholder."""
    base = os.path.splitext(fname)[0]
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".svg"):
        full = os.path.join(IMGS, base + ext)
        if os.path.exists(full):
            return send_from_directory(IMGS, base + ext)
    return ("Not found", 404)

# ═══════════════════════════════════════════════════════════════
# 7. API: PRODUCTS
# ═══════════════════════════════════════════════════════════════
@app.route("/api/products")
def api_products():
    return jsonify(load_products())

@app.route("/api/upload", methods=["POST"])
def api_upload():
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF provided"}), 400
    pf = request.files["pdf"]
    if not pf.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Must be a .pdf file"}), 400

    pdf_path = os.path.join(UPL, "catalogue.pdf")
    try:
        pf.save(pdf_path)
    except Exception as e:
        return jsonify({"error": f"Could not save PDF: {e}"}), 500

    parsed = []
    try:
        from pdf_parser import parse_pdf
        parsed = parse_pdf(pdf_path) or []
    except ImportError:
        print("  [pdf] pdf_parser module not available", flush=True)
    except Exception as e:
        print(f"  [pdf] parse error: {e}", flush=True)

    if parsed:
        for i, p in enumerate(parsed):
            code = str(p.get("code") or f"PDF-{i+1:03d}").strip()
            p["code"] = code
            p["id"]   = code
            p.setdefault("date_added", datetime.datetime.now(IST).date().isoformat())
            if not p.get("image"):
                p["image"] = make_svg(p.get("name", ""), code, p.get("category", ""))
        save_products(parsed)
        print(f"  [pdf] Parsed {len(parsed)} products from PDF", flush=True)
        return jsonify({
            "count": len(parsed), "products": parsed, "source": "pdf",
            "note": f"Extracted {len(parsed)} products from uploaded PDF"
        })

    prods = load_products()
    if prods:
        return jsonify({
            "count": len(prods), "products": prods, "source": "preloaded",
            "note": f"PDF unparseable — showing {len(prods)} existing products"
        })
    return jsonify({"error": "No products data found."}), 422

@app.route("/api/mark-new", methods=["POST"])
def api_mark_new():
    data    = request.get_json(silent=True) or {}
    ids     = data.get("ids", [])
    if not ids:
        return jsonify({"error": "Provide ids list"}), 400
    prods   = load_products()
    today   = datetime.datetime.now(IST).date().isoformat()
    id_set  = set(str(i) for i in ids)
    updated = 0
    for p in prods:
        if str(p.get("id") or p.get("code")) in id_set:
            p["date_added"] = today
            updated += 1
    save_products(prods)
    return jsonify({"updated": updated, "date": today})

# ═══════════════════════════════════════════════════════════════
# 8. PDF INVOICE GENERATION
# ═══════════════════════════════════════════════════════════════
def find_tamil_font():
    """Return (path, name) of first system Tamil-capable font, or (None, None)."""
    candidates = [
        (r"C:\Windows\Fonts\NirmalaUI.ttf",                       "NirmalaUI"),
        (r"C:\Windows\Fonts\Nirmala.ttf",                         "Nirmala"),
        (r"C:\Windows\Fonts\latha.ttf",                           "Latha"),
        (r"C:\Windows\Fonts\Latha.ttf",                           "Latha"),
        ("/System/Library/Fonts/Supplemental/Tamil MN.ttc",        "TamilMN"),
        ("/Library/Fonts/NotoSansTamil-Regular.ttf",               "NotoTamil"),
        ("/usr/share/fonts/truetype/noto/NotoSansTamil-Regular.ttf","NotoTamil"),
        ("/usr/share/fonts/noto/NotoSansTamil-Regular.ttf",        "NotoTamil"),
        ("/usr/share/fonts/TTF/NotoSansTamil-Regular.ttf",         "NotoTamil"),
    ]
    for path, name in candidates:
        if os.path.exists(path):
            return path, name
    return None, None

_TAMIL_FONT_NAME = None
def ensure_tamil_font():
    """Register a Tamil-capable font once; return the font name (or None)."""
    global _TAMIL_FONT_NAME
    if _TAMIL_FONT_NAME is not None:
        return _TAMIL_FONT_NAME or None
    if not REPORTLAB_OK:
        _TAMIL_FONT_NAME = ""
        return None
    path, name = find_tamil_font()
    if path:
        try:
            pdfmetrics.registerFont(TTFont(name, path))
            _TAMIL_FONT_NAME = name
            print(f"  [pdf] Tamil font registered: {name} ({path})", flush=True)
            return name
        except Exception as e:
            print(f"  [pdf] Font register failed: {e}", flush=True)
    _TAMIL_FONT_NAME = ""
    return None


def build_pdf_invoice(order: dict) -> bytes:
    """Generate a professional A4 PDF invoice with selectable Tamil + English text."""
    if not REPORTLAB_OK:
        return build_text_invoice(order).encode("utf-8")

    tamil_font = ensure_tamil_font()
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    M = 15 * mm  # margin

    # ── Theme colours ──
    FOREST = colors.HexColor("#14532D")
    AMBER  = colors.HexColor("#D97706")
    GOLD   = colors.HexColor("#FBBF24")
    TEXT   = colors.HexColor("#151F1A")
    MUTED  = colors.HexColor("#6A7A71")
    BORDER = colors.HexColor("#E2DED3")
    LIGHT  = colors.HexColor("#F5F3EC")

    def set_font(size, bold=False, tamil=False):
        if tamil and tamil_font:
            c.setFont(tamil_font, size)
        elif bold:
            c.setFont("Helvetica-Bold", size)
        else:
            c.setFont("Helvetica", size)

    def draw_line(x1, y1, x2, y2, col=BORDER, w=0.5):
        c.setStrokeColor(col); c.setLineWidth(w); c.line(x1, y1, x2, y2)

    # ── Header band ──
    c.setFillColor(FOREST)
    c.rect(0, H - 42 * mm, W, 42 * mm, fill=1, stroke=0)
    # Accent stripe
    c.setFillColor(AMBER)
    c.rect(0, H - 44 * mm, W, 2 * mm, fill=1, stroke=0)

    c.setFillColor(GOLD)
    set_font(26, bold=True)
    c.drawString(M, H - 20 * mm, "AAMMII")
    set_font(12, bold=True)
    c.drawString(M, H - 27 * mm, "THARCHARBU SANTHAI")
    set_font(9)
    c.setFillColor(colors.white)
    c.drawString(M, H - 33 * mm, "Natural Lifestyle Products · Farm-direct from Tamil Nadu")
    c.drawString(M, H - 38 * mm, "www.aammii.com  ·  +91 95006 55548  ·  orders@aammii.com")

    # INVOICE label (top-right)
    set_font(16, bold=True)
    c.setFillColor(GOLD)
    c.drawRightString(W - M, H - 20 * mm, "TAX INVOICE")
    set_font(9)
    c.setFillColor(colors.white)
    c.drawRightString(W - M, H - 27 * mm, f"Order ID: {order.get('id','')}")
    dt = datetime.datetime.fromtimestamp(order.get("created", 0) / 1000 or datetime.datetime.now().timestamp(), IST) \
        if isinstance(order.get("created"), (int, float)) else datetime.datetime.now(IST)
    c.drawRightString(W - M, H - 32 * mm, dt.strftime("Date: %d %b %Y · %H:%M IST"))
    c.drawRightString(W - M, H - 37 * mm, f"Payment: {order.get('payment','COD').upper()}")

    # ── Customer / Delivery block ──
    y = H - 55 * mm
    cust = order.get("customer", {})

    c.setFillColor(LIGHT)
    c.roundRect(M, y - 30 * mm, (W - 2 * M) / 2 - 4, 32 * mm, 3, fill=1, stroke=0)
    c.roundRect(M + (W - 2 * M) / 2 + 4, y - 30 * mm, (W - 2 * M) / 2 - 4, 32 * mm, 3, fill=1, stroke=0)

    set_font(8, bold=True); c.setFillColor(MUTED)
    c.drawString(M + 4 * mm, y - 4 * mm, "BILLED & SHIP TO")
    set_font(11, bold=True); c.setFillColor(TEXT)
    c.drawString(M + 4 * mm, y - 10 * mm, safe_text(cust.get("name", "Guest")))
    set_font(9); c.setFillColor(TEXT)
    c.drawString(M + 4 * mm, y - 15 * mm, safe_text(cust.get("phone", "")))
    c.drawString(M + 4 * mm, y - 20 * mm, safe_text(cust.get("email", "")))
    # Address wrap
    addr = safe_text(cust.get("address", ""))
    for i, ln in enumerate(wrap_text(addr, 48)[:3]):
        c.drawString(M + 4 * mm, y - (25 + i * 4) * mm, ln)

    # Order info block (right)
    x2 = M + (W - 2 * M) / 2 + 4
    set_font(8, bold=True); c.setFillColor(MUTED)
    c.drawString(x2 + 4 * mm, y - 4 * mm, "ORDER INFO")
    set_font(9); c.setFillColor(TEXT)
    totals = order.get("totals", {})
    pay = order.get("payment", "COD")
    rows = [
        ("Order ID",  order.get("id", "—")),
        ("Status",    "Confirmed"),
        ("Items",     str(sum(i.get("qty", 0) for i in order.get("items", [])))),
        ("Payment",   pay.upper()),
        ("Subtotal",  f"₹{totals.get('subtotal', 0):.2f}"),
        ("Shipping",  f"₹{totals.get('shipping', 0):.2f}" if totals.get("shipping") else "FREE"),
    ]
    for i, (k, v) in enumerate(rows):
        c.setFillColor(MUTED); c.drawString(x2 + 4 * mm, y - (10 + i * 4) * mm, k)
        c.setFillColor(TEXT);  c.drawRightString(x2 + (W - 2 * M) / 2 - 8, y - (10 + i * 4) * mm, safe_text(v))

    # ── Items table ──
    y_table = y - 38 * mm
    # Header row
    c.setFillColor(FOREST)
    c.rect(M, y_table - 7 * mm, W - 2 * M, 7 * mm, fill=1, stroke=0)
    c.setFillColor(GOLD); set_font(9, bold=True)
    # Column positions
    col_code  = M + 3 * mm
    col_name  = M + 28 * mm
    col_qty   = W - M - 62 * mm
    col_price = W - M - 40 * mm
    col_total = W - M - 3 * mm

    c.drawString(col_code,  y_table - 5 * mm, "CODE")
    c.drawString(col_name,  y_table - 5 * mm, "PRODUCT")
    c.drawRightString(col_qty + 16 * mm, y_table - 5 * mm, "QTY")
    c.drawRightString(col_price + 24 * mm, y_table - 5 * mm, "UNIT ₹")
    c.drawRightString(col_total, y_table - 5 * mm, "TOTAL ₹")

    # Rows
    row_y = y_table - 7 * mm
    items = order.get("items", [])
    for idx, it in enumerate(items):
        row_h = 11 * mm
        if row_y - row_h < 50 * mm:
            # Page break
            c.showPage()
            row_y = H - 25 * mm

        # Zebra stripe
        if idx % 2 == 0:
            c.setFillColor(LIGHT)
            c.rect(M, row_y - row_h, W - 2 * M, row_h, fill=1, stroke=0)

        full_name = safe_text(it.get("name", ""))
        tam, eng = (full_name.split(" / ", 1) + [""])[:2]
        qty = int(it.get("qty", 1))
        price = float(it.get("price", 0))
        amt = qty * price
        code = safe_text(it.get("code", it.get("id", "—")))

        set_font(8); c.setFillColor(TEXT)
        c.drawString(col_code, row_y - 4 * mm, code[:10])

        # Tamil name (requires Tamil font to render glyphs; always selectable as text)
        set_font(10, tamil=True, bold=True)
        c.setFillColor(TEXT)
        c.drawString(col_name, row_y - 4 * mm, tam[:40])
        if eng:
            set_font(8)
            c.setFillColor(MUTED)
            c.drawString(col_name, row_y - 8 * mm, eng[:60])

        set_font(9); c.setFillColor(TEXT)
        c.drawRightString(col_qty + 16 * mm,   row_y - 4 * mm, str(qty))
        c.drawRightString(col_price + 24 * mm, row_y - 4 * mm, f"{price:.2f}")
        c.drawRightString(col_total,           row_y - 4 * mm, f"{amt:.2f}")

        draw_line(M, row_y - row_h, W - M, row_y - row_h)
        row_y -= row_h

    # ── Totals panel ──
    y_tot = row_y - 6 * mm
    totals = order.get("totals", {})
    subtotal = totals.get("subtotal", sum(i.get("qty", 1) * i.get("price", 0) for i in items))
    shipping = totals.get("shipping", 0)
    tax      = totals.get("tax", 0)
    grand    = totals.get("grand", subtotal + shipping + tax)

    panel_x = W - M - 80 * mm
    panel_w = 80 * mm
    c.setFillColor(LIGHT)
    c.roundRect(panel_x, y_tot - 34 * mm, panel_w, 34 * mm, 3, fill=1, stroke=0)

    set_font(9); c.setFillColor(MUTED)
    c.drawString(panel_x + 4 * mm, y_tot - 6 * mm, "Subtotal")
    c.setFillColor(TEXT); c.drawRightString(panel_x + panel_w - 4 * mm, y_tot - 6 * mm, f"₹{subtotal:.2f}")

    c.setFillColor(MUTED)
    c.drawString(panel_x + 4 * mm, y_tot - 12 * mm, "Shipping")
    c.setFillColor(TEXT); c.drawRightString(panel_x + panel_w - 4 * mm, y_tot - 12 * mm,
        f"₹{shipping:.2f}" if shipping else "FREE")

    c.setFillColor(MUTED)
    c.drawString(panel_x + 4 * mm, y_tot - 18 * mm, "GST (5%)")
    c.setFillColor(TEXT); c.drawRightString(panel_x + panel_w - 4 * mm, y_tot - 18 * mm, f"₹{tax:.2f}")

    draw_line(panel_x + 3 * mm, y_tot - 22 * mm, panel_x + panel_w - 3 * mm, y_tot - 22 * mm, col=BORDER, w=0.7)
    set_font(12, bold=True); c.setFillColor(FOREST)
    c.drawString(panel_x + 4 * mm, y_tot - 29 * mm, "GRAND TOTAL")
    c.drawRightString(panel_x + panel_w - 4 * mm, y_tot - 29 * mm, f"₹{grand:.2f}")

    # ── Payment info & thank you ──
    y_pay = y_tot - 45 * mm
    set_font(9, bold=True); c.setFillColor(FOREST)
    c.drawString(M, y_pay, "PAYMENT OPTIONS")
    set_font(8); c.setFillColor(TEXT)
    c.drawString(M, y_pay - 5 * mm, "UPI / GPay / PhonePe:  aammii@upi")
    c.drawString(M, y_pay - 10 * mm, "Cash on Delivery:      Available in select pincodes")
    c.drawString(M, y_pay - 15 * mm, "Bank:                  Aammii Tharcharbu Santhai  · A/C 1234567890  · IFSC HDFC0000123")

    # Notes
    if cust.get("notes"):
        set_font(9, bold=True); c.setFillColor(FOREST)
        c.drawString(M, y_pay - 25 * mm, "NOTES")
        set_font(8); c.setFillColor(TEXT)
        for i, ln in enumerate(wrap_text(safe_text(cust.get("notes", "")), 80)[:3]):
            c.drawString(M, y_pay - (30 + i * 4) * mm, ln)

    # ── Footer ──
    set_font(9, tamil=True, bold=True); c.setFillColor(AMBER)
    c.drawCentredString(W / 2, 22 * mm, "நன்றி! வாழ்க வளமுடன்!")
    set_font(9, bold=True); c.setFillColor(FOREST)
    c.drawCentredString(W / 2, 17 * mm, "Thank you for shopping with Aammii Tharcharbu Santhai")
    set_font(8); c.setFillColor(MUTED)
    c.drawCentredString(W / 2, 12 * mm, "For questions or refunds: orders@aammii.com  ·  +91 95006 55548")
    c.drawCentredString(W / 2, 8 * mm, f"Generated {datetime.datetime.now(IST).strftime('%d %b %Y %H:%M IST')}")

    c.showPage(); c.save()
    buf.seek(0)
    return buf.read()


def safe_text(s) -> str:
    if s is None: return ""
    return str(s).replace("\x00", "").strip()

def wrap_text(s: str, width: int) -> list:
    words = s.split(); lines = []; cur = ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur); cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur: lines.append(cur)
    return lines

def build_text_invoice(order: dict) -> str:
    """Fallback plain-text invoice when reportlab is not available."""
    lines = ["=" * 62, "  AAMMII THARCHARBU SANTHAI".center(62),
             "  Natural Lifestyle Products · Farm-direct".center(62),
             "  www.aammii.com · +91 95006 55548".center(62), "=" * 62, ""]
    lines += [f"  Order ID : {order.get('id','')}",
              f"  Date     : {datetime.datetime.now(IST).strftime('%d %b %Y %H:%M')}",
              f"  Customer : {order.get('customer',{}).get('name','Guest')}",
              f"  Phone    : {order.get('customer',{}).get('phone','')}",
              f"  Address  : {order.get('customer',{}).get('address','')}",
              f"  Payment  : {order.get('payment','COD').upper()}", "", "-" * 62,
              f"  {'CODE':<10} {'QTY':>4} {'PRICE':>8} {'TOTAL':>10}", "-" * 62]
    for i in order.get("items", []):
        code  = str(i.get("code", i.get("id", "—")))
        qty   = int(i.get("qty", 1))
        price = float(i.get("price", 0))
        lines.append(f"  {code:<10} {qty:>4} {price:>8.2f} {qty*price:>10.2f}")
        name = str(i.get("name", ""))
        if name: lines.append(f"    {name}")
    t = order.get("totals", {})
    grand = t.get("grand", sum(i.get("qty",1)*i.get("price",0) for i in order.get("items", [])))
    lines += ["-" * 62, f"  {'GRAND TOTAL':>50}  ₹{grand:>8.2f}", "=" * 62,
              "", "  PAYMENT:  UPI / GPay: aammii@upi · COD available",
              "", "  Thank you! Nandri! Vazhga valamudan!"]
    return "\n".join(lines)

# ═══════════════════════════════════════════════════════════════
# 9. API: ORDERS
# ═══════════════════════════════════════════════════════════════
@app.route("/api/order", methods=["POST"])
def api_order():
    try:
        d = request.get_json(silent=True) or {}
        items = d.get("items", [])
        if not items:
            return jsonify({"error": "No items in order"}), 400

        oid = "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        now_ts = int(datetime.datetime.now(IST).timestamp() * 1000)

        order = {
            "id":       oid,
            "created":  now_ts,
            "date":     datetime.datetime.now(IST).isoformat(),
            "customer": d.get("customer", {}),
            "payment":  d.get("payment", "cod"),
            "items":    items,
            "totals":   d.get("totals", {}),
            "status":   "confirmed",
        }

        append_order(order)

        pdf_bytes = build_pdf_invoice(order)
        is_pdf = REPORTLAB_OK
        filename = f"{oid}.pdf" if is_pdf else f"{oid}.txt"

        # Also save a copy to orders/ folder for admin reference
        try:
            out_path = os.path.join(ORD, filename)
            with open(out_path, "wb") as f:
                f.write(pdf_bytes if is_pdf else pdf_bytes)
        except Exception as e:
            print(f"  [order] Could not save invoice file: {e}", flush=True)

        mimetype = "application/pdf" if is_pdf else "text/plain; charset=utf-8"
        return Response(
            pdf_bytes, status=200, mimetype=mimetype,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Order-Id": oid,
                "Access-Control-Expose-Headers": "X-Order-Id, Content-Disposition",
            }
        )
    except Exception as e:
        print(f"  [order] Error: {e}", flush=True)
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/orders")
def api_orders():
    """Return all orders (most recent first). Admin endpoint / also used by user 'Orders' view."""
    return jsonify(load_orders())

@app.route("/api/orders/<oid>")
def api_order_detail(oid):
    orders = load_orders()
    for o in orders:
        if o.get("id") == oid:
            return jsonify(o)
    return jsonify({"error": "Order not found"}), 404

# ═══════════════════════════════════════════════════════════════
# 10. SERVER ENTRY
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n  ╔══════════════════════════════════════════╗")
    print("  ║   Aammii Tharcharbu Santhai              ║")
    print("  ║   Natural Lifestyle Products             ║")
    print("  ╚══════════════════════════════════════════╝\n")
    prebuild_images()
    ensure_tamil_font()
    if not REPORTLAB_OK:
        print("  [!] reportlab not installed — text invoices will be used.")
        print("      Run: pip install reportlab")
    print("  [*] Open in browser → http://localhost:5000")
    print("  [*] Admin panel     → http://localhost:5000/#/admin")
    print("  [*] Images: drop <id>.jpg into generated_images/ to replace SVGs\n")
    app.run(host="0.0.0.0", port=5000, debug=False)

"""
app.py — Aammii Shop Backend
Flask server that:
  - Serves the frontend (index.html / style.css / app.js)
  - Handles PDF upload → product extraction
  - Caches products to JSON
  - Generates SVG product images
  - Creates and serves TXT invoices
"""

import os, json, random, string, datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR  = os.path.join(BASE_DIR, "frontend")
IMAGES_DIR    = os.path.join(BASE_DIR, "generated_images")
UPLOADS_DIR   = os.path.join(BASE_DIR, "uploads")
ORDERS_DIR    = os.path.join(BASE_DIR, "orders")
PRODUCTS_JSON = os.path.join(UPLOADS_DIR, "products.json")

for d in [IMAGES_DIR, UPLOADS_DIR, ORDERS_DIR]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

# ── Serve frontend ────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)

@app.route("/images/<path:filename>")
def serve_image(filename):
    return send_from_directory(IMAGES_DIR, filename)

# ── SVG image generator ───────────────────────────────────────────────────────
PALETTES = [
    ("#4a7c59","#7cb997","🌿"),
    ("#6b4226","#c8956c","🌾"),
    ("#d4a043","#f4c87a","🍯"),
    ("#3d5a80","#7ba7c7","💧"),
    ("#8b4513","#d2a679","🌰"),
    ("#556b2f","#a8c46f","🥬"),
    ("#9b59b6","#c39bd3","🌸"),
    ("#e67e22","#f0a85c","🍊"),
    ("#c0392b","#e88080","🌶"),
    ("#1abc9c","#76d7c4","🌱"),
]

def make_svg(product_name: str, product_id: str) -> str:
    """Generate and cache a colourful SVG for a product."""
    svg_path = os.path.join(IMAGES_DIR, f"{product_id}.svg")
    if os.path.exists(svg_path):
        return f"/images/{product_id}.svg"

    idx = abs(hash(product_name)) % len(PALETTES)
    bg, accent, emoji = PALETTES[idx]

    # Truncate long names for display
    display = product_name[:24] + ("…" if len(product_name) > 24 else "")
    words   = display.split()
    line1   = " ".join(words[:3])
    line2   = " ".join(words[3:]) if len(words) > 3 else ""

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180" viewBox="0 0 280 180">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg}"/>
      <stop offset="100%" stop-color="{accent}"/>
    </linearGradient>
  </defs>
  <rect width="280" height="180" fill="url(#bg)" rx="12"/>
  <rect x="10" y="10" width="260" height="160" fill="none"
        stroke="rgba(255,255,255,0.18)" stroke-width="1.5" rx="8"/>
  <text x="140" y="82"  text-anchor="middle" font-size="54" font-family="sans-serif">{emoji}</text>
  <text x="140" y="118" text-anchor="middle" font-size="13"
        fill="rgba(255,255,255,0.95)" font-family="'DM Sans',sans-serif" font-weight="600">{line1}</text>
  {"" if not line2 else f'<text x="140" y="136" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.80)" font-family="sans-serif">{line2}</text>'}
</svg>"""

    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg)
    return f"/images/{product_id}.svg"

# ── PDF Upload ─────────────────────────────────────────────────────────────────
@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF file provided"}), 400

    pdf_file = request.files["pdf"]
    if not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "File must be a PDF"}), 400

    pdf_path = os.path.join(UPLOADS_DIR, "catalogue.pdf")
    try:
        pdf_file.save(pdf_path)
    except Exception as e:
        return jsonify({"error": f"Could not save file: {str(e)}"}), 500

    # Import here so startup doesn't fail if lib missing
    try:
        from pdf_parser import parse_pdf
    except ImportError as e:
        return jsonify({"error": f"Parser import error: {str(e)}"}), 500

    try:
        raw_products = parse_pdf(pdf_path)
    except Exception as e:
        return jsonify({"error": f"PDF parsing failed: {str(e)}"}), 500

    if not raw_products:
        return jsonify({"error": "No products could be extracted from this PDF. "
                                 "Make sure it contains a product table with names and prices."}), 422

    # Enrich with IDs and images
    products = []
    for i, p in enumerate(raw_products):
        pid = f"p{i+1:04d}"
        p["id"]    = pid
        p["image"] = make_svg(p.get("name", "Product"), pid)
        products.append(p)

    # Cache
    with open(PRODUCTS_JSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    return jsonify({"count": len(products), "products": products})

# ── Get cached products ────────────────────────────────────────────────────────
@app.route("/api/products", methods=["GET"])
def get_products():
    if not os.path.exists(PRODUCTS_JSON):
        return jsonify([])
    try:
        with open(PRODUCTS_JSON, encoding="utf-8") as f:
            return jsonify(json.load(f))
    except Exception:
        return jsonify([])

# ── Place order → download TXT invoice ────────────────────────────────────────
@app.route("/api/order", methods=["POST"])
def place_order():
    data = request.get_json(silent=True)
    if not data or "items" not in data or not data["items"]:
        return jsonify({"error": "No items in order"}), 400

    items     = data["items"]
    order_id  = "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    now       = datetime.datetime.now()
    date_str  = now.strftime("%Y-%m-%d")
    time_str  = now.strftime("%H:%M:%S")
    grand     = sum(i["qty"] * i["price"] for i in items)

    # Build invoice text
    SEP  = "─" * 58
    W    = 58
    lines = [
        "╔" + "═"*W + "╗",
        "║" + "          AAMMII THARCHARBU SANTHAI".center(W) + "║",
        "║" + "              Natural Lifestyle Products".center(W) + "║",
        "╚" + "═"*W + "╝",
        "",
        f"  Order ID  : {order_id}",
        f"  Date      : {date_str}",
        f"  Time      : {time_str}",
        "",
        SEP,
        f"  {'Product':<32} {'Qty':>4}  {'Price':>8}  {'Total':>9}",
        SEP,
    ]
    for item in items:
        name  = item["name"][:32]
        qty   = item["qty"]
        price = item["price"]
        total = qty * price
        lines.append(f"  {name:<32} {qty:>4}  ₹{price:>7.2f}  ₹{total:>8.2f}")

    lines += [
        SEP,
        f"  {'GRAND TOTAL':<44} ₹{grand:>8.2f}",
        SEP,
        "",
        "  Thank you for shopping with Aammii!",
        "  www.aammii.com  |  +91 95006 55548",
        "",
    ]
    invoice_text = "\n".join(lines)

    fname    = f"{order_id}.txt"
    fpath    = os.path.join(ORDERS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(invoice_text)

    return send_file(
        fpath,
        as_attachment=True,
        download_name=fname,
        mimetype="text/plain"
    )

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n  🌿  Aammii Natural Shop")
    print("  ─────────────────────────────────")
    print("  🚀  http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)

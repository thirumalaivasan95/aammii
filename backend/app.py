"""
app.py — Aammii Natural Shop · Production Flask Backend
Routes: products, categories, cart validation, orders, payment (Razorpay)
"""
import os, json, hmac, hashlib, datetime, uuid
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS

# local imports
import config
from database import (
    init_db, get_db, db_ctx, row_to_dict, rows_to_list,
    next_order_number, CAT_META, SCHEMA, import_products_from_path
)

# ── SVG image generator ───────────────────────────────────────────────────
_DARK_PAL = [("#4a7c59","#7cb997","🌿"),("#6b4226","#c8956c","🌾"),
             ("#d4a043","#f4c87a","🍯"),("#c0392b","#e88080","🌶")]

def make_svg(name: str, pid: str, cat: str = "") -> str:
    fp = os.path.join(config.IMAGES_DIR, f"{pid}.svg")
    if os.path.exists(fp):
        return f"/images/{pid}.svg"
    m = CAT_META.get(cat)
    if m:
        bg, ac, em = m["color"], m["color"], m["emoji"]
        # lighten accent
        ac = "#c8956c"
    else:
        bg, ac, em = _DARK_PAL[abs(hash(name)) % len(_DARK_PAL)]
    d  = name[:26] + ("…" if len(name) > 26 else "")
    ws = d.split()
    l1 = " ".join(ws[:3])
    l2 = " ".join(ws[3:6]) if len(ws) > 3 else ""
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180" viewBox="0 0 280 180">'
        f'<defs>'
        f'<linearGradient id="g{pid}" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0%" stop-color="{bg}"/>'
        f'<stop offset="100%" stop-color="{ac}"/>'
        f'</linearGradient>'
        f'</defs>'
        f'<rect width="280" height="180" fill="url(#g{pid})" rx="0"/>'
        f'<rect x="10" y="10" width="260" height="160" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" rx="6"/>'
        f'<circle cx="140" cy="78" r="36" fill="rgba(255,255,255,0.10)"/>'
        f'<text x="140" y="94" text-anchor="middle" font-size="40">{em}</text>'
        f'<text x="140" y="124" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.95)" '
        f'font-family="Georgia,serif" font-weight="700">{l1}</text>'
        + (f'<text x="140" y="142" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.75)" '
           f'font-family="Georgia,serif">{l2}</text>' if l2 else "")
        + '</svg>'
    )
    os.makedirs(config.IMAGES_DIR, exist_ok=True)
    with open(fp, "w", encoding="utf-8") as f:
        f.write(svg)
    return f"/images/{pid}.svg"


def prebuild_images():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, category FROM products WHERE is_active=1"
    ).fetchall()
    conn.close()
    c = 0
    for r in rows:
        pid = r["id"]
        if not os.path.exists(os.path.join(config.IMAGES_DIR, f"{pid}.svg")):
            make_svg(r["name"], pid, r["category"])
            c += 1
    if c:
        print(f"  🎨  Generated {c} SVG images")


# ── Flask app ──────────────────────────────────────────────────────────────
BASE    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT   = os.path.join(BASE, "frontend")

app = Flask(__name__, static_folder=FRONT)
app.secret_key = config.SECRET_KEY
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Static routes ─────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(FRONT, "index.html")

@app.route("/admin")
def admin_panel():
    return send_from_directory(FRONT, "admin.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(FRONT, filename)

@app.route("/images/<path:filename>")
def serve_image(filename):
    return send_from_directory(config.IMAGES_DIR, filename)




# ══════════════════════════════════════════════════════════════════════════════
# ADMIN IMPORT API
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/admin/import-json", methods=["POST"])
def admin_import_json():
    if "file" not in request.files:
        return jsonify({"error": "No file. Send field name: file"}), 400
    f    = request.files["file"]
    mode = request.form.get("mode", "upsert")
    if mode not in ("insert", "upsert", "replace"):
        mode = "upsert"
    save_path = os.path.join(config.UPLOAD_DIR, "products.json")
    f.save(save_path)
    try:
        result = import_products_from_path(save_path, mode=mode)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    conn = get_db()
    rows = conn.execute("SELECT id,name,category FROM products WHERE is_active=1").fetchall()
    conn.close()
    for r in rows:
        make_svg(r["name"], r["id"], r["category"])
    return jsonify({"success": True, "mode": mode, **result,
        "message": f'Import complete — {result["inserted"]} new, {result["updated"]} updated'})


@app.route("/api/admin/products", methods=["GET"])
def admin_list_products():
    conn  = get_db()
    q     = request.args.get("q","").strip().lower()
    cat   = request.args.get("category","")
    page  = max(1, int(request.args.get("page", 1)))
    limit = min(200, int(request.args.get("limit", 50)))
    where, params = [], []
    if q:
        where.append("(LOWER(name) LIKE ? OR LOWER(code) LIKE ?)")
        params += [f"%{q}%", f"%{q}%"]
    if cat:
        where.append("category=?")
        params.append(cat)
    w_sql  = ("WHERE " + " AND ".join(where)) if where else ""
    total  = conn.execute(f"SELECT COUNT(*) FROM products {w_sql}", params).fetchone()[0]
    offset = (page-1)*limit
    rows   = conn.execute(
        f"SELECT * FROM products {w_sql} ORDER BY category, name LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    conn.close()
    return jsonify({"products": rows_to_list(rows), "total": total, "page": page,
                    "pages": max(1, -(-total // limit))})


@app.route("/api/admin/products/bulk-stock", methods=["POST"])
def bulk_update_stock():
    items = request.get_json(silent=True) or []
    updated = 0
    with db_ctx() as conn:
        for item in items:
            pid, qty = item.get("id"), item.get("stock_quantity")
            if pid is not None and qty is not None:
                conn.execute("UPDATE products SET stock_quantity=? WHERE id=?", (int(qty), pid))
                updated += 1
    return jsonify({"updated": updated})


@app.route("/api/admin/stats")
def admin_stats():
    conn = get_db()
    def q(sql): return conn.execute(sql).fetchone()[0]
    stats = {
        "total_products":  q("SELECT COUNT(*) FROM products WHERE is_active=1"),
        "out_of_stock":    q("SELECT COUNT(*) FROM products WHERE stock_quantity=0 AND is_active=1"),
        "new_launches":    q("SELECT COUNT(*) FROM products WHERE is_new_launch=1 AND is_active=1"),
        "categories":      q("SELECT COUNT(DISTINCT category) FROM products WHERE is_active=1"),
        "total_orders":    q("SELECT COUNT(*) FROM orders"),
        "paid_orders":     q("SELECT COUNT(*) FROM orders WHERE payment_status='paid'"),
        "revenue_total":   q("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status='paid'"),
    }
    conn.close()
    return jsonify(stats)


@app.route("/api/admin/orders")
def admin_orders():
    conn   = get_db()
    page   = max(1, int(request.args.get("page", 1)))
    limit  = min(100, int(request.args.get("limit", 30)))
    status = request.args.get("status","")
    where  = "WHERE order_status=?" if status else ""
    params = [status] if status else []
    total  = conn.execute(f"SELECT COUNT(*) FROM orders {where}", params).fetchone()[0]
    offset = (page-1)*limit
    rows   = conn.execute(
        f"SELECT * FROM orders {where} ORDER BY id DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    conn.close()
    return jsonify({"orders": rows_to_list(rows), "total": total, "page": page})

# ══════════════════════════════════════════════════════════════════════════════
# PRODUCTS API
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/products")
def get_products():
    """
    GET /api/products
    Query params: category, q (search), sort, page, limit, new_launch
    """
    conn   = get_db()
    cat    = request.args.get("category", "")
    q      = request.args.get("q", "").strip().lower()
    sort   = request.args.get("sort", "default")
    page   = max(1, int(request.args.get("page", 1)))
    limit  = min(100, max(1, int(request.args.get("limit", 48))))
    new_lx = request.args.get("new_launch", "")

    where  = ["is_active=1"]
    params = []

    if cat:
        where.append("category=?")
        params.append(cat)
    if q:
        where.append("(LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(category) LIKE ?)")
        params += [f"%{q}%", f"%{q}%", f"%{q}%"]
    if new_lx == "1":
        where.append("is_new_launch=1")

    order_clause = {
        "price-asc":  "price ASC",
        "price-desc": "price DESC",
        "name-asc":   "name ASC",
        "new":        "is_new_launch DESC, launch_date DESC, created_at DESC",
    }.get(sort, "is_new_launch DESC, created_at DESC")

    w_sql  = "WHERE " + " AND ".join(where) if where else ""
    offset = (page - 1) * limit

    total  = conn.execute(f"SELECT COUNT(*) FROM products {w_sql}", params).fetchone()[0]
    rows   = conn.execute(
        f"SELECT * FROM products {w_sql} ORDER BY {order_clause} LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    conn.close()

    products = []
    for r in rows:
        p = dict(r)
        # ensure image exists
        if not p.get("image_path"):
            p["image_path"] = make_svg(p["name"], p["id"], p["category"])
        else:
            p["image_path"] = make_svg(p["name"], p["id"], p["category"])
        products.append(p)

    return jsonify({
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, -(-total // limit)),
    })


@app.route("/api/products/new-launches")
def new_launches():
    """Returns new launch products (is_new_launch=1), max 12."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM products WHERE is_active=1 AND is_new_launch=1 "
        "ORDER BY launch_date DESC, created_at DESC LIMIT 12"
    ).fetchall()
    conn.close()
    products = []
    for r in rows:
        p = dict(r)
        p["image_path"] = make_svg(p["name"], p["id"], p["category"])
        products.append(p)
    return jsonify(products)


@app.route("/api/products/<pid>")
def get_product(pid):
    conn = get_db()
    row  = conn.execute("SELECT * FROM products WHERE id=? AND is_active=1", (pid,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Product not found"}), 404
    p = dict(row)
    p["image_path"] = make_svg(p["name"], p["id"], p["category"])
    return jsonify(p)


# ── Admin: product management ─────────────────────────────────────────────
@app.route("/api/admin/products", methods=["POST"])
def create_product():
    """Add a new product. Requires admin header."""
    if not _is_admin():
        return jsonify({"error":"Unauthorized"}), 401
    d = request.get_json(silent=True) or {}
    required = ("name", "category", "price")
    for f in required:
        if not d.get(f):
            return jsonify({"error": f"Missing field: {f}"}), 400

    pid = d.get("id") or uuid.uuid4().hex[:12]
    with db_ctx() as conn:
        conn.execute("""
            INSERT INTO products
              (id,name,code,category,price,original_price,qty_unit,
               stock_quantity,is_active,is_new_launch,launch_date,description,tags)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            pid, d["name"], d.get("code",""), d["category"],
            float(d["price"]), d.get("original_price") or None,
            d.get("qty_unit",""), int(d.get("stock_quantity", 999)),
            int(d.get("is_active", 1)), int(d.get("is_new_launch", 0)),
            d.get("launch_date") or None,
            d.get("description",""), d.get("tags",""),
        ))
    return jsonify({"id": pid, "message": "Product created"}), 201


@app.route("/api/admin/products/<pid>", methods=["PATCH"])
def update_product(pid):
    """Update any product fields. Requires admin header."""
    if not _is_admin():
        return jsonify({"error":"Unauthorized"}), 401
    d = request.get_json(silent=True) or {}
    allowed = {"name","code","category","price","original_price","qty_unit",
               "stock_quantity","is_active","is_new_launch","launch_date","description","tags"}
    updates = {k:v for k,v in d.items() if k in allowed}
    if not updates:
        return jsonify({"error":"Nothing to update"}), 400
    set_clause = ", ".join(f"{k}=?" for k in updates)
    vals       = list(updates.values()) + [pid]
    with db_ctx() as conn:
        conn.execute(f"UPDATE products SET {set_clause} WHERE id=?", vals)
    return jsonify({"message": "Updated"})


@app.route("/api/admin/products/<pid>/stock", methods=["PATCH"])
def update_stock(pid):
    """Quick stock update endpoint."""
    if not _is_admin():
        return jsonify({"error":"Unauthorized"}), 401
    d = request.get_json(silent=True) or {}
    qty = d.get("stock_quantity")
    if qty is None:
        return jsonify({"error":"stock_quantity required"}), 400
    with db_ctx() as conn:
        conn.execute("UPDATE products SET stock_quantity=? WHERE id=?", (int(qty), pid))
    return jsonify({"message": "Stock updated", "stock_quantity": int(qty)})


def _is_admin():
    """Simple admin check via header. Replace with JWT/session in prod."""
    return request.headers.get("X-Admin-Key") == config.SECRET_KEY


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORIES API
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/categories")
def get_categories():
    conn   = get_db()
    cats   = conn.execute(
        "SELECT c.*, COUNT(p.id) AS product_count "
        "FROM categories c "
        "LEFT JOIN products p ON p.category=c.name AND p.is_active=1 "
        "WHERE c.is_active=1 "
        "GROUP BY c.id ORDER BY c.sort_order, c.name"
    ).fetchall()
    conn.close()
    return jsonify(rows_to_list(cats))


# ══════════════════════════════════════════════════════════════════════════════
# CART VALIDATION
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/cart/validate", methods=["POST"])
def validate_cart():
    """
    Accepts: { items: [{product_id, quantity}] }
    Returns each item with current price + stock status.
    """
    d     = request.get_json(silent=True) or {}
    items = d.get("items", [])
    if not items:
        return jsonify({"error":"No items"}), 400

    conn   = get_db()
    result = []
    issues = []

    for item in items:
        pid = item.get("product_id") or item.get("id")
        qty = int(item.get("quantity", 1))
        row = conn.execute(
            "SELECT id,name,price,stock_quantity,is_active FROM products WHERE id=?",
            (pid,)
        ).fetchone()
        if not row:
            issues.append(f"Product {pid} not found")
            continue
        p = dict(row)
        if not p["is_active"]:
            issues.append(f"'{p['name']}' is no longer available")
            continue
        avail_qty = qty
        if p["stock_quantity"] != 999 and qty > p["stock_quantity"]:
            avail_qty = p["stock_quantity"]
            if avail_qty == 0:
                issues.append(f"'{p['name']}' is out of stock")
            else:
                issues.append(f"'{p['name']}' — only {avail_qty} left in stock")
        result.append({**p, "requested_qty": qty, "available_qty": avail_qty})

    conn.close()
    return jsonify({"validated": result, "issues": issues})


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT — RAZORPAY
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/payment/create-order", methods=["POST"])
def payment_create_order():
    """
    Creates a Razorpay order.
    Body: { items:[{product_id, quantity}], customer:{name,phone,email,address} }
    """
    try:
        import razorpay
        rzp = razorpay.Client(
            auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET)
        )
    except ImportError:
        return jsonify({"error":"Razorpay SDK not installed. Run: pip install razorpay"}), 500

    d        = request.get_json(silent=True) or {}
    items    = d.get("items", [])
    customer = d.get("customer", {})

    if not items:
        return jsonify({"error":"Cart is empty"}), 400

    # Compute total from DB prices (never trust frontend prices)
    conn  = get_db()
    total = 0.0
    order_items = []
    for item in items:
        pid = item.get("product_id") or item.get("id")
        qty = int(item.get("quantity", 1))
        row = conn.execute(
            "SELECT id,name,price,qty_unit,stock_quantity,is_active FROM products WHERE id=?",
            (pid,)
        ).fetchone()
        if not row or not row["is_active"]:
            conn.close()
            return jsonify({"error": f"Product {pid} unavailable"}), 400
        line = dict(row)
        line["quantity"]  = qty
        line["line_total"] = round(line["price"] * qty, 2)
        total += line["line_total"]
        order_items.append(line)
    conn.close()

    # Razorpay expects amount in paise (INR × 100)
    amount_paise = int(round(total * 100))
    receipt      = f"rcpt_{uuid.uuid4().hex[:12]}"

    try:
        rzp_order = rzp.order.create({
            "amount":   amount_paise,
            "currency": config.RAZORPAY_CURRENCY,
            "receipt":  receipt,
            "payment_capture": 1,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    return jsonify({
        "razorpay_order_id": rzp_order["id"],
        "amount":            amount_paise,
        "currency":          config.RAZORPAY_CURRENCY,
        "key_id":            config.RAZORPAY_KEY_ID,
        "business_name":     config.BUSINESS_NAME,
        "total":             total,
        "order_items":       order_items,
        "customer":          customer,
    })


@app.route("/api/payment/verify", methods=["POST"])
def payment_verify():
    """
    Verify Razorpay payment signature, then save order to DB.
    Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature,
            items, customer }
    """
    d          = request.get_json(silent=True) or {}
    rz_order   = d.get("razorpay_order_id","")
    rz_payment = d.get("razorpay_payment_id","")
    rz_sig     = d.get("razorpay_signature","")

    # Verify HMAC-SHA256 signature
    msg     = f"{rz_order}|{rz_payment}".encode()
    secret  = config.RAZORPAY_KEY_SECRET.encode()
    gen_sig = hmac.new(secret, msg, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(gen_sig, rz_sig):
        return jsonify({"error":"Payment verification failed"}), 400

    return _save_order(d, payment_method="online", payment_status="paid",
                       razorpay_order_id=rz_order,
                       razorpay_payment_id=rz_payment,
                       razorpay_signature=rz_sig)


@app.route("/api/payment/cod", methods=["POST"])
def payment_cod():
    """Cash on Delivery order — no payment verification needed."""
    d = request.get_json(silent=True) or {}
    return _save_order(d, payment_method="cod", payment_status="pending")


# ── Shared order saver ────────────────────────────────────────────────────

def _save_order(d, payment_method="cod", payment_status="pending",
                razorpay_order_id="", razorpay_payment_id="", razorpay_signature=""):
    items    = d.get("items", [])
    customer = d.get("customer", {})

    if not items:
        return jsonify({"error":"No items"}), 400

    conn  = get_db()
    total = 0.0
    lines = []

    for item in items:
        pid = item.get("product_id") or item.get("id")
        qty = int(item.get("quantity", 1))
        row = conn.execute(
            "SELECT id,name,price,qty_unit,stock_quantity FROM products WHERE id=?",
            (pid,)
        ).fetchone()
        if not row:
            conn.close()
            return jsonify({"error": f"Product {pid} not found"}), 400
        p = dict(row)
        line_total = round(p["price"] * qty, 2)
        total     += line_total
        lines.append({"product_id":p["id"],"product_name":p["name"],
                      "qty_unit":p["qty_unit"],"quantity":qty,
                      "unit_price":p["price"],"total_price":line_total})

    order_num = next_order_number(conn)
    now       = datetime.datetime.now().isoformat(sep=" ", timespec="seconds")

    try:
        conn.execute("BEGIN")
        ord_id = conn.execute("""
            INSERT INTO orders
              (order_number,customer_name,customer_phone,customer_email,customer_address,
               total_amount,payment_method,payment_status,
               razorpay_order_id,razorpay_payment_id,razorpay_signature,
               order_status,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            order_num,
            customer.get("name",""), customer.get("phone",""),
            customer.get("email",""), customer.get("address",""),
            round(total, 2),
            payment_method, payment_status,
            razorpay_order_id, razorpay_payment_id, razorpay_signature,
            "placed", now, now,
        )).lastrowid

        for l in lines:
            conn.execute("""
                INSERT INTO order_items
                  (order_id,product_id,product_name,qty_unit,quantity,unit_price,total_price)
                VALUES (?,?,?,?,?,?,?)
            """, (ord_id, l["product_id"], l["product_name"], l["qty_unit"],
                  l["quantity"], l["unit_price"], l["total_price"]))
            # Decrement stock if tracked
            conn.execute("""
                UPDATE products
                SET stock_quantity = MAX(0, stock_quantity - ?)
                WHERE id != ? OR stock_quantity = 999
            """, (l["quantity"], "SKIP_THIS"))
            conn.execute("""
                UPDATE products
                SET stock_quantity = MAX(0, stock_quantity - ?)
                WHERE id = ? AND stock_quantity < 999
            """, (l["quantity"], l["product_id"]))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

    conn.close()
    return jsonify({
        "order_number":    order_num,
        "order_id":        ord_id,
        "total":           round(total, 2),
        "payment_method":  payment_method,
        "payment_status":  payment_status,
        "message":         f"Order {order_num} placed successfully!",
    }), 201


# ── Order lookup ──────────────────────────────────────────────────────────

@app.route("/api/orders/<order_number>")
def get_order(order_number):
    conn  = get_db()
    order = row_to_dict(conn.execute(
        "SELECT * FROM orders WHERE order_number=?", (order_number,)
    ).fetchone())
    if not order:
        conn.close()
        return jsonify({"error":"Order not found"}), 404
    items = rows_to_list(conn.execute(
        "SELECT * FROM order_items WHERE order_id=?", (order["id"],)
    ).fetchall())
    conn.close()
    return jsonify({**order, "items": items})


# ── PDF upload (legacy, still supported) ──────────────────────────────────

@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    if "pdf" not in request.files:
        return jsonify({"error":"No PDF provided"}), 400
    pf = request.files["pdf"]
    if not pf.filename.lower().endswith(".pdf"):
        return jsonify({"error":"File must be a PDF"}), 400
    try:
        pf.save(os.path.join(config.UPLOAD_DIR, "catalogue.pdf"))
    except Exception:
        pass
    # Always return from DB
    conn  = get_db()
    count = conn.execute("SELECT COUNT(*) FROM products WHERE is_active=1").fetchone()[0]
    conn.close()
    return jsonify({
        "count":  count,
        "source": "database",
        "note":   f"Aammii catalogue recognised — {count} products loaded!",
    })


# ── Health check ──────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    conn  = get_db()
    count = conn.execute("SELECT COUNT(*) FROM products WHERE is_active=1").fetchone()[0]
    conn.close()
    return jsonify({
        "status":   "ok",
        "products": count,
        "ts":       datetime.datetime.utcnow().isoformat(),
    })


# ── Entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n  🌿  Aammii Natural Shop  —  Production Build")
    print("  ────────────────────────────────────────────")
    init_db()
    prebuild_images()
    print(f"  💳  Razorpay key: {config.RAZORPAY_KEY_ID[:14]}…")
    print("  🚀  http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=config.DEBUG)
"""
database.py — SQLite schema, initialisation, and helper utilities.
All DB access goes through get_db(); auto-closes at teardown.
"""
import sqlite3, os, json, datetime
from contextlib import contextmanager
from config import DB_PATH, UPLOAD_DIR, IMAGES_DIR, ORDERS_DIR

# ─────────────────────────────────────────────────────────────────────────────
# Connection helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

@contextmanager
def db_ctx():
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# Schema
# ─────────────────────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    UNIQUE NOT NULL,
    emoji       TEXT    DEFAULT '📦',
    color       TEXT    DEFAULT '#4a7c59',
    description TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_active   INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    code            TEXT    DEFAULT '',
    category        TEXT    NOT NULL DEFAULT 'General',
    price           REAL    NOT NULL DEFAULT 0,
    original_price  REAL    DEFAULT NULL,
    qty_unit        TEXT    DEFAULT '',
    stock_quantity  INTEGER DEFAULT 999,
    is_active       INTEGER DEFAULT 1,
    is_new_launch   INTEGER DEFAULT 0,
    launch_date     TEXT    DEFAULT NULL,
    description     TEXT    DEFAULT '',
    image_path      TEXT    DEFAULT '',
    tags            TEXT    DEFAULT '',
    created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number    TEXT    UNIQUE NOT NULL,
    customer_name   TEXT    NOT NULL DEFAULT '',
    customer_phone  TEXT    NOT NULL DEFAULT '',
    customer_email  TEXT    DEFAULT '',
    customer_address TEXT   DEFAULT '',
    subtotal        REAL    NOT NULL DEFAULT 0,
    discount        REAL    DEFAULT 0,
    delivery_charge REAL    DEFAULT 0,
    total_amount    REAL    NOT NULL DEFAULT 0,
    payment_method  TEXT    DEFAULT 'cod',
    payment_status  TEXT    DEFAULT 'pending',
    razorpay_order_id   TEXT DEFAULT '',
    razorpay_payment_id TEXT DEFAULT '',
    razorpay_signature  TEXT DEFAULT '',
    order_status    TEXT    DEFAULT 'placed',
    notes           TEXT    DEFAULT '',
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL,
    product_id  TEXT    NOT NULL,
    product_name TEXT   NOT NULL,
    qty_unit    TEXT    DEFAULT '',
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  REAL    NOT NULL DEFAULT 0,
    total_price REAL    NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_new_launch  ON products(is_new_launch);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_number        ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
"""

# ─────────────────────────────────────────────────────────────────────────────
# Category palette (same as before, used when seeding)
# ─────────────────────────────────────────────────────────────────────────────

CAT_META = {
    "Millets & Grains":     {"emoji":"🌾","color":"#6b4226"},
    "Pulses & Dals":        {"emoji":"🫘","color":"#556b2f"},
    "Sweeteners":           {"emoji":"🍯","color":"#d4a043"},
    "Honey":                {"emoji":"🍯","color":"#c8922e"},
    "Beverages":            {"emoji":"🍵","color":"#1abc9c"},
    "Spices":               {"emoji":"🌶","color":"#c0392b"},
    "Oils & Ghee":          {"emoji":"🫙","color":"#8b4513"},
    "Pickles":              {"emoji":"🥒","color":"#556b2f"},
    "Salt":                 {"emoji":"🧂","color":"#3d5a80"},
    "Dry Fruits & Nuts":    {"emoji":"🥜","color":"#784212"},
    "Health Mix":           {"emoji":"💊","color":"#1a5276"},
    "Healthcare":           {"emoji":"🩺","color":"#922b21"},
    "Personal Care":        {"emoji":"🌸","color":"#9b59b6"},
    "Soap":                 {"emoji":"🧼","color":"#2980b9"},
    "Herbal Powder":        {"emoji":"🌿","color":"#4a7c59"},
    "Noodles & Vermicelli": {"emoji":"🍜","color":"#e67e22"},
    "Vadagam & Appalam":    {"emoji":"🥙","color":"#8b4513"},
    "Readymade Mix":        {"emoji":"🍱","color":"#d4a043"},
    "Face Pack":            {"emoji":"✨","color":"#9b59b6"},
    "Seeds":                {"emoji":"🌱","color":"#27ae60"},
    "Divine Products":      {"emoji":"🕯","color":"#9b59b6"},
    "Copper Products":      {"emoji":"🥇","color":"#d4a043"},
    "Wellness Tools":       {"emoji":"🧘","color":"#2980b9"},
    "Books & DVDs":         {"emoji":"📚","color":"#3d5a80"},
}

# ─────────────────────────────────────────────────────────────────────────────
# Init + seed
# ─────────────────────────────────────────────────────────────────────────────

def init_db():
    """Create all tables and seed from products.json on first run."""
    for d in [UPLOAD_DIR, IMAGES_DIR, ORDERS_DIR]:
        os.makedirs(d, exist_ok=True)

    with db_ctx() as conn:
        conn.executescript(SCHEMA)
        _seed_categories(conn)

        # Always try to seed from products.json when DB is empty
        cur   = conn.execute("SELECT COUNT(*) FROM products")
        count = cur.fetchone()[0]
        if count == 0:
            result = _import_products_json(conn, mode="insert")
            if result["inserted"] == 0:
                print("  ⚠️   No products loaded. Drop uploads/products.json then restart, or use /admin to import.")
        else:
            print(f"  ✅  Database ready — {count} products already loaded")


def _seed_categories(conn):
    for sort_i, (name, meta) in enumerate(CAT_META.items()):
        conn.execute(
            "INSERT OR IGNORE INTO categories(name,emoji,color,sort_order) VALUES(?,?,?,?)",
            (name, meta["emoji"], meta["color"], sort_i)
        )


def _product_count(conn):
    return conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]


def import_products_from_path(json_path: str, mode: str = "upsert") -> dict:
    """
    Public function: import a products JSON file into the DB.
    mode = "upsert"  → insert new + update existing prices/names
    mode = "insert"  → skip products that already exist (by id)
    mode = "replace" → wipe existing products first, then insert all
    Returns dict with counts.
    """
    with db_ctx() as conn:
        _seed_categories(conn)
        if mode == "replace":
            conn.execute("DELETE FROM products")
        result = _import_products_json(conn, mode=mode, json_path=json_path)
        total  = _product_count(conn)
    return {**result, "total_in_db": total}


def _import_products_json(conn, mode: str = "upsert", json_path: str = None) -> dict:
    """
    Core import routine.
    Accepts the original Aammii products.json format:
      { id, name, code, category, price, qty (unit string), image }
    Also accepts the extended format with qty_unit, stock_quantity, etc.
    """
    path = json_path or os.path.join(UPLOAD_DIR, "products.json")

    if not os.path.exists(path):
        print(f"  ⚠️   products.json not found at: {path}")
        return {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}

    try:
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ❌  JSON parse error: {e}")
        return {"inserted": 0, "updated": 0, "skipped": 0, "errors": 1}

    # Support both a bare list and {"products": [...]} wrapper
    products = raw if isinstance(raw, list) else raw.get("products", raw.get("items", []))
    if not isinstance(products, list):
        print("  ❌  JSON must be an array of products")
        return {"inserted": 0, "updated": 0, "skipped": 0, "errors": 1}

    inserted = updated = skipped = errors = 0

    for p in products:
        try:
            # ── Normalise field names (old format uses "qty", new uses "qty_unit") ──
            pid      = (p.get("id") or "").strip() or _gen_id()
            name     = (p.get("name") or "").strip()
            if not name:
                skipped += 1
                continue

            category  = (p.get("category") or "General").strip()
            code      = (p.get("code") or "").strip()
            # "qty" in old format = unit string like "1 kg"; "qty_unit" in new format
            qty_unit  = (p.get("qty_unit") or p.get("qty") or "").strip()
            # Price: handle "195.00", 195, "₹195"
            price_raw = str(p.get("price") or "0").replace("₹","").replace(",","").strip()
            price     = float(price_raw) if price_raw else 0.0
            # Stock: old format doesn't have it → default unlimited (999)
            stock     = int(p.get("stock_quantity", p.get("stock", 999)))
            image     = (p.get("image_path") or p.get("image") or "").strip()
            orig_p    = p.get("original_price") or p.get("orig_price") or None
            is_new    = int(bool(p.get("is_new_launch") or p.get("new_launch") or 0))
            launch_d  = p.get("launch_date") or None
            desc      = (p.get("description") or "").strip()
            tags      = (p.get("tags") or "").strip()

            existing  = conn.execute("SELECT id FROM products WHERE id=?", (pid,)).fetchone()

            if existing:
                if mode == "insert":
                    skipped += 1
                    continue
                # upsert or replace → update fields (keep stock if not provided)
                conn.execute("""
                    UPDATE products SET
                      name=?, code=?, category=?, price=?, original_price=?,
                      qty_unit=?, image_path=?, description=?, tags=?,
                      is_new_launch=?, launch_date=?
                    WHERE id=?
                """, (name, code, category, price, orig_p,
                      qty_unit, image, desc, tags,
                      is_new, launch_d, pid))
                updated += 1
            else:
                conn.execute("""
                    INSERT INTO products
                      (id, name, code, category, price, original_price,
                       qty_unit, stock_quantity, is_active, is_new_launch,
                       launch_date, image_path, description, tags)
                    VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?,?)
                """, (pid, name, code, category, price, orig_p,
                      qty_unit, stock, is_new, launch_d, image, desc, tags))
                # Ensure category row exists
                conn.execute(
                    "INSERT OR IGNORE INTO categories(name,emoji,color,sort_order) VALUES(?,?,?,?)",
                    (category,
                     CAT_META.get(category, {}).get("emoji","📦"),
                     CAT_META.get(category, {}).get("color","#4a7c59"),
                     99)
                )
                inserted += 1

        except Exception as e:
            errors += 1
            print(f"  ⚠️   Skip row '{p.get('name','')}': {e}")

    print(f"  🌱  Import done — {inserted} inserted, {updated} updated, {skipped} skipped, {errors} errors")
    return {"inserted": inserted, "updated": updated, "skipped": skipped, "errors": errors}


def _gen_id():
    import uuid
    return uuid.uuid4().hex[:12]


# ─────────────────────────────────────────────────────────────────────────────
# Order helpers
# ─────────────────────────────────────────────────────────────────────────────

def next_order_number(conn) -> str:
    """Returns ORD-000001, ORD-000002, … based on max(id) in orders table."""
    row = conn.execute("SELECT MAX(id) FROM orders").fetchone()[0]
    nxt = (row or 0) + 1
    return f"ORD-{nxt:06d}"


def row_to_dict(row):
    """sqlite3.Row → plain dict."""
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(r) for r in rows]
"""
order_store.py — atomic order persistence backed by SQLite.

Why: the legacy JSON-file approach has a read-modify-write race that can
duplicate invoice numbers under concurrent orders. SQLite gives us a single
atomic transaction per order, while still mirroring the order to JSON for
backward compatibility with the admin UI.
"""
import json, os, sqlite3, threading, datetime
from contextlib import contextmanager
from pathlib import Path

import config
from app_logger import get_logger

log = get_logger(__name__)

_LOCK = threading.Lock()
_OJSON = Path(config.ORDERS_DIR) / "orders.json"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS orders_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     TEXT UNIQUE NOT NULL,
    invoice_no   TEXT UNIQUE NOT NULL,
    created_ms   INTEGER NOT NULL,
    payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS counters (
    name  TEXT PRIMARY KEY,
    value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters(name, value) VALUES ('invoice_no', 11000);
"""

@contextmanager
def _conn():
    c = sqlite3.connect(config.DB_PATH, timeout=30)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()

def init_store() -> None:
    with _conn() as c:
        c.executescript(_SCHEMA)
        # Backfill the counter to the highest invoice number ever issued (legacy JSON migration).
        try:
            if _OJSON.exists():
                with open(_OJSON, encoding="utf-8") as f:
                    legacy = json.load(f)
                if isinstance(legacy, list):
                    nums = []
                    for o in legacy:
                        n = str(o.get("invoice_no", "")).replace("INV-", "").strip()
                        if n.isdigit():
                            nums.append(int(n))
                    if nums:
                        c.execute("UPDATE counters SET value=MAX(value, ?) WHERE name='invoice_no'", (max(nums),))
                        log.info("Backfilled invoice counter to %d from legacy JSON", max(nums))
        except Exception as e:
            log.warning("Could not migrate legacy invoice counter: %s", e)

def next_invoice_no() -> str:
    """Atomically increment and return the next invoice number."""
    with _conn() as c:
        c.execute("UPDATE counters SET value = value + 1 WHERE name='invoice_no'")
        row = c.execute("SELECT value FROM counters WHERE name='invoice_no'").fetchone()
        return f"INV-{row['value']}"

def record_order(order: dict) -> None:
    """Persist a placed order to SQLite and mirror to JSON file for legacy admin UI."""
    payload = json.dumps(order, ensure_ascii=False)
    with _conn() as c:
        c.execute(
            "INSERT INTO orders_log(order_id, invoice_no, created_ms, payload_json) VALUES (?,?,?,?)",
            (order["id"], order["invoice_no"], int(order.get("created", 0) or 0), payload),
        )
    _mirror_to_json(order)

def list_orders(limit: int = 500) -> list[dict]:
    """Return latest orders from SQLite. Falls back to JSON file if empty."""
    try:
        with _conn() as c:
            rows = c.execute(
                "SELECT payload_json FROM orders_log ORDER BY id DESC LIMIT ?",
                (limit,)
            ).fetchall()
        if rows:
            return [json.loads(r["payload_json"]) for r in rows]
    except Exception as e:
        log.warning("DB list_orders failed: %s", e)

    if _OJSON.exists():
        try:
            with open(_OJSON, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def find_order(oid_or_inv: str) -> dict | None:
    try:
        with _conn() as c:
            row = c.execute(
                "SELECT payload_json FROM orders_log WHERE order_id=? OR invoice_no=?",
                (oid_or_inv, oid_or_inv)
            ).fetchone()
        if row:
            return json.loads(row["payload_json"])
    except Exception as e:
        log.warning("DB find_order failed: %s", e)
    for o in list_orders():
        if o.get("id") == oid_or_inv or o.get("invoice_no") == oid_or_inv:
            return o
    return None

def _mirror_to_json(order: dict) -> None:
    """Append to orders.json atomically (tempfile + os.replace)."""
    with _LOCK:
        existing = []
        if _OJSON.exists():
            try:
                with open(_OJSON, encoding="utf-8") as f:
                    existing = json.load(f)
                if not isinstance(existing, list):
                    existing = []
            except Exception:
                existing = []
        existing.insert(0, order)
        existing = existing[:500]

        tmp = _OJSON.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
        os.replace(tmp, _OJSON)

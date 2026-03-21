#!/usr/bin/env python3
"""
admin.py — Aammii Shop CLI Admin Tool
Usage:
  python3 admin.py list-products [--category=X] [--oos]
  python3 admin.py set-stock <product_id> <quantity>
  python3 admin.py set-new-launch <product_id> <0|1>
  python3 admin.py add-product
  python3 admin.py list-orders [--status=X]
  python3 admin.py stats
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import argparse, json
from database import init_db, db_ctx, get_db

def cmd_stats():
    conn = get_db()
    products = conn.execute("SELECT COUNT(*) FROM products WHERE is_active=1").fetchone()[0]
    oos      = conn.execute("SELECT COUNT(*) FROM products WHERE stock_quantity=0 AND is_active=1").fetchone()[0]
    launches = conn.execute("SELECT COUNT(*) FROM products WHERE is_new_launch=1 AND is_active=1").fetchone()[0]
    orders   = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    revenue  = conn.execute("SELECT SUM(total_amount) FROM orders WHERE payment_status='paid'").fetchone()[0] or 0
    conn.close()
    print(f"\n  📊  Aammii Shop Statistics")
    print(f"  {'─'*40}")
    print(f"  Products active : {products}")
    print(f"  Out of stock    : {oos}")
    print(f"  New launches    : {launches}")
    print(f"  Total orders    : {orders}")
    print(f"  Revenue (paid)  : ₹{revenue:,.2f}\n")

def cmd_list_products(category=None, oos=False):
    conn = get_db()
    q    = "SELECT * FROM products WHERE is_active=1"
    p    = []
    if category: q += " AND category=?"; p.append(category)
    if oos:      q += " AND stock_quantity=0"
    rows = conn.execute(q + " ORDER BY category, name", p).fetchall()
    conn.close()
    print(f"\n  {'ID':<14} {'Name':<35} {'Category':<20} {'Price':>8} {'Stock':>7} {'New'}")
    print(f"  {'─'*100}")
    for r in rows:
        stock = "OOS" if r["stock_quantity"] == 0 else ("∞" if r["stock_quantity"]==999 else str(r["stock_quantity"]))
        new   = "✅" if r["is_new_launch"] else ""
        print(f"  {r['id']:<14} {r['name'][:34]:<35} {r['category'][:19]:<20} ₹{r['price']:>7.2f} {stock:>7} {new}")
    print()

def cmd_set_stock(pid, qty):
    with db_ctx() as conn:
        n = conn.execute("UPDATE products SET stock_quantity=? WHERE id=?", (qty, pid)).rowcount
    if n:
        print(f"  ✅  {pid} → stock_quantity = {qty}")
    else:
        print(f"  ❌  Product {pid} not found")

def cmd_set_launch(pid, flag):
    with db_ctx() as conn:
        import datetime
        ld = datetime.date.today().isoformat() if flag else None
        n  = conn.execute("UPDATE products SET is_new_launch=?, launch_date=? WHERE id=?",
                          (flag, ld, pid)).rowcount
    if n:
        status = "marked as NEW LAUNCH" if flag else "removed from new launches"
        print(f"  ✅  {pid} {status}")
    else:
        print(f"  ❌  Product {pid} not found")

def cmd_add_product():
    print("\n  📦  Add New Product")
    print(f"  {'─'*40}")
    name     = input("  Name        : ").strip()
    code     = input("  Code        : ").strip()
    category = input("  Category    : ").strip()
    price    = float(input("  Price (₹)  : ").strip())
    qty_unit = input("  Qty unit    : ").strip()
    stock    = input("  Stock (999=unlimited): ").strip() or "999"
    is_new   = input("  New launch? (y/n): ").strip().lower() == "y"

    import uuid, datetime
    pid = uuid.uuid4().hex[:12]
    with db_ctx() as conn:
        conn.execute("""
            INSERT INTO products (id,name,code,category,price,qty_unit,stock_quantity,is_active,is_new_launch,launch_date)
            VALUES (?,?,?,?,?,?,?,1,?,?)
        """, (pid, name, code, category, price, qty_unit, int(stock), int(is_new),
              datetime.date.today().isoformat() if is_new else None))
    print(f"\n  ✅  Product added  — ID: {pid}\n")

def cmd_list_orders(status=None):
    conn = get_db()
    q    = "SELECT * FROM orders"
    p    = []
    if status: q += " WHERE order_status=?"; p.append(status)
    rows = conn.execute(q + " ORDER BY id DESC LIMIT 50", p).fetchall()
    conn.close()
    print(f"\n  {'Order #':<14} {'Customer':<22} {'Total':>10} {'Pay':>8} {'Status':<12} {'Date'}")
    print(f"  {'─'*82}")
    for r in rows:
        print(f"  {r['order_number']:<14} {r['customer_name'][:21]:<22} ₹{r['total_amount']:>9.2f} {r['payment_method']:>8} {r['order_status']:<12} {r['created_at'][:10]}")
    print()

def main():
    init_db()
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]
    if   cmd == "stats":
        cmd_stats()
    elif cmd == "list-products":
        cat  = next((a.split("=")[1] for a in sys.argv[2:] if a.startswith("--category=")), None)
        oos  = "--oos" in sys.argv
        cmd_list_products(cat, oos)
    elif cmd == "set-stock" and len(sys.argv) >= 4:
        cmd_set_stock(sys.argv[2], int(sys.argv[3]))
    elif cmd == "set-new-launch" and len(sys.argv) >= 4:
        cmd_set_launch(sys.argv[2], int(sys.argv[3]))
    elif cmd == "add-product":
        cmd_add_product()
    elif cmd == "list-orders":
        st = next((a.split("=")[1] for a in sys.argv[2:] if a.startswith("--status=")), None)
        cmd_list_orders(st)
    else:
        print(f"  ❌  Unknown command: {cmd}")
        print(__doc__)

if __name__ == "__main__":
    main()
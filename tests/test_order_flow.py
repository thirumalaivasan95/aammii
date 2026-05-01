"""End-to-end tests through the Flask test client."""
import json


def _payload():
    return {
        "customer": {"name": "Bob", "phone": "9500000001",
                     "email": "b@x.com", "address": "Coimbatore"},
        "items":    [{"code": "P-001", "name": "Test Millet", "qty": 2, "price": 100}],
        "payment":  "cod",
        "totals":   {"grand": 200},
    }


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_orders_requires_admin(client):
    r = client.get("/api/orders")
    assert r.status_code == 401


def test_orders_with_token(client):
    r = client.get("/api/orders", headers={"X-Admin-Token": "test-token"})
    assert r.status_code == 200
    assert r.get_json() == []


def test_product_update_requires_admin(client):
    r = client.patch("/api/products/P-001", json={"price": 99})
    assert r.status_code == 401


def test_place_order_atomic_invoice_no(client):
    r1 = client.post("/api/order", json=_payload())
    r2 = client.post("/api/order", json=_payload())
    assert r1.status_code == 200, r1.get_json()
    assert r2.status_code == 200
    n1 = int(r1.get_json()["invoice_no"].split("-")[1])
    n2 = int(r2.get_json()["invoice_no"].split("-")[1])
    assert n2 == n1 + 1


def test_place_order_rejects_bad_payload(client):
    r = client.post("/api/order", json={"items": []})
    assert r.status_code == 400


def test_invoice_pdf_saved(client):
    r = client.post("/api/order", json=_payload())
    assert r.status_code == 200
    inv = r.get_json()["invoice_no"]
    r2 = client.get(f"/api/invoice/{inv}")
    assert r2.status_code == 200
    # PDF magic bytes if reportlab is installed; otherwise plain text
    body = r2.data
    assert body.startswith(b"%PDF") or b"GRAND TOTAL" in body

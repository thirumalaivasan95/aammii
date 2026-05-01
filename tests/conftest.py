"""
conftest.py — shared pytest fixtures.

Each test gets isolated temp dirs for orders/uploads/db so we never
touch real production data.
"""
import os, sys, importlib, json
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))


@pytest.fixture
def tmp_env(tmp_path, monkeypatch):
    """Sandbox: redirect data paths inside the test's tmp dir."""
    uploads = tmp_path / "uploads"; uploads.mkdir()
    orders  = tmp_path / "orders";  orders.mkdir()
    images  = tmp_path / "images";  images.mkdir()
    logs    = tmp_path / "logs";    logs.mkdir()
    db      = tmp_path / "test.db"

    # Seed a minimal products.json so order placement can enrich items.
    (uploads / "products.json").write_text(json.dumps([
        {"id": "P-001", "code": "P-001", "name": "Test Millet", "price": 100,
         "qty_unit": "1kg", "category": "Millets & Grains"},
    ]), encoding="utf-8")

    monkeypatch.setenv("ADMIN_TOKEN", "test-token")
    monkeypatch.setenv("CORS_ORIGINS", "*")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("LOG_LEVEL", "WARNING")
    monkeypatch.setenv("LOG_FILE", str(logs / "test.log"))

    # Reload config so it picks up env + new paths
    import config  # type: ignore
    importlib.reload(config)
    config.UPLOAD_DIR = str(uploads)
    config.ORDERS_DIR = str(orders)
    config.IMAGES_DIR = str(images)
    config.LOGS_DIR   = str(logs)
    config.DB_PATH    = str(db)

    # Reload modules that captured the old paths
    import app_logger; importlib.reload(app_logger)
    import order_store; importlib.reload(order_store)
    import security; importlib.reload(security)

    yield {
        "uploads": uploads, "orders": orders, "db": db, "config": config,
    }


@pytest.fixture
def client(tmp_env):
    import importlib
    import app  # type: ignore
    importlib.reload(app)
    app.order_store.init_store()
    app.app.config["TESTING"] = True
    with app.app.test_client() as c:
        yield c

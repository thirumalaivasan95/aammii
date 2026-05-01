"""Tests: GST math, invoice rows, totals."""
import pytest


def test_gst_rate_default_low(tmp_env):
    import app
    p = {"category": "Millets & Grains"}
    assert app.gst_rate_for(p) == pytest.approx(0.05)


def test_gst_rate_default_high(tmp_env):
    import app
    p = {"category": "Soap"}
    assert app.gst_rate_for(p) == pytest.approx(0.18)


def test_gst_rate_explicit_percent(tmp_env):
    import app
    p = {"gst_rate": 12}
    assert app.gst_rate_for(p) == pytest.approx(0.12)


def test_gst_rate_explicit_decimal(tmp_env):
    import app
    p = {"gst_rate": 0.05}
    assert app.gst_rate_for(p) == pytest.approx(0.05)


def test_compute_invoice_rows_5pct(tmp_env):
    import app
    items = [{"name": "Foo", "price": 105, "qty": 1, "gst_rate": 0.05}]
    rows, totals = app.compute_invoice_rows(items)
    # 105 (incl) → sales 100, cgst 2.5, sgst 2.5
    assert rows[0]["sales"] == pytest.approx(100.0)
    assert rows[0]["cgst"]  == pytest.approx(2.5)
    assert rows[0]["sgst"]  == pytest.approx(2.5)
    assert totals["grand"]  == pytest.approx(105.0)


def test_compute_invoice_rows_multi_qty(tmp_env):
    import app
    items = [{"name": "Bar", "price": 50, "qty": 3, "gst_rate": 0.05}]
    rows, totals = app.compute_invoice_rows(items)
    assert rows[0]["qty"]   == 3
    assert rows[0]["total"] == pytest.approx(150.0)
    assert totals["grand"]  == pytest.approx(150.0)


def test_hsn_default_for_category(tmp_env):
    import app
    assert app.hsn_for({"category": "Soap"}) == "34011190"


def test_compute_invoice_rows_zero_gst(tmp_env):
    import app
    items = [{"name": "Tax-free", "price": 100, "qty": 1, "gst_rate": 0}]
    rows, totals = app.compute_invoice_rows(items)
    assert rows[0]["cgst"] == 0
    assert rows[0]["sgst"] == 0
    assert totals["grand"] == pytest.approx(100.0)

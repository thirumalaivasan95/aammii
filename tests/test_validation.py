"""Tests: order payload validation."""
import pytest


def _good():
    return {
        "customer": {"name": "Alice", "phone": "9500000000",
                     "email": "a@b.com", "address": "Coimbatore"},
        "items":    [{"code": "P-001", "name": "Foo", "qty": 1, "price": 100}],
        "payment":  "cod",
        "totals":   {"grand": 100},
    }


def test_valid_payload_passes(tmp_env):
    from security import validate_order_payload
    out = validate_order_payload(_good())
    assert out["customer"]["name"] == "Alice"
    assert len(out["items"]) == 1


def test_missing_items_rejected(tmp_env):
    from security import validate_order_payload, ValidationError
    p = _good(); p["items"] = []
    with pytest.raises(ValidationError):
        validate_order_payload(p)


def test_bad_phone_rejected(tmp_env):
    from security import validate_order_payload, ValidationError
    p = _good(); p["customer"]["phone"] = "abc"
    with pytest.raises(ValidationError):
        validate_order_payload(p)


def test_bad_email_rejected(tmp_env):
    from security import validate_order_payload, ValidationError
    p = _good(); p["customer"]["email"] = "not-an-email"
    with pytest.raises(ValidationError):
        validate_order_payload(p)


def test_qty_out_of_range_rejected(tmp_env):
    from security import validate_order_payload, ValidationError
    p = _good(); p["items"][0]["qty"] = 0
    with pytest.raises(ValidationError):
        validate_order_payload(p)


def test_unknown_payment_rejected(tmp_env):
    from security import validate_order_payload, ValidationError
    p = _good(); p["payment"] = "barter"
    with pytest.raises(ValidationError):
        validate_order_payload(p)

# Aammii — Professional Build Notes

This document summarises the upgrades layered on top of the original
prototype to make it production-ready.

## What changed

| Area | Before | After |
|---|---|---|
| Config | hard-coded constants | `.env` + `config.py` (env-driven) |
| Auth | none — admin endpoints open | `X-Admin-Token` header on mutating routes; admin UI has token entry stored in localStorage |
| CORS | `*` everywhere | env-driven allow-list (`CORS_ORIGINS`) |
| Validation | none on `/api/order` | strict schema (`security.py`) |
| Order/invoice DB | JSON file (race-prone) | SQLite WAL + atomic counter |
| File writes | non-atomic | tempfile + `os.replace` |
| Logging | `print(..., flush=True)` | rotating file + console (`app_logger.py`) |
| Invoice | text + PDF | PDF + **QR code** for order tracking |
| Tests | none | 21 pytest cases (math, validation, e2e) |
| CI | none | GitHub Actions matrix (3.11 + 3.12) + Docker build |
| Container | none | `Dockerfile` + `docker-compose.yml` |
| Prod server | Flask dev | `waitress` (Windows) or `gunicorn` (Linux) |
| SEO | basic meta | JSON-LD schema, OG tags, robots.txt, sitemap.xml |
| Checkout flow | one-step "Place Order" | two-step: Checkout (form) → Confirm (quotation/invoice review with per-item GST) → Pay Now |
| Product images | single `image` URL | `image` + `images[]` gallery with admin editor (add/remove/reorder URLs) |
| Hosting | single Flask box | split: Cloudflare Pages (CDN frontend) + PythonAnywhere (Flask + persistent disk) |

## Quick start (development)

```powershell
# Install deps
pip install -r backend/requirements.txt

# One-time: copy and edit env
copy .env.example .env

# Run dev server
python backend/app.py

# Run tests
pytest

# Run lint
ruff check backend/ tests/
```

## Production server

```powershell
# Windows / cross-platform
python backend/wsgi.py

# Linux / Mac (alternate)
gunicorn -b 0.0.0.0:5000 --chdir backend wsgi:application
```

## Docker

```bash
docker compose up --build -d
docker compose logs -f aammii
```

## Admin access

Set `ADMIN_TOKEN` in `.env`, then call admin endpoints with header:

```
X-Admin-Token: <your-token>
```

Without the token, the following return **401**:
- `PATCH /api/products/<id>`
- `POST /api/upload`
- `POST /api/mark-new`
- `GET  /api/orders`
- `GET  /api/orders/<id>`

If `ADMIN_TOKEN` is empty, the decorator logs a **warning** and falls
through (development convenience only).

## What still needs work

- **Razorpay integration** — `RAZORPAY_KEY_*` are wired in `config.py` and
  the Confirm page has a `Pay Now` button, but the click currently calls
  `/api/order` directly (records order, no money moves). Branch in `payNow()`
  on `payment !== 'cod'` to open Razorpay checkout, then POST to
  `/api/order` on payment success. Sketch in `BUSINESS_GUIDE.md`.
- **Email invoices** — add SMTP config + send PDF after order placed.
- **Customer accounts via Firebase** — frontend has the modal, backend
  doesn't trust the JWT. Add token verification.
- **Stock management** — `database.py` has the schema but `app.py`
  still reads/writes products from JSON. Move when traffic demands.
- **Per-IP rate limit** — `flask-limiter` is installed; wire it on
  `/api/order` and `/api/upload` (`@limiter.limit("5 per minute")`).
- **Promo code application** — `AAMMII10` shows a "10% off" toast at
  checkout but the discount isn't applied to the cart total or the
  invoice rows.
- **Order status updates** — orders are locked at `confirmed`. No admin UI
  to set `shipped` / `delivered` and no customer-facing status timeline.

## Quotation / Confirm flow

The checkout flow is now two-step to give customers a clear review screen
before committing payment:

1. **`/cart`** — review cart, apply promo code intent.
2. **`/checkout`** — collect contact + shipping + preferred payment method.
   Submit saves to `localStorage["aammii-pending-order"]` and routes to
   `/confirm`.
3. **`/confirm`** — quotation/invoice-style table with per-item GST,
   address summary, and a `Pay Now` button. **Edit** routes back to
   `/checkout` with the form prefilled from the pending payload.
4. **`Pay Now`** — POSTs to `/api/order`, clears the cart and the pending
   payload, downloads the invoice PDF, and routes to `/order-placed/<id>`.

GST per row is computed in `gstRateFor()` (frontend mirror of the backend's
`HIGH_GST_CATS` table, defaulting to 5% / 18% based on category, with
explicit `gst_rate` on a product winning if set).

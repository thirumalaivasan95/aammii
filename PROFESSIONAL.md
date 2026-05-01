# Aammii — Professional Build Notes

This document summarises the upgrades layered on top of the original
prototype to make it production-ready.

## What changed

| Area | Before | After |
|---|---|---|
| Config | hard-coded constants | `.env` + `config.py` (env-driven) |
| Auth | none — admin endpoints open | `X-Admin-Token` header on mutating routes |
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

- **Razorpay integration** — `RAZORPAY_KEY_*` are wired in `config.py` but
  no `/api/payment/*` endpoint yet. Sketch in `BUSINESS_GUIDE.md`.
- **Email invoices** — add SMTP config + send PDF after order placed.
- **Customer accounts via Firebase** — frontend has the modal, backend
  doesn't trust the JWT. Add token verification.
- **Stock management** — `database.py` has the schema but `app.py`
  still reads/writes products from JSON. Move when traffic demands.
- **Per-IP rate limit** — `flask-limiter` is installed; wire it on
  `/api/order` and `/api/upload` (`@limiter.limit("5 per minute")`).

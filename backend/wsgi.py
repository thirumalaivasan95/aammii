"""
wsgi.py — production entry point.

Run with waitress (Windows-friendly):
    python wsgi.py
or with gunicorn (Linux/Mac):
    gunicorn -b 0.0.0.0:5000 wsgi:application
"""
import config
from app_logger import get_logger
from app import app as application
import order_store

log = get_logger("aammii.wsgi")

# One-time initialisation
order_store.init_store()

if __name__ == "__main__":
    from waitress import serve
    log.info("Starting waitress on http://%s:%d (production)", config.HOST, config.PORT)
    serve(application, host=config.HOST, port=config.PORT, threads=8)

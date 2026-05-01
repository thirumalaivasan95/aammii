"""
app_logger.py — structured logging with rotating file handler.
"""
import logging, sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

import config

_FMT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
_DATEFMT = "%Y-%m-%d %H:%M:%S"

_configured = False

def get_logger(name: str = "aammii") -> logging.Logger:
    global _configured
    logger = logging.getLogger(name)
    if _configured:
        return logger

    level = getattr(logging, config.LOG_LEVEL, logging.INFO)
    root  = logging.getLogger()
    root.setLevel(level)

    fmt = logging.Formatter(_FMT, datefmt=_DATEFMT)

    # Console (UTF-8 safe)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    sh.setLevel(level)
    root.addHandler(sh)

    # Rotating file
    try:
        log_path = Path(config.LOG_FILE)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        fh = RotatingFileHandler(log_path, maxBytes=2_000_000, backupCount=5, encoding="utf-8")
        fh.setFormatter(fmt)
        fh.setLevel(level)
        root.addHandler(fh)
    except Exception as e:
        root.warning("Could not attach file handler: %s", e)

    # Quieter werkzeug
    logging.getLogger("werkzeug").setLevel(logging.WARNING)

    _configured = True
    return logger

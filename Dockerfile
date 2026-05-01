FROM python:3.11-slim

# Install system fonts for Tamil rendering on PDF invoices
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fonts-noto fonts-noto-extra \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer cache)
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy app source
COPY backend  /app/backend
COPY frontend /app/frontend
COPY uploads  /app/uploads
COPY orders   /app/orders

# Non-root runtime user
RUN useradd -m aammii && chown -R aammii:aammii /app
USER aammii

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    PORT=5000

EXPOSE 5000
WORKDIR /app/backend

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:5000/api/health').status==200 else 1)"

CMD ["python", "wsgi.py"]

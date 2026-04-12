#!/bin/bash
# =================================================================
# deploy.sh — Aammii Tharcharbu Santhai
# Run this on your Oracle Cloud / Ubuntu 22.04 server
# Usage:  bash deploy.sh
# =================================================================

set -e

echo ""
echo "🌿 Aammii Tharcharbu Santhai — Server Setup"
echo "────────────────────────────────────────────"

# ── 1. System packages ────────────────────────────────────────────
echo "[1/8] Installing system packages..."
sudo apt-get update -y -q
sudo apt-get install -y -q python3 python3-pip python3-venv nginx git ufw

# ── 2. Clone or update repo ───────────────────────────────────────
echo "[2/8] Setting up app directory..."
APP_DIR="/var/www/aammii"
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    # If deploying for the first time — copy files
    sudo mkdir -p "$APP_DIR"
    sudo chown -R $USER:$USER "$APP_DIR"
    # Copy everything from current directory
    cp -r . "$APP_DIR/"
    cd "$APP_DIR"
fi

# ── 3. Python virtual environment ────────────────────────────────
echo "[3/8] Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install flask flask-cors gunicorn -q

# ── 4. Systemd service ────────────────────────────────────────────
echo "[4/8] Creating systemd service..."
sudo tee /etc/systemd/system/aammii.service > /dev/null <<SERVICE
[Unit]
Description=Aammii Tharcharbu Santhai Flask App
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/gunicorn --workers 2 --bind 127.0.0.1:5000 app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable aammii
sudo systemctl restart aammii
echo "   ✅ Service started"

# ── 5. Nginx config ───────────────────────────────────────────────
echo "[5/8] Configuring Nginx..."
# Get public IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "_")

sudo tee /etc/nginx/sites-available/aammii > /dev/null <<NGINX
server {
    listen 80;
    server_name $SERVER_IP _;

    client_max_body_size 20M;

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120;
    }

    location /images/ {
        alias $APP_DIR/generated_images/;
        expires 7d;
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/aammii /etc/nginx/sites-enabled/aammii
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
echo "   ✅ Nginx configured"

# ── 6. Firewall ───────────────────────────────────────────────────
echo "[6/8] Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "   ✅ Firewall active (ports 22, 80, 443 open)"

# ── 7. Directories ────────────────────────────────────────────────
echo "[7/8] Creating required directories..."
mkdir -p "$APP_DIR/uploads" "$APP_DIR/orders" "$APP_DIR/generated_images"
echo "   ✅ Directories ready"

# ── 8. Status check ───────────────────────────────────────────────
echo "[8/8] Checking service status..."
sleep 2
sudo systemctl is-active --quiet aammii && echo "   ✅ Flask app is running" || echo "   ❌ Flask app failed — check: sudo journalctl -u aammii -n 20"
sudo nginx -t 2>&1 | grep -q "successful" && echo "   ✅ Nginx is running" || echo "   ⚠️  Check nginx config"

echo ""
echo "════════════════════════════════════════════════"
echo "✅  DEPLOYMENT COMPLETE!"
echo ""
echo "   🌐  Your site: http://$SERVER_IP"
echo ""
echo "   Useful commands:"
echo "   sudo systemctl status aammii    — check app"
echo "   sudo journalctl -u aammii -f    — live logs"
echo "   sudo systemctl restart aammii   — restart app"
echo "════════════════════════════════════════════════"
echo ""

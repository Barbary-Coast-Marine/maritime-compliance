#!/usr/bin/env bash
# deploy-demo.sh — Bootstrap maritime compliance demo server
# Run as root on a fresh Ubuntu 24.04 droplet
set -euo pipefail

APP_USER="maritime"
APP_DIR="/opt/maritime"
DB_NAME="maritime"
DB_USER="maritime"
DB_PASS="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 32)"
DOMAIN="${1:-demo.barbarycoastmarine.com}"

log() { echo -e "\033[1;36m[deploy]\033[0m $*"; }

# ─── System packages ─────────────────────────────────────────────────────────
log "Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
  curl git build-essential \
  postgresql postgresql-contrib \
  redis-server \
  nginx certbot python3-certbot-nginx \
  ufw fail2ban

# ─── Node.js 22 ──────────────────────────────────────────────────────────────
log "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm pm2

# ─── PostgreSQL ──────────────────────────────────────────────────────────────
log "Configuring PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

# ─── Redis ───────────────────────────────────────────────────────────────────
log "Configuring Redis..."
systemctl start redis-server
systemctl enable redis-server

# ─── App user ────────────────────────────────────────────────────────────────
log "Creating app user..."
id -u $APP_USER &>/dev/null || useradd -m -s /bin/bash $APP_USER

# ─── Clone repo ──────────────────────────────────────────────────────────────
log "Cloning repository..."
rm -rf $APP_DIR
git clone https://github.com/Barbary-Coast-Marine/maritime-compliance.git $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# ─── Environment ─────────────────────────────────────────────────────────────
log "Writing environment config..."
cat > $APP_DIR/.env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://localhost:6379
OLLAMA_URL=http://localhost:11434
PORT=3200
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_API_URL=https://$DOMAIN
EOF

cat > $APP_DIR/apps/vessel-agent/.env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://localhost:6379
PORT=3200
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=$JWT_SECRET
EOF

cat > $APP_DIR/apps/dashboard/.env.local << EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN/api-proxy
EOF

# ─── Build ───────────────────────────────────────────────────────────────────
log "Installing dependencies..."
cd $APP_DIR
sudo -u $APP_USER pnpm install --frozen-lockfile

log "Building vessel-agent..."
sudo -u $APP_USER pnpm --filter @maritime/vessel-agent build

log "Building dashboard..."
sudo -u $APP_USER pnpm --filter dashboard build

# ─── Database migrations + seed ──────────────────────────────────────────────
log "Running migrations..."
sudo -u $APP_USER bash -c "cd $APP_DIR && DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME pnpm --filter @maritime/db migrate"

log "Seeding demo data..."
sudo -u $APP_USER bash -c "cd $APP_DIR && DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME pnpm --filter @maritime/db seed"

# ─── PM2 process config ───────────────────────────────────────────────────────
log "Configuring PM2..."
cat > $APP_DIR/ecosystem.config.cjs << 'PMEOF'
module.exports = {
  apps: [
    {
      name: "vessel-agent",
      cwd: "/opt/maritime/apps/vessel-agent",
      script: "node",
      args: "--loader tsx/esm src/server.ts",
      env: {
        NODE_ENV: "production",
      },
      env_file: "/opt/maritime/apps/vessel-agent/.env",
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: "dashboard",
      cwd: "/opt/maritime/apps/dashboard",
      script: "node_modules/.bin/next",
      args: "start --port 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
PMEOF

sudo -u $APP_USER bash -c "cd $APP_DIR && pm2 start ecosystem.config.cjs"
sudo -u $APP_USER bash -c "pm2 save"
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER | tail -1 | bash || true

# ─── Nginx ───────────────────────────────────────────────────────────────────
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/maritime-demo << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    # Dashboard
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    # API (proxied so NEXT_PUBLIC_API_URL can be same-origin)
    location /api-proxy/ {
        rewrite ^/api-proxy/(.*) /\$1 break;
        proxy_pass http://localhost:3200;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/maritime-demo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ─── Firewall ─────────────────────────────────────────────────────────────────
log "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3000/tcp
ufw deny 3200/tcp

# ─── SSL ─────────────────────────────────────────────────────────────────────
log "Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m darren.mckeeman@gmail.com || \
  log "⚠ SSL cert failed — run certbot manually after DNS propagates"

log ""
log "═══════════════════════════════════════════════"
log "  Maritime Compliance Demo — Deploy Complete"
log "  URL: https://$DOMAIN"
log "  Login: captain / obrien2026"
log "═══════════════════════════════════════════════"

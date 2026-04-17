#!/bin/bash
# Setup script for new vessel installation

echo "Generating secrets..."
DB_PASSWORD=$(openssl rand -base64 24)
AUTH_SECRET=$(openssl rand -base64 32)

cat <<EOF > .env
DB_USER=marinedb
DB_PASSWORD=$DB_PASSWORD
AUTH_SECRET=$AUTH_SECRET
EOF

echo "Starting Docker containers..."
docker-compose up -d

echo "Running database migrations..."
docker-compose exec vessel-agent pnpm db:migrate

echo "Installation complete. Access the dashboard at http://maritime.local"

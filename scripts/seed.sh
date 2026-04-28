#!/usr/bin/env bash
set -euo pipefail

echo "Seeding auth service…"
docker compose exec -T auth-service node src/seed.js

echo "Seeding vehicle service…"
docker compose exec -T vehicle-service node src/seed.js

echo "Seeding customer service…"
docker compose exec -T customer-service node src/seed.js

echo "Done. Demo logins:"
echo "  admin / admin123"
echo "  staff / staff123"

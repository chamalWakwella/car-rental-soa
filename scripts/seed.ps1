$ErrorActionPreference = "Stop"

Write-Host "Seeding auth service..."
docker compose exec -T auth-service node src/seed.js

Write-Host "Seeding vehicle service..."
docker compose exec -T vehicle-service node src/seed.js

Write-Host "Seeding customer service..."
docker compose exec -T customer-service node src/seed.js

Write-Host ""
Write-Host "Done. Demo logins:"
Write-Host "  admin / admin123"
Write-Host "  staff / staff123"

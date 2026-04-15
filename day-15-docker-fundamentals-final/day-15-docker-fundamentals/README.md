# Day 15: Docker Fundamentals

**Date:** March 03, 2026 | **Learning Time:** 3 hours

> Docker has no "frontend" or "backend" to code separately —
> the entire challenge is configuration files. Study each file
> carefully; every line is annotated.

---

## 🚀 How to Run Everything
```bash

# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Stop postgres in local ( If running )
sudo systemctl stop postgresql

# Stop redis in local ( If running )
sudo systemctl stop redis.server

cd app

# Development (with hot reload)
sudo docker compose -f docker-compose.dev.yml up --build

# Production build
docker compose up --build

# Stop everything
sudo docker compose down

# Stop and remove volumes (wipes database!)
sudo docker compose -f docker-compose.dev.yml down -v ( dev )
sudo docker compose down -v ( Prod )
```

## 📁 Project Structure
```
app/
├── backend/              ← Node.js Express API
├── frontend/             ← React app (nginx-served in prod)
├── Dockerfile.backend    ← Multi-stage build for backend
├── Dockerfile.frontend   ← Multi-stage build for frontend
├── docker-compose.yml    ← Production compose
├── docker-compose.dev.yml← Development with hot reload
├── .dockerignore         ← What Docker ignores (like .gitignore)
└── nginx.conf            ← Nginx config for production
```

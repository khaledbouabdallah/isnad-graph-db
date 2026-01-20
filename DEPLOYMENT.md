# Isnad Explorer - Deployment Guide

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- pnpm

### Quick Start

1. **Start Neo4j database:**
   ```bash
   docker compose up neo4j -d
   ```

2. **Load data into Neo4j:**
   ```bash
   # Run your loader script
   python src/loader.py
   ```

3. **Start the backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

4. **Start the frontend:**
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```

5. Open http://localhost:3000

---

## Production Deployment (Hetzner VPS)

### 1. Server Setup

```bash
# SSH into your VPS
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin

# Create app directory
mkdir -p /opt/isnad-explorer
cd /opt/isnad-explorer
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/isnad-graph-db.git .
```

### 3. Configure Environment

```bash
# Copy and edit environment variables
cp .env.example .env
nano .env

# Set your domain and secure password:
# DOMAIN=isnad.yourdomain.com
# NEO4J_PASSWORD=your-secure-password
```

### 4. Update Caddyfile

```bash
nano Caddyfile
# Replace {$DOMAIN} with your actual domain
```

### 5. Deploy

```bash
# Start all services with production profile
docker compose --profile production up -d

# Check logs
docker compose logs -f
```

### 6. Load Data

```bash
# Copy your Neo4j data dump to the server, or
# Run the loader against the production database

# Option A: Copy existing data
docker cp neo4j_backup.dump isnad-neo4j:/var/lib/neo4j/data/

# Option B: Run loader
docker exec -it isnad-neo4j cypher-shell -u neo4j -p your-password
```

### 7. DNS Configuration

Point your domain's A record to your VPS IP address:
```
A    isnad.yourdomain.com    → your.vps.ip.address
```

Caddy will automatically obtain SSL certificates from Let's Encrypt.

---

## GitHub Actions Setup

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | SSH username (usually `root`) |
| `VPS_SSH_KEY` | Private SSH key for deployment |
| `DOMAIN` | Your production domain |

---

## Maintenance

### View logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f neo4j
```

### Restart services
```bash
docker compose restart
```

### Update deployment
```bash
git pull
docker compose pull
docker compose --profile production up -d
```

### Backup Neo4j data
```bash
docker exec isnad-neo4j neo4j-admin dump --database=neo4j --to=/data/backup.dump
docker cp isnad-neo4j:/data/backup.dump ./backup-$(date +%Y%m%d).dump
```

---

## Resource Usage

Expected resources on Hetzner CX22 (4GB RAM):

| Service | Memory |
|---------|--------|
| Neo4j | ~800MB |
| Backend | ~150MB |
| Frontend | ~200MB |
| Caddy | ~30MB |
| **Total** | ~1.2GB |

Plenty of headroom for your 1,669 nodes and 33K edges!

# API Interview Projects

Four standalone API projects covering REST/OpenAPI, GraphQL, API Gateways, and a modern full-stack pattern.
Each project runs independently and can be demoed live during an interview.

---

## Table of Contents

- [Quick Start (local)](#quick-start-local)
- [Project 1 — Book Library REST API](#project-1--book-library-rest-api)
- [Project 2 — Movie Ratings GraphQL API](#project-2--movie-ratings-graphql-api)
- [Project 3 — API Gateway with Kong](#project-3--api-gateway-with-kong)
- [Project 4 — Full-stack Task Manager](#project-4--full-stack-task-manager)
- [Deploy to AWS EC2 (Ubuntu)](#deploy-to-aws-ec2-ubuntu)

---

## Quick Start (local)

```bash
# Clone or copy this folder to your machine
cd api-projects

# Each project has its own directory:
# project1-rest-openapi/
# project2-graphql/
# project3-kong/
# project4-fullstack/
```

Node.js 20+ is required for all projects. Docker is required for Project 3.

---

## Project 1 — Book Library REST API

**Stack:** Node.js · Express · OpenAPI 3.0 · Swagger UI · express-openapi-validator  
**Concepts:** Contract-first design, request validation, interactive documentation  
**Port:** 3000

### Run locally

```bash
cd project1-rest-openapi
npm install
npm start
```

Open http://localhost:3000/docs — the full interactive Swagger UI.

### Endpoints

| Method | Path              | Description             |
|--------|-------------------|-------------------------|
| GET    | /books            | List all books          |
| GET    | /books?genre=Programming | Filter by genre  |
| POST   | /books            | Add a new book          |
| GET    | /books/:id        | Get book by ID          |
| PUT    | /books/:id        | Update a book           |
| DELETE | /books/:id        | Delete a book           |
| PATCH  | /books/:id/borrow | Borrow or return a book |
| GET    | /health           | Health check            |

### Example requests

```bash
# Get all books
curl http://localhost:3000/books

# Add a book
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Code","author":"Robert C. Martin","genre":"Programming","year":2008}'

# Borrow a book (use a real ID from the GET response)
curl -X PATCH http://localhost:3000/books/{id}/borrow \
  -H "Content-Type: application/json" \
  -d '{"action":"borrow"}'

# Trigger a validation error (missing required field)
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Missing Fields"}'
```

### Interview talking points

- The OpenAPI spec was written **before** the code (contract-first)
- `express-openapi-validator` auto-validates every request against the spec — no manual validation code
- Swagger UI is auto-generated from the same YAML — docs are always in sync with the contract

---

## Project 2 — Movie Ratings GraphQL API

**Stack:** Node.js · Apollo Server 4 · GraphQL  
**Concepts:** Schema-first GraphQL, queries, mutations, nested resolvers, structured errors  
**Port:** 4000

### Run locally

```bash
cd project2-graphql
npm install
npm start
```

Open http://localhost:4000 — Apollo Explorer opens automatically.

### Example GraphQL queries

Paste these into the Apollo Explorer at http://localhost:4000:

```graphql
# Get all movies (only request what you need)
query {
  movies {
    title
    year
    averageRating
  }
}

# Filter by genre — director is loaded lazily, only when requested
query {
  movies(genre: "Sci-Fi") {
    title
    director {
      name
      nationality
    }
    totalRatings
    averageRating
  }
}

# Top 3 rated movies
query {
  topMovies(limit: 3) {
    title
    averageRating
    genre
  }
}

# Add a rating (score must be 1-5)
mutation {
  addRating(movieId: "m1", input: { userId: "user99", score: 5, comment: "Brilliant!" }) {
    title
    averageRating
    totalRatings
  }
}

# Add a new movie
mutation {
  addMovie(input: { title: "Oppenheimer", year: 2023, genre: "Drama", directorId: "d1" }) {
    id
    title
    director { name }
  }
}

# Trigger a validation error (score out of range)
mutation {
  addRating(movieId: "m1", input: { userId: "u1", score: 10 }) {
    title
  }
}
```

### Interview talking points

- Compare `movies { title }` vs `movies { title director { name } nationality }` — show the client controls the shape
- The `Director` resolver is **lazy** — it only runs when `director` is in the query
- REST would need two endpoints or over-fetch; GraphQL does it in one request with zero waste
- Custom `GraphQLError` with `extensions.code` shows structured error handling

---

## Project 3 — API Gateway with Kong

**Stack:** Kong 3.6 · Docker · Node.js · Express  
**Concepts:** Reverse proxy, rate limiting, API key auth, request tracing  
**Ports:** 8000 (proxy), 8001 (Kong admin), 3000 (backend direct)

### Prerequisites

Install Docker: https://docs.docker.com/get-docker/

### Run locally

```bash
cd project3-kong
docker compose up --build
```

Wait for: `kong  | ... [info] Starting Kong`

### Test the gateway

```bash
# This fails — no API key
curl http://localhost:8000/api/weather
# → 401 Unauthorized

# This works — valid API key
curl http://localhost:8000/api/weather?city=london \
  -H "X-API-Key: my-secret-api-key-123"

# Try another city
curl "http://localhost:8000/api/weather?city=tokyo" \
  -H "X-API-Key: my-secret-api-key-123"

# 5-day forecast
curl "http://localhost:8000/api/forecast?city=new-york" \
  -H "X-API-Key: my-secret-api-key-123"

# Hit rate limit — run this 11 times fast
for i in {1..11}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    "http://localhost:8000/api/weather" \
    -H "X-API-Key: my-secret-api-key-123"
done
# First 10 → 200, 11th → 429

# Kong admin API — check service config
curl http://localhost:8001/services

# Check applied plugins
curl http://localhost:8001/plugins
```

### Available cities

`new-york` · `london` · `tokyo` · `sydney` · `dubai`

### API keys

| Consumer     | API Key                      |
|--------------|------------------------------|
| demo-user    | `my-secret-api-key-123`      |
| admin-user   | `admin-super-secret-key-456` |

### Interview talking points

- The `kong.yaml` file is declarative config-as-code — the entire gateway is defined in one file
- The backend has zero auth code — Kong handles it before the request reaches the service
- `hide_credentials: true` strips the API key before forwarding — the service never sees it
- `X-Request-ID` header enables distributed tracing across services
- Rate limiting returns standard `X-RateLimit-Remaining` headers — clients can see their quota

---

## Project 4 — Full-stack Task Manager

**Stack:** TypeScript · Fastify · Prisma · SQLite · Vitest · GitHub Actions  
**Concepts:** Type-safe APIs, ORM, auto-generated OpenAPI, integration tests, CI/CD  
**Port:** 3000

### Run locally

```bash
cd project4-fullstack

# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env

# 3. Run database migrations (creates dev.db automatically)
npx prisma migrate dev --name init

# 4. Start the server
npm run dev
```

Open:
- API: http://localhost:3000/api/tasks
- Docs: http://localhost:3000/docs (auto-generated from TypeScript types)

### Run tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

### Endpoints

| Method | Path               | Description          |
|--------|--------------------|----------------------|
| GET    | /api/tasks         | List tasks (filterable) |
| POST   | /api/tasks         | Create a task        |
| GET    | /api/tasks/:id     | Get task by ID       |
| PATCH  | /api/tasks/:id     | Update a task        |
| DELETE | /api/tasks/:id     | Delete a task        |
| GET    | /api/tasks/stats   | Aggregated stats     |
| GET    | /health            | Health check         |

### Example requests

```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy to production","priority":"URGENT","description":"Final deployment step"}'

# List all tasks
curl http://localhost:3000/api/tasks

# Filter by status
curl "http://localhost:3000/api/tasks?status=TODO"

# Update a task
curl -X PATCH http://localhost:3000/api/tasks/{id} \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# Get stats
curl http://localhost:3000/api/tasks/stats
```

### Enums

**Status:** `TODO` · `IN_PROGRESS` · `DONE` · `CANCELLED`  
**Priority:** `LOW` · `MEDIUM` · `HIGH` · `URGENT`

### Interview talking points

- TypeScript catches contract mismatches at compile time — `npm run lint` runs `tsc --noEmit`
- Fastify's JSON Schema is the single source of truth for validation AND OpenAPI docs
- Prisma gives type-safe DB queries — wrong field names are compile-time errors, not runtime crashes
- `app.inject()` in Vitest tests routes without a real HTTP server — fast and isolated
- The CI pipeline runs on every push — type-check → test → build must all pass

---

## Deploy to AWS EC2 (Ubuntu)

### Step 1 — Launch an EC2 instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu Server 24.04 LTS (Free Tier eligible)**
3. Instance type: **t2.micro** (free tier) or **t3.small** for better performance
4. Create or select a key pair (.pem file) — download and save it
5. Security Group — add these **Inbound Rules**:

| Type        | Port  | Source    | Purpose                     |
|-------------|-------|-----------|-----------------------------|
| SSH         | 22    | Your IP   | Remote access               |
| Custom TCP  | 3000  | 0.0.0.0/0 | Projects 1, 4               |
| Custom TCP  | 4000  | 0.0.0.0/0 | Project 2 (GraphQL)         |
| Custom TCP  | 8000  | 0.0.0.0/0 | Project 3 (Kong proxy)      |
| Custom TCP  | 8001  | 0.0.0.0/0 | Project 3 (Kong admin)      |

6. Launch the instance and note the **Public IPv4 address**

---

### Step 2 — Connect to your instance

```bash
# Fix key permissions (required on Mac/Linux)
chmod 400 your-key.pem

# SSH into the instance (replace with your actual IP)
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

### Step 3 — Install system dependencies

Run all of these on the EC2 instance:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should print v20.x.x
npm --version    # Should print 10.x.x

# Install Git
sudo apt install -y git

# Install PM2 (process manager — keeps apps running after logout)
sudo npm install -g pm2

# Install Docker (for Project 3)
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# Allow running Docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker   # Apply group change without logout
```

---

### Step 4 — Upload your project files

**Option A — Git (recommended)**

```bash
# On EC2: clone from your GitHub repo
git clone https://github.com/YOUR_USERNAME/api-projects.git
cd api-projects
```

**Option B — SCP (copy from your machine)**

```bash
# Run this on YOUR LOCAL MACHINE (not EC2)
scp -i your-key.pem -r ./api-projects ubuntu@YOUR_EC2_IP:~/
```

---

### Step 5 — Run Project 1 (REST + OpenAPI)

```bash
cd ~/api-projects/project1-rest-openapi

npm install
npm start
# Or with PM2 to keep it alive:
pm2 start index.js --name book-api

# Test it
curl http://localhost:3000/books
curl http://localhost:3000/health
```

**Access from browser:** `http://YOUR_EC2_IP:3000/docs`

---

### Step 6 — Run Project 2 (GraphQL)

```bash
cd ~/api-projects/project2-graphql

npm install
pm2 start index.js --name graphql-api

# Test it
curl -X POST http://localhost:4000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{ movies { title year averageRating } }"}'
```

**Access from browser:** `http://YOUR_EC2_IP:4000` (Apollo Explorer)

---

### Step 7 — Run Project 3 (Kong Gateway)

```bash
cd ~/api-projects/project3-kong

# Start everything with Docker Compose
docker compose up -d --build

# Check status
docker compose ps

# View Kong logs
docker compose logs kong -f

# Test it
curl http://localhost:8000/api/weather?city=tokyo \
  -H "X-API-Key: my-secret-api-key-123"

# Test rate limiting (run quickly 11 times)
for i in {1..11}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    http://localhost:8000/api/weather \
    -H "X-API-Key: my-secret-api-key-123"
done
```

**Access from browser:**
- `http://YOUR_EC2_IP:8000/api/weather?city=london` (with header)
- `http://YOUR_EC2_IP:8001/services` (Kong admin)

---

### Step 8 — Run Project 4 (Full-stack TypeScript)

```bash
cd ~/api-projects/project4-fullstack

npm install

# Set up environment
cp .env.example .env
# Edit .env if needed:
# nano .env

# Generate Prisma client
npx prisma generate

# Run database migration
npx prisma migrate dev --name init

# Start with PM2
pm2 start --name task-api -- npm run dev

# Run tests
npm test
```

**Access from browser:**
- `http://YOUR_EC2_IP:3000/api/tasks`
- `http://YOUR_EC2_IP:3000/docs`

---

### Step 9 — PM2 management commands

```bash
# View all running processes
pm2 list

# View logs for a specific app
pm2 logs book-api
pm2 logs graphql-api
pm2 logs task-api

# Restart an app
pm2 restart book-api

# Stop an app
pm2 stop book-api

# Auto-start on server reboot
pm2 startup
pm2 save
```

---

### Step 10 — Verify everything is running

```bash
# Project 1 - REST API
curl http://YOUR_EC2_IP:3000/health

# Project 2 - GraphQL
curl -X POST http://YOUR_EC2_IP:4000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{ movies { title } }"}'

# Project 3 - Kong Gateway
curl http://YOUR_EC2_IP:8000/api/weather?city=london \
  -H "X-API-Key: my-secret-api-key-123"

# Project 4 - Task Manager
curl http://YOUR_EC2_IP:3000/api/tasks
```

---

### Troubleshooting

**Port already in use**
```bash
# Find what is using the port
sudo lsof -i :3000
sudo kill -9 <PID>
```

**Cannot connect from browser**
- Double-check EC2 Security Group inbound rules include the port
- Confirm the app is bound to `0.0.0.0` (not `127.0.0.1`)

**Docker permission denied**
```bash
sudo usermod -aG docker ubuntu
newgrp docker
```

**PM2 process crashed**
```bash
pm2 logs <app-name>   # Read the error
pm2 restart <app-name>
```

**Database errors (Project 4)**
```bash
cd project4-fullstack
npx prisma migrate reset --force   # Wipe and recreate
npx prisma migrate dev --name init
```

---

### Cost reminder

The t2.micro instance is free for 12 months under AWS Free Tier.  
**Stop the instance when not in use** to avoid charges:

```
AWS Console → EC2 → Instances → Select instance → Instance State → Stop
```

Or from terminal:
```bash
sudo shutdown -h now
```

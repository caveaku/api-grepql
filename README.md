# API Interview Projects

Four standalone API projects that each demonstrate a distinct layer of modern backend engineering — from REST contract design to GraphQL, API gateway infrastructure, and a production-pattern TypeScript stack. Every project can be run locally and demoed live.

---

## Table of Contents

- [Project 1 — Book Library REST API](#project-1--book-library-rest-api)
- [Project 2 — Movie Ratings GraphQL API](#project-2--movie-ratings-graphql-api)
- [Project 3 — API Gateway with Kong](#project-3--api-gateway-with-kong)
- [Project 4 — Full-stack Task Manager](#project-4--full-stack-task-manager)
- [Running Locally](#running-locally)
- [Deploy to AWS EC2](#deploy-to-aws-ec2-ubuntu)

---

## Project 1 — Book Library REST API

**Stack:** Node.js · Express · OpenAPI 3.0 · Swagger UI · express-openapi-validator  
**Port:** 3000

### What this project is

This is a contract-first REST API for managing a book library. The word "contract-first" is the key idea: I wrote the OpenAPI specification in YAML **before** writing a single line of application code. The spec defines every endpoint, every request body shape, and every response — and the running server enforces it automatically.

### Why it matters

In a typical team, the API contract is what the frontend team, mobile team, and third-party integrators all depend on. If a developer changes a required field name or drops a property, every consumer breaks. By using `express-openapi-validator`, the spec becomes a living enforcement layer — any request that violates the contract is rejected with a structured 422 before it ever reaches my business logic. This means I cannot accidentally ship a breaking change without also updating the spec.

The Swagger UI at `/docs` is auto-generated from the same YAML file. There is no separate documentation to maintain or drift out of sync — the spec is the documentation.

### Key design decisions

| Decision | Why |
|---|---|
| Contract-first (spec before code) | Forces agreement on the API shape before implementation begins — critical in team settings |
| `express-openapi-validator` middleware | Validation is declared once in YAML, not scattered across route handlers |
| UUID primary keys | Avoids exposing sequential IDs that leak record counts and invite enumeration attacks |
| `/books/:id/borrow` as a PATCH sub-resource | Models a state change (borrow/return) as a resource action, keeping the core `/books/:id` endpoint clean |
| Centralized error handler | All validation errors bubble up to one place and return a consistent `{ success, error, details }` shape |

### How to Run

**Prerequisites:** Node.js 20+

**Step 1 — Install dependencies**

```bash
cd project1-rest-openapi
npm install
```

**Step 2 — Start the server**

```bash
npm start
```

You should see:

```
📚 Book Library API running on port 3000
   API:  http://localhost:3000/books
   Docs: http://localhost:3000/docs
```

**Step 3 — Verify the server is up**

```bash
curl http://localhost:3000/health
# → {"status":"ok","uptime":...,"timestamp":"..."}
```

**Step 4 — Open the interactive docs**

Go to **http://localhost:3000/docs** in your browser. Swagger UI loads with every endpoint listed and executable from the browser.

**Step 5 — Test the endpoints**

```bash
# List all books (4 pre-loaded)
curl http://localhost:3000/books

# Filter by genre
curl "http://localhost:3000/books?genre=Programming"

# Add a new book
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Architecture","author":"Robert C. Martin","genre":"Programming","year":2017}'

# Copy the "id" from the response above, then get that book
curl http://localhost:3000/books/<id>

# Borrow the book
curl -X PATCH http://localhost:3000/books/<id>/borrow \
  -H "Content-Type: application/json" \
  -d '{"action":"borrow"}'

# Try to borrow it again — expect 400 (already borrowed)
curl -X PATCH http://localhost:3000/books/<id>/borrow \
  -H "Content-Type: application/json" \
  -d '{"action":"borrow"}'

# Return the book
curl -X PATCH http://localhost:3000/books/<id>/borrow \
  -H "Content-Type: application/json" \
  -d '{"action":"return"}'

# Trigger a validation error — missing required fields
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Incomplete Book"}'
# → 422 Unprocessable Entity with detailed validation errors

# Update a book
curl -X PUT http://localhost:3000/books/<id> \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Architecture","author":"Robert C. Martin","genre":"Software","year":2017}'

# Delete a book
curl -X DELETE http://localhost:3000/books/<id>
```

**Available scripts**

| Command | What it does |
|---|---|
| `npm start` | Run with Node.js (production) |
| `npm run dev` | Run with nodemon (auto-restarts on file changes) |

---

### What to demo

```bash
cd project1-rest-openapi
npm install && npm start
```

- Open **http://localhost:3000/docs** — walk through the interactive Swagger UI
- Send a valid `POST /books` with all required fields — show the 201 response
- Send a `POST /books` with a missing required field — show the automatic 422 validation error
- Call `PATCH /books/:id/borrow` twice — show the business-logic guard on double-borrow

### Interview talking points

> "I chose contract-first because in my experience the biggest source of integration bugs is the gap between what the API is supposed to do and what it actually does. By making the OpenAPI spec the single source of truth, validated at runtime, that gap is closed by design."

> "The validator runs as Express middleware, so I have zero validation code in my route handlers — each handler only contains business logic. That separation makes routes easy to test and easy to reason about."

> "I can show you what happens when I send a request that violates the schema. The server rejects it before my code even runs."

---

## Project 2 — Movie Ratings GraphQL API

**Stack:** Node.js · Apollo Server 4 · GraphQL  
**Port:** 4000

### What this project is

A GraphQL API for movies and ratings, built schema-first. Clients query exactly the fields they need — nothing more, nothing less. The API supports nested queries (movies with their directors), mutations (add a movie, submit a rating), and structured error handling.

### Why it matters

REST forces the server to decide what data to return. GraphQL inverts that — the client declares its data requirements in the query, and the server fulfills exactly that shape in a single round trip. This eliminates two of the most common REST problems: over-fetching (getting 20 fields when you need 3) and under-fetching (making three calls to assemble one screen).

This project demonstrates the practical difference: fetching a movie list for a mobile card view versus fetching the same movies with full director bios requires two different REST endpoints or a bloated response. In GraphQL it is one query with a different field selection.

### Key design decisions

| Decision | Why |
|---|---|
| Schema-first (`typeDefs` defined before resolvers) | The schema is the contract — the same contract-first principle as Project 1, applied to GraphQL |
| Lazy `Director` resolver | The director data is only fetched when `director { ... }` appears in the query — no wasted work |
| `GraphQLError` with `extensions.code` | Structured errors (`INVALID_RATING_SCORE`, `MOVIE_NOT_FOUND`) let clients handle errors programmatically, not just read a string |
| Input types for mutations | `AddMovieInput` and `AddRatingInput` make mutations self-documenting and prevent field injection |
| `averageRating` and `totalRatings` as computed fields | Derived data calculated at query time rather than stored redundantly |

### How to Run

**Prerequisites:** Node.js 20+

**Step 1 — Install dependencies**

```bash
cd project2-graphql
npm install
```

**Step 2 — Start the server**

```bash
npm start
```

You should see:

```
🚀 Server ready at http://localhost:4000/
```

**Step 3 — Open Apollo Explorer**

Go to **http://localhost:4000** in your browser. Apollo Explorer loads automatically with schema introspection — you can browse every type, query, and mutation without reading the code.

**Step 4 — Run queries in the Explorer**

Paste these one at a time into the Explorer editor and click Run:

```graphql
# Get all movies — minimal fields (mobile card view)
query {
  movies {
    id
    title
    year
    averageRating
  }
}

# Filter by genre and include nested director data
query {
  movies(genre: "Sci-Fi") {
    title
    director { name nationality }
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

# Get all directors
query {
  directors {
    id
    name
    nationality
    birthYear
  }
}
```

**Step 5 — Run mutations**

```graphql
# Add a rating (use id "m1" to "m6")
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

# Delete a movie
mutation {
  deleteMovie(id: "m1") {
    success
    message
  }
}
```

**Step 6 — Trigger a validation error**

```graphql
# Score must be 1–5 — this returns a structured error with extensions.code
mutation {
  addRating(movieId: "m1", input: { userId: "u1", score: 10 }) {
    title
  }
}
```

Expected response:

```json
{
  "errors": [{
    "message": "Score must be between 1 and 5",
    "extensions": { "code": "INVALID_RATING_SCORE" }
  }]
}
```

**Available scripts**

| Command | What it does |
|---|---|
| `npm start` | Run with Node.js |
| `npm run dev` | Run with Node.js `--watch` (auto-restarts on file changes) |

---

### What to demo

```bash
cd project2-graphql
npm install && npm start
```

Open **http://localhost:4000** — Apollo Explorer loads automatically.

```graphql
# Show over-fetch vs precise fetch
query CardView {
  movies { title year averageRating }
}

query DetailView {
  movies(genre: "Sci-Fi") {
    title
    director { name nationality }
    totalRatings
    averageRating
  }
}

# Show lazy loading — director only resolves when requested
query TopRated {
  topMovies(limit: 3) { title averageRating genre }
}

# Mutation with validation
mutation {
  addRating(movieId: "m1", input: { userId: "user99", score: 5, comment: "Brilliant!" }) {
    title averageRating totalRatings
  }
}

# Trigger structured error (score out of range)
mutation {
  addRating(movieId: "m1", input: { userId: "u1", score: 10 }) { title }
}
```

### Interview talking points

> "The most concrete way I explain GraphQL is to show the same data need being served by a single query versus two REST calls. I run both in the Explorer and let the response shape speak for itself."

> "The Director resolver is lazy — it only executes when `director` is in the selection set. If a client only asks for titles, that resolver never runs. In REST you would either join the data for every response or add query parameters — both put the decision on the server."

> "Error handling is one thing people often get wrong with GraphQL. GraphQL always returns 200 unless the server itself is down. My resolvers throw `GraphQLError` with an `extensions.code` so clients can distinguish a validation error from a not-found error without parsing the message string."

---

## Project 3 — API Gateway with Kong

**Stack:** Kong 3.6 · Docker Compose · Node.js · Express (backend service)  
**Ports:** 8000 (Kong proxy) · 8001 (Kong admin) · 3000 (backend direct)

### What this project is

An API gateway setup using Kong, sitting in front of a Node.js weather service. The gateway handles API key authentication, rate limiting, request size limiting, and distributed tracing — all without the backend service knowing any of it exists. The entire gateway configuration is declared in a single `kong.yaml` file.

### Why it matters

In production systems, concerns like authentication, rate limiting, and observability are cross-cutting — they apply to every service, not just one. If each microservice implements its own auth and rate limiting, you get duplication, inconsistency, and a maintenance burden that scales with the number of services.

An API gateway centralizes those concerns at the network edge. The backend service in this project has zero authentication code. Kong intercepts every request, validates the API key, checks the rate limit, attaches a correlation ID for tracing, then forwards the clean request to the backend. The backend only sees valid, authorized requests — and it never sees the API key.

### Key design decisions

| Decision | Why |
|---|---|
| Declarative `kong.yaml` (config-as-code) | The entire gateway is version-controlled and reproducible — no manual admin UI clicks |
| `hide_credentials: true` on key-auth | The API key is stripped before forwarding — the backend cannot accidentally log or leak it |
| Rate limit at service level (not route level) | Applies consistently to all routes under the weather service without repeating config |
| `correlation-id` plugin (UUID, `X-Request-ID`) | Every request gets a unique trace ID echoed back to the client — enables end-to-end request tracing across services |
| Two consumers (`demo-user`, `admin-user`) | Demonstrates per-consumer access control — different keys, same gateway, different quota policies possible |

### How to Run

**Prerequisites:** Docker Desktop (running)

**Step 1 — Start all containers**

```bash
cd project3-kong
docker compose up --build
```

This starts two containers: `kong` (the gateway) and `weather-service` (the backend). Wait until you see:

```
kong  | ... [info] Starting Kong
```

**Step 2 — Verify Kong is up**

```bash
curl http://localhost:8001/status
# → {"database":{"reachability":"off"},...}
```

**Step 3 — Test authentication**

```bash
# No API key — Kong blocks the request
curl http://localhost:8000/api/weather
# → {"message":"No API key found in request"}  (401)

# With a valid API key — request reaches the backend
curl "http://localhost:8000/api/weather?city=london" \
  -H "X-API-Key: my-secret-api-key-123"
# → {"city":"London","temperature":...}

# Admin API key also works
curl "http://localhost:8000/api/weather?city=tokyo" \
  -H "X-API-Key: admin-super-secret-key-456"
```

**Available cities:** `new-york` · `london` · `tokyo` · `sydney` · `dubai`

**Step 4 — Test the forecast endpoint**

```bash
curl "http://localhost:8000/api/forecast?city=sydney" \
  -H "X-API-Key: my-secret-api-key-123"
```

**Step 5 — Trigger rate limiting**

```bash
# Send 11 requests in quick succession
# First 10 return 200, the 11th returns 429 Too Many Requests
for i in {1..11}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    "http://localhost:8000/api/weather?city=london" \
    -H "X-API-Key: my-secret-api-key-123"
done
```

Watch for the `X-RateLimit-Remaining-Minute` header dropping to 0 then the 429.

**Step 6 — Inspect the gateway config via the admin API**

```bash
# List all registered services
curl http://localhost:8001/services

# List all routes
curl http://localhost:8001/routes

# List all active plugins (auth, rate-limit, correlation-id, etc.)
curl http://localhost:8001/plugins

# List all consumers
curl http://localhost:8001/consumers
```

**Step 7 — Check the X-Request-ID tracing header**

```bash
curl -v "http://localhost:8000/api/weather?city=dubai" \
  -H "X-API-Key: my-secret-api-key-123" 2>&1 | grep -i "x-request-id"
# → X-Request-ID: <uuid>  — unique per request, echoed back in the response
```

**Step 8 — Stop the containers**

```bash
docker compose down
```

**Available scripts / Docker commands**

| Command | What it does |
|---|---|
| `docker compose up --build` | Build and start all containers (foreground) |
| `docker compose up -d --build` | Build and start in background (detached) |
| `docker compose down` | Stop and remove containers |
| `docker compose logs kong -f` | Tail Kong gateway logs |
| `docker compose logs weather-service -f` | Tail backend service logs |
| `docker compose ps` | Show container status |

---

### What to demo

```bash
cd project3-kong
docker compose up --build
```

```bash
# No API key → 401
curl http://localhost:8000/api/weather

# Valid key → 200 with weather data
curl "http://localhost:8000/api/weather?city=london" \
  -H "X-API-Key: my-secret-api-key-123"

# Show rate limiting — 10 requests/minute, 11th returns 429
for i in {1..11}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    "http://localhost:8000/api/weather" \
    -H "X-API-Key: my-secret-api-key-123"
done

# Show Kong admin API — inspect live config
curl http://localhost:8001/plugins
```

### Interview talking points

> "The thing I want to highlight is what the backend service does NOT have to know about. It has no auth middleware, no rate limiting logic, no tracing setup. That's all Kong's job. If I want to change the rate limit from 10 to 100 requests per minute, I change one line in `kong.yaml` — the backend doesn't change at all."

> "The `hide_credentials: true` flag is a security detail I think is worth calling out. Kong strips the API key from the request before it reaches the backend. This means if the backend accidentally logs all incoming headers, it never logs a credential."

> "Config-as-code is the key operational principle here. The `kong.yaml` file is the single source of truth. It's committed to git, it can be code-reviewed, and it produces the exact same gateway in dev, staging, and production."

---

## Project 4 — Full-stack Task Manager

**Stack:** TypeScript · Fastify · Prisma · SQLite · Vitest · GitHub Actions  
**Port:** 3000

### What this project is

A production-pattern REST API for task management, built entirely in TypeScript. It demonstrates the full vertical slice of a modern backend: type-safe API layer (Fastify), type-safe ORM (Prisma), integration tests (Vitest with Fastify's `inject()`), auto-generated OpenAPI docs, and a CI pipeline that enforces types, tests, and build on every push.

### Why it matters

Projects 1, 2, and 3 demonstrate individual concepts in isolation. This project shows how those concepts are combined in the kind of codebase a team actually ships. TypeScript threads through every layer — the HTTP handler, the database query, and the test — which means type errors surface at compile time, not in production.

The CI pipeline enforces this. Every push to the repository must pass `tsc --noEmit` (type check), `vitest` (integration tests), and `tsc --build` (compilation) before a PR can merge. This is what "type-safe from top to bottom" looks like in practice.

### Key design decisions

| Decision | Why |
|---|---|
| Fastify over Express | Fastify's JSON Schema validation is the single source of truth for both request validation AND OpenAPI docs — no duplication |
| Prisma as ORM | Querying a non-existent field is a compile-time error, not a runtime crash — the type safety extends to the database layer |
| SQLite for local dev | Zero-infrastructure database — no Docker needed for development, just `prisma migrate dev` |
| `app.inject()` in tests | Tests route requests directly through the Fastify application without binding a real port — fast, isolated, no port conflicts |
| `buildApp()` factory pattern | The app is exported as a factory function, not a singleton — this is what makes `inject()`-based testing and `NODE_ENV=test` isolation possible |
| GitHub Actions CI | Type-check → test → build pipeline runs on every push — failures block merging |
| `.env.example` committed | Documents required environment variables without committing actual secrets |

### How to Run

**Prerequisites:** Node.js 20+

**Step 1 — Install dependencies**

```bash
cd project4-fullstack
npm install
```

**Step 2 — Set up the environment file**

```bash
cp .env.example .env
```

The `.env.example` contains all required variables with working defaults — no edits needed for local development:

```
DATABASE_URL="file:./dev.db"
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```

**Step 3 — Run the database migration**

```bash
npx prisma migrate dev --name init
```

This creates `prisma/dev.db` (a SQLite file) and runs the schema migration. Prisma also generates the type-safe client automatically.

You should see:

```
✔ Generated Prisma Client
✔ Your database is now in sync with your schema.
```

**Step 4 — Start the development server**

```bash
npm run dev
```

You should see:

```
✅ Task Manager API
   API:  http://localhost:3000/api/tasks
   Docs: http://localhost:3000/docs
```

**Step 5 — Open the auto-generated API docs**

Go to **http://localhost:3000/docs** — Swagger UI is auto-generated from the TypeScript route schemas.

**Step 6 — Test the endpoints**

```bash
# Create tasks
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Design database schema","priority":"HIGH","description":"ERD and migration plan"}'

curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write unit tests","priority":"MEDIUM"}'

curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy to production","priority":"URGENT","description":"Final deployment step"}'

# List all tasks
curl http://localhost:3000/api/tasks

# Filter by status
curl "http://localhost:3000/api/tasks?status=TODO"

# Filter by priority
curl "http://localhost:3000/api/tasks?priority=URGENT"

# Get a single task (copy an id from the list above)
curl http://localhost:3000/api/tasks/<id>

# Update a task — move it to IN_PROGRESS
curl -X PATCH http://localhost:3000/api/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# Mark it DONE
curl -X PATCH http://localhost:3000/api/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"DONE"}'

# Get aggregated stats (count by status and priority)
curl http://localhost:3000/api/tasks/stats

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks/<id>

# Health check
curl http://localhost:3000/health
```

**Status values:** `TODO` · `IN_PROGRESS` · `DONE` · `CANCELLED`  
**Priority values:** `LOW` · `MEDIUM` · `HIGH` · `URGENT`

**Step 7 — Run the test suite**

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

**Step 8 — Run the type checker**

```bash
npm run lint
# Runs tsc --noEmit — zero output means zero type errors
```

**Step 9 — Explore the database with Prisma Studio**

```bash
npx prisma studio
# Opens http://localhost:5555 — a visual table editor for dev.db
```

**Available scripts**

| Command | What it does |
|---|---|
| `npm run dev` | Start with `tsx watch` — hot reload on save |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build (`node dist/index.js`) |
| `npm test` | Run Vitest integration tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run lint` | Type-check without emitting (`tsc --noEmit`) |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:reset` | Wipe and recreate the database |

---

### What to demo

```bash
cd project4-fullstack
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy to production","priority":"URGENT","description":"Final deployment step"}'

# Filter tasks by status
curl "http://localhost:3000/api/tasks?status=TODO"

# Get aggregated stats
curl http://localhost:3000/api/tasks/stats

# Run the test suite
npm test
```

Open **http://localhost:3000/docs** — OpenAPI docs auto-generated from the TypeScript route schemas.

### Interview talking points

> "The thing I'd highlight here is that TypeScript is not just in the route handlers — it goes all the way down to the database. If Prisma generates a client from the schema and I try to query a field that doesn't exist, that's a red squiggle in my editor and a compile error in CI. The schema is the source of truth for the entire stack."

> "I use Fastify's JSON Schema for validation instead of a separate validation library. The same schema object that validates incoming requests is also what generates the OpenAPI documentation. There is one place to change a field — not two."

> "The `buildApp()` pattern is worth explaining. Because the app is a factory, I can create a fresh instance for every test with no shared state and no real network listener. Vitest's `inject()` method sends requests directly through the routing layer — the tests run in milliseconds and can never fail due to port conflicts."

> "The CI pipeline is the last line of defense. I can demo this by looking at the GitHub Actions workflow: it runs the type checker first because type errors are the cheapest to catch, then the tests, then the build. If any step fails, the PR is blocked."

---

## Running Locally

Node.js 20+ is required for all projects. Docker is required for Project 3 only.

```bash
# Project 1 — REST API
cd project1-rest-openapi && npm install && npm start
# → http://localhost:3000/docs

# Project 2 — GraphQL
cd project2-graphql && npm install && npm start
# → http://localhost:4000

# Project 3 — Kong Gateway
cd project3-kong && docker compose up --build
# → http://localhost:8000 (proxy), http://localhost:8001 (admin)

# Project 4 — Full-stack TypeScript
cd project4-fullstack && npm install && cp .env.example .env
npx prisma migrate dev --name init && npm run dev
# → http://localhost:3000/docs
```

---

## Deploy to AWS EC2 (Ubuntu)

### Step 1 — Launch an EC2 instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu Server 24.04 LTS (Free Tier eligible)**
3. Instance type: **t2.micro** (free tier) or **t3.small** for better performance
4. Create or select a key pair (.pem file) — download and save it
5. Security Group — add these inbound rules:

| Type       | Port | Source    | Purpose                |
|------------|------|-----------|------------------------|
| SSH        | 22   | Your IP   | Remote access          |
| Custom TCP | 3000 | 0.0.0.0/0 | Projects 1 and 4       |
| Custom TCP | 4000 | 0.0.0.0/0 | Project 2 (GraphQL)    |
| Custom TCP | 8000 | 0.0.0.0/0 | Project 3 (Kong proxy) |
| Custom TCP | 8001 | 0.0.0.0/0 | Project 3 (Kong admin) |

6. Launch and note the **Public IPv4 address**

### Step 2 — Connect

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3 — Install dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# PM2 (process manager)
sudo npm install -g pm2

# Docker (Project 3)
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker ubuntu && newgrp docker
```

### Step 4 — Upload project files

```bash
# On EC2 — clone from GitHub
git clone https://github.com/caveaku/api-grepql.git
cd api-grepql
```

### Step 5 — Run Project 1

```bash
cd project1-rest-openapi && npm install
pm2 start index.js --name book-api
# → http://YOUR_EC2_IP:3000/docs
```

### Step 6 — Run Project 2

```bash
cd project2-graphql && npm install
pm2 start index.js --name graphql-api
# → http://YOUR_EC2_IP:4000
```

### Step 7 — Run Project 3

```bash
cd project3-kong
docker compose up -d --build
# → http://YOUR_EC2_IP:8000/api/weather?city=london (with X-API-Key header)
# → http://YOUR_EC2_IP:8001/services (Kong admin)
```

### Step 8 — Run Project 4

```bash
cd project4-fullstack && npm install
cp .env.example .env
npx prisma generate && npx prisma migrate dev --name init
pm2 start --name task-api -- npm run dev
# → http://YOUR_EC2_IP:3000/docs
```

### Step 9 — PM2 management

```bash
pm2 list                   # View all running processes
pm2 logs book-api          # Tail logs for a specific app
pm2 restart book-api       # Restart an app
pm2 startup && pm2 save    # Auto-start on server reboot
```

### Step 10 — Verify everything

```bash
curl http://YOUR_EC2_IP:3000/health
curl -X POST http://YOUR_EC2_IP:4000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{ movies { title } }"}'
curl "http://YOUR_EC2_IP:8000/api/weather?city=london" \
  -H "X-API-Key: my-secret-api-key-123"
curl http://YOUR_EC2_IP:3000/api/tasks
```

### Troubleshooting

```bash
# Port already in use
sudo lsof -i :3000 && sudo kill -9 <PID>

# Docker permission denied
sudo usermod -aG docker ubuntu && newgrp docker

# Project 4 database errors
cd project4-fullstack
npx prisma migrate reset --force && npx prisma migrate dev --name init
```

**Cost reminder:** The t2.micro instance is free for 12 months under AWS Free Tier. Stop the instance when not in use.

```bash
sudo shutdown -h now
```

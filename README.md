# Car Rental — Service-Oriented Architecture Demo

A complete reference implementation of a **car rental information system** built as a
small set of Node.js microservices behind an API gateway, with a React + Tailwind
client and MongoDB persistence. The project demonstrates the benefits of a
**service-oriented approach** to a classic distributed business problem: cars,
vans, customers, rentals, and per-customer pricing rules.

---

## 1. Problem statement (summary)

A car renting company needs an information system that can:

- Hold the make, model, and registration number of every car (and **van**).
- Compute rental cost, track availability, and report total cars on rent.
- Add and delete cars/vans and mark them as on-rent.
- Maintain customer accounts: name, address, rented vehicle, return date,
  amount due, and any penalty charges.
- Add and delete customers and report total customer count.
- Apply **age-based pricing**:
  - Under-25 customers: **+20%** insurance surcharge.
  - Over-50 customers: **−10%** senior discount.
- Be accessible from different clients / GUIs over a network.

Everything in that list is implemented in this repository.

---

## 2. Critical analysis of architectural styles

| Style | Pros | Cons | Verdict for this problem |
|---|---|---|---|
| **Monolithic OO app** (single Node + DB) | Simplest to build, single deploy, in-process calls | Tight coupling, single tech stack, hard to scale parts independently, single failure domain | OK for an exercise but doesn't show distributed concerns |
| **Client-Server (RPC / direct DB)** | Familiar, fast, easy GUIs | Poor reuse, business logic leaks to clients, brittle when GUIs differ | Not flexible enough for "different clients and different GUIs" |
| **SOAP / WS-\* SOA** | Strong contracts (WSDL), enterprise tooling | Heavy XML, complex tooling, slow iteration, mismatched with modern JS stacks | Overkill for a demo |
| **REST microservices behind a gateway (chosen)** | Independent deploy/scale, polyglot ready, clear bounded contexts, language-agnostic JSON contracts, easy GUI consumption | Operational overhead (orchestration, observability), eventual consistency between services | **Best fit** — matches the requirement of multiple clients & GUIs, services own their data |
| **Event-driven / message bus** | Loose coupling, great for async workflows | Adds infra (broker), harder to reason about for CRUD-heavy domains | Useful as a future extension (e.g. publish `RentalCreated`) |

**Chosen architecture:** REST-based microservices with a thin API gateway and JWT-based
authentication. This gives us SOA's headline benefits — service autonomy,
independent evolution, and platform-agnostic contracts — without the ceremony of
SOAP/ESB stacks.

---

## 3. Software-quality benefits delivered by SOA here

- **Reusability** — `auth-service` issues tokens that the vehicle, customer, and
  any future service all consume without re-implementing identity logic.
  The `vehicle-service` is reused by the customer service when creating a rental
  and could be reused by, say, a maintenance system.
- **Maintainability** — each service is a small Node.js app (~1 file of routes,
  one or two Mongoose models). A bug in pricing only touches `customer-service`.
- **Extendibility** — adding a new vehicle category (e.g. trucks) only requires
  editing the `Vehicle` schema and seed data; adding a new client (mobile app,
  partner integration) just needs a JWT and the gateway URL.
- **Independent deployability** — Docker images are built per service, so
  customer-service can be redeployed without touching vehicles or auth.
- **Polyglot persistence** — every service has its **own MongoDB database**
  (`car_rental_auth`, `car_rental_vehicles`, `car_rental_customers`),
  preventing schema coupling.
- **Object orientation inside each service** — Mongoose schemas + small route
  handlers keep each service's code OO while the system as a whole is SOA.
  The two paradigms complement each other.

---

## 4. Architecture

```
┌──────────────────┐       ┌────────────────────────────────────────────┐
│   React client   │       │              API Gateway (4000)            │
│  (Tailwind, SPA) │──────▶│  /api/auth/*    → auth-service     (4001)  │
│  served by Nginx │       │  /api/vehicles  → vehicle-service  (4002)  │
└──────────────────┘       │  /api/customers → customer-service (4003)  │
                           │  /api/rentals   → customer-service (4003)  │
                           └──────┬───────────────┬───────────┬─────────┘
                                  │               │           │
                          ┌───────▼───┐   ┌───────▼───┐  ┌────▼─────────┐
                          │   auth    │   │  vehicle  │  │   customer    │
                          │  service  │   │  service  │  │ + rental svc  │
                          └─────┬─────┘   └─────┬─────┘  └──────┬────────┘
                                │               │               │
                          ┌─────▼─────┐   ┌─────▼─────┐  ┌──────▼───────┐
                          │  mongo    │   │  mongo    │  │   mongo       │
                          │  /auth    │   │  /vehicles│  │  /customers   │
                          └───────────┘   └───────────┘  └───────────────┘
```

The customer service also calls the vehicle service over HTTP when creating /
returning a rental (forwarding the user's JWT) — this models a real-world
service-to-service collaboration.

### UML — Component / deployment view

```
[Browser SPA] ──HTTPS──▶ [Nginx (client container)]
                              │ /api/* reverse proxy
                              ▼
                       [API Gateway]
                       │     │     │
            ┌──────────┘     │     └──────────┐
            ▼                ▼                ▼
       [Auth svc]      [Vehicle svc]    [Customer svc]
            │                │                │
            ▼                ▼                ▼
        [Mongo]          [Mongo]          [Mongo]
```

### UML — Class model (logical)

```
+--------------------+       +--------------------+
|       User         |       |      Vehicle       |
+--------------------+       +--------------------+
| - id               |       | - id               |
| - username         |       | - type:car|van     |
| - passwordHash     |       | - make             |
| - role:admin|staff |       | - model            |
+--------------------+       | - regNumber (uniq) |
                             | - dailyRate        |
                             | - isOnRent         |
                             +---------+----------+
                                       │ 0..1
                                       │
+--------------------+        1        ▼ 0..*
|     Customer       |◄───────────[ Rental ]────────┐
+--------------------+                              │
| - id               |                              │
| - name             |                              │
| - address          |                              │
| - dateOfBirth      |     +--------------------+   │
| - email/phone      |     |       Rental       |◄──┘
+--------------------+     +--------------------+
                           | - customerId       |
                           | - vehicleId        |
                           | - startDate        |
                           | - expectedReturn   |
                           | - actualReturn     |
                           | - daysRented       |
                           | - baseCost         |
                           | - ageAdjustment    |
                           | - totalCost        |
                           | - penaltyCharges   |
                           | - finalAmount      |
                           | - status           |
                           +--------------------+
```

### UML — Sequence: "Create a rental"

```
Staff UI         Gateway         Customer svc      Vehicle svc
   │  POST /rentals  │                 │                │
   │ ───────────────▶│                 │                │
   │                 │ verify JWT      │                │
   │                 │────────────────▶│                │
   │                 │                 │ load Customer  │
   │                 │                 │                │
   │                 │                 │ GET /vehicles/:id ──▶
   │                 │                 │◀── vehicle data       │
   │                 │                 │ compute pricing │
   │                 │                 │   (age rules)   │
   │                 │                 │ save Rental     │
   │                 │                 │ POST /vehicles/:id/rent ─▶
   │                 │                 │◀── 200 OK              │
   │                 │◀─ 201 Rental ───│                │
   │ ◀───────────────│                 │                │
```

---

## 5. Pricing rules (implemented in `customer-service`)

```
baseCost   = dailyRate × days
if age < 25: ageAdjustment = +20% of baseCost
elif age > 50: ageAdjustment = −10% of baseCost
else:         ageAdjustment = 0
totalCost  = baseCost + ageAdjustment

# on return:
if actualReturn > expectedReturn:
    lateDays      = ceil(actual − expected)
    penalty       = lateDays × dailyRate × 1.5
finalAmount = totalCost + penalty
```

The same engine is exposed as `POST /api/rentals/quote` so the UI can show a
live cost preview before confirming a rental.

---

## 6. Tech stack

| Layer | Choice |
|---|---|
| Frontend | **React 18** + Vite + **Tailwind CSS** + React Router |
| Backend  | **Node.js 20** + Express |
| Database | **MongoDB 7** (one DB per service) |
| Service-to-service | HTTP/JSON, JWT pass-through |
| Auth | JWT (HS256) issued by `auth-service` |
| Gateway | Express + `http-proxy-middleware` |
| Orchestration | **docker-compose** |

---

## 7. Running the system

### Prerequisites
- Docker Desktop / Docker Engine with Compose v2

### Boot everything
```bash
cp .env.example .env       # set a real JWT_SECRET for prod
docker compose up --build -d
```

### Seed demo data (users, fleet, customers)
```bash
# macOS / Linux / WSL
bash scripts/seed.sh

# Windows PowerShell
powershell -File scripts/seed.ps1
```

### Open the app
- UI: <http://localhost:3000>
- Gateway: <http://localhost:4000/health>
- Auth: <http://localhost:4001/health>
- Vehicles: <http://localhost:4002/health>
- Customers: <http://localhost:4003/health>

### Default users
| Username | Password | Role |
|---|---|---|
| admin | admin123 | admin (can register users, delete cars/customers) |
| staff | staff123 | staff (front-desk operations) |

### Tear down
```bash
docker compose down          # keep data
docker compose down -v       # also drop the mongo volume
```

---

## 8. API surface (via gateway)

Base URL: `http://localhost:4000/api`

### Auth (`/auth`)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/login` | none | `{ username, password }` → `{ token, user }` |
| POST | `/auth/register` | admin | `{ username, password, role, fullName }` |
| GET  | `/auth/me` | any | — |
| GET  | `/auth/users` | admin | — |

### Vehicles (`/vehicles`) — JWT required
| Method | Path | Notes |
|---|---|---|
| GET | `/vehicles?type=car|van&available=true|false` | list with filters |
| GET | `/vehicles/stats` | totals, on-rent, available, by-type |
| GET | `/vehicles/:id` | single |
| POST | `/vehicles` | staff/admin — create car or van |
| PUT | `/vehicles/:id` | staff/admin — update mutable fields |
| DELETE | `/vehicles/:id` | admin only — refused if on rent |
| POST | `/vehicles/:id/rent` | mark on rent (called by customer-service) |
| POST | `/vehicles/:id/return` | mark returned |

### Customers (`/customers`) — JWT required
| Method | Path | Notes |
|---|---|---|
| GET | `/customers` | list |
| GET | `/customers/stats` | total |
| GET | `/customers/:id` | customer + rental history |
| POST | `/customers` | staff/admin |
| PUT | `/customers/:id` | staff/admin |
| DELETE | `/customers/:id` | admin only — refused if active rental |

### Rentals (`/rentals`) — JWT required
| Method | Path | Notes |
|---|---|---|
| GET | `/rentals?status=active|completed&customerId=…` | list |
| GET | `/rentals/stats` | active / completed / revenue |
| GET | `/rentals/:id` | single |
| POST | `/rentals` | staff/admin — creates rental, marks vehicle on-rent |
| POST | `/rentals/:id/return` | staff/admin — finalizes, computes penalty |
| POST | `/rentals/quote` | preview cost (live pricing engine) |

---

## 9. Repository layout

```
car-rental-soa/
├── docker-compose.yml
├── .env.example
├── scripts/                       seed helpers
├── client/                        React + Tailwind SPA (Vite)
│   ├── src/
│   │   ├── api/client.js          axios instance with JWT interceptor
│   │   ├── auth/AuthContext.jsx   login / token state
│   │   ├── components/            Layout, Modal, StatCard
│   │   └── pages/                 Login, Dashboard, Vehicles, Customers, Rentals
│   ├── nginx.conf                 reverse proxies /api/* to gateway
│   └── Dockerfile
└── services/
    ├── shared/                    JWT middleware, error helpers
    ├── auth-service/              login + register (JWT issuer)
    ├── vehicle-service/           cars + vans inventory
    ├── customer-service/          customers + rentals + pricing
    └── gateway/                   single ingress, JWT verification
```

---

## 10. Manual smoke test

```bash
# 1. login as admin
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq

# 2. list vehicles (paste TOKEN from above)
curl -s http://localhost:4000/api/vehicles \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. get a quote for a young (under-25) customer
curl -s -X POST http://localhost:4000/api/rentals/quote \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"<id>","vehicleId":"<id>","expectedReturnDate":"2030-01-10"}' | jq
```

---

## 11. Possible extensions

- Replace JWT secret with rotating keys (JWKS) and a real identity provider.
- Publish domain events (`RentalCreated`, `VehicleReturned`) on a message bus
  (RabbitMQ / Kafka) for audit, analytics, and decoupling.
- Add a `payments-service` that listens for completed rentals.
- Add OpenAPI specs per service and contract tests at the gateway boundary.
- Replace docker-compose with Kubernetes manifests for production.

---

## 12. License

MIT — see `package.json`.

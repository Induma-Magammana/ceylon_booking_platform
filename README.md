# CeylonBooking Platform

A centralized, web-based tourism management system that empowers Sri Lankan SMEs by automating scheduling, facilitating dual-market pricing, and ensuring secure bookings.

## 🌴 Project Overview

CeylonBooking addresses three critical issues in Sri Lanka's tourism industry:

1. **Operational Inefficiency**: Replaces manual scheduling (notebooks/WhatsApp) with automated inventory management
2. **Pricing Friction**: Supports "Dual Pricing" (subsidized rates for locals) with LKR/USD currencies
3. **Lack of Centralization**: Provides a unified platform for verified, safe local experiences

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│                    Responsive UI / Tailwind CSS                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/JSON
┌────────────────────────────▼────────────────────────────────────┐
│                      Backend API (Hono)                          │
│              High-performance Edge Computing                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Listings    │  │  Bookings    │  │  Scheduling Engine   │  │
│  │  Endpoints   │  │  Endpoints   │  │  (Availability/Conf) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ PostgreSQL Protocol
┌────────────────────────────▼────────────────────────────────────┐
│                    Database (Supabase)                           │
│         PostgreSQL + Real-time + Row Level Security              │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Docker Desktop (for local Supabase)

### Installation

```bash
# Clone the repository
cd ceylon-booking-platform

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start local Supabase (requires Docker)
npx supabase start

# Run database migrations
npx supabase db reset

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

## 📁 Project Structure

```
ceylon-booking-platform/
├── src/
│   ├── api/              # Hono API endpoints
│   │   └── index.ts      # Main API router
│   ├── domain/           # Domain models with Zod validation
│   │   ├── User.ts       # User entity (tourist/host)
│   │   ├── Listing.ts    # Listing entity (slot/date-based)
│   │   └── Booking.ts    # Booking entity with dual currency
│   ├── services/         # Business logic services
│   │   └── SchedulingService.ts  # Availability & conflict detection
│   └── utils/            # Shared utilities
│       └── supabase.ts   # Database client & types
├── tests/
│   ├── unit/             # Unit tests for domain & services
│   ├── integration/      # API integration tests
│   └── fixtures/         # Test data helpers
├── supabase/
│   └── migrations/       # SQL migration files
├── docs/                 # Additional documentation
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 🔑 Key Features

### 1. Dynamic Scheduling Engine
- Handles both **time-slot** (activities) and **date-based** (homestays) inventory
- Real-time availability checking
- Automatic conflict detection to prevent double bookings
- Capacity management per listing

### 2. Dual Pricing System
- Separate pricing for locals (LKR) and tourists (USD)
- Automatic currency detection based on user profile
- Flexible price management for hosts

### 3. Multi-Location Host Dashboard
- Manage multiple properties/activities under one account
- Calendar view for schedule management
- Booking history and earnings tracking

### 4. Secure Booking Flow
- Integration with PayHere payment gateway
- Digital ticket generation
- Automated booking confirmations

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js, Tailwind CSS |
| **Backend** | Hono (Edge-ready framework) |
| **Database** | Supabase (PostgreSQL) |
| **Validation** | Zod |
| **Testing** | Vitest |
| **Payments** | PayHere API |

## 📊 Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Unique email address |
| user_type | ENUM | 'tourist' or 'host' |
| full_name | TEXT | Display name |
| created_at | TIMESTAMP | Registration date |

### Listings Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| host_id | UUID | Foreign key to users |
| title | TEXT | Listing title |
| inventory_type | ENUM | 'slot' or 'date' |
| location | TEXT | Physical location |
| local_price | DECIMAL | Price in LKR |
| foreign_price | DECIMAL | Price in USD |
| capacity | INTEGER | Max bookings per slot/date |

### Bookings Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| listing_id | UUID | Foreign key to listings |
| tourist_id | UUID | Foreign key to users |
| booking_date | DATE | Date of booking |
| time_slot | TIME | Time slot (nullable for date-based) |
| quantity | INTEGER | Number of spots booked |
| total_price | DECIMAL | Final price |
| currency | ENUM | 'LKR' or 'USD' |
| status | ENUM | 'pending', 'confirmed', 'cancelled' |

## 🧪 Testing Strategy

The project follows **Test-Driven Development (TDD)**:

1. **Unit Tests**: Validate domain models and business logic
   - User/Listing/Booking validation
   - SchedulingService calculations
   
2. **Integration Tests**: Verify API endpoints
   - Request/response handling
   - Error scenarios

3. **E2E Tests** (planned): Full user journeys
   - Booking flow
   - Payment processing

## 📝 API Documentation

See [API.md](./docs/API.md) for detailed endpoint documentation.

## 🔒 Security Considerations

- All API endpoints require authentication (Supabase Auth)
- Row Level Security (RLS) policies enforce data isolation
- HTTPS mandatory for all communications
- Input validation via Zod schemas

## 🗺️ Roadmap

- [x] Phase 1: Backend Foundation (8-10%)
- [ ] Phase 2: Dual Pricing & Extended API (15-20%)
- [ ] Phase 3: Payment Integration (25-30%)
- [ ] Phase 4: Frontend Development (40-50%)
- [ ] Phase 5: Host Dashboard (60-70%)
- [ ] Phase 6: Testing & Polish (80-90%)
- [ ] Phase 7: Deployment (100%)

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is developed as part of IS 3920 - Individual Project on Business Solutions at University of Moratuwa.

## 📞 Contact

**Author**: I.N. Magammana (225126D)  
**Supervisor**: Ms. M.A.N. Perera  
**Industry Supervisor**: Mr. Akila Induranga (WSO2)

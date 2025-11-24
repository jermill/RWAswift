# RWAswift - Real World Asset Compliance Platform

**Make RWA compliance as fast as a Venmo payment - 2 minutes, not 2 weeks**

## Overview

RWAswift is a compliance-as-a-service platform that enables Real World Asset (RWA) tokenization platforms to verify investors and maintain regulatory compliance in under 2 minutes.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js 20, Express.js, PostgreSQL 15
- **Infrastructure**: Docker, AWS, Supabase
- **External Services**: Persona (KYC), OFAC (Sanctions), Stripe (Payments)

## Project Structure

```
rwaswift/
├── frontend/          # Next.js application
├── backend/           # Express.js API server
│   └── src/
│       ├── routes/    # API routes
│       ├── controllers/ # Request handlers
│       ├── services/  # Business logic
│       ├── middleware/ # Express middleware
│       ├── utils/     # Helper functions
│       └── config/    # Configuration
├── database/          # Database migrations and seeds
├── shared/            # Shared types and utilities
└── docker-compose.yml # Docker configuration
```

## Quick Start

### Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+
- Docker (optional)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd rwaswift

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start backend
cd backend
npm install
npm run dev

# Start frontend (in new terminal)
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose up
```

## API Documentation

API documentation available at: http://localhost:3001/api/docs

## Environment Variables

See `.env.example` for required environment variables.

## Development Progress

- [x] Phase 1.1: Project structure created
- [ ] Phase 1.2: Backend server setup
- [ ] Phase 1.3: Database setup
- [ ] Phase 1.4: Environment configuration

## License

Proprietary - All rights reserved

## Contact

For questions: product@rwaswift.com


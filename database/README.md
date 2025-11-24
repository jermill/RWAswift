# RWAswift Database Setup

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy (about 10 seconds)
sleep 10

# Run migrations and seed data
cd backend
npm run db:setup -- --seed
```

### Option 2: Local PostgreSQL

```bash
# Install PostgreSQL 15+ if not already installed
# macOS: brew install postgresql@15
# Ubuntu: sudo apt-get install postgresql-15

# Create database
createdb rwaswift

# Set environment variable
export DATABASE_URL="postgresql://localhost:5432/rwaswift"

# Run migrations
cd backend
npm run db:setup -- --seed
```

### Option 3: Supabase (Cloud)

1. Create a project at https://supabase.com
2. Get your connection string from Settings > Database
3. Add to `.env`:
```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]
```
4. Run migrations:
```bash
cd backend
npm run db:setup
```

## Database Schema

### Core Tables

- **organizations** - Customer accounts using RWAswift
- **verifications** - KYC verification records
- **documents** - Uploaded verification documents
- **webhooks** - Webhook configurations
- **webhook_deliveries** - Webhook delivery logs
- **api_logs** - API usage logs
- **compliance_rules** - Jurisdiction-specific rules

### Relationships

```
organizations (1) → (many) verifications
verifications (1) → (many) documents
organizations (1) → (many) webhooks
webhooks (1) → (many) webhook_deliveries
```

## Migrations

Migrations are SQL files in `migrations/` directory, numbered sequentially.

```bash
# Run all migrations
npm run db:migrate

# Re-run migrations (force)
npm run db:migrate -- --force
```

## Seeds

Test data for development:

```bash
# Seed test data
npm run db:seed
```

This creates:
- Test organization with API key: `rwa_test_sk_1234567890abcdef`
- 3 sample verifications (approved, pending, rejected)
- Sample webhook configuration
- API logs

## Commands

```bash
# Setup database (first time)
npm run db:setup

# Setup with test data
npm run db:setup -- --seed

# Re-run migrations
npm run db:migrate

# Seed only
npm run db:seed
```

## Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=[mode]
```

Example:
```
postgresql://rwaswift:password@localhost:5432/rwaswift
```

## Troubleshooting

### "Connection refused"
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- For Docker: `docker-compose ps` to verify postgres is up

### "Role does not exist"
```bash
# Create user
createuser -s rwaswift

# Or in psql:
CREATE USER rwaswift WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rwaswift TO rwaswift;
```

### "Database does not exist"
```bash
createdb rwaswift
```

### Reset database
```bash
# Drop and recreate
dropdb rwaswift
createdb rwaswift
npm run db:setup -- --seed
```

## Security Notes

- Never commit real API keys or passwords
- Use strong passwords in production
- Enable SSL for production databases
- Rotate API keys regularly
- Use row-level security (RLS) in production

## Production Checklist

- [ ] Enable SSL/TLS
- [ ] Use connection pooling
- [ ] Set up automated backups
- [ ] Enable query logging
- [ ] Configure monitoring
- [ ] Use read replicas for scale
- [ ] Enable row-level security
- [ ] Set up database encryption


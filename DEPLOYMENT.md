# 🚀 RWAswift Deployment Guide

## Overview

RWAswift is deployed using a modern JAMstack architecture:
- **Frontend:** Netlify (Next.js)
- **Backend:** Railway/Render/AWS (Node.js/Express)
- **Database:** Supabase (PostgreSQL)
- **Email:** SendGrid
- **Monitoring:** DataDog/Sentry

---

## 📦 Frontend Deployment (Netlify)

### Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/rwaswift/rwaswift)

### Manual Deployment

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Login to Netlify:**
```bash
netlify login
```

3. **Initialize site:**
```bash
netlify init
```

4. **Deploy:**
```bash
# Deploy to staging
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Environment Variables (Netlify)

Add these in Netlify Dashboard → Site Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://api.rwaswift.com
NEXT_PUBLIC_APP_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Build Settings

- **Build Command:** `cd frontend && npm run build`
- **Publish Directory:** `frontend/.next`
- **Node Version:** 20

---

## 🖥️ Backend Deployment

### Option 1: Railway (Recommended)

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login and init:**
```bash
railway login
railway init
```

3. **Add environment variables:**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set DATABASE_URL=your_database_url
railway variables set JWT_SECRET=your_jwt_secret
# ... add all variables from .env.example
```

4. **Deploy:**
```bash
cd backend
railway up
```

### Option 2: Render

1. Create new Web Service on [Render.com](https://render.com)
2. Connect GitHub repository
3. Configure:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Environment:** Node 20
4. Add environment variables
5. Deploy

### Option 3: AWS (EC2 + Docker)

```bash
# Build Docker image
docker build -t rwaswift-backend ./backend

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-ecr-url
docker tag rwaswift-backend:latest your-ecr-url/rwaswift-backend:latest
docker push your-ecr-url/rwaswift-backend:latest

# Deploy to ECS
aws ecs update-service --cluster rwaswift --service backend --force-new-deployment
```

---

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project

Go to [Supabase.com](https://supabase.com) and create new project.

### 2. Run Migrations

```bash
cd backend
npm run db:setup
```

Or manually execute: `database/migrations/001_initial_schema.sql`

### 3. Configure Environment

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_KEY=[YOUR_SERVICE_KEY]
```

---

## 📧 Email Setup (SendGrid)

### 1. Create SendGrid Account

Sign up at [SendGrid.com](https://sendgrid.com)

### 2. Create API Key

Dashboard → Settings → API Keys → Create API Key

### 3. Verify Domain

Dashboard → Settings → Sender Authentication → Domain Authentication

### 4. Configure Environment

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
ENABLE_EMAIL_NOTIFICATIONS=true
```

---

## 🔐 Environment Variables Checklist

### Backend (.env)

```bash
# Required
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-32-characters-min
JWT_REFRESH_SECRET=your-refresh-secret-32-characters

# Optional but recommended
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@yourdomain.com
SENTRY_DSN=https://xxx@sentry.io/xxx
REDIS_URL=redis://...

# API Keys for services
PERSONA_API_KEY=persona_xxx
STRIPE_SECRET_KEY=sk_live_xxx
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.rwaswift.com
NEXT_PUBLIC_APP_ENV=production
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Automatically runs on push to `main` or `develop`:

1. **Backend Tests** → Lint → Build
2. **Frontend Tests** → Lint → Build
3. **Deploy Staging** (on develop branch)
4. **Deploy Production** (on main branch)

### Required GitHub Secrets

```
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
NETLIFY_STAGING_SITE_ID
```

---

## 📊 Monitoring Setup

### Sentry (Error Tracking)

1. Create project at [Sentry.io](https://sentry.io)
2. Get DSN
3. Add to environment:
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### DataDog (Application Monitoring)

1. Create account at [DataDog.com](https://datadoghq.com)
2. Get API key
3. Add to environment:
```bash
DATADOG_API_KEY=xxx
```

---

## 🧪 Testing Deployments

### Backend Health Check

```bash
curl https://api.rwaswift.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-24T12:00:00.000Z",
  "uptime": 12345,
  "environment": "production"
}
```

### Frontend Check

```bash
curl -I https://rwaswift.com
```

Expected: `200 OK`

### API Test

```bash
curl -X POST https://api.rwaswift.com/api/v1/verify \
  -H "X-API-Key: rwa_xxx" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","country":"USA"}'
```

---

## 🔒 Security Checklist

Before going live:

- [ ] Change all default secrets and keys
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database backups
- [ ] Configure firewall rules
- [ ] Enable logging and monitoring
- [ ] Set up alerts for errors
- [ ] Review and test all endpoints
- [ ] Perform security audit

---

## 📈 Scaling Considerations

### Backend Scaling

- **Horizontal:** Add more instances behind load balancer
- **Database:** Use read replicas for heavy read operations
- **Cache:** Implement Redis for frequently accessed data
- **CDN:** Use CloudFront for static assets

### Frontend Scaling

- **Automatic:** Netlify handles this automatically
- **CDN:** Globally distributed by default
- **Edge Functions:** For server-side logic near users

---

## 🆘 Troubleshooting

### Backend not connecting to database

```bash
# Test database connection
psql $DATABASE_URL

# Check environment variables
echo $DATABASE_URL
```

### Email not sending

```bash
# Test SendGrid API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

### Build failing

```bash
# Check Node version
node --version  # Should be 20+

# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Support

- **Documentation:** https://docs.rwaswift.com
- **Issues:** https://github.com/rwaswift/rwaswift/issues
- **Email:** support@rwaswift.com

---

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm test                 # Run tests

# Deployment
netlify deploy           # Deploy frontend to staging
netlify deploy --prod    # Deploy frontend to production
railway up               # Deploy backend to Railway
npm run db:setup         # Setup database

# Monitoring
npm run logs             # View application logs
npm run health           # Check health status
```

---

**Last Updated:** November 2024  
**Version:** 1.0.0


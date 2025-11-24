# 🚀 Netlify Deployment Guide

Complete guide to deploy RWAswift frontend to Netlify.

---

## 📋 Prerequisites

- ✅ GitHub repository: https://github.com/jermill/RWAswift
- ✅ Netlify account: https://app.netlify.com/
- ✅ Backend API running (Supabase configured)
- ✅ Row Level Security enabled in Supabase

---

## 🚀 Quick Deploy (Method 1: Netlify Dashboard)

### Step 1: Connect GitHub Repository

1. Go to https://app.netlify.com/
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub**
4. Select repository: **`jermill/RWAswift`**
5. Click **"Authorize Netlify"** (if prompted)

### Step 2: Configure Build Settings

Netlify should auto-detect the settings from `netlify.toml`, but verify:

```
Build command:     cd frontend && npm install && npm run build
Publish directory: frontend/out
```

### Step 3: Set Environment Variables

Click **"Add environment variables"** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` (for now, update after backend deploy) |
| `NODE_VERSION` | `20` |

### Step 4: Deploy

1. Click **"Deploy site"**
2. Wait 2-3 minutes for build to complete
3. Your site will be live at: `https://[random-name].netlify.app`

### Step 5: Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `app.rwaswift.com`)
4. Follow DNS configuration instructions

---

## ⚡ Quick Deploy (Method 2: Netlify CLI)

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login

```bash
netlify login
```

### Step 3: Initialize & Deploy

```bash
cd /Volumes/jermill/RWAswift

# Link to Netlify (first time only)
netlify init

# Deploy to production
netlify deploy --prod
```

---

## 🔧 Configuration Details

### netlify.toml Configuration

The repository includes a complete `netlify.toml` with:

✅ **Build Settings**
- Node.js 20
- Next.js static export
- Automatic dependency installation

✅ **Security Headers**
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection enabled
- Referrer-Policy configured
- Permissions-Policy restricted

✅ **Performance**
- Static asset caching (1 year)
- JS/CSS caching optimized
- Compression enabled

✅ **Routing**
- API proxy to backend
- SPA routing configured
- 404 fallback to index.html

---

## 🔍 Verify Deployment

### 1. Check Build Logs

Go to **Deploys** tab → Click latest deploy → Check logs for errors

Expected output:
```
✓ Building Next.js static export
✓ Exporting (3/3)
✓ Export successful
```

### 2. Test Frontend

Visit your Netlify URL and verify:
- ✅ Landing page loads
- ✅ Dashboard is accessible
- ✅ No console errors
- ✅ API calls work (after backend is deployed)

### 3. Test API Connection

Open browser console and run:
```javascript
fetch('https://your-site.netlify.app/api/v1/health')
  .then(r => r.json())
  .then(console.log)
```

---

## 🐛 Troubleshooting

### Build Fails: "Node version too old"

**Solution:** Verify `netlify.toml` has `NODE_VERSION = "20"`

### Build Fails: "Module not found"

**Solution:** Verify build command includes `npm install`:
```toml
command = "cd frontend && npm install && npm run build"
```

### API calls fail (404)

**Solution:** Update `NEXT_PUBLIC_API_URL` in Netlify environment variables to your backend URL

### Blank page after deploy

**Solution:** Check browser console for errors. Verify `frontend/out` directory contains files after build.

---

## 🔄 Continuous Deployment

Netlify automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Netlify will:
1. Detect push to GitHub
2. Run build automatically
3. Deploy to production
4. Show deploy status in GitHub commit

---

## 📊 Post-Deployment Checklist

- [ ] Site is live at Netlify URL
- [ ] No build errors in deploy logs
- [ ] Landing page loads correctly
- [ ] Dashboard page loads correctly
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Netlify)
- [ ] Environment variables set correctly
- [ ] API calls connect to backend successfully

---

## 🎯 Next Steps

After frontend is deployed:

1. **Deploy Backend** - Deploy Express API to Railway/Render/Fly.io
2. **Update API URL** - Change `NEXT_PUBLIC_API_URL` in Netlify to production backend URL
3. **Test E2E** - Create test verification through the UI
4. **Monitor** - Set up error tracking (Sentry) and analytics
5. **Custom Domain** - Configure your own domain name

---

## 📞 Support

- **Netlify Docs:** https://docs.netlify.com/
- **Next.js Deploy:** https://nextjs.org/docs/deployment
- **GitHub Issues:** https://github.com/jermill/RWAswift/issues

---

**Ready to deploy?** 🚀

Visit: https://app.netlify.com/start


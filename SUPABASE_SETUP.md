# 🚀 Supabase Setup Instructions

## Step 1: Run Database Migration

Go to your Supabase project and follow these steps:

### 1. Open SQL Editor
1. Go to https://supabase.com/dashboard/project/smampnuruqkuyjovwujd
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### 2. Copy and Run the Migration SQL
Copy the entire contents of `/database/migrations/001_initial_schema.sql` and paste it into the SQL editor.

**OR** use this direct link to the migration file in your project:
```bash
cat /Volumes/jermill/RWAswift/database/migrations/001_initial_schema.sql
```

### 3. Execute the Migration
Click **"Run"** button in the SQL Editor

### 4. Verify Tables Created
You should see these tables created:
- ✅ organizations
- ✅ verifications  
- ✅ documents
- ✅ webhooks
- ✅ webhook_deliveries
- ✅ api_logs
- ✅ compliance_rules

## Step 2: Enable Row Level Security (RLS) - Optional

For production, you should enable RLS:

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (we'll use API key auth from backend, so allow service role)
CREATE POLICY "Enable all access for service role" ON organizations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON verifications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON documents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON webhooks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON webhook_deliveries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON api_logs
  FOR ALL USING (auth.role() = 'service_role');
```

## Step 3: Verify Connection

After running the migration, your backend should automatically connect to Supabase!

Check the terminal where the backend is running - you should see:
```
✅ Supabase connection successful
```

## Step 4: Test the Integration

Run this command to test:
```bash
curl -s http://localhost:3001/health | jq .
```

You should see:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 🎯 What's Different Now?

### Before (In-Memory):
- Data lost on server restart ❌
- No persistence ❌
- Mock data only ❌

### After (Supabase):
- Data persists forever ✅
- Real database ✅
- Production-ready ✅
- Dashboard to view data ✅
- Auto backups ✅

---

## 📊 View Your Data

After creating verifications, view them in Supabase:

1. Go to **Table Editor** in Supabase dashboard
2. Select **verifications** table
3. See all your KYC records in real-time!

---

## 🔐 Security Notes

**Current Setup (Development):**
- Using anon key for quick setup
- RLS disabled for development

**Production Setup (Before Launch):**
1. Get service_role key from Supabase
2. Update SUPABASE_SERVICE_KEY in .env
3. Enable RLS (see Step 2)
4. Create proper policies
5. Use service key in backend

---

## ❓ Troubleshooting

### Error: "relation 'organizations' does not exist"
**Solution:** Run the migration SQL in Step 1

### Error: "Invalid API key"
**Solution:** Check that SUPABASE_ANON_KEY in .env matches your project key

### Error: "permission denied"
**Solution:** Make sure RLS is disabled during development OR use service_role key

---

## ✅ Next Steps

After migration is successful:
1. Restart your backend server
2. Test creating a verification
3. View the data in Supabase dashboard
4. Your data will now persist forever!



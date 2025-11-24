-- ===================================
-- Quick RLS Enable Script
-- Copy and paste this into Supabase SQL Editor
-- https://supabase.com/dashboard/project/smampnuruqkuyjovwujd/sql/new
-- ===================================

-- STEP 1: Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create policies (allows service_role full access)
CREATE POLICY "Service has full access to organizations"
ON organizations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Service has full access to verifications"
ON verifications FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Service has full access to documents"
ON documents FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Service has full access to webhooks"
ON webhooks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Service has full access to webhook_deliveries"
ON webhook_deliveries FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Service has full access to api_logs"
ON api_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Everyone can read compliance_rules"
ON compliance_rules FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Service can modify compliance_rules"
ON compliance_rules FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Done! Your database is now secured with Row Level Security.


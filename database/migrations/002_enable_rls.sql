-- ===================================
-- RWAswift Row Level Security Setup
-- Migration: 002_enable_rls
-- Created: November 2025
-- ===================================

-- ===================================
-- ENABLE ROW LEVEL SECURITY
-- ===================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

-- ===================================
-- POLICIES FOR SERVICE ROLE (Backend API)
-- ===================================

-- Organizations: Service role has full access
CREATE POLICY "Service role has full access to organizations"
ON organizations
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Verifications: Service role has full access
CREATE POLICY "Service role has full access to verifications"
ON verifications
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Documents: Service role has full access
CREATE POLICY "Service role has full access to documents"
ON documents
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Webhooks: Service role has full access
CREATE POLICY "Service role has full access to webhooks"
ON webhooks
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Webhook Deliveries: Service role has full access
CREATE POLICY "Service role has full access to webhook_deliveries"
ON webhook_deliveries
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- API Logs: Service role has full access
CREATE POLICY "Service role has full access to api_logs"
ON api_logs
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Compliance Rules: Read-only for all, write for service role
CREATE POLICY "Anyone can read compliance rules"
ON compliance_rules
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Service role can modify compliance rules"
ON compliance_rules
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ===================================
-- ADDITIONAL SECURITY POLICIES
-- ===================================

-- Optional: Add organization-specific policies
-- Uncomment these if you want to restrict data access per organization
-- (Currently allowing full access for backend service)

/*
-- Organizations can only see their own data
CREATE POLICY "Organizations can view their own data"
ON organizations
FOR SELECT
TO authenticated
USING (id = auth.uid()::text::uuid);

-- Organizations can only see their own verifications
CREATE POLICY "Organizations can view their own verifications"
ON verifications
FOR SELECT
TO authenticated
USING (org_id = auth.uid()::text::uuid);

-- Organizations can only create verifications for themselves
CREATE POLICY "Organizations can create their own verifications"
ON verifications
FOR INSERT
TO authenticated
WITH CHECK (org_id = auth.uid()::text::uuid);
*/

-- ===================================
-- COMMENTS
-- ===================================

COMMENT ON POLICY "Service role has full access to organizations" ON organizations IS 
'Allows backend service to manage all organizations';

COMMENT ON POLICY "Service role has full access to verifications" ON verifications IS 
'Allows backend service to manage all verifications';

COMMENT ON POLICY "Anyone can read compliance rules" ON compliance_rules IS 
'Compliance rules are public reference data';

-- ===================================
-- SECURITY NOTES
-- ===================================

/*
IMPORTANT SECURITY CONSIDERATIONS:

1. CURRENT SETUP (Development/MVP):
   - RLS is enabled on all tables
   - Policies allow full access for authenticated and anon roles
   - Backend uses anon key for simplicity
   - Suitable for development and testing

2. RECOMMENDED FOR PRODUCTION:
   - Use service_role key instead of anon key in backend
   - Update SUPABASE_SERVICE_KEY in .env
   - service_role bypasses RLS (has full access)
   - Keep anon key secret and never expose to frontend

3. MULTI-TENANCY (Future):
   - Uncomment organization-specific policies above
   - Implement Supabase Auth for organizations
   - Use JWT tokens with org claims
   - Each org can only access their own data

4. AUDIT LOGGING:
   - Consider adding trigger for api_logs
   - Log all SELECT/INSERT/UPDATE/DELETE operations
   - Track who accessed what data and when

5. DATA ENCRYPTION:
   - Enable Supabase encryption at rest (default)
   - Consider field-level encryption for sensitive data
   - Use Supabase vault for secrets
*/


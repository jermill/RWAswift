-- ===================================
-- RWAswift Initial Database Schema
-- Migration: 001_initial_schema
-- Created: November 2024
-- ===================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable case-insensitive text extension
CREATE EXTENSION IF NOT EXISTS citext;

-- ===================================
-- ORGANIZATIONS TABLE
-- Stores customer/platform accounts
-- ===================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    website VARCHAR(255),
    
    -- API Access
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_key_prefix VARCHAR(10) NOT NULL,
    api_secret_hash VARCHAR(255) NOT NULL,
    
    -- Subscription Details
    plan VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter, growth, enterprise
    monthly_limit INTEGER NOT NULL DEFAULT 100,
    monthly_usage INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, cancelled
    is_verified BOOLEAN NOT NULL DEFAULT false,
    
    -- Billing
    stripe_customer_id VARCHAR(255),
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_api_call_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for organizations
CREATE INDEX idx_organizations_api_key ON organizations(api_key);
CREATE INDEX idx_organizations_email ON organizations(email);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);

-- ===================================
-- VERIFICATIONS TABLE
-- Stores KYC verification records
-- ===================================
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Investor Information
    investor_email CITEXT NOT NULL,
    investor_first_name VARCHAR(100),
    investor_last_name VARCHAR(100),
    investor_country VARCHAR(3), -- ISO country code
    investor_ip_address INET,
    
    -- Verification Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, approved, rejected, failed
    
    -- Risk Assessment
    risk_score INTEGER, -- 0-100 scale
    risk_level VARCHAR(20), -- low, medium, high
    risk_reasons JSONB DEFAULT '[]',
    
    -- Decision Details
    decision VARCHAR(20), -- approved, rejected
    decision_reason TEXT,
    decision_made_at TIMESTAMP WITH TIME ZONE,
    decision_made_by VARCHAR(50) DEFAULT 'system', -- system, manual, admin
    
    -- External Provider Data
    persona_inquiry_id VARCHAR(255),
    persona_status VARCHAR(50),
    ofac_screening_id VARCHAR(255),
    ofac_match_found BOOLEAN DEFAULT false,
    
    -- Processing Metrics
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Webhook Delivery
    webhook_delivered BOOLEAN DEFAULT false,
    webhook_delivered_at TIMESTAMP WITH TIME ZONE,
    webhook_attempts INTEGER DEFAULT 0,
    
    -- Metadata
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for verifications
CREATE INDEX idx_verifications_org_id ON verifications(org_id);
CREATE INDEX idx_verifications_investor_email ON verifications(investor_email);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_created_at ON verifications(created_at DESC);
CREATE INDEX idx_verifications_risk_level ON verifications(risk_level);
CREATE INDEX idx_verifications_decision ON verifications(decision);
CREATE INDEX idx_verifications_org_status ON verifications(org_id, status);

-- ===================================
-- DOCUMENTS TABLE
-- Stores uploaded verification documents
-- ===================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
    
    -- Document Details
    type VARCHAR(50) NOT NULL, -- passport, drivers_license, national_id, proof_of_address
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    file_type VARCHAR(100) NOT NULL, -- MIME type
    
    -- Storage
    s3_bucket VARCHAR(255),
    s3_key TEXT NOT NULL,
    s3_url TEXT,
    
    -- Extracted Data (from AI/OCR)
    extracted_data JSONB DEFAULT '{}',
    
    -- Validation
    is_valid BOOLEAN,
    validation_errors JSONB DEFAULT '[]',
    
    -- Security
    encryption_key_id VARCHAR(255),
    is_encrypted BOOLEAN DEFAULT true,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- For GDPR compliance
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Indexes for documents
CREATE INDEX idx_documents_verification_id ON documents(verification_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX idx_documents_expires_at ON documents(expires_at) WHERE expires_at IS NOT NULL;

-- ===================================
-- WEBHOOKS TABLE
-- Stores webhook configurations
-- ===================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Webhook Configuration
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    
    -- Events to subscribe to
    events JSONB NOT NULL DEFAULT '["verification.completed"]',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Delivery Settings
    retry_count INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 10,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for webhooks
CREATE INDEX idx_webhooks_org_id ON webhooks(org_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

-- ===================================
-- WEBHOOK_DELIVERIES TABLE
-- Tracks webhook delivery attempts
-- ===================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    verification_id UUID REFERENCES verifications(id) ON DELETE SET NULL,
    
    -- Delivery Details
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Response
    http_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Status
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    
    -- Retry Information
    attempt_number INTEGER NOT NULL DEFAULT 1,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for webhook_deliveries
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_verification_id ON webhook_deliveries(verification_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_success ON webhook_deliveries(success);

-- ===================================
-- API_LOGS TABLE
-- Tracks API usage and performance
-- ===================================
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Request Details
    request_id VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    query_params JSONB,
    
    -- Response Details
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    
    -- Client Information
    ip_address INET,
    user_agent TEXT,
    
    -- API Key Used
    api_key_prefix VARCHAR(10),
    
    -- Error Information
    error_message TEXT,
    error_stack TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for api_logs (partition by date for performance)
CREATE INDEX idx_api_logs_org_id ON api_logs(org_id);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX idx_api_logs_request_id ON api_logs(request_id);

-- ===================================
-- COMPLIANCE_RULES TABLE
-- Stores jurisdiction-specific compliance rules
-- ===================================
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Jurisdiction
    country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
    country_name VARCHAR(100) NOT NULL,
    region VARCHAR(50), -- e.g., 'EU', 'APAC', 'Americas'
    
    -- Rule Details
    rule_type VARCHAR(50) NOT NULL, -- kyc_required, aml_screening, accredited_investor, etc.
    requirements JSONB NOT NULL,
    
    -- Risk Classification
    risk_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Metadata
    source TEXT, -- e.g., 'FATF', 'EU AMLD5', 'SEC'
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for compliance_rules
CREATE INDEX idx_compliance_rules_country_code ON compliance_rules(country_code);
CREATE INDEX idx_compliance_rules_is_active ON compliance_rules(is_active);
CREATE INDEX idx_compliance_rules_rule_type ON compliance_rules(rule_type);
CREATE UNIQUE INDEX idx_compliance_rules_unique ON compliance_rules(country_code, rule_type) WHERE is_active = true;

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verifications_updated_at BEFORE UPDATE ON verifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- VIEWS
-- ===================================

-- View for verification statistics by organization
CREATE OR REPLACE VIEW verification_stats AS
SELECT 
    org_id,
    COUNT(*) as total_verifications,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    ROUND(AVG(processing_time_ms)) as avg_processing_time_ms,
    ROUND(AVG(risk_score)) as avg_risk_score,
    MAX(created_at) as last_verification_at
FROM verifications
GROUP BY org_id;

-- ===================================
-- INITIAL DATA
-- ===================================

-- Insert default compliance rules for major jurisdictions
INSERT INTO compliance_rules (country_code, country_name, region, rule_type, requirements, risk_level, effective_from, source) VALUES
('USA', 'United States', 'Americas', 'kyc_required', '{"documents": ["passport", "drivers_license"], "min_age": 18}', 'medium', '2024-01-01', 'USA PATRIOT Act'),
('GBR', 'United Kingdom', 'Europe', 'kyc_required', '{"documents": ["passport", "drivers_license", "national_id"], "min_age": 18}', 'low', '2024-01-01', 'UK FCA'),
('DEU', 'Germany', 'Europe', 'kyc_required', '{"documents": ["passport", "national_id"], "min_age": 18}', 'low', '2024-01-01', 'EU AMLD5'),
('CAN', 'Canada', 'Americas', 'kyc_required', '{"documents": ["passport", "drivers_license"], "min_age": 18}', 'low', '2024-01-01', 'FINTRAC'),
('AUS', 'Australia', 'APAC', 'kyc_required', '{"documents": ["passport", "drivers_license"], "min_age": 18}', 'low', '2024-01-01', 'AUSTRAC')
ON CONFLICT DO NOTHING;

-- ===================================
-- COMMENTS
-- ===================================

COMMENT ON TABLE organizations IS 'Customer/platform accounts using RWAswift';
COMMENT ON TABLE verifications IS 'Individual investor KYC verification records';
COMMENT ON TABLE documents IS 'Uploaded verification documents with encryption';
COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and results';
COMMENT ON TABLE api_logs IS 'API request logs for monitoring and debugging';
COMMENT ON TABLE compliance_rules IS 'Jurisdiction-specific compliance requirements';

-- ===================================
-- GRANTS (for application user)
-- ===================================

-- These will be set up when we create the application database user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO rwaswift_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rwaswift_app;


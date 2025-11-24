-- ===================================
-- RWAswift Test Data Seeds
-- Seed: 001_test_data
-- ===================================

-- Note: This is for development/testing only
-- DO NOT run in production

-- ===================================
-- TEST ORGANIZATION
-- ===================================

INSERT INTO organizations (
    id,
    name,
    email,
    website,
    api_key,
    api_key_prefix,
    api_secret_hash,
    plan,
    monthly_limit,
    monthly_usage,
    status,
    is_verified,
    settings,
    metadata
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed UUID for testing
    'Test RWA Platform',
    'test@rwaplatform.com',
    'https://rwaplatform.com',
    'rwa_test_sk_1234567890abcdef',
    'rwa_test',
    '$2a$10$ZjFxNWI0YzExNWY2YjE4Z.WXQ2YWM0YjM0YzQ2YjM0', -- bcrypt hash of 'test_secret'
    'growth',
    1000,
    15,
    'active',
    true,
    '{"webhook_enabled": true, "email_notifications": true}',
    '{"test": true, "created_by": "seed_script"}'
) ON CONFLICT (id) DO NOTHING;

-- ===================================
-- TEST VERIFICATIONS
-- ===================================

-- Approved verification
INSERT INTO verifications (
    id,
    org_id,
    investor_email,
    investor_first_name,
    investor_last_name,
    investor_country,
    status,
    risk_score,
    risk_level,
    risk_reasons,
    decision,
    decision_reason,
    decision_made_at,
    processing_time_ms,
    created_at,
    updated_at
) VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'john.doe@example.com',
    'John',
    'Doe',
    'USA',
    'approved',
    25,
    'low',
    '[]',
    'approved',
    'All checks passed',
    NOW() - INTERVAL '1 hour',
    45000,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
) ON CONFLICT (id) DO NOTHING;

-- Pending verification
INSERT INTO verifications (
    id,
    org_id,
    investor_email,
    investor_first_name,
    investor_last_name,
    investor_country,
    status,
    risk_score,
    risk_level,
    created_at
) VALUES (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'jane.smith@example.com',
    'Jane',
    'Smith',
    'GBR',
    'processing',
    35,
    'low',
    NOW() - INTERVAL '5 minutes'
) ON CONFLICT (id) DO NOTHING;

-- Rejected verification
INSERT INTO verifications (
    id,
    org_id,
    investor_email,
    investor_first_name,
    investor_last_name,
    investor_country,
    status,
    risk_score,
    risk_level,
    risk_reasons,
    decision,
    decision_reason,
    decision_made_at,
    processing_time_ms,
    created_at,
    updated_at
) VALUES (
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'suspicious@example.com',
    'Bob',
    'Suspicious',
    'XXX',
    'rejected',
    95,
    'high',
    '["OFAC match found", "High-risk country", "Suspicious email domain"]',
    'rejected',
    'Failed sanctions screening',
    NOW() - INTERVAL '30 minutes',
    12000,
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT (id) DO NOTHING;

-- ===================================
-- TEST WEBHOOK
-- ===================================

INSERT INTO webhooks (
    id,
    org_id,
    url,
    secret,
    events,
    is_active,
    description
) VALUES (
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'https://rwaplatform.com/webhooks/rwaswift',
    'whsec_test1234567890abcdef',
    '["verification.completed", "verification.approved", "verification.rejected"]',
    true,
    'Main webhook for verification events'
) ON CONFLICT (id) DO NOTHING;

-- ===================================
-- TEST API LOGS
-- ===================================

INSERT INTO api_logs (
    org_id,
    request_id,
    method,
    path,
    status_code,
    response_time_ms,
    api_key_prefix,
    created_at
) VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    uuid_generate_v4()::text,
    'POST',
    '/api/v1/verify',
    200,
    145,
    'rwa_test',
    NOW() - INTERVAL '2 hours'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    uuid_generate_v4()::text,
    'GET',
    '/api/v1/verify/b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    200,
    45,
    'rwa_test',
    NOW() - INTERVAL '1 hour'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    uuid_generate_v4()::text,
    'GET',
    '/api/v1/stats',
    200,
    89,
    'rwa_test',
    NOW() - INTERVAL '30 minutes'
);

-- ===================================
-- VERIFICATION STATS
-- ===================================

-- The verification_stats view will automatically show statistics
-- You can query it with: SELECT * FROM verification_stats;

COMMIT;


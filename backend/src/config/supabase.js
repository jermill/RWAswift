const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

// Create Supabase client
// Use service_role key if available (bypasses RLS - for backend use only)
// Falls back to anon key for development
const supabaseKey = config.supabase.serviceKey || config.supabase.anonKey;
const supabase = createClient(
  config.supabase.url,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

console.log(`🔐 Supabase connected with ${config.supabase.serviceKey ? 'service_role' : 'anon'} key`);

// Helper function to execute raw SQL queries
async function query(text, params) {
  try {
    // Use Supabase RPC for complex queries
    // For now, we'll use the table API
    console.log('Query:', text, params);
    return { rows: [], rowCount: 0 };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Organizations table operations
const organizations = {
  async create(data) {
    const { data: org, error } = await supabase
      .from('organizations')
      .insert([{
        name: data.name,
        email: data.email,
        api_key: data.api_key,
        api_key_prefix: (data.api_key_prefix || data.api_key.substring(0, 10)),
        api_secret_hash: data.api_secret_hash,
        status: data.status || 'active',
        plan: data.plan || 'starter',
        monthly_limit: data.monthly_limit || 100,
        monthly_usage: 0
      }])
      .select()
      .single();
    
    if (error) throw error;
    return org;
  },

  async findByEmail(email) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  async findByApiKey(apiKey) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('api_key', apiKey)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateApiKey(id, apiKey, apiSecretHash) {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        api_key: apiKey,
        api_secret_hash: apiSecretHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Verifications table operations
const verifications = {
  async create(data) {
    const { data: verification, error } = await supabase
      .from('verifications')
      .insert([{
        org_id: data.organization_id,
        investor_email: data.email,
        investor_first_name: data.first_name,
        investor_last_name: data.last_name,
        investor_country: data.country,
        investor_ip_address: data.ip_address,
        status: data.status || 'pending'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return verification;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async findByOrganization(organizationId, limit = 10, offset = 0) {
    const { data, error, count } = await supabase
      .from('verifications')
      .select('*', { count: 'exact' })
      .eq('org_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return { verifications: data || [], total: count || 0 };
  },

  async update(id, data) {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: verification, error } = await supabase
      .from('verifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return verification;
  },

  async getStats(organizationId) {
    const { data, error } = await supabase
      .from('verifications')
      .select('status, risk_level')
      .eq('org_id', organizationId);
    
    if (error) throw error;

    const stats = {
      total: data.length,
      approved: data.filter(v => v.status === 'approved').length,
      rejected: data.filter(v => v.status === 'rejected').length,
      pending: data.filter(v => v.status === 'pending').length,
      processing: data.filter(v => v.status === 'processing').length,
      risk_distribution: {
        low: data.filter(v => v.risk_level === 'low').length,
        medium: data.filter(v => v.risk_level === 'medium').length,
        high: data.filter(v => v.risk_level === 'high').length
      }
    };

    return stats;
  }
};

// Webhooks table operations
const webhooks = {
  async create(data) {
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert([{
        org_id: data.organization_id,
        url: data.url,
        events: data.events,
        description: data.description,
        secret: data.secret,
        is_active: data.is_active !== false
      }])
      .select()
      .single();
    
    if (error) throw error;
    return webhook;
  },

  async findByOrganization(organizationId) {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('org_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async findById(id, organizationId) {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('org_id', organizationId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(id, organizationId, data) {
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(data)
      .eq('id', id)
      .eq('org_id', organizationId)
      .select()
      .single();
    
    if (error) throw error;
    return webhook;
  },

  async delete(id, organizationId) {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('org_id', organizationId);
    
    if (error) throw error;
    return true;
  }
};

// Webhook deliveries table operations
const webhookDeliveries = {
  async create(data) {
    const { data: delivery, error } = await supabase
      .from('webhook_deliveries')
      .insert([{
        webhook_id: data.webhook_id,
        event_type: data.event_type,
        payload: data.payload,
        status: data.status || 'pending',
        attempt_count: data.attempt_count || 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return delivery;
  },

  async update(id, data) {
    const { data: delivery, error } = await supabase
      .from('webhook_deliveries')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return delivery;
  }
};

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

module.exports = {
  supabase,
  query,
  organizations,
  verifications,
  webhooks,
  webhookDeliveries,
  testConnection
};


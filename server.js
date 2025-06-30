import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Debug environment variables
console.log('=== RAILWAY ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY present:', process.env.SUPABASE_ANON_KEY ? 'YES' : 'NO');

// Supabase configuration with error checking
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL environment variable is missing!');
  console.error('Current value:', supabaseUrl);
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_ANON_KEY environment variable is missing!');
  console.error('Current value:', supabaseKey ? 'Present' : 'Missing');
  process.exit(1);
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('❌ SUPABASE_URL is not a valid URL:', supabaseUrl);
  console.error('Expected format: https://your-project.supabase.co');
  process.exit(1);
}

console.log('✅ Supabase URL is valid:', supabaseUrl);

// Initialize Supabase client
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error.message);
  process.exit(1);
}

// Test database connection
async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('callers')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection test failed:', error.message);
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get all callers
app.get('/api/callers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('callers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching callers:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ready callers for host
app.get('/api/calls/ready', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select(`
        *,
        callers (
          name,
          phone,
          location
        )
      `)
      .eq('call_status', 'Ready')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching ready calls:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new caller
app.post('/api/callers', async (req, res) => {
  try {
    const { name, phone, location, email, caller_type, notes, status } = req.body;

    const { data, error } = await supabase
      .from('callers')
      .insert([{
        name,
        phone,
        location,
        email,
        caller_type: caller_type || 'New',
        notes,
        status: status || 'Active'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating caller:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new call
app.post('/api/calls', async (req, res) => {
  try {
    const { 
      caller_id, 
      topic, 
      screener_notes, 
      priority, 
      screener_name,
      talking_points 
    } = req.body;

    const { data, error } = await supabase
      .from('calls')
      .insert([{
        caller_id,
        topic,
        screener_notes,
        call_status: 'Ready',
        priority: priority || 'Medium',
        screener_name,
        talking_points
      }])
      .select(`
        *,
        callers (
          name,
          phone,
          location
        )
      `)
      .single();

    if (error) {
      console.error('Error creating call:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update call status
app.patch('/api/calls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('calls')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating call:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('=================================');
  
  // Test database connection after server starts
  await testDatabaseConnection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Server shutting down gracefully...');
  process.exit(0);
});

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Debug environment variables
console.log('=== RAILWAY ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY present:', process.env.SUPABASE_ANON_KEY ? 'YES' : 'NO');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase client created successfully');

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Simple HTML response for root
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Radio Show Management System</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 50px auto; 
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .status { 
                color: #28a745; 
                font-weight: bold; 
            }
            .test-links {
                margin-top: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            .test-links a {
                display: block;
                margin: 10px 0;
                color: #007bff;
                text-decoration: none;
            }
            .test-links a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎙️ Radio Show Management System</h1>
            <p class="status">✅ Server is running successfully!</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Port:</strong> ${PORT}</p>
            <p><strong>Database:</strong> Connected to Supabase</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            
            <div class="test-links">
                <h3>Test Links:</h3>
                <a href="/api/health">Health Check API</a>
                <a href="/api/callers">View Callers API</a>
                <a href="/api/calls/ready">Ready Calls API</a>
            </div>
            
            <p><em>✨ The full React application will be deployed here once the frontend is built.</em></p>
        </div>
    </body>
    </html>
  `);
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

// Start server


const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('=================================');
});

// Set server timeout
server.timeout = 120000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Server shutting down gracefully...');
  process.exit(0);
});

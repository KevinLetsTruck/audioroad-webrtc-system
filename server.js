import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateCaller, validateCall, validateCallStatusUpdate } from './middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "wss://*"]
    }
  }
}));

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client/build')));

// Debug environment variables
console.log('=== RAILWAY ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY present:', process.env.SUPABASE_ANON_KEY ? 'YES' : 'NO');

// Environment variable validation
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase client created successfully');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? false 
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Join rooms based on user role
  socket.on('join:role', (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined room: ${role}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    socketConnections: io.engine.clientsCount
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

// Get ready callers for host - FIXED with correct enum value
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
      .eq('call_status', 'ready')  // Changed from 'Ready' to 'ready'
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

// Add new caller - WITH VALIDATION
app.post('/api/callers', validateCaller, async (req, res) => {
  try {
    const { name, phone, location, email, caller_type, notes, status } = req.body;

    const { data, error } = await supabase
      .from('callers')
      .insert([{
        name,
        phone,
        location,
        email,
        caller_type: caller_type || 'new',  // Fixed enum case
        notes,
        status: status || 'active'  // Fixed enum case
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating caller:', error);
      return res.status(500).json({ error: error.message });
    }

    // Emit real-time event
    io.emit('caller:created', data);

    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new call - WITH VALIDATION
app.post('/api/calls', validateCall, async (req, res) => {
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
        call_status: 'ready',  // Changed from 'Ready' to 'ready'
        priority: priority?.toLowerCase() || 'medium',  // Ensure lowercase
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

    // Emit real-time event
    io.emit('call:created', data);

    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update call status - WITH VALIDATION
app.patch('/api/calls/:id', validateCallStatusUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Ensure enum values are lowercase
    if (updates.call_status) {
      updates.call_status = updates.call_status.toLowerCase();
    }
    if (updates.priority) {
      updates.priority = updates.priority.toLowerCase();
    }

    const { data, error } = await supabase
      .from('calls')
      .update(updates)
      .eq('id', id)
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
      console.error('Error updating call:', error);
      return res.status(500).json({ error: error.message });
    }

    // Emit real-time event
    io.emit('call:updated', data);

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch all handler for React app - must be after all API routes
app.get('*', (req, res) => {
  // In development, proxy to React dev server
  if (process.env.NODE_ENV !== 'production') {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>AudioRoad Network</title>
          <style>
              body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
              .info { background: #f0f0f0; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 600px; }
              .link { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
      </head>
      <body>
          <h1>🎙️ AudioRoad Network Backend</h1>
          <div class="info">
              <p>Backend server is running! To use the full application:</p>
              <p>1. Open a new terminal and navigate to the client directory</p>
              <p>2. Run: <code>npm start</code></p>
              <p>3. Access the React app at <a href="http://localhost:3001">http://localhost:3001</a></p>
              <hr>
              <p>Or test the API endpoints:</p>
              <a href="/api/health" class="link">Health Check</a>
              <a href="/api/callers" class="link">View Callers</a>
              <a href="/api/calls/ready" class="link">Ready Calls</a>
          </div>
      </body>
      </html>
    `);
  } else {
    // In production, serve the React build
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  }
});

// Start server
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.io ready for connections`);
  console.log('=================================');
});

// Set server timeout
server.timeout = 120000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down gracefully...');
  io.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Server shutting down gracefully...');
  io.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

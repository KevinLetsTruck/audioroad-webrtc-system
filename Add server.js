const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://urgzmoaaklfikirsgtoz.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZ3ptb2Fha2xmaWtpcnNndG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMDI4NjksImV4cCI6MjA2Njc3ODg2OX0.UN7e4ExE4pe0SF1eCEP1IxJ1OPoX9SoHgnp4swdACDA'
);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/screener', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'screener.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

// API Routes
app.get('/api/shows', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('show_episodes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/callers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('callers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching callers:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/callers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('callers')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error creating caller:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-show', (showId) => {
    socket.join(`show-${showId}`);
    console.log(`User ${socket.id} joined show ${showId}`);
  });
  
  socket.on('new-caller', (callerData) => {
    io.to(`show-${callerData.showId}`).emit('caller-added', callerData);
  });
  
  socket.on('caller-ready', (callerData) => {
    io.to(`show-${callerData.showId}`).emit('caller-ready', callerData);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

server.listen(PORT, () => {
  console.log(`AudioRoad WebRTC Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

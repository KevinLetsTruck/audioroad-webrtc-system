// Caller types
export interface Caller {
  id: string;
  name: string;
  phone: string;
  location?: string;
  email?: string;
  caller_type: 'new' | 'regular' | 'vip';
  notes?: string;
  status: 'active' | 'blocked' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Call types
export interface Call {
  id: string;
  caller_id: string;
  topic: string;
  screener_notes?: string;
  call_status: 'waiting' | 'ready' | 'on_air' | 'completed' | 'dropped';
  priority: 'low' | 'medium' | 'high';
  screener_name?: string;
  talking_points?: string;
  created_at: string;
  updated_at: string;
  callers?: Caller; // Joined data
}

// Form types
export interface CallerFormData {
  name: string;
  phone: string;
  location?: string;
  email?: string;
  caller_type?: 'new' | 'regular' | 'vip';
  notes?: string;
}

export interface CallFormData {
  caller_id: string;
  topic: string;
  screener_notes?: string;
  priority?: 'low' | 'medium' | 'high';
  screener_name?: string;
  talking_points?: string;
}

// API Response types
export interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
  port: number;
}

// WebSocket event types
export interface SocketEvents {
  'call:created': (call: Call) => void;
  'call:updated': (call: Call) => void;
  'call:deleted': (callId: string) => void;
  'caller:created': (caller: Caller) => void;
  'caller:updated': (caller: Caller) => void;
}
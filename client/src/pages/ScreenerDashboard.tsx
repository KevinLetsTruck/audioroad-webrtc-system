import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, endpoints } from '../config/api';
import { useSocket, useCallEvents, useCallerEvents } from '../contexts/SocketContext';
import { Caller, Call, CallerFormData, CallFormData } from '../types';
import './ScreenerDashboard.css';

const ScreenerDashboard: React.FC = () => {
  const [callers, setCallers] = useState<Caller[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCaller, setSelectedCaller] = useState<Caller | null>(null);
  const [isNewCaller, setIsNewCaller] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { connected, joinRole } = useSocket();

  // Form states
  const [callerForm, setCallerForm] = useState<CallerFormData>({
    name: '',
    phone: '',
    location: '',
    email: '',
    caller_type: 'new',
    notes: ''
  });

  const [callForm, setCallForm] = useState<CallFormData>({
    caller_id: '',
    topic: '',
    screener_notes: '',
    priority: 'medium',
    screener_name: '',
    talking_points: ''
  });

  // Socket event handlers
  useCallEvents(
    // On call created
    (newCall) => {
      setCalls(prevCalls => {
        // Check if call already exists
        if (prevCalls.find(c => c.id === newCall.id)) {
          return prevCalls;
        }
        return [newCall, ...prevCalls];
      });
    },
    // On call updated
    (updatedCall) => {
      setCalls(prevCalls => {
        // If the call status is no longer 'ready', remove it from the list
        if (updatedCall.call_status !== 'ready') {
          return prevCalls.filter(c => c.id !== updatedCall.id);
        }
        // Otherwise update the call in the list
        return prevCalls.map(c => c.id === updatedCall.id ? updatedCall : c);
      });
    }
  );

  useCallerEvents(
    // On caller created
    (newCaller) => {
      setCallers(prevCallers => {
        // Check if caller already exists
        if (prevCallers.find(c => c.id === newCaller.id)) {
          return prevCallers;
        }
        return [newCaller, ...prevCallers];
      });
    },
    // On caller updated
    (updatedCaller) => {
      setCallers(prevCallers => 
        prevCallers.map(c => c.id === updatedCaller.id ? updatedCaller : c)
      );
    }
  );

  // Join screener room on mount
  useEffect(() => {
    joinRole('screener');
  }, [joinRole]);

  // Fetch callers and calls on mount
  useEffect(() => {
    fetchCallers();
    fetchCalls();
  }, []);

  const fetchCallers = async () => {
    try {
      const response = await api.get(endpoints.callers);
      setCallers(response.data);
    } catch (err) {
      console.error('Error fetching callers:', err);
      setError('Failed to load callers');
    }
  };

  const fetchCalls = async () => {
    try {
      const response = await api.get(endpoints.readyCalls);
      setCalls(response.data);
    } catch (err) {
      console.error('Error fetching calls:', err);
      setError('Failed to load calls');
    }
  };

  const handleCallerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post(endpoints.callers, callerForm);
      const newCaller = response.data;
      // No need to manually update state - Socket.io will handle it
      setSelectedCaller(newCaller);
      setIsNewCaller(false);
      
      // Reset form
      setCallerForm({
        name: '',
        phone: '',
        location: '',
        email: '',
        caller_type: 'new',
        notes: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create caller');
    } finally {
      setLoading(false);
    }
  };

  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaller) return;

    setLoading(true);
    setError('');

    try {
      await api.post(endpoints.calls, {
        ...callForm,
        caller_id: selectedCaller.id
      });
      
      // No need to manually update state - Socket.io will handle it
      
      // Reset call form
      setCallForm({
        caller_id: '',
        topic: '',
        screener_notes: '',
        priority: 'medium',
        screener_name: '',
        talking_points: ''
      });
      
      // Clear selected caller
      setSelectedCaller(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create call');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  return (
    <div className="screener-dashboard">
      <div className="dashboard-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>📞 Screener Dashboard</h1>
        <div className="header-info">
          <span className="queue-count">Queue: {calls.length} calls</span>
          <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="left-panel">
          <div className="section">
            <h2>Caller Information</h2>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="caller-options">
              <button 
                className={`option-btn ${!isNewCaller ? 'active' : ''}`}
                onClick={() => setIsNewCaller(false)}
              >
                Existing Caller
              </button>
              <button 
                className={`option-btn ${isNewCaller ? 'active' : ''}`}
                onClick={() => setIsNewCaller(true)}
              >
                New Caller
              </button>
            </div>

            {!isNewCaller ? (
              <div className="existing-caller">
                <input
                  type="text"
                  placeholder="Search callers by name or phone..."
                  className="search-input"
                  onChange={(e) => {
                    const query = e.target.value.toLowerCase();
                    // Filter callers based on search
                  }}
                />
                <div className="caller-list">
                  {callers.slice(0, 5).map(caller => (
                    <div 
                      key={caller.id} 
                      className={`caller-item ${selectedCaller?.id === caller.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCaller(caller)}
                    >
                      <div className="caller-name">{caller.name}</div>
                      <div className="caller-details">
                        {formatPhone(caller.phone)} | {caller.location || 'Unknown location'}
                      </div>
                      <div className="caller-type">{caller.caller_type.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCallerSubmit} className="caller-form">
                <input
                  type="text"
                  placeholder="Caller Name *"
                  value={callerForm.name}
                  onChange={(e) => setCallerForm({ ...callerForm, name: e.target.value })}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={callerForm.phone}
                  onChange={(e) => setCallerForm({ ...callerForm, phone: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={callerForm.location}
                  onChange={(e) => setCallerForm({ ...callerForm, location: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={callerForm.email}
                  onChange={(e) => setCallerForm({ ...callerForm, email: e.target.value })}
                />
                <select
                  value={callerForm.caller_type}
                  onChange={(e) => setCallerForm({ ...callerForm, caller_type: e.target.value as any })}
                >
                  <option value="new">New Caller</option>
                  <option value="regular">Regular Caller</option>
                  <option value="vip">VIP Caller</option>
                </select>
                <textarea
                  placeholder="Notes about the caller"
                  value={callerForm.notes}
                  onChange={(e) => setCallerForm({ ...callerForm, notes: e.target.value })}
                  rows={3}
                />
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Caller'}
                </button>
              </form>
            )}
          </div>

          {selectedCaller && (
            <div className="section">
              <h2>Call Details</h2>
              <div className="selected-caller-info">
                <strong>{selectedCaller.name}</strong> - {formatPhone(selectedCaller.phone)}
              </div>
              <form onSubmit={handleCallSubmit} className="call-form">
                <input
                  type="text"
                  placeholder="Your Name (Screener) *"
                  value={callForm.screener_name}
                  onChange={(e) => setCallForm({ ...callForm, screener_name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Call Topic *"
                  value={callForm.topic}
                  onChange={(e) => setCallForm({ ...callForm, topic: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Screener Notes"
                  value={callForm.screener_notes}
                  onChange={(e) => setCallForm({ ...callForm, screener_notes: e.target.value })}
                  rows={3}
                />
                <textarea
                  placeholder="Talking Points for Host"
                  value={callForm.talking_points}
                  onChange={(e) => setCallForm({ ...callForm, talking_points: e.target.value })}
                  rows={3}
                />
                <select
                  value={callForm.priority}
                  onChange={(e) => setCallForm({ ...callForm, priority: e.target.value as any })}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <button type="submit" disabled={loading}>
                  {loading ? 'Adding to Queue...' : 'Add to Queue'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="section">
            <h2>Call Queue</h2>
            <div className="real-time-indicator">
              {connected && <span className="pulse-dot"></span>}
              Real-time updates {connected ? 'active' : 'inactive'}
            </div>
            <div className="call-queue">
              {calls.length === 0 ? (
                <div className="empty-queue">No calls in queue</div>
              ) : (
                calls.map((call, index) => (
                  <div key={call.id} className={`queue-item priority-${call.priority}`}>
                    <div className="queue-number">{index + 1}</div>
                    <div className="queue-details">
                      <div className="queue-caller">
                        {call.callers?.name} - {call.callers?.location || 'Unknown'}
                      </div>
                      <div className="queue-topic">{call.topic}</div>
                      {call.screener_notes && (
                        <div className="queue-notes">Notes: {call.screener_notes}</div>
                      )}
                      <div className="queue-meta">
                        Screener: {call.screener_name} | Priority: {call.priority.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenerDashboard;
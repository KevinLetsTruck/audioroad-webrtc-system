import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, endpoints } from '../config/api';
import { useSocket, useCallEvents } from '../contexts/SocketContext';
import { Call } from '../types';
import './HostDashboard.css';

const HostDashboard: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [onAirCall, setOnAirCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  const { connected, joinRole } = useSocket();

  // Socket event handlers
  useCallEvents(
    // On call created
    (newCall) => {
      if (newCall.call_status === 'ready') {
        setCalls(prevCalls => {
          // Check if call already exists
          if (prevCalls.find(c => c.id === newCall.id)) {
            return prevCalls;
          }
          return [...prevCalls, newCall];
        });
      }
    },
    // On call updated
    (updatedCall) => {
      // Handle call status changes
      if (updatedCall.call_status === 'ready') {
        // Add to ready queue if not already there
        setCalls(prevCalls => {
          const exists = prevCalls.find(c => c.id === updatedCall.id);
          if (exists) {
            return prevCalls.map(c => c.id === updatedCall.id ? updatedCall : c);
          }
          return [...prevCalls, updatedCall];
        });
      } else if (updatedCall.call_status === 'on_air') {
        // Remove from queue and set as on-air
        setCalls(prevCalls => prevCalls.filter(c => c.id !== updatedCall.id));
        setOnAirCall(updatedCall);
        if (selectedCall?.id === updatedCall.id) {
          setSelectedCall(null);
        }
      } else {
        // Remove from both queue and on-air
        setCalls(prevCalls => prevCalls.filter(c => c.id !== updatedCall.id));
        if (onAirCall?.id === updatedCall.id) {
          setOnAirCall(null);
        }
        if (selectedCall?.id === updatedCall.id) {
          setSelectedCall(null);
        }
      }
    }
  );

  // Join host room on mount
  useEffect(() => {
    joinRole('host');
  }, [joinRole]);

  // Fetch calls on mount
  useEffect(() => {
    fetchCalls();
  }, []);

  // Timer for on-air call
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (onAirCall) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [onAirCall]);

  const fetchCalls = async () => {
    try {
      const response = await api.get(endpoints.readyCalls);
      setCalls(response.data);
    } catch (err) {
      console.error('Error fetching calls:', err);
      setError('Failed to load calls');
    }
  };

  const updateCallStatus = async (callId: string, status: string) => {
    setLoading(true);
    setError('');

    try {
      await api.patch(`${endpoints.calls}/${callId}`, {
        call_status: status
      });

      // Socket.io will handle the state updates
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update call status');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    <div className="host-dashboard">
      <div className="dashboard-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>🎙️ Host Dashboard</h1>
        <div className="header-info">
          <span className="live-indicator">
            {onAirCall ? '🔴 ON AIR' : '⚪ OFF AIR'}
          </span>
          {onAirCall && <span className="call-timer">{formatTime(elapsedTime)}</span>}
          <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-content">
        <div className="main-panel">
          {onAirCall && (
            <div className="on-air-section">
              <h2>🔴 Currently On Air</h2>
              <div className="on-air-card">
                <div className="on-air-info">
                  <div className="caller-main">
                    <span className="caller-name-large">{onAirCall.callers?.name}</span>
                    <span className="caller-location">{onAirCall.callers?.location || 'Unknown location'}</span>
                  </div>
                  <div className="call-topic-large">{onAirCall.topic}</div>
                  {onAirCall.talking_points && (
                    <div className="talking-points">
                      <strong>Talking Points:</strong>
                      <p>{onAirCall.talking_points}</p>
                    </div>
                  )}
                  {onAirCall.screener_notes && (
                    <div className="screener-notes">
                      <strong>Screener Notes:</strong>
                      <p>{onAirCall.screener_notes}</p>
                    </div>
                  )}
                </div>
                <div className="on-air-actions">
                  <button 
                    className="action-btn complete"
                    onClick={() => updateCallStatus(onAirCall.id, 'completed')}
                    disabled={loading}
                  >
                    ✓ Complete Call
                  </button>
                  <button 
                    className="action-btn drop"
                    onClick={() => updateCallStatus(onAirCall.id, 'dropped')}
                    disabled={loading}
                  >
                    ✗ Drop Call
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="queue-section">
            <h2>📞 Call Queue ({calls.length})</h2>
            <div className="real-time-indicator">
              {connected && <span className="pulse-dot"></span>}
              Real-time sync {connected ? 'active' : 'inactive'}
            </div>
            <div className="call-queue">
              {calls.length === 0 ? (
                <div className="empty-queue">No calls waiting in queue</div>
              ) : (
                calls.map((call, index) => (
                  <div 
                    key={call.id} 
                    className={`queue-card ${selectedCall?.id === call.id ? 'selected' : ''} priority-${call.priority}`}
                    onClick={() => setSelectedCall(call)}
                  >
                    <div className="queue-position">{index + 1}</div>
                    <div className="queue-info">
                      <div className="caller-info">
                        <span className="caller-name">{call.callers?.name}</span>
                        <span className="caller-meta">
                          {call.callers?.location || 'Unknown'} | {call.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="call-topic">{call.topic}</div>
                    </div>
                    <div className="queue-actions">
                      <button 
                        className="quick-action on-air"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCallStatus(call.id, 'on_air');
                        }}
                        disabled={loading || !!onAirCall}
                        title="Put on air"
                      >
                        📻
                      </button>
                      <button 
                        className="quick-action drop"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCallStatus(call.id, 'dropped');
                        }}
                        disabled={loading}
                        title="Drop call"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="side-panel">
          {selectedCall && (
            <div className="call-details">
              <h3>Call Details</h3>
              <div className="detail-section">
                <div className="detail-label">Caller:</div>
                <div className="detail-value">{selectedCall.callers?.name}</div>
              </div>
              <div className="detail-section">
                <div className="detail-label">Phone:</div>
                <div className="detail-value">{formatPhone(selectedCall.callers?.phone || '')}</div>
              </div>
              <div className="detail-section">
                <div className="detail-label">Location:</div>
                <div className="detail-value">{selectedCall.callers?.location || 'Unknown'}</div>
              </div>
              <div className="detail-section">
                <div className="detail-label">Topic:</div>
                <div className="detail-value">{selectedCall.topic}</div>
              </div>
              {selectedCall.talking_points && (
                <div className="detail-section">
                  <div className="detail-label">Talking Points:</div>
                  <div className="detail-value">{selectedCall.talking_points}</div>
                </div>
              )}
              {selectedCall.screener_notes && (
                <div className="detail-section">
                  <div className="detail-label">Screener Notes:</div>
                  <div className="detail-value">{selectedCall.screener_notes}</div>
                </div>
              )}
              <div className="detail-section">
                <div className="detail-label">Screened by:</div>
                <div className="detail-value">{selectedCall.screener_name}</div>
              </div>
              <div className="detail-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => updateCallStatus(selectedCall.id, 'on_air')}
                  disabled={loading || !!onAirCall}
                >
                  🎙️ Put On Air
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => updateCallStatus(selectedCall.id, 'dropped')}
                  disabled={loading}
                >
                  Drop Call
                </button>
              </div>
            </div>
          )}

          <div className="quick-stats">
            <h3>Session Stats</h3>
            <div className="stat-item">
              <div className="stat-label">Calls in Queue</div>
              <div className="stat-value">{calls.length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">High Priority</div>
              <div className="stat-value">{calls.filter(c => c.priority === 'high').length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Current Status</div>
              <div className="stat-value">{onAirCall ? 'On Air' : 'Ready'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Connection</div>
              <div className="stat-value">{connected ? 'Live' : 'Offline'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
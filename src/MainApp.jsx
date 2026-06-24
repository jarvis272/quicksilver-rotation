import React, { useState, useEffect } from 'react';
import { Plus, RotateCcw, LogOut, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from './lib/supabase';
import NewSession from './NewSession.jsx';
import SessionDetail from './SessionDetail.jsx';

export default function MainApp({ session }) {
  const today = new Date().toISOString().slice(0, 10);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(today);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showNewCourt, setShowNewCourt] = useState(false);
  const [toast, setToast] = useState(null);

  const userId = session.user.id;

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('rotation_sessions')
        .select('*')
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: true });
      const loaded = data || [];
      setSessions(loaded);
      const forToday = loaded.filter(s => s.session_date === today);
      if (forToday.length) {
        setActiveSessionId(forToday[0].id);
      }
      setLoading(false);
    })();
  }, []);

  // All navigable dates: today + dates that have sessions, sorted desc
  const allDates = [...new Set([today, ...sessions.map(s => s.session_date)])].sort().reverse();
  const dateIdx = allDates.indexOf(currentDate);

  const courtsForDate = sessions
    .filter(s => s.session_date === currentDate)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const changeDate = (dir) => {
    // dir +1 = go to older date (higher index in desc array), -1 = newer
    const newIdx = dateIdx + dir;
    if (newIdx < 0 || newIdx >= allDates.length) return;
    const newDate = allDates[newIdx];
    const forNew = sessions
      .filter(s => s.session_date === newDate)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setCurrentDate(newDate);
    setShowNewCourt(false);
    setActiveSessionId(forNew[0]?.id || null);
  };

  const handleCourtCreated = (newSess) => {
    setSessions(prev => [...prev, newSess]);
    setCurrentDate(newSess.session_date);
    setActiveSessionId(newSess.id);
    setShowNewCourt(false);
    showToast('Court started!');
  };

  const handleSessionUpdated = (updatedSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? { ...s, ...updatedSession } : s));
  };

  const selectCourt = (id) => {
    setActiveSessionId(id);
    setShowNewCourt(false);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const formatDate = (d) => {
    const dt = new Date(d + 'T12:00:00');
    const isToday = d === today;
    const label = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return isToday ? `Today · ${label}` : label;
  };

  const logout = () => supabase.auth.signOut();

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* App header */}
      <header style={{ padding: '12px 20px', borderBottom: '1px solid #1a1f2e',
        background: 'rgba(10,14,26,.97)', backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={18} style={{ color: '#10b981' }} />
            <span className="display" style={{ fontSize: 22, fontWeight: 800,
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ROTATION
            </span>
          </div>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #2d3748',
            color: '#94a3b8', padding: '6px 8px', borderRadius: 8 }}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid #1a1f2e',
        background: '#0d1117', position: 'sticky', top: 53, zIndex: 25 }}>
        <button
          onClick={() => changeDate(1)}
          disabled={dateIdx >= allDates.length - 1}
          style={{ background: 'transparent', border: 'none', padding: '4px 6px',
            color: dateIdx >= allDates.length - 1 ? '#1f2937' : '#94a3b8', cursor: 'pointer' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
          {formatDate(currentDate)}
        </span>
        <button
          onClick={() => changeDate(-1)}
          disabled={dateIdx <= 0}
          style={{ background: 'transparent', border: 'none', padding: '4px 6px',
            color: dateIdx <= 0 ? '#1f2937' : '#94a3b8', cursor: 'pointer' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Court tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto',
        borderBottom: '2px solid #1a1f2e', background: '#0a0e1a',
        position: 'sticky', top: 95, zIndex: 20, scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch' }}>
        {courtsForDate.map((court, i) => {
          const isActive = activeSessionId === court.id && !showNewCourt;
          const isClosed = !!court.closed_at;
          return (
            <button key={court.id} onClick={() => selectCourt(court.id)} style={{
              background: 'transparent', border: 'none',
              borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: -2,
              color: isActive ? '#10b981' : isClosed ? '#475569' : '#94a3b8',
              padding: '10px 18px', fontSize: 13, fontWeight: 600,
              whiteSpace: 'nowrap', flexShrink: 0,
              opacity: isClosed && !isActive ? 0.65 : 1,
              cursor: 'pointer',
            }}>
              Court {i + 1}{isClosed ? ' ✓' : ''}
            </button>
          );
        })}
        <button onClick={() => { setShowNewCourt(true); setActiveSessionId(null); }} style={{
          background: 'transparent', border: 'none',
          borderBottom: showNewCourt ? '2px solid #10b981' : '2px solid transparent',
          marginBottom: -2,
          color: showNewCourt ? '#10b981' : '#475569',
          padding: '10px 16px', fontSize: 18, flexShrink: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>+</button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
          <Loader size={24} className="spin" style={{ color: '#10b981' }} />
        </div>
      ) : showNewCourt ? (
        <NewSession
          userId={userId}
          courtNumber={courtsForDate.length + 1}
          defaultDate={currentDate}
          onCreated={handleCourtCreated}
          onBack={() => {
            setShowNewCourt(false);
            setActiveSessionId(courtsForDate[0]?.id || null);
          }}
        />
      ) : activeSession ? (
        <SessionDetail
          key={activeSession.id}
          session={activeSession}
          onSessionUpdated={handleSessionUpdated}
          showToast={showToast}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RotateCcw size={48} style={{ color: '#1f2937', marginBottom: 16 }} />
          <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 6 }}>
            No courts for this day
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
            Tap <strong style={{ color: '#475569' }}>+</strong> to start Court 1
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: toast.kind === 'error' ? '#7f1d1d' : '#064e3b',
          color: '#e2e8f0', padding: '10px 16px', borderRadius: 8, fontSize: 13,
          zIndex: 50, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

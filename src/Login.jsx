import React, { useState } from 'react';
import { RotateCcw, Loader, Mail, Lock } from 'lucide-react';
import { supabase } from './lib/supabase';

const inp = { width: '100%', background: '#0a0e1a', border: '1px solid #1f2937',
  color: '#e2e8f0', padding: '10px 12px 10px 36px', borderRadius: 8, fontSize: 14, outline: 'none' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async () => {
    setError(''); setInfo('');
    if (!email || !password) { setError('Email and password required'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Account created! Sign in below.'); setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setError(e.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <RotateCcw size={26} style={{ color: '#10b981' }} />
            <h1 className="display" style={{ margin: 0, fontSize: 30, fontWeight: 800,
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ROTATION TRACKER
            </h1>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 2 }}>QUICKSILVER CLUB</div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>Use the same login as your other Quicksilver apps</div>
        </div>

        <div style={{ background: '#141926', border: '1px solid #1f2937', borderRadius: 16, padding: 24 }}>
          <h2 className="display" style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>
            {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </h2>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 18 }}>
            {mode === 'signin' ? 'Welcome back' : 'New here? Set up your account'}
          </div>

          {[['EMAIL', email, setEmail, 'email', Mail], ['PASSWORD', password, setPassword, 'password', Lock]].map(([label, val, set, type, Icon]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 5, fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
              <div style={{ position: 'relative' }}>
                <Icon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input type={type} value={val} onChange={e => set(e.target.value)}
                  style={inp} onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>
            </div>
          ))}

          {error && <div style={{ background: 'rgba(127,29,29,.3)', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '9px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}
          {info  && <div style={{ background: 'rgba(6,78,59,.3)',  border: '1px solid #065f46', color: '#6ee7b7',  padding: '9px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{info}</div>}

          <button onClick={submit} disabled={loading} style={{
            width: '100%', border: 'none', padding: '12px', borderRadius: 10,
            fontWeight: 700, fontSize: 14, letterSpacing: 1,
            background: loading ? '#1f2937' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: loading ? '#475569' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <Loader size={16} className="spin" /> : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'underline' }}>
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have one? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

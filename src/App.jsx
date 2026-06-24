import React, { useState, useEffect } from 'react';
import { RotateCcw, Loader } from 'lucide-react';
import { supabase } from './lib/supabase';
import Login from './Login.jsx';
import MainApp from './MainApp.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <RotateCcw size={32} style={{ color: '#10b981' }} />
      <Loader size={16} className="spin" style={{ color: '#64748b' }} />
    </div>
  );

  return session ? <MainApp session={session} /> : <Login />;
}

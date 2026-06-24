import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, Loader } from 'lucide-react';
import { supabase } from './lib/supabase';

const inp = { width: '100%', background: '#0a0e1a', border: '1px solid #1f2937',
  color: '#e2e8f0', padding: '10px 12px', borderRadius: 8, fontSize: 14, outline: 'none' };

export default function NewSession({ userId, onCreated, onBack, courtNumber = 1, defaultDate }) {
  const date = defaultDate || new Date().toISOString().slice(0, 10);
  const autoName = `Court ${courtNumber}`;
  const [players, setPlayers] = useState(['', '', '', '', '', '']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updatePlayer = (i, v) => setPlayers(prev => prev.map((p, idx) => idx === i ? v : p));
  const canSave = players.every(p => p.trim());

  const save = async () => {
    if (!canSave) return;
    setSaving(true); setError('');
    try {
      const { data: sess, error: sErr } = await supabase
        .from('rotation_sessions')
        .insert({ user_id: userId, name: autoName, session_date: date })
        .select().single();
      if (sErr) throw sErr;

      const playerRows = players.map((p, i) => ({
        session_id: sess.id,
        player_number: i + 1,
        player_name: p.trim(),
      }));
      const { error: pErr } = await supabase.from('rotation_players').insert(playerRows);
      if (pErr) throw pErr;

      onCreated(sess);
    } catch (e) {
      setError(e.message || 'Failed to create court');
      setSaving(false);
    }
  };

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1f2e',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none',
          color: '#94a3b8', padding: 4, cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="display" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          SET UP {autoName.toUpperCase()}
        </h2>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13,
          color: '#34d399', lineHeight: 1.6 }}>
          Creating <strong>{autoName}</strong> · {dateLabel}
        </div>

        <div style={{ background: '#141926', border: '1px solid #1f2937', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>
            PLAYER ROSTER
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
            Assign 1–6 by skill: 1 = strongest, 6 = weakest.
          </div>
          {players.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: '#0a0e1a',
                border: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#10b981', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
              <input value={p} onChange={e => updatePlayer(i, e.target.value)}
                placeholder={`Player ${i + 1} name`} autoFocus={i === 0}
                style={{ ...inp, padding: '9px 12px', flex: 1 }} />
            </div>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(127,29,29,.3)', color: '#fca5a5',
          padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>{error}</div>}

        <button onClick={save} disabled={!canSave || saving} style={{
          width: '100%', border: 'none', padding: '14px', borderRadius: 12,
          fontWeight: 700, fontSize: 14, letterSpacing: 1,
          background: canSave && !saving ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#1f2937',
          color: canSave && !saving ? '#fff' : '#475569',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
          {saving ? <Loader size={16} className="spin" /> : <><RotateCcw size={16} /> START COURT</>}
        </button>
      </div>
    </div>
  );
}

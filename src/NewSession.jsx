import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Loader, Search, Check, Swords, Scale } from 'lucide-react';
import { supabase } from './lib/supabase';
import { assignSlots, SKILL_RANK } from './lib/algorithm';

const SKILL_COLOR = {
  beginner:         '#475569',
  amateur:          '#64748b',
  intermediate:     '#3b82f6',
  intermediate_plus:'#06b6d4',
  advanced:         '#f59e0b',
  pro:              '#10b981',
};

const SKILL_LABEL = {
  intermediate_plus: 'Int+',
};

function SkillBadge({ skill, size = 'sm' }) {
  if (!skill) return null;
  const color = SKILL_COLOR[skill] || '#64748b';
  const label = SKILL_LABEL[skill] || (skill.charAt(0).toUpperCase() + skill.slice(1));
  const fs = size === 'sm' ? 10 : 11;
  return (
    <span style={{
      fontSize: fs, fontWeight: 700, color,
      border: `1px solid ${color}55`,
      borderRadius: 4, padding: '1px 5px',
      background: `${color}15`, whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

export default function NewSession({ userId, onCreated, onBack, courtNumber = 1, defaultDate }) {
  const date = defaultDate || new Date().toISOString().slice(0, 10);
  const autoName = `Court ${courtNumber}`;

  const [allPlayers, setAllPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]); // array of player objects from `players` table
  const [mode, setMode] = useState('balanced');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('players')
        .select('id, name, skill')
        .order('name');
      setAllPlayers(data || []);
      setLoadingPlayers(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allPlayers.filter(p =>
      !q || p.name.toLowerCase().includes(q)
    );
  }, [allPlayers, search]);

  const isSelected = (id) => selected.some(s => s.id === id);

  const togglePlayer = (player) => {
    if (isSelected(player.id)) {
      setSelected(prev => prev.filter(s => s.id !== player.id));
    } else if (selected.length < 6) {
      setSelected(prev => [...prev, player]);
    }
  };

  // Live slot assignment preview
  const slotPreview = useMemo(() => {
    if (selected.length !== 6) return [];
    return assignSlots(selected, mode);
  }, [selected, mode]);

  const canSave = selected.length === 6 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true); setError('');
    try {
      const { data: sess, error: sErr } = await supabase
        .from('rotation_sessions')
        .insert({ user_id: userId, name: autoName, session_date: date, mode })
        .select().single();
      if (sErr) throw sErr;

      const playerRows = slotPreview.map(p => ({
        session_id: sess.id,
        player_number: p.player_number,
        player_name: p.name,
        player_id: p.id,
        skill: p.skill,
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
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
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

      <div style={{ padding: '16px 20px' }}>
        {/* Context chip */}
        <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
          borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: 13,
          color: '#34d399' }}>
          {autoName} · {dateLabel}
        </div>

        {/* Mode toggle */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
            GAME MODE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'balanced', Icon: Scale, label: 'Balanced', desc: 'Strong paired with weak' },
              { key: 'competitive', Icon: Swords, label: 'Competitive', desc: 'Strong vs strong' },
            ].map(({ key, Icon, label, desc }) => {
              const active = mode === key;
              return (
                <button key={key} onClick={() => setMode(key)} style={{
                  background: active ? 'rgba(16,185,129,.1)' : '#141926',
                  border: `1px solid ${active ? '#10b981' : '#1f2937'}`,
                  borderRadius: 10, padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <Icon size={16} style={{ color: active ? '#10b981' : '#475569', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#10b981' : '#94a3b8' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Player picker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600 }}>
              SELECT PLAYERS
            </div>
            <div style={{ fontSize: 12, color: selected.length === 6 ? '#10b981' : '#64748b', fontWeight: 600 }}>
              {selected.length}/6
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players…"
              style={{ width: '100%', background: '#0a0e1a', border: '1px solid #1f2937',
                color: '#e2e8f0', padding: '9px 12px 9px 32px', borderRadius: 8,
                fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Player list */}
          <div style={{ background: '#141926', border: '1px solid #1f2937', borderRadius: 12,
            overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
            {loadingPlayers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Loader size={18} className="spin" style={{ color: '#10b981' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                No players found
              </div>
            ) : filtered.map((player, i) => {
              const sel = isSelected(player.id);
              const disabled = !sel && selected.length >= 6;
              return (
                <button key={player.id} onClick={() => !disabled && togglePlayer(player)}
                  style={{
                    width: '100%', background: sel ? 'rgba(16,185,129,.08)' : 'transparent',
                    border: 'none', borderTop: i > 0 ? '1px solid #1a1f2e' : 'none',
                    padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                  }}>
                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                    background: sel ? '#10b981' : '#0a0e1a',
                    border: `2px solid ${sel ? '#10b981' : '#2d3748'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600,
                    color: sel ? '#e2e8f0' : '#94a3b8', textAlign: 'left' }}>
                    {player.name}
                  </span>
                  <SkillBadge skill={player.skill} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot preview */}
        {slotPreview.length === 6 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
              SLOT ASSIGNMENT PREVIEW
            </div>
            <div style={{ background: '#141926', border: '1px solid #1f2937',
              borderRadius: 12, overflow: 'hidden' }}>
              {slotPreview.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px',
                  borderTop: i > 0 ? '1px solid #1a1f2e' : 'none',
                  background: i % 2 === 0 ? '#141926' : '#0f1621',
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: '#0a0e1a',
                    border: '1px solid #1f2937', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    color: '#10b981', flexShrink: 0 }}>
                    {p.player_number}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                    {p.name}
                  </span>
                  <SkillBadge skill={p.skill} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 6, paddingLeft: 2 }}>
              {mode === 'balanced'
                ? 'Slot 1 = strongest — algorithm pairs strong with weak each game.'
                : 'Slot 1 = weakest — algorithm clusters strong players on same team.'}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(127,29,29,.3)', color: '#fca5a5',
            padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button onClick={save} disabled={!canSave} style={{
          width: '100%', border: 'none', padding: '14px', borderRadius: 12,
          fontWeight: 700, fontSize: 14, letterSpacing: 1,
          background: canSave ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#1f2937',
          color: canSave ? '#fff' : '#475569',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: canSave ? 'pointer' : 'default',
        }}>
          {saving
            ? <Loader size={16} className="spin" />
            : selected.length < 6
              ? `Select ${6 - selected.length} more player${6 - selected.length !== 1 ? 's' : ''}`
              : <><RotateCcw size={16} /> START COURT</>
          }
        </button>
      </div>
    </div>
  );
}

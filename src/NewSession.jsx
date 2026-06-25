import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, RotateCcw, Loader, X, Swords, Scale } from 'lucide-react';
import { supabase } from './lib/supabase';
import { assignSlots } from './lib/algorithm';

const SKILL_COLOR = {
  beginner:          '#475569',
  amateur:           '#64748b',
  intermediate:      '#3b82f6',
  intermediate_plus: '#06b6d4',
  advanced:          '#f59e0b',
  pro:               '#10b981',
};
const SKILL_LABEL = { intermediate_plus: 'Int+' };

function SkillBadge({ skill }) {
  if (!skill) return null;
  const color = SKILL_COLOR[skill] || '#64748b';
  const label = SKILL_LABEL[skill] || (skill.charAt(0).toUpperCase() + skill.slice(1));
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      border: `1px solid ${color}55`, borderRadius: 4,
      padding: '1px 6px', background: `${color}15`,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function PlayerSlot({ index, player, allPlayers, otherSelectedIds, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allPlayers.filter(p =>
      (!q || p.name.toLowerCase().includes(q))
    );
  }, [allPlayers, query]);

  const openDropdown = () => {
    setQuery('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closeDropdown = () => {
    setOpen(false);
    setQuery('');
  };

  const handleBlur = () => {
    // delay so a dropdown click registers before blur fires
    setTimeout(closeDropdown, 150);
  };

  const handleSelect = (p) => {
    onSelect(index, p);
    setOpen(false);
    setQuery('');
  };

  return (
    <div style={{ position: 'relative', marginBottom: 6 }}>
      {/* Slot row */}
      <div
        onClick={() => !open && openDropdown()}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: open ? '#1a2236' : '#141926',
          border: `1px solid ${open ? '#334155' : player ? '#1f2937' : '#1f2937'}`,
          borderRadius: open ? '10px 10px 0 0' : 10,
          padding: '10px 12px',
          cursor: open ? 'default' : 'pointer',
          transition: 'border-color .15s',
        }}
      >
        {/* Slot number badge */}
        <div style={{
          width: 26, height: 26, borderRadius: 13, flexShrink: 0,
          background: player ? 'rgba(16,185,129,.15)' : '#0a0e1a',
          border: `1px solid ${player ? '#10b981' : '#2d3748'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          color: player ? '#10b981' : '#475569',
        }}>
          {index + 1}
        </div>

        {/* Input or display */}
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onBlur={handleBlur}
            placeholder="Type to search…"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: '#e2e8f0', fontSize: 14, outline: 'none', padding: 0,
            }}
          />
        ) : player ? (
          <>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
              {player.name}
            </span>
            <SkillBadge skill={player.skill} />
            <button
              onClick={e => { e.stopPropagation(); onClear(index); }}
              style={{ background: 'transparent', border: 'none', color: '#475569',
                padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center',
                flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: '#475569' }}>
            Search player…
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#1a2236', border: '1px solid #334155',
          borderTop: 'none', borderRadius: '0 0 10px 10px',
          maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,.4)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>
              No players found
            </div>
          ) : filtered.map((p, i) => {
            const taken = otherSelectedIds.has(p.id);
            return (
              <button
                key={p.id}
                onMouseDown={e => e.preventDefault()} // prevent blur before click
                onClick={() => !taken && handleSelect(p)}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  borderTop: i > 0 ? '1px solid #1e293b' : 'none',
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: taken ? 'default' : 'pointer',
                  opacity: taken ? 0.35 : 1,
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                  {p.name}
                </span>
                <SkillBadge skill={p.skill} />
                {taken && (
                  <span style={{ fontSize: 10, color: '#475569' }}>taken</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NewSession({ userId, onCreated, onBack, courtNumber = 1, defaultDate }) {
  const date = defaultDate || new Date().toISOString().slice(0, 10);
  const autoName = `Court ${courtNumber}`;

  const [allPlayers, setAllPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [slots, setSlots] = useState(Array(6).fill(null));
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

  const handleSelect = (index, player) => {
    setSlots(prev => prev.map((s, i) => i === index ? player : s));
  };

  const handleClear = (index) => {
    setSlots(prev => prev.map((s, i) => i === index ? null : s));
  };

  const filledSlots = slots.filter(Boolean);
  const allFilled = filledSlots.length === 6;

  const slotPreview = useMemo(() => {
    if (!allFilled) return [];
    return assignSlots(filledSlots, mode);
  }, [slots, mode]);

  const canSave = allFilled && !saving;

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
          borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: 13, color: '#34d399' }}>
          {autoName} · {dateLabel}
        </div>

        {/* 6 player slots */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600 }}>
              PLAYER ROSTER
            </div>
            <div style={{ fontSize: 12, fontWeight: 600,
              color: allFilled ? '#10b981' : '#64748b' }}>
              {filledSlots.length}/6
            </div>
          </div>

          {loadingPlayers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Loader size={20} className="spin" style={{ color: '#10b981' }} />
            </div>
          ) : (
            slots.map((player, i) => {
              const otherSelectedIds = new Set(
                slots.filter((s, idx) => s && idx !== i).map(s => s.id)
              );
              return (
                <PlayerSlot
                  key={i}
                  index={i}
                  player={player}
                  allPlayers={allPlayers}
                  otherSelectedIds={otherSelectedIds}
                  onSelect={handleSelect}
                  onClear={handleClear}
                />
              );
            })
          )}
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

        {/* Slot preview */}
        {slotPreview.length === 6 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
              SLOT ASSIGNMENT
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
                : 'Slot 1 = weakest — algorithm clusters strong players together.'}
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
            : !allFilled
              ? `Fill ${6 - filledSlots.length} more slot${6 - filledSlots.length !== 1 ? 's' : ''}`
              : <><RotateCcw size={16} /> START COURT</>
          }
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Loader, Trophy, BarChart3, Users, CheckCircle, Edit2, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { SCHEDULE, getName, getResult, computeStats, computePairs, sessionProgress } from './lib/algorithm';

const NAVY = '#0F172A'; const GREEN = '#10b981'; const BLUE = '#1D4ED8'; const AMBER = '#B45309';
const BLUE_BG = '#1e3a5f'; const AMBER_BG = '#3b2000';

const inp = {
  background: '#0a0e1a', border: '1px solid #1f2937',
  color: '#e2e8f0', padding: '8px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
};

export default function SessionDetail({ session, onSessionUpdated, showToast }) {
  const [players, setPlayers] = useState([]);
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState('games');
  const [updating, setUpdating] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(!!session.closed_at);
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [playerEdits, setPlayerEdits] = useState({});
  const [savingPlayers, setSavingPlayers] = useState(false);

  useEffect(() => {
    setIsClosed(!!session.closed_at);
  }, [session.id, session.closed_at]);

  useEffect(() => {
    setLoading(true);
    setTab('games');
    (async () => {
      const [{ data: pl }, { data: re }] = await Promise.all([
        supabase.from('rotation_players').select('*').eq('session_id', session.id).order('player_number'),
        supabase.from('rotation_results').select('*').eq('session_id', session.id),
      ]);
      setPlayers(pl || []);
      setResults(re || []);
      setLoading(false);
    })();
  }, [session.id]);

  const updateGame = async (gameNum, patch) => {
    if (isClosed) return;
    setUpdating(prev => new Set([...prev, gameNum]));
    setResults(prev => {
      const existing = prev.find(r => r.game_number === gameNum);
      if (existing) return prev.map(r => r.game_number === gameNum ? { ...r, ...patch } : r);
      return [...prev, { game_number: gameNum, session_id: session.id, status: 'pending', ...patch }];
    });
    const { error } = await supabase.from('rotation_results')
      .upsert({ session_id: session.id, game_number: gameNum, ...patch },
               { onConflict: 'session_id,game_number' });
    if (error) showToast('Update failed', 'error');
    setUpdating(prev => { const n = new Set(prev); n.delete(gameNum); return n; });
  };

  const cycleStatus = (gameNum, current) => {
    const next = { pending: 'live', live: 'done', done: 'pending' }[current] || 'live';
    const patch = { status: next };
    if (next === 'pending') { patch.winner = null; patch.score_diff = null; }
    updateGame(gameNum, patch);
  };

  const setWinner = (gameNum, winner) => updateGame(gameNum, { winner });
  const setScore = (gameNum, score_diff) => updateGame(gameNum, { score_diff: parseInt(score_diff) || null });

  const finishCourt = async () => {
    if (!confirm('Mark this court as finished? Results will be locked.')) return;
    const ts = new Date().toISOString();
    const { error } = await supabase.from('rotation_sessions')
      .update({ closed_at: ts })
      .eq('id', session.id);
    if (!error) {
      setIsClosed(true);
      onSessionUpdated?.({ ...session, closed_at: ts });
    } else {
      showToast('Failed to finish court', 'error');
    }
  };

  const startEditPlayers = () => {
    setPlayerEdits(Object.fromEntries(players.map(p => [p.player_number, p.player_name])));
    setEditingPlayers(true);
  };

  const savePlayerEdits = async () => {
    if (savingPlayers) return;
    const hasEmpty = Object.values(playerEdits).some(v => !v.trim());
    if (hasEmpty) { showToast('All player names required', 'error'); return; }
    setSavingPlayers(true);
    const updates = await Promise.all(
      players.map(p =>
        supabase.from('rotation_players')
          .update({ player_name: playerEdits[p.player_number].trim() })
          .eq('id', p.id)
      )
    );
    if (updates.some(r => r.error)) {
      showToast('Failed to save names', 'error');
    } else {
      setPlayers(prev => prev.map(p => ({ ...p, player_name: playerEdits[p.player_number].trim() })));
      setEditingPlayers(false);
      showToast('Players updated');
    }
    setSavingPlayers(false);
  };

  const { done, total, pct } = sessionProgress(results);
  const stats = useMemo(() => computeStats(players, results), [players, results]);
  const pairs = useMemo(() => computePairs(players, results), [players, results]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <Loader size={24} className="spin" style={{ color: '#10b981' }} />
    </div>
  );

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Session header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1f2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#e2e8f0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.name}
              {isClosed && <span style={{ marginLeft: 8, fontSize: 12, color: '#10b981' }}>✓ Finished</span>}
            </div>
            <div style={{ fontSize: 11, color: done === total ? '#10b981' : '#64748b', marginTop: 2 }}>
              {done}/{total} games done {done === total ? '✓' : ''}
            </div>
          </div>
          {!isClosed && (
            <button onClick={startEditPlayers} style={{
              background: 'transparent', border: '1px solid #2d3748',
              color: '#94a3b8', padding: '5px 10px', borderRadius: 8,
              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Edit2 size={11} /> Reset Players
            </button>
          )}
        </div>
        <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`,
            background: done === total ? '#10b981' : '#34d399',
            borderRadius: 2, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Reset Players inline form */}
      {editingPlayers && (
        <div style={{ margin: '12px 16px', background: '#141926', border: '1px solid #1f2937',
          borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 12 }}>
            EDIT PLAYER NAMES
          </div>
          {players.map(p => (
            <div key={p.player_number} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: '#0a0e1a',
                border: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#10b981', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{p.player_number}</div>
              <input
                value={playerEdits[p.player_number] || ''}
                onChange={e => setPlayerEdits(prev => ({ ...prev, [p.player_number]: e.target.value }))}
                style={{ ...inp, flex: 1 }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={savePlayerEdits} disabled={savingPlayers} style={{
              flex: 1, background: '#10b981', border: 'none', color: '#fff',
              padding: '9px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {savingPlayers ? <Loader size={13} className="spin" /> : 'Save'}
            </button>
            <button onClick={() => setEditingPlayers(false)} style={{
              flex: 1, background: 'transparent', border: '1px solid #2d3748',
              color: '#94a3b8', padding: '9px', borderRadius: 8, fontWeight: 600, fontSize: 13,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'games' && (
        <GamesTab
          schedule={SCHEDULE} players={players} results={results}
          updating={updating} cycleStatus={cycleStatus} setWinner={setWinner} setScore={setScore}
          isClosed={isClosed} onFinishCourt={finishCourt}
        />
      )}
      {tab === 'stats' && <StatsTab stats={stats} pairs={pairs} />}

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,14,26,.97)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid #1a1f2e', display: 'flex', zIndex: 20 }}>
        {[['games', RotateCcw, 'Games'], ['stats', BarChart3, 'Stats']].map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, background: 'transparent', border: 'none',
            color: tab === key ? '#10b981' : '#64748b',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '10px 0 14px' }}>
            <Icon size={20} />
            <span style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── GAMES TAB ───────────────────────────────────────────────────────────────
function GamesTab({ schedule, players, results, updating, cycleStatus, setWinner, setScore, isClosed, onFinishCourt }) {
  const cycles = [...new Set(schedule.map(g => g.cycle))];
  return (
    <div style={{ padding: '12px 16px' }}>
      {isClosed && (
        <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12,
          color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={14} />
          Court finished — results are locked.
        </div>
      )}
      {cycles.map(ci => (
        <div key={ci} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, fontWeight: 600,
            padding: '10px 4px 6px', textTransform: 'uppercase' }}>
            Cycle {ci} · Games {(ci-1)*6+1}–{ci*6}
          </div>
          {schedule.filter(g => g.cycle === ci).map(g => (
            <GameRow key={g.gameNum} game={g} players={players} results={results}
              isUpdating={updating.has(g.gameNum)}
              isClosed={isClosed}
              onCycleStatus={() => cycleStatus(g.gameNum, getResult(results, g.gameNum).status)}
              onWinner={w => setWinner(g.gameNum, w)}
              onScore={v => setScore(g.gameNum, v)} />
          ))}
        </div>
      ))}

      {!isClosed && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1a1f2e' }}>
          <button onClick={onFinishCourt} style={{
            width: '100%', background: 'transparent',
            border: '1px solid #065f46', color: '#10b981',
            padding: '13px', borderRadius: 12, fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <CheckCircle size={16} /> Finish Court
          </button>
        </div>
      )}
    </div>
  );
}

function GameRow({ game, players, results, isUpdating, isClosed, onCycleStatus, onWinner, onScore }) {
  const r = getResult(results, game.gameNum);
  const { status, winner, score_diff } = r;

  const statusColors = {
    pending: { bg: '#141926', border: '#1f2937', btnBg: '#1f2937', btnColor: '#94a3b8', btnLabel: 'Start' },
    live:    { bg: '#2d2600', border: '#854f0b', btnBg: '#854f0b', btnColor: '#fef3c7', btnLabel: 'Done' },
    done:    { bg: '#0a2018', border: '#065f46', btnBg: '#065f46', btnColor: '#d1fae5', btnLabel: 'Done ✓' },
  };
  const sc = statusColors[status] || statusColors.pending;

  return (
    <div className="fade-in" style={{ background: sc.bg, border: `1px solid ${sc.border}`,
      borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 12, background: '#0a0e1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
          {game.gameNum}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <TeamChip nums={game.teamA} players={players} color={BLUE} bg={BLUE_BG} winner={winner} side="A" />
            <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>vs</span>
            <TeamChip nums={game.teamB} players={players} color={AMBER} bg={AMBER_BG} winner={winner} side="B" />
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
            Sit: {game.sit.map(n => getName(players, n)).join(', ')}
          </div>
        </div>
        {!isClosed && (
          <button onClick={onCycleStatus} disabled={isUpdating} style={{
            background: sc.btnBg, border: 'none', color: sc.btnColor,
            padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            whiteSpace: 'nowrap', flexShrink: 0 }}>
            {isUpdating ? <Loader size={12} className="spin" /> : sc.btnLabel}
          </button>
        )}
      </div>

      {status === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
          paddingTop: 8, borderTop: '1px solid #1f2937' }}>
          <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>Winner:</span>
          {['Team A', 'Team B'].map(w => (
            <button key={w} onClick={() => !isClosed && onWinner(winner === w ? null : w)}
              disabled={isClosed}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none',
                background: winner === w ? (w === 'Team A' ? BLUE : '#b45309') : '#1f2937',
                color: winner === w ? '#fff' : '#94a3b8',
                cursor: isClosed ? 'default' : 'pointer',
              }}>
              {w}
            </button>
          ))}
          {winner && (
            <>
              <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4, flexShrink: 0 }}>Diff:</span>
              {isClosed ? (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{score_diff || '—'}</span>
              ) : (
                <input type="number" min="1" max="29"
                  value={score_diff || ''} onChange={e => onScore(e.target.value)}
                  placeholder="0" style={{ width: 52, background: '#0a0e1a', border: '1px solid #1f2937',
                    color: '#e2e8f0', padding: '4px 8px', borderRadius: 6, fontSize: 12,
                    outline: 'none', textAlign: 'center' }} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TeamChip({ nums, players, color, bg, winner, side }) {
  const isWinner = winner === `Team ${side}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4,
      background: isWinner ? bg : 'transparent',
      border: `1px solid ${isWinner ? color : 'transparent'}`,
      borderRadius: 6, padding: isWinner ? '2px 6px' : 0 }}>
      {isWinner && <Trophy size={10} style={{ color, flexShrink: 0 }} />}
      {nums.map((n, i) => (
        <span key={n} style={{ fontSize: 12, fontWeight: 600, color: isWinner ? color : '#94a3b8' }}>
          {getName(players, n)}{i < nums.length - 1 ? ' +' : ''}
        </span>
      ))}
    </div>
  );
}

// ─── STATS TAB ───────────────────────────────────────────────────────────────
function StatsTab({ stats, pairs }) {
  return (
    <div style={{ padding: '12px 16px' }}>
      <SectionHeader>Player Stats</SectionHeader>
      <div style={{ background: '#141926', border: '1px solid #1f2937', borderRadius: 12,
        overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 54px 50px',
          gap: 0, padding: '8px 12px',
          background: '#1e293b', fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
          <span>PLAYER</span><span style={{textAlign:'center'}}>GP</span>
          <span style={{textAlign:'center'}}>W</span><span style={{textAlign:'center'}}>WIN%</span>
          <span style={{textAlign:'center'}}>AVG±</span>
        </div>
        {stats.map((p, i) => (
          <div key={p.playerNumber} style={{
            display: 'grid', gridTemplateColumns: '1fr 44px 44px 54px 50px',
            gap: 0, padding: '10px 12px', fontSize: 13,
            borderTop: i > 0 ? '1px solid #1f2937' : 'none',
            background: i % 2 === 0 ? '#141926' : '#0f1621' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10,
                background: '#0a0e1a', border: '1px solid #1f2937',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>
                {p.playerNumber}
              </div>
              <span style={{ fontWeight: 600, color: '#e2e8f0', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            </div>
            <span style={{ textAlign: 'center', color: '#94a3b8' }}>{p.gamesPlayed}</span>
            <span style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{p.wins}</span>
            <span style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700 }}>
              {p.winPct !== null ? `${p.winPct}%` : '—'}
            </span>
            <span style={{ textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              {p.avgMargin || '—'}
            </span>
          </div>
        ))}
      </div>

      <SectionHeader>Pair Performance</SectionHeader>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
        Sorted by win rate. Accurate after 6+ games together.
      </div>
      <div style={{ background: '#141926', border: '1px solid #1f2937',
        borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 36px 54px',
          padding: '8px 12px', background: '#1e293b',
          fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
          <span>PAIR</span><span style={{textAlign:'center'}}>TOGTHR</span>
          <span style={{textAlign:'center'}}>W</span><span style={{textAlign:'center'}}>WIN%</span>
        </div>
        {pairs.map((pair, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 44px 36px 54px',
            padding: '9px 12px', fontSize: 12, borderTop: i > 0 ? '1px solid #1f2937' : 'none',
            background: i === 0 && pair.wins > 0 ? 'rgba(16,185,129,.06)' : i % 2 === 0 ? '#141926' : '#0f1621' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              {i === 0 && pair.wins > 0 && <Trophy size={11} style={{ color: '#10b981', flexShrink: 0 }} />}
              <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pair.nameA} + {pair.nameB}
              </span>
            </div>
            <span style={{ textAlign: 'center', color: '#94a3b8' }}>{pair.together}</span>
            <span style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{pair.wins}</span>
            <span style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700 }}>
              {pair.winPct !== null ? `${pair.winPct}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1.5, fontWeight: 600,
      marginBottom: 8, marginTop: 4 }}>{children.toUpperCase()}</div>
  );
}

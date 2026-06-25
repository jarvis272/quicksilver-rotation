export const SKILL_RANK = {
  beginner: 1, amateur: 2, intermediate: 3,
  intermediate_plus: 4, advanced: 5, pro: 6,
};

// Sorts selected players into slots 1–6 for the given mode.
// balanced: strongest = slot 1 (pairs strong with weak each game)
// competitive: weakest = slot 1 (clusters strong players together)
export function assignSlots(selectedPlayers, mode) {
  const ranked = [...selectedPlayers].sort((a, b) => {
    const rA = SKILL_RANK[a.skill?.toLowerCase()] ?? 3;
    const rB = SKILL_RANK[b.skill?.toLowerCase()] ?? 3;
    return mode === 'balanced' ? rB - rA : rA - rB;
  });
  return ranked.map((p, i) => ({ ...p, player_number: i + 1 }));
}

// 6-game fair rotation cycle
// Each cycle: every player plays 4, sits 2. No 3 in a row.
// Every player partners + faces every other player once per cycle.
export const CYCLE = [
  { teamA: [3,4], teamB: [5,6], sit: [1,2] },
  { teamA: [1,5], teamB: [2,6], sit: [3,4] },
  { teamA: [1,3], teamB: [2,4], sit: [5,6] },
  { teamA: [3,5], teamB: [4,6], sit: [1,2] },
  { teamA: [1,6], teamB: [2,5], sit: [3,4] },
  { teamA: [1,4], teamB: [2,3], sit: [5,6] },
];

// 2 cycles = 12 games total
export const SCHEDULE = [...Array(2)].flatMap((_, ci) =>
  CYCLE.map((g, gi) => ({ ...g, gameNum: ci * 6 + gi + 1, cycle: ci + 1 }))
);

export function getName(players, num) {
  return players.find(p => p.player_number === num)?.player_name || `P${num}`;
}

export function getResult(results, gameNum) {
  return results.find(r => r.game_number === gameNum) || { status: 'pending', winner: null, score_diff: null };
}

export function computeStats(players, results) {
  return players
    .sort((a, b) => a.player_number - b.player_number)
    .map(player => {
      const pNum = player.player_number;
      const myGames = SCHEDULE.filter(g => [...g.teamA, ...g.teamB].includes(pNum));
      const doneGames = myGames.filter(g => getResult(results, g.gameNum).status === 'done');
      const wins = doneGames.filter(g => {
        const r = getResult(results, g.gameNum);
        const onA = g.teamA.includes(pNum);
        return (onA && r.winner === 'Team A') || (!onA && r.winner === 'Team B');
      });
      const margins = wins
        .map(g => getResult(results, g.gameNum).score_diff)
        .filter(Boolean);
      return {
        playerNumber: pNum,
        name: player.player_name,
        gamesPlayed: doneGames.length,
        wins: wins.length,
        losses: doneGames.length - wins.length,
        winPct: doneGames.length > 0 ? Math.round(wins.length / doneGames.length * 100) : null,
        avgMargin: margins.length > 0
          ? (margins.reduce((a, b) => a + b, 0) / margins.length).toFixed(1)
          : null,
      };
    });
}

export function computePairs(players, results) {
  const pairs = [];
  const sorted = [...players].sort((a, b) => a.player_number - b.player_number);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const pA = sorted[i].player_number;
      const pB = sorted[j].player_number;
      const together = SCHEDULE.filter(g =>
        (g.teamA.includes(pA) && g.teamA.includes(pB)) ||
        (g.teamB.includes(pA) && g.teamB.includes(pB))
      );
      const done = together.filter(g => getResult(results, g.gameNum).status === 'done');
      const wins = done.filter(g => {
        const r = getResult(results, g.gameNum);
        const onA = g.teamA.includes(pA) && g.teamA.includes(pB);
        return (onA && r.winner === 'Team A') || (!onA && r.winner === 'Team B');
      });
      pairs.push({
        nameA: sorted[i].player_name,
        nameB: sorted[j].player_name,
        together: done.length,
        wins: wins.length,
        winPct: done.length > 0 ? Math.round(wins.length / done.length * 100) : null,
      });
    }
  }
  return pairs.sort((a, b) => {
    if (a.winPct === null && b.winPct === null) return 0;
    if (a.winPct === null) return 1;
    if (b.winPct === null) return -1;
    return b.winPct - a.winPct || b.wins - a.wins;
  });
}

export function sessionProgress(results) {
  const done = results.filter(r => r.status === 'done').length;
  return { done, total: 12, pct: Math.round(done / 12 * 100) };
}

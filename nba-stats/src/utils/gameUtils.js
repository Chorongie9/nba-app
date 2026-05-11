export const getTeamLogo = (teamId) => {
  if (!teamId) return null;
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
};

export const formatMin = (min) => {
  if (!min) return '—';
  const s = String(min);
  const iso = s.match(/PT(\d+)M([\d.]+)S/);
  if (iso) return `${iso[1]}:${String(Math.round(Number(iso[2]))).padStart(2, '0')}`;
  return s.includes('.') ? s.split('.')[0] : s;
};

export const fmtFrac = (made, att) => {
  if (made == null && att == null) return '—';
  return `${made ?? 0}-${att ?? 0}`;
};

export const fmtPlusMinus = (v) => {
  if (v == null) return '—';
  return v > 0 ? `+${v}` : String(v);
};

export const COLS = [
  { label: 'MIN', render: (p) => formatMin(p.MIN),            cls: () => 'text-zinc-400' },
  { label: 'FG',  render: (p) => fmtFrac(p.FGM, p.FGA),      cls: () => 'text-zinc-400' },
  { label: '3PT', render: (p) => fmtFrac(p.FG3M, p.FG3A),    cls: () => 'text-zinc-400' },
  { label: 'FT',  render: (p) => fmtFrac(p.FTM, p.FTA),      cls: () => 'text-zinc-400' },
  { label: 'REB', render: (p) => p.REB ?? '—',                cls: () => 'text-zinc-400' },
  { label: 'AST', render: (p) => p.AST ?? '—',                cls: () => 'text-zinc-400' },
  { label: 'STL', render: (p) => p.STL ?? '—',                cls: () => 'text-zinc-400' },
  { label: 'BLK', render: (p) => p.BLK ?? '—',                cls: () => 'text-zinc-400' },
  { label: 'TO',  render: (p) => p.TO  ?? '—',                cls: () => 'text-zinc-400' },
  { label: 'PF',  render: (p) => p.PF  ?? '—',                cls: () => 'text-zinc-400' },
  { label: 'PTS', render: (p) => p.PTS ?? '—',                cls: () => 'text-zinc-100 font-bold' },
  { label: '+/-', render: (p) => fmtPlusMinus(p.PLUS_MINUS),  cls: () => 'text-zinc-400' },
];

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// One entry per stat toggle button — key matches the data field, color is the line/button accent
const STATS = [
  { key: 'PTS',     label: 'PTS', color: '#f59e0b' },
  { key: 'REB',     label: 'REB', color: '#34d399' },
  { key: 'AST',     label: 'AST', color: '#60a5fa' },
  { key: 'FG_PCT',  label: 'FG%', color: '#a78bfa', isPercent: true },
  { key: 'FG3_PCT', label: '3P%', color: '#f87171', isPercent: true },
];

// nba_api returns season totals, not per-game. Convert here.
// For traded players it returns one row per team + a "TOT" row — keep only TOT.
const prepareData = (data) => {
  if (!data?.length) return [];
  const deduped = data.filter(row => {
    const hasTot = data.some(r => r.SEASON_ID === row.SEASON_ID && r.TEAM_ABBREVIATION === 'TOT');
    return !hasTot || row.TEAM_ABBREVIATION === 'TOT';
  });
  return deduped.map(row => ({
    season:  row.SEASON_ID?.slice(2) ?? '',           // "2021-22" → "21-22"
    PTS:     row.GP ? +(row.PTS / row.GP).toFixed(1) : null,
    REB:     row.GP ? +(row.REB / row.GP).toFixed(1) : null,
    AST:     row.GP ? +(row.AST / row.GP).toFixed(1) : null,
    FG_PCT:  row.FG_PCT  != null ? +(row.FG_PCT  * 100).toFixed(1) : null,
    FG3_PCT: row.FG3_PCT != null ? +(row.FG3_PCT * 100).toFixed(1) : null,
  }));
};

const CustomTooltip = ({ active, payload, label, statConfig }) => {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color: statConfig.color }}>
        {payload[0].value}{statConfig.isPercent ? '%' : ''} {statConfig.label}
      </p>
    </div>
  );
};

const Toggle = ({ showPlayoffs, setShowPlayoffs }) => (
  <div className="flex items-center gap-3 text-xs">
    <button
      onClick={() => setShowPlayoffs(false)}
      className={`pb-0.5 transition-colors ${!showPlayoffs ? 'text-zinc-100 border-b border-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      Regular
    </button>
    <span className="text-zinc-700">/</span>
    <button
      onClick={() => setShowPlayoffs(true)}
      className={`pb-0.5 transition-colors ${showPlayoffs ? 'text-amber-400 border-b border-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      Playoffs
    </button>
  </div>
);

const CareerChart = ({ regularData, playoffData }) => {
  const [activeStat, setActiveStat] = useState('PTS');
  const [showPlayoffs, setShowPlayoffs] = useState(false);

  const source     = showPlayoffs ? playoffData : regularData;
  const chartData  = prepareData(source);
  const statConfig = STATS.find(s => s.key === activeStat);
  const hasPlayoffs = playoffData?.length > 0;

  if (!regularData?.length) return null;

  if (!chartData.length) return (
    <p className="text-center text-zinc-600 text-sm">No playoff data available</p>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Career Progression
        </h2>
        {hasPlayoffs && <Toggle showPlayoffs={showPlayoffs} setShowPlayoffs={setShowPlayoffs} />}
      </div>

      {/* Stat selector */}
      <div className="flex gap-2 mb-6">
        {STATS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveStat(s.key)}
            className={`px-3 py-1 rounded text-[10px] uppercase tracking-widest font-semibold transition-colors ${
              activeStat === s.key ? 'text-zinc-900' : 'text-zinc-500 bg-zinc-800 hover:text-zinc-300'
            }`}
            style={activeStat === s.key ? { backgroundColor: s.color } : {}}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="season"
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            tickFormatter={v => statConfig.isPercent ? `${v}%` : v}
          />
          <Tooltip
            content={<CustomTooltip statConfig={statConfig} />}
            cursor={{ stroke: '#52525b', strokeWidth: 1 }}
          />
          <Line
            key={activeStat}
            dataKey={activeStat}
            stroke={statConfig.color}
            strokeWidth={2}
            dot={{ r: 3, fill: statConfig.color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: statConfig.color, stroke: '#18181b', strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CareerChart;

import React from "react";

function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400 mb-6">
        Career · Season · Playoffs
      </p>
      <h1 className="font-display font-extrabold leading-none tracking-tight text-zinc-50 uppercase"
          style={{ fontSize: "clamp(5rem, 15vw, 10rem)" }}>
        NBA<br />Stats
      </h1>
      <p className="text-zinc-500 mt-6 text-sm max-w-xs leading-relaxed">
        Search any player from the nav to explore career stats, recent games, and playoff history.
      </p>
      <div className="mt-16 flex items-stretch border border-zinc-800 rounded-xl overflow-hidden max-w-lg w-full">
        {[
          { label: "Career Averages", desc: "PPG · RPG · APG · FG%" },
          { label: "Season Stats",    desc: "Regular & playoffs" },
          { label: "Head-to-Head",    desc: "Scoreboard compare" },
        ].map(({ label, desc }, i, arr) => (
          <div
            key={label}
            className={`flex-1 px-5 py-5 text-center ${i < arr.length - 1 ? "border-r border-zinc-800" : ""}`}
          >
            <p className="text-xs font-medium text-zinc-200">{label}</p>
            <p className="text-[11px] text-zinc-600 mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;

export const PotDisplay = ({ stake }: { stake: number }) => (
  <div className="relative flex flex-col items-center rounded-3xl border border-pp-primary/40 bg-gradient-to-br from-black/40 via-pp-surface/60 to-pp-surface/80 px-4 py-4 text-center shadow-[0_15px_45px_rgba(53,208,127,0.25)]">
    <div className="absolute -top-3 inline-flex h-8 w-32 items-center justify-center rounded-full bg-gradient-to-r from-pp-primary/80 to-pp-secondary/80 text-[10px] font-bold uppercase tracking-[0.4em] text-white shadow-[0_10px_30px_rgba(53,208,127,0.5)]">
      Pot
    </div>
    <p className="mt-2 text-3xl font-black text-white">R{(stake * 2).toFixed(2)}</p>
    <p className="mt-1 text-xs uppercase tracking-[0.4em] text-gray-300">Stake locked</p>
    <div className="mt-3 h-1 w-full rounded-full bg-white/10">
      <div className="h-full rounded-full bg-gradient-to-r from-pp-primary to-pp-secondary animate-pulse-glow" />
    </div>
  </div>
)

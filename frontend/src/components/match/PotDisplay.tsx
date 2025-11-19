export const PotDisplay = ({ stake }: { stake: number }) => (
  <div className="flex flex-col items-center rounded-2xl border border-pp-primary/40 bg-white/5 px-4 py-3 text-center">
    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Pot</p>
    <p className="text-2xl font-bold text-white">R{(stake * 2).toFixed(2)}</p>
    <p className="text-xs text-pp-primary">Stake locked</p>
  </div>
)

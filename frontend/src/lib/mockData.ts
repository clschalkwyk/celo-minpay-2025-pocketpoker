import type {
  Card,
  DeckTheme,
  LeaderboardEntry,
  MatchState,
  Mission,
  PlayerSeat,
  StakeTier,
  UserProfile,
} from '../types'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const stakeTiers: StakeTier[] = [
  { id: 'stake-05', label: 'R0.50', amount: 0.5 },
  { id: 'stake-1', label: 'R1', amount: 1 },
  { id: 'stake-5', label: 'R5', amount: 5 },
  { id: 'stake-10', label: 'R10', amount: 10 },
]

const baseProfile: UserProfile = {
  id: 'player-001',
  username: 'NeoStacker',
  avatarUrl: 'https://avatar.vercel.sh/neo.svg?size=120',
  rankTitle: 'Street Ace',
  level: 12,
  xp: 1420,
  xpToNextLevel: 1600,
  elo: 1532,
  stats: {
    matches: 188,
    wins: 103,
    losses: 85,
    streak: 3,
  },
  activeDeckId: 'deck-midnight',
  unlockedDeckIds: ['deck-midnight', 'deck-ndebele', 'deck-cyber', 'deck-sunrise', 'deck-creator'],
}

const deckThemes: DeckTheme[] = [
  {
    id: 'deck-midnight',
    name: 'Midnight Noir',
    rarity: 'rare',
    description: 'Black on black with gold glyphs for the grinders.',
    previewImage: '/deck_1.jpg',
    unlockCondition: 'Reach Level 5',
  },
  {
    id: 'deck-ndebele',
    name: 'Ndebele Geometry',
    rarity: 'legendary',
    description: 'Warm geometric lines inspired by South African art.',
    previewImage: '/deck_3.jpg',
    unlockCondition: 'Complete 10 missions',
  },
  {
    id: 'deck-cyber',
    name: 'Celo Cybermint',
    rarity: 'ranked',
    description: 'Mint gradient meets neon grids.',
    previewImage: '/deck_4.jpg',
    unlockCondition: 'Win 5 ranked matches',
  },
  {
    id: 'deck-sunrise',
    name: 'Savanna Sunrise',
    rarity: 'common',
    description: 'Soft oranges and dusty hues for calm grinders.',
    previewImage: '/deck_2.jpg',
    unlockCondition: 'Starter deck',
  },
  {
    id: 'deck-creator',
    name: 'Creator Skin',
    rarity: 'legendary',
    description: 'Custom art dropped by PC creator.',
    previewImage: '/deck_5.jpg',
    unlockCondition: 'Special drop',
  },
]

const missions: Mission[] = [
  {
    id: 'mission-1',
    title: 'Warm-up Laps',
    description: 'Play 3 matches today.',
    type: 'daily',
    progress: 2,
    target: 3,
    rewardXp: 150,
    state: 'active',
    objective: 'matches_played',
  },
  {
    id: 'mission-2',
    title: 'Make it Stick',
    description: 'Win a match with a rare deck equipped.',
    type: 'daily',
    progress: 1,
    target: 1,
    rewardXp: 200,
    rewardDescription: 'Unlocks Bonus Pot FX',
    state: 'completed',
    objective: 'matches_played',
  },
  {
    id: 'mission-3',
    title: 'Rank Push',
    description: 'Earn 400 XP this week.',
    type: 'seasonal',
    progress: 220,
    target: 400,
    rewardXp: 400,
    state: 'active',
    objective: 'xp_earned',
  },
]

const leaderboard: LeaderboardEntry[] = [
  { id: 'p1', rank: 1, username: 'MintMonarch', avatarUrl: 'https://avatar.vercel.sh/mint', elo: 1820, wins: 402 },
  { id: 'p2', rank: 2, username: 'EdgeOfRiver', avatarUrl: 'https://avatar.vercel.sh/edge', elo: 1788, wins: 376 },
  { id: 'p3', rank: 3, username: 'DeckTactician', avatarUrl: 'https://avatar.vercel.sh/tact', elo: 1742, wins: 341 },
  { id: 'p4', rank: 4, username: 'BluffMuse', avatarUrl: 'https://avatar.vercel.sh/muse', elo: 1704, wins: 310 },
  { id: 'p5', rank: 5, username: 'RidgeRunner', avatarUrl: 'https://avatar.vercel.sh/ridge', elo: 1680, wins: 299 },
  { id: 'p6', rank: 6, username: 'CeloTide', avatarUrl: 'https://avatar.vercel.sh/celo', elo: 1654, wins: 280 },
]

const opponentPool = [
  { id: 'opp-1', username: 'ShadowToast', avatarUrl: 'https://avatar.vercel.sh/shadow' },
  { id: 'opp-2', username: 'ChipChaser', avatarUrl: 'https://avatar.vercel.sh/chip' },
  { id: 'opp-3', username: 'SavannaKid', avatarUrl: 'https://avatar.vercel.sh/savanna' },
  { id: 'opp-4', username: 'StackedNinja', avatarUrl: 'https://avatar.vercel.sh/ninja' },
]

const suits = ['♠', '♥', '♦', '♣']
const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']

const dealCards = (): Card[] => {
  const cards: Card[] = []
  const used = new Set<string>()
  while (cards.length < 3) {
    const rank = ranks[Math.floor(Math.random() * ranks.length)]
    const suit = suits[Math.floor(Math.random() * suits.length)]
    const code = `${rank}${suit}`
    if (!used.has(code)) {
      used.add(code)
      cards.push({ rank, suit, code })
    }
  }
  return cards
}

const randomId = () => Math.random().toString(36).slice(2, 9)

const cloneProfile = () => deepClone(baseProfile)

const createSeat = (opts: Partial<PlayerSeat>): PlayerSeat => ({
  id: opts.id ?? randomId(),
  username: opts.username ?? 'Anonymous',
  avatarUrl: opts.avatarUrl ?? 'https://avatar.vercel.sh/guest',
  deckId: opts.deckId ?? deckThemes[0]!.id,
  cards: opts.cards ?? dealCards(),
  ready: opts.ready ?? false,
  isYou: opts.isYou ?? false,
})

const createMatch = (stake: number): MatchState => {
  const opponent = opponentPool[Math.floor(Math.random() * opponentPool.length)]
  return {
    id: `match-${randomId()}`,
    stake,
    pot: stake * 2,
    phase: 'active',
    you: createSeat({
      id: baseProfile.id,
      username: baseProfile.username,
      avatarUrl: baseProfile.avatarUrl,
      deckId: baseProfile.activeDeckId,
      cards: dealCards(),
      ready: true,
      isYou: true,
    }),
    opponent: createSeat({
      ...opponent,
      deckId: 'deck-creator',
      cards: dealCards(),
      ready: false,
      isYou: false,
    }),
  }
}

const randomResultText = (winner: 'you' | 'opponent') =>
  winner === 'you' ? 'You cleaned them out.' : 'Tough beat. Shuffle again?'

export const MockApi = {
  async fetchProfile(): Promise<UserProfile> {
    await wait(450)
    return cloneProfile()
  },
  async fetchDecks(): Promise<DeckTheme[]> {
    await wait(250)
    return deepClone(deckThemes)
  },
  async fetchMissions(): Promise<Mission[]> {
    await wait(300)
    return deepClone(missions)
  },
  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    await wait(500)
    return deepClone(leaderboard)
  },
  async fetchBalance(): Promise<number> {
    await wait(350)
    return Number((20 + Math.random() * 15).toFixed(2))
  },
  async queueMatch(stake: number): Promise<MatchState> {
    await wait(1200 + Math.random() * 600)
    return createMatch(stake)
  },
  async resolveMatch(matchId: string): Promise<MatchState['result']> {
    void matchId
    await wait(1500)
    const winner = Math.random() > 0.45 ? 'you' : 'opponent'
    return { winner, summary: randomResultText(winner) }
  },
  async sendStakeTransaction(stake: number): Promise<{ txHash: string }> {
    void stake
    await wait(800)
    return { txHash: `0x${randomId()}${randomId()}` }
  },
}

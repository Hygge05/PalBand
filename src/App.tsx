import { useCallback, useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Data model                                                         */
/* ------------------------------------------------------------------ */

type Performance = 'flame' | 'normal' | 'snowflake'

type Tier = {
  name: string
  level: number
  color: string
  ring: string
  min: number
  emoji: string
}

const TIERS: Tier[] = [
  { name: 'Observer', level: 1, color: '#afafaf', ring: '#e5e5e5', min: 0, emoji: '👁' },
  { name: 'Explorer', level: 2, color: '#1cb0f6', ring: '#cdeeff', min: 500, emoji: '⛏' },
  { name: 'Connector', level: 3, color: '#58cc02', ring: '#d7f5c2', min: 1200, emoji: '🗣' },
  { name: 'Socialite', level: 4, color: '#ff9600', ring: '#ffe4c2', min: 2200, emoji: '🤝' },
  { name: 'Magnet', level: 5, color: '#ce82ff', ring: '#eed6ff', min: 3500, emoji: '🛰' },
]

function tierForScore(score: number): Tier {
  let current = TIERS[0]
  for (const t of TIERS) if (score >= t.min) current = t
  return current
}

type Player = {
  id: string
  name: string
  avatar: string
  bg: string
  online: boolean
  country: string
  performance: Performance
  score: number
  anonymous?: boolean
}

const PERF: Record<Performance, { emoji: string; label: string; note: string; color: string }> = {
  flame: {
    emoji: '🔥',
    label: 'On fire',
    note: 'High social frequency & long conversations lately',
    color: '#ff9600',
  },
  normal: {
    emoji: '☀️',
    label: 'Warming up',
    note: 'Moderate social frequency recently',
    color: '#ffc800',
  },
  snowflake: {
    emoji: '❄️',
    label: 'Cooling off',
    note: 'Low social activity recently',
    color: '#1cb0f6',
  },
}

const PLAYERS: Player[] = [
  { id: 'u1', name: 'Mayer R.', avatar: '🦊', bg: '#ffe4c2', online: true, country: '🇺🇸', performance: 'flame', score: 4120 },
  { id: 'u2', name: 'Kaito T.', avatar: '🐧', bg: '#cdeeff', online: true, country: '🇯🇵', performance: 'flame', score: 3980 },
  { id: 'u3', name: 'Keyan M.', avatar: '🐼', bg: '#eed6ff', online: false, country: '🇨🇳', performance: 'normal', score: 3610 },
  { id: 'you', name: 'You', avatar: '🐨', bg: '#d7f5c2', online: true, country: '🇦🇺', performance: 'flame', score: 2740 },
  { id: 'u5', name: 'Anonymous', avatar: '🐦', bg: '#e5e5e5', online: false, country: '🏳️', performance: 'normal', score: 2510, anonymous: true },
  { id: 'u6', name: 'Diego M.', avatar: '🐸', bg: '#d7f5c2', online: true, country: '🇪🇸', performance: 'snowflake', score: 1980 },
  { id: 'u7', name: 'Lena K.', avatar: '🐝', bg: '#fff0b8', online: false, country: '🇩🇪', performance: 'normal', score: 1740 },
  { id: 'u8', name: 'Omar A.', avatar: '🦁', bg: '#ffe4c2', online: true, country: '🇪🇬', performance: 'snowflake', score: 1320 },
  { id: 'u9', name: 'Sofia B.', avatar: '🦋', bg: '#eed6ff', online: false, country: '🇧🇷', performance: 'normal', score: 980 },
  { id: 'u10', name: 'Noah W.', avatar: '🐢', bg: '#cdeeff', online: true, country: '🇨🇦', performance: 'snowflake', score: 640 },
]

const ranked = [...PLAYERS].sort((a, b) => b.score - a.score)

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function Avatar({ p, size = 48 }: { p: Player; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{ background: p.bg, fontSize: size * 0.52 }}
      >
        {p.anonymous ? '🕶️' : p.avatar}
      </div>
      <span
        className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-snow"
        style={{
          width: size * 0.28,
          height: size * 0.28,
          background: p.online ? '#58cc02' : '#afafaf',
        }}
      />
    </div>
  )
}

function TierChip({ tier, compact = false }: { tier: Tier; compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-extrabold"
      style={{
        background: tier.ring,
        color: tier.color,
        padding: compact ? '3px 10px' : '5px 14px',
        fontSize: compact ? 12 : 14,
      }}
    >
      <span
        className="grid h-4 w-4 place-items-center rounded-full text-[9px] text-snow"
        style={{ background: tier.color }}
      >
        {tier.emoji}
      </span>
      {tier.name}
    </span>
  )
}

/* Chunky Duolingo-style button */
function ChunkyButton({
  children,
  color = '#58cc02',
  shadow = '#4caf00',
  text = '#ffffff',
  onClick,
  className = '',
}: {
  children: React.ReactNode
  color?: string
  shadow?: string
  text?: string
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl px-5 py-3 text-[15px] font-extrabold uppercase tracking-wide transition-all active:translate-y-[3px] active:[box-shadow:none] ${className}`}
      style={{ background: color, color: text, boxShadow: `0 4px 0 ${shadow}` }}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Leaderboard screen                                                 */
/* ------------------------------------------------------------------ */

type Scope = 'friends' | 'country' | 'global'

function Leaderboard() {
  const [scope, setScope] = useState<Scope>('global')
  const you = ranked.find((p) => p.id === 'you')!
  const yourRank = ranked.indexOf(you) + 1
  const tier = tierForScore(you.score)

  const scopes: { key: Scope; label: string }[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'country', label: 'Region' },
    { key: 'global', label: 'Global' },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Tier banner */}
      <div
        className="relative overflow-hidden rounded-3xl px-5 py-5 text-snow"
        style={{ background: `linear-gradient(135deg, ${tier.color}, ${tier.color}dd)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-90">Your league</p>
            <p className="mt-0.5 text-2xl font-black">{tier.name} League</p>
            <p className="mt-1 text-sm font-bold opacity-90">
              Top {Math.round((yourRank / ranked.length) * 100)}% · Rank #{yourRank}
            </p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-4xl backdrop-blur">
            {tier.emoji}
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold opacity-90">
          Advance to {TIERS[Math.min(tier.level, TIERS.length - 1)].name} — {' '}
          {Math.max(0, TIERS[Math.min(tier.level, TIERS.length - 1)].min - you.score)} pts to go
        </p>
      </div>

      {/* Scope tabs */}
      <div className="flex rounded-2xl bg-swan/60 p-1">
        {scopes.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className="flex-1 rounded-xl py-2 text-sm font-extrabold transition-colors"
            style={{
              background: scope === s.key ? '#ffffff' : 'transparent',
              color: scope === s.key ? '#4b4b4b' : '#afafaf',
              boxShadow: scope === s.key ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {ranked.map((p, i) => {
          const rank = i + 1
          const isYou = p.id === 'you'
          const perf = PERF[p.performance]
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
              style={{
                background: isYou ? '#ddf4ff' : '#ffffff',
                boxShadow: isYou ? 'inset 0 0 0 2px #1cb0f6' : '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div className="grid w-7 shrink-0 place-items-center text-lg font-black" style={{ color: rank <= 3 ? '#ff9600' : '#afafaf' }}>
                {medal ?? rank}
              </div>
              <Avatar p={p} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-extrabold text-eel">{isYou ? 'You' : p.name}</span>
                  <span className="text-sm">{p.country}</span>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold"
                  style={{ color: perf.color }}
                >
                  {perf.emoji} {perf.label}
                </span>
              </div>
              <div className="text-right">
                <p className="font-black text-eel">{p.score.toLocaleString()}</p>
                <p className="-mt-0.5 text-[11px] font-bold text-hare">pts</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Daily result screen (two pages)                                    */
/* ------------------------------------------------------------------ */

const DAILY = {
  score: 320,
  socialMinutes: 74,
  maxDurationMin: 38,
  prevRank: 6,
  newRank: 4,
}

function encouragement(score: number) {
  if (score >= 300) return { text: "Incredible! You're on fire today 🔥", color: '#ff9600' }
  if (score >= 150) return { text: 'Great work — that took real courage 💪', color: '#58cc02' }
  if (score > 0) return { text: 'Nice start! Every hello counts 👋', color: '#1cb0f6' }
  return { text: 'A quiet day. Tomorrow is a fresh start ❄️', color: '#afafaf' }
}

function StatCard({
  emoji,
  label,
  value,
  unit,
  color,
}: {
  emoji: string
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div className="rounded-2xl bg-snow p-4 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full text-2xl" style={{ background: `${color}22` }}>
        {emoji}
      </div>
      <p className="text-2xl font-black text-eel">
        {value}
        <span className="ml-0.5 text-sm font-extrabold text-hare">{unit}</span>
      </p>
      <p className="mt-0.5 text-xs font-bold text-wolf">{label}</p>
    </div>
  )
}

function DailyResult() {
  const [page, setPage] = useState(0)
  const enc = encouragement(DAILY.score)
  const you = ranked.find((p) => p.id === 'you')!
  const tier = tierForScore(you.score)
  const rankDelta = DAILY.prevRank - DAILY.newRank

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {page === 0 ? (
        <>
          <div className="rounded-3xl bg-snow p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-hare">Today&apos;s result</p>
            <div className="my-3 text-7xl">🔥</div>
            <p className="text-6xl font-black" style={{ color: '#58cc02' }}>
              +{DAILY.score}
            </p>
            <p className="mt-1 text-sm font-bold text-wolf">social points earned</p>
            <div
              className="mt-4 rounded-2xl px-4 py-3 text-[15px] font-extrabold"
              style={{ background: `${enc.color}1a`, color: enc.color }}
            >
              {enc.text}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard emoji="⏱️" label="Total social time" value={`${DAILY.socialMinutes}`} unit="min" color="#1cb0f6" />
            <StatCard emoji="🗣️" label="Longest chat" value={`${DAILY.maxDurationMin}`} unit="min" color="#ce82ff" />
          </div>

          <ChunkyButton color="#58cc02" shadow="#4caf00" onClick={() => setPage(1)}>
            See your standings →
          </ChunkyButton>
        </>
      ) : (
        <>
          {/* Ranking update */}
          <div className="rounded-3xl bg-snow p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-hare">Ranking update</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-4xl font-black text-hare line-through">#{DAILY.prevRank}</span>
              <span className="text-3xl font-black text-feather">&gt;&gt;</span>
              <span className="text-5xl font-black" style={{ color: '#58cc02' }}>
                #{DAILY.newRank}
              </span>
            </div>
            {rankDelta > 0 && (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-feather/15 px-3 py-1 text-sm font-black text-feather">
                ▲ Up {rankDelta} {rankDelta === 1 ? 'place' : 'places'}!
              </p>
            )}
          </div>

          {/* Tier */}
          <div className="flex items-center justify-between rounded-2xl bg-snow p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-hare">Current tier</p>
              <p className="mt-1 text-lg font-black text-eel">{tier.name} League</p>
            </div>
            <TierChip tier={tier} />
          </div>

          {/* Daily summary */}
          <div className="rounded-2xl p-5 text-snow" style={{ background: 'linear-gradient(135deg,#1cb0f6,#1899d6)' }}>
            <p className="text-xs font-black uppercase tracking-widest opacity-90">Daily summary</p>
            <p className="mt-2 text-[15px] font-bold leading-relaxed">
              You reached out to <b>5 people</b> today and kept one conversation going for{' '}
              <b>{DAILY.maxDurationMin} minutes</b> — your longest all week. That courage climbed you{' '}
              <b>{rankDelta} spots</b> up the ladder. Keep the flame alive tomorrow! 🔥
            </p>
          </div>

          <ChunkyButton color="#1cb0f6" shadow="#1899d6" onClick={() => setPage(0)}>
            ← Back to summary
          </ChunkyButton>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Profile screen                                                     */
/* ------------------------------------------------------------------ */

function Profile() {
  const [anonymous, setAnonymous] = useState(false)
  const [showStatus, setShowStatus] = useState(true)
  const you = ranked.find((p) => p.id === 'you')!
  const tier = tierForScore(you.score)
  const perf = PERF[you.performance]

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <div className="flex flex-col items-center rounded-3xl bg-snow p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Avatar p={{ ...you, anonymous }} size={88} />
        <p className="mt-3 text-xl font-black text-eel">{anonymous ? 'Anonymous Koala' : 'You'}</p>
        <p className="text-sm font-bold text-hare">@social_you · {you.country}</p>
        <div className="mt-3">
          <TierChip tier={tier} />
        </div>
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold"
          style={{ background: `${perf.color}22`, color: perf.color }}
        >
          {perf.emoji} {perf.label} — {perf.note}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard emoji="⭐" label="Total score" value={you.score.toLocaleString()} unit="" color="#ffc800" />
        <StatCard emoji="🔥" label="Day streak" value="12" unit="" color="#ff9600" />
        <StatCard emoji="🤝" label="Connections" value="47" unit="" color="#58cc02" />
      </div>

      {/* Tier ladder */}
      <div className="rounded-2xl bg-snow p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-hare">League ladder</p>
        <div className="flex flex-col gap-2">
          {TIERS.map((t) => {
            const active = t.level === tier.level
            return (
              <div
                key={t.level}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: active ? t.ring : 'transparent' }}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full text-sm" style={{ background: t.color }}>
                  {t.emoji}
                </span>
                <span className="flex-1 font-extrabold" style={{ color: active ? t.color : '#afafaf' }}>
                  {t.name}
                </span>
                <span className="text-xs font-bold text-hare">{t.min.toLocaleString()}+ pts</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Privacy toggles */}
      <div className="rounded-2xl bg-snow p-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ToggleRow label="Appear anonymous" desc="Hide your name & avatar on boards" value={anonymous} onChange={setAnonymous} />
        <div className="mx-3 h-px bg-swan" />
        <ToggleRow label="Show status & region" desc="Display online status and country" value={showStatus} onChange={setShowStatus} />
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="flex-1">
        <p className="font-extrabold text-eel">{label}</p>
        <p className="text-xs font-semibold text-hare">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative h-7 w-12 rounded-full transition-colors"
        style={{ background: value ? '#58cc02' : '#e5e5e5' }}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all"
          style={{ left: value ? 22 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
        />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Battle / matchmaking model                                         */
/* ------------------------------------------------------------------ */

const CHALLENGES = [
  { icon: '👋', task: 'Say hello to a stranger nearby' },
  { icon: '💬', task: 'Keep a conversation alive for 5 minutes' },
  { icon: '🌟', task: 'Give someone a genuine compliment' },
  { icon: '❓', task: 'Ask an open-ended question & really listen' },
  { icon: '🙋', task: 'Introduce yourself to someone new' },
]

/** Opponents drawn from the same or a neighbouring tier as you. */
function opponentPool(): Player[] {
  const you = ranked.find((p) => p.id === 'you')!
  const yourTier = tierForScore(you.score).level
  return PLAYERS.filter(
    (p) => p.id !== 'you' && Math.abs(tierForScore(p.score).level - yourTier) <= 1,
  )
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

type BattleOutcome = {
  win: boolean
  points: number
  opponent: Player
  challenge: (typeof CHALLENGES)[number]
  streak: number
  tierBefore: Tier
  tierAfter: Tier
}

function simulateOutcome(opponent: Player, challenge: (typeof CHALLENGES)[number]): BattleOutcome {
  const you = ranked.find((p) => p.id === 'you')!
  const win = Math.random() > 0.42
  const points = win ? 30 : -18
  const tierBefore = tierForScore(you.score)
  const tierAfter = tierForScore(you.score + points)
  return {
    win,
    points,
    opponent,
    challenge,
    streak: win ? 4 : 0,
    tierBefore,
    tierAfter,
  }
}

/* ------------------------------------------------------------------ */
/*  Phone: Battle / matchmaking screen                                 */
/* ------------------------------------------------------------------ */

type BattlePhase = 'home' | 'searching' | 'matched' | 'result'

function Battle({ registerBack }: { registerBack: (fn: (() => void) | null) => void }) {
  const [enabled, setEnabled] = useState(true)
  const [phase, setPhase] = useState<BattlePhase>('home')
  const [matching, setMatching] = useState(128)
  const [searchLabel, setSearchLabel] = useState('')
  const [match, setMatch] = useState<{ opponent: Player; challenge: (typeof CHALLENGES)[number] } | null>(null)
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null)

  const friends = PLAYERS.filter((p) => p.online && p.id !== 'you' && !p.anonymous)

  /* Expose a back action to the app header on every sub-page */
  useEffect(() => {
    registerBack(phase === 'home' ? null : () => setPhase('home'))
    return () => registerBack(null)
  }, [phase, registerBack])

  /* Live "users currently matching" ticker */
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      setMatching((m) => Math.max(40, Math.min(240, m + Math.floor(Math.random() * 15) - 7)))
    }, 1400)
    return () => clearInterval(id)
  }, [enabled])

  function startSearch(label: string, opponent?: Player) {
    setSearchLabel(label)
    setPhase('searching')
    const opp = opponent ?? randomFrom(opponentPool())
    const challenge = randomFrom(CHALLENGES)
    window.setTimeout(() => {
      setMatch({ opponent: opp, challenge })
      setPhase('matched')
    }, 2400)
  }

  function reportResult() {
    if (!match) return
    setOutcome(simulateOutcome(match.opponent, match.challenge))
    setPhase('result')
  }

  /* -------- Matched: task announcement -------- */
  if (phase === 'matched' && match) {
    const { opponent, challenge } = match
    return (
      <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
        <div className="rounded-3xl bg-snow p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-black uppercase tracking-widest text-feather">Opponent found!</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <div className="grid h-16 w-16 place-items-center rounded-full text-3xl" style={{ background: '#d7f5c2' }}>🐨</div>
              <p className="mt-1 text-xs font-extrabold text-eel">You</p>
            </div>
            <span className="text-2xl font-black text-fox">VS</span>
            <div className="flex flex-col items-center">
              {/* Only the other party's avatar & ID are shown */}
              <div className="grid h-16 w-16 place-items-center rounded-full text-3xl" style={{ background: opponent.bg }}>{opponent.avatar}</div>
              <p className="mt-1 text-xs font-extrabold text-eel">{opponent.name}</p>
            </div>
          </div>
        </div>

        {/* Challenge task announced */}
        <div className="rounded-3xl p-6 text-center text-snow" style={{ background: 'linear-gradient(135deg,#ce82ff,#a568cc)' }}>
          <p className="text-xs font-black uppercase tracking-widest opacity-90">Your challenge task</p>
          <div className="my-3 text-5xl">{challenge.icon}</div>
          <p className="text-lg font-black leading-snug">{challenge.task}</p>
          <p className="mt-2 text-xs font-bold opacity-90">
            Both of you got the same task — the first to complete the task wins the match.
          </p>
        </div>

        <ChunkyButton color="#58cc02" shadow="#4caf00" onClick={reportResult}>
          I did it — post my result
        </ChunkyButton>
        <button onClick={() => setPhase('home')} className="text-sm font-extrabold text-hare">
          Forfeit
        </button>
      </div>
    )
  }

  /* -------- Result page -------- */
  if (phase === 'result' && outcome) {
    const { win, points, opponent, streak, tierBefore, tierAfter } = outcome
    const promoted = tierAfter.level > tierBefore.level
    const demoted = tierAfter.level < tierBefore.level
    const accent = win ? '#58cc02' : '#ff4b4b'
    const stars = win ? 3 : 1
    return (
      <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
        {/* Big result banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-7 text-center text-snow"
          style={{ background: `linear-gradient(160deg, ${accent}, ${accent}cc)` }}
        >
          <p className="text-xs font-black uppercase tracking-widest opacity-90">Match result</p>
          <div className="my-2 text-6xl">{win ? '🏆' : '💔'}</div>
          <p className="text-4xl font-black">{win ? 'Victory!' : 'Defeat'}</p>
          <p className="mx-auto mt-2 max-w-[260px] text-sm font-bold leading-snug opacity-95">
            {win
              ? 'Match won! You did an amazing job this time, you will do even better next time!!'
              : `${opponent.name} got this one! Shake it off — the next hello is a fresh chance.`}
          </p>
        </div>

        {/* Points + star rating */}
        <div className="flex items-center justify-between rounded-2xl bg-snow p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-hare">Social points</p>
            <p className="text-3xl font-black" style={{ color: accent }}>
              {points > 0 ? `+${points}` : points}
            </p>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="text-2xl leading-none transition-colors"
                style={{ color: i < stars ? accent : '#e5e5e5' }}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Tier change + streak */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-snow p-4 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-hare">Tier</p>
            {promoted || demoted ? (
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className="text-sm font-black" style={{ color: tierBefore.color }}>{tierBefore.name}</span>
                <span>{promoted ? '⬆️' : '⬇️'}</span>
                <span className="text-sm font-black" style={{ color: tierAfter.color }}>{tierAfter.name}</span>
              </div>
            ) : (
              <>
                <p className="mt-2 text-lg font-black" style={{ color: tierAfter.color }}>{tierAfter.name}</p>
                <p className="text-[11px] font-bold text-hare">No change</p>
              </>
            )}
          </div>
          <div className="rounded-2xl bg-snow p-4 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-hare">Win streak</p>
            <p className="mt-2 text-lg font-black text-fox">🔥 {streak}</p>
            <p className="text-[11px] font-bold text-hare">{win ? 'days in a row' : 'streak reset'}</p>
          </div>
        </div>

        <ChunkyButton color="#58cc02" shadow="#4caf00" onClick={() => setPhase('home')}>
          Match again →
        </ChunkyButton>
      </div>
    )
  }

  /* -------- Searching overlay -------- */
  if (phase === 'searching') {
    return (
      <div className="flex flex-col items-center gap-6 px-6 pb-28 pt-16 text-center">
        <div className="relative grid h-40 w-40 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-macaw/20" />
          <span className="absolute inset-4 animate-ping rounded-full bg-macaw/25" style={{ animationDelay: '0.3s' }} />
          <div className="grid h-24 w-24 place-items-center rounded-full bg-macaw text-5xl text-snow shadow-lg">⚔️</div>
        </div>
        <div>
          <p className="text-xl font-black text-eel">Finding an opponent…</p>
          <p className="mt-1 text-sm font-bold text-wolf">{searchLabel}</p>
        </div>
        <button
          onClick={() => setPhase('home')}
          className="rounded-2xl px-5 py-2.5 text-sm font-extrabold text-hare"
          style={{ background: '#f0f0f0' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  /* -------- Home / initiate challenge -------- */
  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Master switch */}
      <div
        className="rounded-3xl p-5 text-snow"
        style={{ background: enabled ? 'linear-gradient(135deg,#ff9600,#ff7a00)' : 'linear-gradient(135deg,#afafaf,#9a9a9a)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{enabled ? '⚔️' : '🚫'}</span>
          <div className="flex-1">
            <p className="text-lg font-black">Matchmaking {enabled ? 'On' : 'Off'}</p>
            <p className="text-xs font-bold opacity-90">
              {enabled
                ? 'You can send & receive match invites'
                : 'Turn on to send & receive match invites'}
            </p>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className="relative h-8 w-14 shrink-0 rounded-full transition-colors"
            style={{ background: enabled ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.15)' }}
          >
            <span
              className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all"
              style={{ left: enabled ? 30 : 4, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
            />
          </button>
        </div>
      </div>

      {!enabled ? (
        <div className="rounded-3xl bg-snow p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="text-5xl">😴</div>
          <p className="mt-3 font-extrabold text-eel">Matchmaking is off</p>
          <p className="mt-1 text-sm font-semibold text-hare">
            Enable to start Matching with other players!
          </p>
        </div>
      ) : (
        <>
          {/* Random match */}
          <div className="rounded-3xl bg-snow p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎲</span>
              <p className="text-lg font-black text-eel">Quick match</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-wolf">
              Get paired with an online player in the same or a similar tier.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-feather/10 px-3 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-feather opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-feather" />
              </span>
              <span className="text-sm font-extrabold text-feather">{matching} players</span>
              <span className="text-sm font-bold text-wolf">currently matching</span>
            </div>
            <div className="mt-3">
              <ChunkyButton color="#58cc02" shadow="#4caf00" onClick={() => startSearch('Matching by tier…')}>
                Find opponent
              </ChunkyButton>
            </div>
          </div>

          {/* Random friend duel */}
          <div className="rounded-3xl bg-snow p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <p className="text-lg font-black text-eel">Surprise a friend</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-wolf">
              Challenge a random online friend!
            </p>
            <div className="mt-3">
              <ChunkyButton
                color="#ce82ff"
                shadow="#a568cc"
                onClick={() => startSearch('Inviting a random friend…', randomFrom(friends))}
              >
                Random friend challenge
              </ChunkyButton>
            </div>
          </div>

          {/* Challenge a specific friend */}
          <div className="rounded-3xl bg-snow p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              <p className="text-lg font-black text-eel">Challenge a friend</p>
            </div>
            <p className="mt-1 mb-3 text-sm font-semibold text-wolf">
              Pick an online friend to challenge right now.
            </p>
            <div className="flex flex-col gap-2">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-polar px-3 py-2">
                  <Avatar p={f} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-eel">{f.name} {f.country}</p>
                    <p className="text-[11px] font-bold text-feather">● Online</p>
                  </div>
                  <button
                    onClick={() => startSearch(`Inviting ${f.name}…`, f)}
                    className="rounded-xl bg-macaw px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-snow transition-all active:translate-y-[2px]"
                    style={{ boxShadow: '0 3px 0 #1899d6' }}
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Watch: circular smartwatch battle flow                             */
/* ------------------------------------------------------------------ */

type WatchPhase = 'idle' | 'incoming' | 'waiting' | 'battle' | 'result'

function WatchDevice() {
  const [phase, setPhase] = useState<WatchPhase>('idle')
  const [countdown, setCountdown] = useState(10)
  const [battleLeft, setBattleLeft] = useState(30)
  const [opponent, setOpponent] = useState<Player>(() => randomFrom(opponentPool()))
  const [challenge, setChallenge] = useState(() => randomFrom(CHALLENGES))
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null)
  const timer = useRef<number | null>(null)

  function clearTimer() {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }

  /* Incoming invite → 10s auto-decline */
  useEffect(() => {
    if (phase !== 'incoming') return
    setCountdown(10)
    timer.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearTimer()
          setPhase('idle') // auto-declined, no penalty
          return 0
        }
        return c - 1
      })
    }, 1000)
    return clearTimer
  }, [phase])

  /* Outgoing: you initiated on the phone → wait for the opponent to accept */
  useEffect(() => {
    if (phase !== 'waiting') return
    const accept = window.setTimeout(() => setPhase('battle'), 3200)
    return () => clearTimeout(accept)
  }, [phase])

  /* Battle in progress → short live timer */
  useEffect(() => {
    if (phase !== 'battle') return
    setBattleLeft(30)
    timer.current = window.setInterval(() => {
      setBattleLeft((c) => {
        if (c <= 1) {
          clearTimer()
          setOutcome(simulateOutcome(opponent, challenge))
          setPhase('result')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return clearTimer
  }, [phase, opponent, challenge])

  function receiveInvite() {
    setOpponent(randomFrom(opponentPool()))
    setChallenge(randomFrom(CHALLENGES))
    setPhase('incoming')
  }

  function initiateFromPhone() {
    setOpponent(randomFrom(opponentPool()))
    setChallenge(randomFrom(CHALLENGES))
    setPhase('waiting')
  }

  const SIZE = 300

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Watch body */}
      <div className="relative">
        {/* crown */}
        <span
          className="absolute -right-1.5 top-1/2 h-12 w-3 -translate-y-1/2 rounded-full"
          style={{ background: 'linear-gradient(90deg,#3a3a3a,#1a1a1a)' }}
        />
        <div
          className="relative grid place-items-center rounded-full"
          style={{
            width: SIZE,
            height: SIZE,
            background: 'linear-gradient(145deg,#2a2a2a,#0a0a0a)',
            padding: 12,
            boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 0 0 2px #333',
          }}
        >
          {/* screen */}
          <div
            className="relative flex flex-col items-center justify-center overflow-hidden rounded-full text-center"
            style={{ width: SIZE - 24, height: SIZE - 24, background: '#000', padding: 34 }}
          >
            {phase === 'idle' && <WatchIdle onReceive={receiveInvite} onInitiate={initiateFromPhone} />}
            {phase === 'waiting' && (
              <WatchWaiting opponent={opponent} onCancel={() => setPhase('idle')} />
            )}
            {phase === 'incoming' && (
              <WatchIncoming
                opponent={opponent}
                countdown={countdown}
                onAccept={() => {
                  clearTimer()
                  setPhase('battle')
                }}
                onDecline={() => {
                  clearTimer()
                  setPhase('idle')
                }}
              />
            )}
            {phase === 'battle' && (
              <WatchBattle opponent={opponent} challenge={challenge} left={battleLeft} />
            )}
            {phase === 'result' && outcome && (
              <WatchResult outcome={outcome} onDone={() => setPhase('idle')} />
            )}
          </div>
        </div>
      </div>
      <p className="text-xs font-bold text-hare">CourageWatch · ⌀ 5 cm</p>
    </div>
  )
}

/* Circular countdown ring */
function Ring({ progress, color, size = 210 }: { progress: number; color: string; size?: number }) {
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="pointer-events-none absolute inset-0 m-auto -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e1e" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  )
}

function WatchIdle({ onReceive, onInitiate }: { onReceive: () => void; onInitiate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 text-snow">
      <span className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-feather/40" />
        <span className="relative text-3xl">⌚</span>
      </span>
      <p className="text-[14px] font-black">Ready to duel</p>
      <p className="-mt-1 text-[10px] font-semibold text-hare">Pick a scenario</p>
      <button
        onClick={onReceive}
        className="rounded-full bg-fox px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-snow"
        style={{ boxShadow: '0 3px 0 #cc7a00' }}
      >
        📥 Receive invite
      </button>
      <button
        onClick={onInitiate}
        className="rounded-full bg-feather px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-snow"
        style={{ boxShadow: '0 3px 0 #4caf00' }}
      >
        📱 Sent from phone
      </button>
    </div>
  )
}

/* Outgoing flow: you initiated on the phone, watch waits for the opponent */
function WatchWaiting({ opponent, onCancel }: { opponent: Player; onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 text-snow">
      <p className="text-[10px] font-black uppercase tracking-widest text-feather">Invite sent</p>
      <div className="relative my-1 grid h-14 w-14 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-feather/30" />
        <div className="grid h-12 w-12 place-items-center rounded-full text-2xl" style={{ background: opponent.bg }}>
          {opponent.avatar}
        </div>
      </div>
      <p className="text-[13px] font-black">{opponent.name}</p>
      <p className="-mt-0.5 text-[10px] font-bold text-hare">Waiting to accept…</p>
      <button
        onClick={onCancel}
        className="mt-1 rounded-full bg-[#2a2a2a] px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-hare"
      >
        Cancel
      </button>
    </div>
  )
}

function WatchIncoming({
  opponent,
  countdown,
  onAccept,
  onDecline,
}: {
  opponent: Player
  countdown: number
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center text-snow">
      <Ring progress={countdown / 10} color={countdown <= 3 ? '#ff4b4b' : '#ffc800'} />
      <p className="text-[10px] font-black uppercase tracking-widest text-fox">Duel invite</p>
      {/* Only opponent avatar + ID shown; everything else hidden */}
      <div className="mt-1 grid h-12 w-12 place-items-center rounded-full text-2xl" style={{ background: opponent.bg }}>
        {opponent.avatar}
      </div>
      <p className="mt-1 text-[13px] font-black">{opponent.name}</p>
      <p className="text-[10px] font-bold text-hare">wants to duel · {countdown}s</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={onDecline}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#2a2a2a] text-lg text-cardinal"
        >
          ✕
        </button>
        <button
          onClick={onAccept}
          className="grid h-12 w-12 place-items-center rounded-full bg-feather text-xl text-snow"
          style={{ boxShadow: '0 3px 0 #4caf00' }}
        >
          ✓
        </button>
      </div>
    </div>
  )
}

function WatchBattle({
  opponent,
  challenge,
  left,
}: {
  opponent: Player
  challenge: (typeof CHALLENGES)[number]
  left: number
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center text-snow">
      <Ring progress={left / 30} color="#1cb0f6" />
      <div className="flex items-center gap-1.5">
        <div className="grid h-7 w-7 place-items-center rounded-full text-sm" style={{ background: '#d7f5c2' }}>🐨</div>
        <span className="text-[11px] font-black text-fox">VS</span>
        <div className="grid h-7 w-7 place-items-center rounded-full text-sm" style={{ background: opponent.bg }}>{opponent.avatar}</div>
      </div>
      <p className="mt-1 text-[10px] font-bold text-hare">{opponent.name}</p>
      <div className="mt-1.5 px-1">
        <div className="text-xl">{challenge.icon}</div>
        <p className="mt-0.5 text-[11px] font-extrabold leading-tight">{challenge.task}</p>
      </div>
      <p className="mt-1 text-[13px] font-black text-macaw">{left}s left</p>
    </div>
  )
}

function WatchResult({ outcome, onDone }: { outcome: BattleOutcome; onDone: () => void }) {
  const { win, points, opponent, streak } = outcome
  const color = win ? '#58cc02' : '#ff4b4b'
  return (
    <div className="flex flex-col items-center gap-0.5 text-snow">
      <div className="text-4xl">{win ? '🏆' : '💔'}</div>
      <p className="text-base font-black" style={{ color }}>{win ? 'Victory!' : 'Defeat'}</p>
      {/* Settlement text */}
      <p className="px-1 text-[10px] font-semibold leading-tight text-hare">
        {win ? 'Match won!!' : `${opponent.name} got this one!`}
      </p>
      <p className="mt-0.5 text-xl font-black" style={{ color }}>
        {points > 0 ? `+${points}` : points}
      </p>
      <p className="-mt-0.5 text-[9px] font-bold text-hare">
        social pts {win ? 'added' : 'deducted'}
      </p>
      {/* Win streak / reset */}
      <p className="text-[10px] font-extrabold" style={{ color: win ? '#ff9600' : '#777777' }}>
        {win ? `🔥 ${streak} win streak` : 'streak reset'}
      </p>
      <button
        onClick={onDone}
        className="mt-1 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-snow"
        style={{ background: color }}
      >
        Done
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'leaderboard' | 'battle' | 'daily' | 'profile'

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'leaderboard', icon: '🏆', label: 'Leaders' },
  { key: 'battle', icon: '⚔️', label: 'Match' },
  { key: 'daily', icon: '📊', label: 'Today' },
  { key: 'profile', icon: '🧑', label: 'You' },
]

const TITLES: Record<Tab, string> = {
  leaderboard: 'Leaderboard 🏆',
  battle: 'Match',
  daily: 'Daily Result',
  profile: 'Profile',
}

/**
 * Which build to render is decided by the URL, so a single deploy serves both:
 *   /            → phone app
 *   /?view=watch → smartwatch   (also accepts #watch)
 */
function resolveDevice(): 'phone' | 'watch' {
  if (typeof window === 'undefined') return 'phone'
  const view = new URLSearchParams(window.location.search).get('view')
  const hash = window.location.hash.replace('#', '')
  return view === 'watch' || hash === 'watch' ? 'watch' : 'phone'
}

export default function App() {
  const [tab, setTab] = useState<Tab>('battle')
  const [back, setBack] = useState<{ fn: () => void } | null>(null)
  const device = resolveDevice()

  const registerBack = useCallback(
    (fn: (() => void) | null) => setBack(fn ? { fn } : null),
    [],
  )

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 py-6">
      {device === 'watch' ? (
        <WatchDevice />
      ) : (
      <div className="relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[2rem] bg-[#f7f7f7]" style={{ height: '860px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-swan bg-snow/95 px-4 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2">
            {back ? (
              <button
                onClick={back.fn}
                aria-label="Back"
                className="grid h-7 w-7 place-items-center text-2xl font-black text-eel"
              >
                &lt;
              </button>
            ) : (
              <span className="text-2xl">{tab === 'profile' ? '👤' : '🐨'}</span>
            )}
            <h1 className="text-xl font-black text-eel">{TITLES[tab]}</h1>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-fox/15 px-3 py-1 text-sm font-black text-fox">
            🔥 12
          </span>
        </header>

        {/* Screen */}
        <main className="flex-1 overflow-y-auto">
          {tab === 'leaderboard' && <Leaderboard />}
          {tab === 'battle' && <Battle registerBack={registerBack} />}
          {tab === 'daily' && <DailyResult />}
          {tab === 'profile' && <Profile />}
        </main>

        {/* Bottom nav */}
        <nav className="z-20 shrink-0 border-t border-swan bg-snow">
          <div className="flex">
            {TABS.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors"
                >
                  <span
                    className="grid h-9 w-14 place-items-center rounded-xl text-xl transition-all"
                    style={{ background: active ? '#ddf4ff' : 'transparent', transform: active ? 'scale(1)' : 'scale(0.95)' }}
                  >
                    {t.icon}
                  </span>
                  <span className="text-[11px] font-extrabold" style={{ color: active ? '#1cb0f6' : '#afafaf' }}>
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
      )}
    </div>
  )
}

'use client'

/**
 * Tiny inline SVG/CSS animations used in OnboardingHost slides.
 * Each demo renders inside a 240×120 viewBox and is wrapped by the host
 * with `key={index}` so the animation restarts when the user navigates.
 */

const FRAME = 'relative w-full rounded-2xl bg-gradient-to-br from-[#fdf9f5] to-[#faf6ef] border border-[#e8e0d5] overflow-hidden'

export function DemoWelcome() {
  // Five colored dots around a center, gentle staggered pulse + soft connecting lines
  const dots = [
    { x: 70, y: 38, c: '#e8724a', d: 0 },
    { x: 170, y: 38, c: '#10b981', d: 0.3 },
    { x: 60, y: 88, c: '#f59e0b', d: 0.6 },
    { x: 180, y: 88, c: '#ec4899', d: 0.9 },
    { x: 120, y: 22, c: '#5b4cf5', d: 1.2 },
  ]
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 120" className="w-full h-32">
        {dots.map((p, i) => (
          <line key={`l${i}`} x1="120" y1="64" x2={p.x} y2={p.y}
            stroke={p.c} strokeWidth="1" strokeDasharray="2 3" opacity="0.22" />
        ))}
        <circle cx="120" cy="64" r="9" fill="#5b4cf5" opacity="0.12" />
        <circle cx="120" cy="64" r="4" fill="#5b4cf5" />
        {dots.map((p, i) => (
          <circle key={`d${i}`} cx={p.x} cy={p.y} r="6" fill={p.c}
            style={{ animation: `demoPulse 2.4s ease-in-out ${p.d}s infinite` }} />
        ))}
      </svg>
    </div>
  )
}

export function DemoDashboard() {
  // Three mini cards cascade in (event, chat, poll)
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 120" className="w-full h-32">
        {/* Event card */}
        <g style={{ animation: 'demoCascade 3.6s ease-out 0s infinite' }}>
          <rect x="20" y="14" width="200" height="28" rx="6" fill="white" stroke="#e8e0d5" />
          <rect x="20" y="14" width="3" height="28" fill="#5b4cf5" />
          <rect x="32" y="22" width="80" height="5" rx="2" fill="#1a1614" opacity="0.65" />
          <rect x="32" y="32" width="50" height="4" rx="2" fill="#9c8b75" opacity="0.6" />
        </g>
        {/* Chat preview */}
        <g style={{ animation: 'demoCascade 3.6s ease-out 0.5s infinite' }}>
          <rect x="20" y="50" width="200" height="22" rx="6" fill="white" stroke="#e8e0d5" />
          <circle cx="32" cy="61" r="6" fill="#10b981" opacity="0.35" />
          <rect x="44" y="58" width="100" height="4" rx="2" fill="#1a1614" opacity="0.55" />
          <rect x="44" y="65" width="60" height="3.5" rx="2" fill="#9c8b75" opacity="0.5" />
        </g>
        {/* Poll */}
        <g style={{ animation: 'demoCascade 3.6s ease-out 1s infinite' }}>
          <rect x="20" y="80" width="200" height="26" rx="6" fill="white" stroke="#e8e0d5" />
          <rect x="32" y="88" width="70" height="4" rx="2" fill="#1a1614" opacity="0.55" />
          <rect x="32" y="98" width="40" height="3" rx="1.5" fill="#5b4cf5" opacity="0.4" />
          <rect x="76" y="98" width="60" height="3" rx="1.5" fill="#5b4cf5" opacity="0.7" />
          <rect x="140" y="98" width="20" height="3" rx="1.5" fill="#5b4cf5" opacity="0.25" />
        </g>
      </svg>
    </div>
  )
}

export function DemoCalendar() {
  // 21-day mini grid; days 9-13 highlight in sequence (drag), then a multi-day bar fades in
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 120" className="w-full h-32">
        {Array.from({ length: 21 }).map((_, i) => {
          const col = i % 7
          const row = Math.floor(i / 7)
          const x = 13 + col * 31
          const y = 14 + row * 31
          const inRange = i >= 9 && i <= 13
          const stagger = inRange ? (i - 9) * 0.18 : 0
          return (
            <rect
              key={i}
              x={x} y={y} width="28" height="28" rx="4"
              fill="white" stroke="#e8e0d5"
              style={inRange ? { animation: `demoCalDay 3.6s ease-in-out ${stagger}s infinite` } : undefined}
            />
          )
        })}
        {/* Multi-day event bar across days 9–13 */}
        <rect
          x="75" y="56" width="152" height="14" rx="3"
          fill="#5b4cf5"
          style={{ animation: 'demoCalBar 3.6s ease-in-out infinite' }}
        />
        {/* Cursor that drags */}
        <g style={{ animation: 'demoCalCursor 3.6s ease-in-out infinite' }}>
          <circle r="4" fill="#5b4cf5" opacity="0.85" />
          <circle r="9" fill="#5b4cf5" opacity="0.18" />
        </g>
      </svg>
    </div>
  )
}

export function DemoEvents() {
  // Event card filling in: title bar, location, then 4 avatars cascade
  const colors = ['#e8724a', '#10b981', '#f59e0b', '#ec4899']
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 120" className="w-full h-32">
        <rect x="22" y="14" width="196" height="92" rx="10" fill="white" stroke="#e8e0d5" />
        <rect x="22" y="14" width="196" height="4" rx="2" fill="#5b4cf5" opacity="0.85" />
        <rect x="34" y="30" width="80" height="6" rx="3" fill="#1a1614" opacity="0.7"
          style={{ animation: 'demoFadeIn 3s ease-out 0s infinite' }} />
        <rect x="34" y="44" width="60" height="4" rx="2" fill="#9c8b75" opacity="0.6"
          style={{ animation: 'demoFadeIn 3s ease-out 0.3s infinite' }} />
        {/* avatars */}
        {colors.map((c, i) => (
          <circle key={i} cx={42 + i * 18} cy="78" r="9" fill={c} opacity="0.85"
            style={{ animation: `demoAvatarPop 3s cubic-bezier(0.34,1.56,0.64,1) ${0.6 + i * 0.18}s infinite` }} />
        ))}
        {/* date pills */}
        <rect x="130" y="70" width="38" height="14" rx="7" fill="#5b4cf5" opacity="0.1"
          style={{ animation: 'demoFadeIn 3s ease-out 1.4s infinite' }} />
        <rect x="172" y="70" width="38" height="14" rx="7" fill="#e8724a" opacity="0.12"
          style={{ animation: 'demoFadeIn 3s ease-out 1.6s infinite' }} />
      </svg>
    </div>
  )
}

export function DemoItinerary() {
  // List of three time-stamped items appearing in sequence
  const items = [
    { time: '09:00', w: 90, c: '#5b4cf5' },
    { time: '13:30', w: 120, c: '#10b981' },
    { time: '18:00', w: 70, c: '#e8724a' },
  ]
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 120" className="w-full h-32">
        {/* vertical timeline */}
        <line x1="50" y1="20" x2="50" y2="100" stroke="#e8e0d5" strokeWidth="1.5" />
        {items.map((item, i) => {
          const y = 24 + i * 28
          return (
            <g key={i} style={{ animation: `demoSlideIn 3.2s ease-out ${i * 0.35}s infinite` }}>
              <circle cx="50" cy={y + 4} r="4" fill={item.c} />
              <text x="20" y={y + 7} fontSize="8" fill="#9c8b75" fontFamily="system-ui">{item.time}</text>
              <rect x="62" y={y - 3} width={item.w} height="14" rx="3" fill="white" stroke="#e8e0d5" />
              <rect x="68" y={y + 1} width={item.w - 18} height="3" rx="1.5" fill="#1a1614" opacity="0.55" />
              <rect x="68" y={y + 6} width={item.w - 36} height="2.5" rx="1" fill="#9c8b75" opacity="0.5" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function DemoChat() {
  // Two messages slide in from alternating sides + a heart reaction pops on one
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 120" className="w-full h-32">
        {/* Incoming bubble (left) */}
        <g style={{ animation: 'demoChatLeft 3.4s ease-out 0s infinite' }}>
          <rect x="20" y="22" width="120" height="22" rx="11" fill="#f3efe8" />
          <rect x="32" y="29" width="96" height="3.5" rx="2" fill="#1a1614" opacity="0.55" />
          <rect x="32" y="36" width="60" height="3" rx="1.5" fill="#9c8b75" opacity="0.55" />
        </g>
        {/* Outgoing bubble (right) */}
        <g style={{ animation: 'demoChatRight 3.4s ease-out 0.7s infinite' }}>
          <rect x="100" y="54" width="120" height="22" rx="11" fill="#5b4cf5" />
          <rect x="112" y="61" width="96" height="3.5" rx="2" fill="white" opacity="0.95" />
          <rect x="112" y="68" width="50" height="3" rx="1.5" fill="white" opacity="0.7" />
        </g>
        {/* Heart reaction pops on the incoming bubble */}
        <g style={{ animation: 'demoReactionPop 3.4s cubic-bezier(0.34,1.56,0.64,1) 1.6s infinite' }}>
          <circle cx="124" cy="48" r="9" fill="white" stroke="#e8e0d5" />
          <path d="M124 51.5 C 121 49, 119.5 45.5, 122 44 C 123.3 43.3, 124 44.5, 124 44.5 C 124 44.5, 124.7 43.3, 126 44 C 128.5 45.5, 127 49, 124 51.5 Z"
            fill="#e8724a" />
        </g>
        {/* Typing indicator dots at bottom */}
        <g transform="translate(20, 92)">
          <circle cx="0" cy="0" r="2.5" fill="#9c8b75" style={{ animation: 'demoTypingDot 1.2s ease-in-out 0s infinite' }} />
          <circle cx="8" cy="0" r="2.5" fill="#9c8b75" style={{ animation: 'demoTypingDot 1.2s ease-in-out 0.2s infinite' }} />
          <circle cx="16" cy="0" r="2.5" fill="#9c8b75" style={{ animation: 'demoTypingDot 1.2s ease-in-out 0.4s infinite' }} />
        </g>
      </svg>
    </div>
  )
}

export function DemoPolls() {
  // Question text + 3 horizontal bars filling to different widths in sequence
  const bars = [
    { label: 80, w: 130, d: 0.1, c: '#5b4cf5' },
    { label: 70, w: 80, d: 0.4, c: '#10b981' },
    { label: 60, w: 50, d: 0.7, c: '#e8724a' },
  ]
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 120" className="w-full h-32">
        {/* Question */}
        <rect x="22" y="14" width="120" height="5" rx="2.5" fill="#1a1614" opacity="0.7" />
        <rect x="22" y="24" width="80" height="4" rx="2" fill="#9c8b75" opacity="0.55" />
        {/* Bars */}
        {bars.map((b, i) => {
          const y = 44 + i * 22
          return (
            <g key={i}>
              <rect x="22" y={y} width="180" height="14" rx="3" fill="#f3efe8" />
              <rect x="22" y={y} height="14" rx="3" fill={b.c} opacity="0.85"
                style={{
                  width: b.w,
                  transformOrigin: 'left center',
                  animation: `demoBarFill 3s ease-out ${b.d}s infinite`,
                }} />
              <rect x="28" y={y + 4.5} width={b.label} height="3.5" rx="1.5" fill="white" opacity="0.95"
                style={{ animation: `demoFadeIn 3s ease-out ${b.d + 0.3}s infinite` }} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

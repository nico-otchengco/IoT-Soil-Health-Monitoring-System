import { useEffect, useRef, useState } from 'react'

interface Param  { key: string; label: string; value: string; unit: string; pct: number; status: 'ok' | 'warn' }
interface Stage  { id: string; index: string; title: string; desc: string; icon: React.ReactNode; color: string }
interface Crop   { glyph: string; name: string; latin: string; desc: string; specs: { key: string; val: string }[]; color: string }

const BASE_PARAMS: Param[] = [
  { key: 'ph',    label: 'Soil pH',      value: '6.4',  unit: 'pH',    pct: 64, status: 'ok'   },
  { key: 'moist', label: 'Moisture',     value: '62',   unit: '%',     pct: 62, status: 'ok'   },
  { key: 'temp',  label: 'Temperature',  value: '28.1', unit: '°C',    pct: 75, status: 'warn' },
  { key: 'ec',    label: 'Conductivity', value: '1.8',  unit: 'mS/cm', pct: 45, status: 'ok'   },
]

const MARQUEE_ITEMS = [
  { label: 'pH Monitoring',           val: '6.0–7.0'  },
  { label: 'Moisture Detection',      val: '60–70%'   },
  { label: 'Temperature Sensing',     val: '±0.5°C'   },
  { label: 'EC Analysis',             val: 'mS/cm'    },
  { label: 'NPK Profiling',           val: 'mg/kg'    },
  { label: 'Cloud Data Logging',      val: '∞ records' },
  { label: 'Crop Recommendations',    val: '3 crops'  },
  { label: '7-Day Trend Projections', val: 'trend'    },
]

const STATS = [
  { num: '5',  label: 'Soil parameters\nmonitored live'  },
  { num: '3',  label: 'Crops with\ntailored profiles'    },
  { num: '7d', label: 'Trend projection\nwindow'          },
  { num: '∞',  label: 'Cloud-stored\nsoil history'        },
]

const FEATURES = [
  { code: 'F-01', title: 'Multi-Parameter Sensing',      tag: 'Core Feature',       desc: 'Simultaneous IoT monitoring of pH, moisture, temperature, EC, and NPK — five parameters that together determine soil health and crop readiness.' },
  { code: 'F-02', title: 'Crop-Specific Recommendations', tag: 'Intelligence Layer', desc: 'Treatment plans calibrated per crop — fertilizer type, dosage, and timing derived from current readings against validated agronomic thresholds.' },
  { code: 'F-03', title: 'Alternative Crop Routing',     tag: 'Decision Support',   desc: 'When your soil profile better suits a different crop, SmartSoil flags it — plant what your soil is already primed for.' },
  { code: 'F-04', title: 'Cloud Data Logging',           tag: 'Infrastructure',     desc: 'All sensor readings stream and store in real time, building a longitudinal soil health record across every season.' },
  { code: 'F-05', title: '7-Day Trend Projections',      tag: 'Forecasting',        desc: 'Trend-based projections from historical readings let you anticipate soil shifts before they affect your crop cycle.' },
  { code: 'F-06', title: 'Gardener-Tested Interface',    tag: 'UX Research',        desc: 'Designed for non-technical users and validated with real home gardeners in Barangay Tunasan — science without the jargon barrier.' },
]

const PIPELINE_STAGES: Stage[] = [
  {
    id: 'sense', index: '01', title: 'Sense', color: '#6eba42',
    desc: 'IoT probes buried in the root zone capture live pH, moisture, temp, EC, and NPK readings without disturbing the soil matrix.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="24" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M18 20V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M11 14c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
        <path d="M7 14c0-6.075 4.925-11 11-11s11 4.925 11 11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
        <rect x="15" y="27" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    id: 'transmit', index: '02', title: 'Transmit', color: '#4a9eba',
    desc: 'Readings are timestamped and streamed wirelessly to a cloud database — building a longitudinal soil health record in real time.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="22" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="22" y="4"  width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M14 27h8M22 9H14M14 27V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="27" cy="27" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 22V14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
        <path d="M27 14v9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'analyze', index: '03', title: 'Analyze', color: '#c8922a',
    desc: 'Current values are cross-referenced against validated agronomic thresholds for each supported crop and growth stage.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="4" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 24l5-6 5 4 5-8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="4" y1="19" x2="32" y2="19" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: 'recommend', index: '04', title: 'Recommend', color: '#9ed464',
    desc: 'A specific treatment plan is generated: fertilizer type, dosage, timing, and alternative crop suggestions when soil conditions allow.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 4C10.268 4 4 10.268 4 18c0 3.866 1.566 7.366 4.101 9.899L18 32l9.899-4.101A13.944 13.944 0 0032 18c0-7.732-6.268-14-14-14z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M18 12v7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="18" cy="19" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
]

const CROPS: Crop[] = [
  {
    glyph: '🥬', name: 'Pechay', latin: 'Brassica rapa subsp. chinensis', color: '#6eba42',
    desc: 'A leafy staple of Filipino home cooking. Fast-growing, moisture-sensitive, and highly responsive to balanced NPK nutrition.',
    specs: [
      { key: 'Optimal pH',  val: '6.0 – 7.0'       },
      { key: 'Moisture',    val: '60 – 70%'         },
      { key: 'Temperature', val: '15 – 25°C'        },
      { key: 'Fertilizer',  val: '14-14-14 Complete' },
      { key: 'Harvest',     val: '~30 days'          },
    ],
  },
  {
    glyph: '🌿', name: 'Okra', latin: 'Abelmoschus esculentus', color: '#c8922a',
    desc: 'Heat-tolerant and drought-resilient. Uses a distinct fertilizer split — higher K during fruiting — making it unique in the SmartSoil recommendation engine.',
    specs: [
      { key: 'Optimal pH',  val: '6.0 – 6.8'         },
      { key: 'Moisture',    val: '50 – 65%'           },
      { key: 'Temperature', val: '24 – 35°C'          },
      { key: 'Fertilizer',  val: 'Custom N-P-K split' },
      { key: 'Harvest',     val: '~60 days'           },
    ],
  },
  {
    glyph: '🌱', name: 'Lemongrass', latin: 'Cymbopogon citratus', color: '#4a9eba',
    desc: 'Hardy aromatic herb used in Philippine cuisine and folk medicine. Tolerates wide pH swings but responds dramatically to targeted soil nutrition.',
    specs: [
      { key: 'Optimal pH',  val: '5.5 – 7.5'       },
      { key: 'Moisture',    val: '40 – 60%'         },
      { key: 'Temperature', val: '20 – 35°C'        },
      { key: 'Fertilizer',  val: '14-14-14 Complete' },
      { key: 'Harvest',     val: '~90 days'          },
    ],
  },
]

function useReveal(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add('visible') },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__logo">
        <span className="navbar__pulse" />
        SmartSoil
      </div>
      <ul className="navbar__links">
        {['system', 'pipeline', 'crops', 'research'].map(id => (
          <li key={id}><a href={`#${id}`}>{id.charAt(0).toUpperCase() + id.slice(1)}</a></li>
        ))}
      </ul>
      <div className="navbar__status">
        <span className="navbar__status-dot" />
        Live Monitoring
      </div>
    </nav>
  )
}

function jitter(base: number, range = 0.1) {
  return parseFloat((base + (Math.random() - 0.5) * range).toFixed(2))
}

function Hero() {
  const [time, setTime] = useState('')
  const [params, setParams] = useState<Param[]>(BASE_PARAMS)

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
      setParams(prev => prev.map(p => ({
        ...p,
        value: String(jitter(parseFloat(p.value))),
        pct: Math.min(100, Math.max(10, p.pct + (Math.random() - 0.5) * 2)),
      })))
    }
    tick()
    const id = setInterval(tick, 2400)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="hero">
      <div className="hero__grid-bg" aria-hidden />
      <div className="hero__glow"    aria-hidden />

      <div className="hero__left">
        <p className="hero__eyebrow">
          <span className="hero__eyebrow-line" />
          IoT Soil Intelligence · Barangay Tunasan, Muntinlupa
        </p>
        <h1 className="hero__heading">
          Know your<br />
          <em>soil.</em><br />
          <span className="hero__heading--dim">Grow smarter.</span>
        </h1>
        <p className="hero__desc">
          SmartSoil monitors five critical soil parameters in real time and delivers
          crop-specific treatment recommendations to home gardeners —
          no lab, no guesswork.
        </p>
        <div className="hero__actions">
          <a href="#pipeline" className="btn-primary">See the Pipeline →</a>
          <a href="#crops"    className="btn-ghost">Supported Crops <span className="btn-ghost__arrow">→</span></a>
        </div>
      </div>

      <div className="hero__right">
        <div className="widget">
          <div className="widget__header">
            <span className="widget__id">PECHAY_PLOT_A</span>
            <span className="widget__time">{time}</span>
          </div>
          <div className="widget__params">
            {params.map(p => (
              <div key={p.key} className="widget__param">
                <span className="widget__param-label">{p.label}</span>
                <div className="widget__bar-wrap">
                  <div className={`widget__bar widget__bar--${p.status}`} style={{ width: `${p.pct}%` }} />
                </div>
                <span className="widget__param-val">
                  {p.value}<span className="widget__param-unit">{p.unit}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="widget__npk">
            {[{ l: 'Nitrogen', s: 'N', v: '38 mg/kg' }, { l: 'Phosphorus', s: 'P', v: '22 mg/kg' }, { l: 'Potassium', s: 'K', v: '41 mg/kg' }].map(n => (
              <div key={n.s} className="npk">
                <span className="npk__label">{n.l}</span>
                <span className="npk__symbol">{n.s}</span>
                <span className="npk__val">{n.v}</span>
              </div>
            ))}
          </div>
          <div className="widget__reco">
            <span className="widget__reco-tag">→ Treatment Recommendation</span>
            <p className="widget__reco-text">Apply 14-14-14 complete fertilizer at 2 g/L. Soil is near-optimal — maintain current irrigation schedule.</p>
            <div className="widget__reco-crops">
              {['Pechay ✓', 'Okra ✓', 'Lemongrass ✓'].map(c => (
                <span key={c} className="widget__reco-crop">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div className="marquee-wrap" aria-hidden>
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-item__val">{item.val}</span>
            {item.label}
            <span className="marquee-sep">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Stats() {
  return (
    <div className="stats">
      {STATS.map(s => (
        <div key={s.num} className="stat">
          <span className="stat__num">{s.num}</span>
          <span className="stat__label">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function Features() {
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)

  return (
    <section className="features reveal" ref={ref} id="system">
      <div className="features__header">
        <p className="section-num">01 — System Capabilities</p>
        <h2 className="section-heading">Built for precision.<br /><em>Designed for people.</em></h2>
        <p className="section-sub">Every feature grounded in agronomic science and validated with real home gardeners.</p>
      </div>
      <div className="features__grid">
        {FEATURES.map(f => (
          <div key={f.code} className="feat">
            <div className="feat__top">
              <span className="feat__code">{f.code}</span>
              <span className="feat__tag">→ {f.tag}</span>
            </div>
            <h3 className="feat__title">{f.title}</h3>
            <p className="feat__desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PipelineSVG({ activeStage }: { activeStage: number }) {
  return (
    <svg className="pipeline-svg" viewBox="0 0 900 160" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6eba42" stopOpacity="0.8" />
          <stop offset="33%"  stopColor="#4a9eba" stopOpacity="0.8" />
          <stop offset="66%"  stopColor="#c8922a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#9ed464" stopOpacity="0.8" />
        </linearGradient>
        <filter id="glow-f">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Rail */}
      <path d="M 80 80 H 820" stroke="rgba(110,186,66,0.06)" strokeWidth="36" fill="none" strokeLinecap="round" />
      {/* Dashed spine */}
      <path className="pipeline-line" d="M 80 80 H 820" stroke="rgba(110,186,66,0.14)" strokeWidth="1.5" fill="none" strokeDasharray="6 4" />

      {/* Active segment */}
      {activeStage > 0 && (
        <path
          className="pipeline-active"
          d={`M ${80 + (activeStage - 1) * 247} 80 H ${80 + activeStage * 247}`}
          stroke="url(#flow-grad)" strokeWidth="2.5" fill="none" filter="url(#glow-f)"
        />
      )}

      {/* Animated packets */}
      {[0, 1, 2].map(i => (
        <circle key={i} r="5" fill="#6eba42" opacity="0.7" filter="url(#glow-f)">
          <animateMotion dur={`${3.5 + i * 1.1}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" path="M 80 80 H 820" />
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur={`${3.5 + i * 1.1}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {[0, 1].map(i => (
        <circle key={`w${i}`} r="3" fill="#4a9eba" opacity="0.45">
          <animateMotion dur={`${5 + i * 0.8}s`} begin={`${i * 2.5}s`} repeatCount="indefinite" path="M 80 80 H 820" />
        </circle>
      ))}

      {/* Stage nodes */}
      {PIPELINE_STAGES.map((s, i) => {
        const cx = 80 + i * 247
        const isActive  = i <= activeStage - 1
        const isCurrent = i === activeStage - 1
        return (
          <g key={s.id}>
            <circle
              cx={cx} cy={80} r={isCurrent ? 22 : 18}
              fill={isActive ? s.color : 'var(--bg-2)'}
              stroke={isActive ? s.color : 'rgba(110,186,66,0.14)'}
              strokeWidth="1.5" opacity={isActive ? 1 : 0.6}
              style={{ transition: 'all 0.4s ease', filter: isCurrent ? `drop-shadow(0 0 8px ${s.color})` : 'none' }}
            />
            <text x={cx} y={84} textAnchor="middle" fill={isActive ? 'var(--bg)' : 'var(--text-3)'}
              fontSize="11" fontFamily="'DM Mono',monospace">{s.index}</text>
            <text x={cx} y={118} textAnchor="middle" fill={isActive ? 'var(--text)' : 'var(--text-3)'}
              fontSize="10" fontFamily="'DM Mono',monospace" letterSpacing="1"
              style={{ transition: 'fill 0.4s ease' }}>{s.title.toUpperCase()}</text>
          </g>
        )
      })}

      {/* Soil layer */}
      <path d="M 0 145 Q 225 138,450 145 Q 675 152,900 145 L 900 160 L 0 160 Z" fill="rgba(139,94,60,0.12)" />
      <path d="M 0 152 Q 225 148,450 153 Q 675 158,900 152 L 900 160 L 0 160 Z" fill="rgba(139,94,60,0.08)" />
    </svg>
  )
}

function Pipeline() {
  const [activeStage, setActiveStage] = useState(0)
  const [selected, setSelected]       = useState(0)
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)

  useEffect(() => {
    const id = setInterval(() => {
      setActiveStage(prev => {
        const next = (prev % PIPELINE_STAGES.length) + 1
        setSelected(next - 1)
        return next
      })
    }, 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="pipeline reveal" ref={ref} id="pipeline">
      <div className="pipeline__header">
        <p className="section-num">02 — Data Pipeline</p>
        <h2 className="section-heading">From sensor<br /><em>to solution.</em></h2>
        <p className="section-sub">Four stages that transform raw soil data into precise growing decisions.</p>
      </div>

      <div className="pipeline__flow-wrap">
        <PipelineSVG activeStage={activeStage} />
      </div>

      <div className="pipeline__stages">
        {PIPELINE_STAGES.map((s, i) => (
          <button
            key={s.id}
            className={`stage-card${selected === i ? ' stage-card--active' : ''}`}
            onClick={() => { setSelected(i); setActiveStage(i + 1) }}
            style={{ '--stage-color': s.color } as React.CSSProperties}
          >
            <div className="stage-card__top">
              <span className="stage-card__num">{s.index}</span>
              <span className="stage-card__icon" style={{ color: selected === i ? s.color : 'var(--text-3)' }}>{s.icon}</span>
            </div>
            <h3 className="stage-card__title">{s.title}</h3>
            <p className="stage-card__desc">{s.desc}</p>
            <div className="stage-card__bar">
              <div className="stage-card__bar-fill" style={{ background: s.color }} />
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function SoilDiagram({ color }: { color: string }) {
  return (
    <svg className="soil-diagram" viewBox="0 0 320 80" fill="none" aria-hidden>
      <rect x="0" y="40" width="320" height="15" fill="rgba(139,94,60,0.18)" rx="1" />
      <rect x="0" y="55" width="320" height="12" fill="rgba(139,94,60,0.12)" rx="1" />
      <rect x="0" y="67" width="320" height="13" fill="rgba(139,94,60,0.08)" rx="1" />
      <rect x="148" y="10" width="3" height="50" rx="1.5" fill={color} opacity="0.8" />
      <circle cx="149.5" cy="10" r="5" fill={color} opacity="0.9" />
      {[14, 22, 30].map((r, i) => (
        <circle key={i} cx="149.5" cy="10" r={r} stroke={color} strokeWidth="0.8" fill="none" opacity={0.25 - i * 0.07}>
          <animate attributeName="r"       from={r * 0.5} to={r * 1.6} dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.4"     to="0"       dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx="149.5" r="2" fill={color}>
        <animate attributeName="cy"      values="55;10"      dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;1;0"    dur="1.6s" repeatCount="indefinite" />
      </circle>
      {['TOPSOIL', 'SUBSOIL', 'BEDROCK'].map((label, i) => (
        <text key={label} x="8" y={51 + i * 12} fontSize="7" fill={`rgba(139,94,60,${0.7 - i * 0.17})`} fontFamily="'DM Mono',monospace">{label}</text>
      ))}
    </svg>
  )
}

function Crops() {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)

  const crop = CROPS[active]

  return (
    <section className="crops reveal" ref={ref} id="crops">
      <div className="crops__header">
        <p className="section-num">03 — Supported Crops</p>
        <h2 className="section-heading">Three crops.<br /><em>One system.</em></h2>
        <p className="section-sub">Soil profiles and treatment logic fine-tuned for the most common home garden crops in urban Muntinlupa.</p>
      </div>

      <div className="crops__layout">
        <div className="crops__tabs">
          {CROPS.map((c, i) => (
            <button
              key={c.name}
              className={`crop-tab${active === i ? ' crop-tab--active' : ''}`}
              onClick={() => setActive(i)}
              style={{ '--crop-color': c.color } as React.CSSProperties}
            >
              <span className="crop-tab__glyph">{c.glyph}</span>
              <span className="crop-tab__name">{c.name}</span>
              <span className="crop-tab__latin">{c.latin}</span>
            </button>
          ))}
        </div>

        <div className="crops__detail" key={active} style={{ '--crop-color': crop.color } as React.CSSProperties}>
          <div className="crops__detail-top">
            <p className="crops__detail-latin">{crop.latin}</p>
            <h3 className="crops__detail-name" style={{ color: crop.color }}>{crop.glyph} {crop.name}</h3>
            <p className="crops__detail-desc">{crop.desc}</p>
          </div>
          <div className="crops__specs">
            {crop.specs.map(s => (
              <div key={s.key} className="crop-spec">
                <span className="crop-spec__key">{s.key}</span>
                <span className="crop-spec__bar-wrap">
                  <span className="crop-spec__bar" style={{ background: crop.color }} />
                </span>
                <span className="crop-spec__val">{s.val}</span>
              </div>
            ))}
          </div>
          <SoilDiagram color={crop.color} />
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="cta" id="research">
      <div className="cta__glow" aria-hidden />
      <p className="cta__eyebrow">Capstone Research · Muntinlupa City</p>
      <h2 className="cta__heading">Science for every<br /><em>garden.</em></h2>
      <p className="cta__sub">SmartSoil brings evidence-based soil management to home gardeners who deserve more than guesswork — built and validated right here in Barangay Tunasan.</p>
      <div className="cta__actions">
        <a href="#pipeline" className="btn-primary">Explore the System →</a>
        <a href="#crops"    className="btn-ghost">View Crops <span className="btn-ghost__arrow">→</span></a>
      </div>
      <div className="cta__coords">14.3536° N · 121.0478° E · Muntinlupa, Metro Manila</div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__left">
        <span className="footer__logo">SmartSoil</span>
        <span className="footer__desc">Designed & Developed by Gian Nico Otchengco · 2026</span>
      </div>
      <div className="footer__right">
        <a href="https://github.com/nico-otchengco/IoT-Soil-Health-Monitoring-System" target="_blank" rel="noopener noreferrer" className="footer__logo">Github</a>
        <a href="https://www.linkedin.com/in/gian-nico-otchengco-78a982383/" target="_blank" rel="noopener noreferrer" className="footer__logo">LinkedIn</a>
        <a href="https://portfolio-gnotchengco.vercel.app" target="_blank" rel="noopener noreferrer" className="footer__logo">Portfolio</a>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Stats />
        <Features />
        <Pipeline />
        <Crops />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
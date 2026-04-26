import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useTheme } from './ThemeProvider'
import { useTimer } from './TimerContext'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  return `${m}min`
}

function formatDurationFull(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#6366f1',
  '#14b8a6', '#eab308', '#ef4444', '#a855f7',
]

interface PieSlice {
  startAngle: number
  endAngle: number
  color: string
  label: string
  value: number
  pct: string
}

function computeSlices(data: { label: string; value: number }[]): { slices: PieSlice[]; total: number; cx: number; cy: number; r: number; innerR: number } {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!data.length || total === 0) return { slices: [], total: 0, cx: 0, cy: 0, r: 0, innerR: 0 }
  const cx = 200, cy = 200, r = 140, innerR = 75
  let acc = -Math.PI / 2
  const slices: PieSlice[] = data.map((d, i) => {
    const angle = (d.value / total) * Math.PI * 2
    const start = acc
    acc += angle
    return {
      startAngle: start,
      endAngle: acc,
      color: PIE_COLORS[i % PIE_COLORS.length],
      label: d.label,
      value: d.value,
      pct: ((d.value / total) * 100).toFixed(1),
    }
  })
  return { slices, total, cx, cy, r, innerR }
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function describeArc(cx: number, cy: number, r: number, innerR: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(cx, cy, r, startAngle)
  const outerEnd = polarToCartesian(cx, cy, r, endAngle)
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle)
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle)
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0
  return [
    `M ${outerStart.x},${outerStart.y}`,
    `A ${r},${r} 0 ${largeArcFlag},1 ${outerEnd.x},${outerEnd.y}`,
    `L ${innerStart.x},${innerStart.y}`,
    `A ${innerR},${innerR} 0 ${largeArcFlag},0 ${innerEnd.x},${innerEnd.y}`,
    'Z',
  ].join(' ')
}

function InteractivePieChart({ data, isDark }: { data: { label: string; value: number }[]; isDark: boolean }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { slices, total, cx, cy, r, innerR } = useMemo(() => computeSlices(data), [data])

  if (!slices.length || total === 0) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border h-[380px] ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'}`}>
        <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>暂无数据</p>
      </div>
    )
  }

  const baseR = r
  const baseInnerR = innerR
  const baseCx = cx
  const baseCy = cy
  const expand = 8

  function getLabelPos(slice: PieSlice, idx: number) {
    const midAngle = (slice.startAngle + slice.endAngle) / 2
    const elbowR = baseR + 20
    const textR = baseR + 55
    const elbow = polarToCartesian(baseCx, baseCy, elbowR, midAngle)
    const textPt = polarToCartesian(baseCx, baseCy, textR, midAngle)
    const anchor = midAngle > Math.PI / 2 && midAngle < (Math.PI * 3) / 2 ? 'end' as const : 'start' as const
    return { elbow, textPt, anchor, midAngle }
  }

  const activeIdx = hoverIdx ?? (slices.length === 1 ? 0 : null)

  return (
    <div className={`rounded-2xl border overflow-hidden relative ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'}`} style={{ minHeight: 420 }}>
      <svg ref={svgRef} viewBox="0 0 400 400" className="w-full" style={{ maxHeight: 420 }}>
        <defs>
          {slices.map((_, i) => (
            <filter key={i} id={`pie-shadow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity={i === activeIdx ? "0.25" : "0"} />
            </filter>
          ))}
          <linearGradient id={`pie-glow`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {slices.map((slice, i) => {
          const isActive = i === activeIdx
          const curR = isActive ? baseR + expand : baseR
          const curInnerR = isActive ? baseInnerR + expand * 0.5 : baseInnerR
          const offsetCx = isActive ? baseCx + Math.cos((slice.startAngle + slice.endAngle) / 2) * 4 : baseCx
          const offsetCy = isActive ? baseCy + Math.sin((slice.startAngle + slice.endAngle) / 2) * 4 : baseCy
          const pathD = describeArc(offsetCx, offsetCy, curR, curInnerR, slice.startAngle, slice.endAngle)
          const hitD = describeArc(baseCx, baseCy, baseR + 12, baseInnerR - 4, slice.startAngle, slice.endAngle)
          const opacity = activeIdx !== null && !isActive ? 0.45 : 1

          return (
            <g key={i}>
              <path
                d={hitD}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              <path
                d={pathD}
                fill={slice.color}
                stroke={isDark ? '#171717' : '#fff'}
                strokeWidth={isActive ? 2 : 1}
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'none',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: `${offsetCx}px ${offsetCy}px`,
                  filter: `url(#pie-shadow-${i})`,
                  opacity,
                }}
              />
            </g>
          )
        })}

        <circle cx={baseCx} cy={baseCy} r={baseInnerR - 2} fill={isDark ? '#171717' : '#fff'} />
        <text x={baseCx} y={baseCy - 8} textAnchor="middle" fill={isDark ? '#737373' : '#94a3b8'} fontSize={11} fontWeight="500">总计</text>
        <text x={baseCx} y={baseCy + 14} textAnchor="middle" fill={isDark ? '#fff' : '#1e293b'} fontSize={18} fontWeight="800">{formatDuration(total)}</text>

        {slices.map((slice, i) => {
          if (slice.value === 0) return null
          const { elbow, textPt, anchor, midAngle } = getLabelPos(slice, i)
          const isActive = i === activeIdx
          const labelOpacity = activeIdx !== null && !isActive ? 0.35 : 1
          const lineColor = slice.color

          return (
            <g key={`label-${i}`} style={{ transition: 'opacity 0.2s', pointerEvents: 'none' }} opacity={labelOpacity}>
              <line
                x1={elbow.x} y1={elbow.y}
                x2={textPt.x} y2={textPt.y}
                stroke={lineColor}
                strokeWidth={1.5}
                strokeDasharray="4,3"
                opacity={0.7}
              />
              <circle cx={elbow.x} cy={elbow.y} r={3} fill={lineColor} opacity={0.9} />
              <text
                x={anchor === 'start' ? textPt.x + 6 : textPt.x - 6}
                y={textPt.y - 2}
                textAnchor={anchor}
                fontSize={13}
                fontWeight={isActive ? 700 : 600}
                fill={isDark ? '#f0f0f0' : '#1e293b'}
              >
                {slice.label.length > 10 ? slice.label.slice(0, 9) + '..' : slice.label}
              </text>
              <text
                x={anchor === 'start' ? textPt.x + 6 : textPt.x - 6}
                y={textPt.y + 14}
                textAnchor={anchor}
                fontSize={11}
                fontWeight="700"
                fill={slice.color}
              >
                {formatDuration(slice.value)} ({slice.pct}%)
              </text>
            </g>
          )
        })}
      </svg>

      {activeIdx !== null && slices[activeIdx] && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg backdrop-blur-md z-10 animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-neutral-800/90 border border-white/10' : 'bg-white/95 border border-slate-200/80'}`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slices[activeIdx].color }} />
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{slices[activeIdx].label}</span>
          </div>
          <div className={`text-xs mt-1 tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{formatDuration(slices[activeIdx].value)} · 占比 {slices[activeIdx].pct}%</div>
        </div>
      )}
    </div>
  )
}

function InteractiveLineChart({ data, isDark }: { data: { date: string; value: number }[]; isDark: boolean }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (!data.length || data.every(d => d.value === 0)) {
    return (
      <div className={`flex items-center justify-center h-[280px] rounded-2xl border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'}`}>
        <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>暂无数据</p>
      </div>
    )
  }

  const W = 640, H = 280, padL = 48, padR = 24, padT = 24, padB = 42
  const chartW = W - padL - padR, chartH = H - padT - padB
  const maxVal = Math.max(...data.map(d => d.value), 60)

  const pts = data.map((d, i) => ({
    x: padL + (data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padT + chartH - (d.value / maxVal) * chartH,
    ...d,
  }))

  function smoothPath(points: typeof pts): string {
    if (points.length <= 1) return points.length === 1 ? `M${points[0].x},${points[0].y}` : ''
    let p = `M${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i], p1 = points[i + 1]
      const mx = (p0.x + p1.x) / 2
      p += ` C${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`
    }
    return p
  }

  const linePath = smoothPath(pts)
  const areaPath = linePath ? linePath + ` L${pts[pts.length - 1].x},${padT + chartH} L${pts[0].x},${padT + chartH} Z` : ''

  const gridYs = [0, 0.25, 0.5, 0.75, 1]
  const activePoint = hoverIdx !== null ? pts[hoverIdx] : null

  return (
    <div ref={containerRef} className={`rounded-2xl border overflow-hidden relative ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'}`} style={{ minHeight: 300 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dotShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#3b82f6" floodOpacity="0.4" />
          </filter>
        </defs>

        {gridYs.map(ratio => {
          const y = padT + chartH * (1 - ratio)
          return (
            <g key={ratio}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={isDark ? '#262626' : '#f1f5f9'} strokeWidth="1" strokeDasharray={ratio === 0 || ratio === 1 ? '0' : '4,3'} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="9" fill={isDark ? '#525252' : '#94a3b8'} fontFamily="monospace">
                {formatDuration(Math.round(maxVal * ratio))}
              </text>
            </g>
          )
        })}

        {areaPath && <path d={areaPath} fill="url(#areaGrad)" style={{ transition: 'opacity 0.3s' }} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />
        )}

        {pts.map((pt, i) => {
          const isActive = i === hoverIdx
          const radius = isActive ? 6 : (pt.value > 0 ? 3.5 : 2)
          return (
            <g key={i}>
              {pt.value > 0 && (
                <circle
                  cx={pt.x} cy={pt.y} r={radius + 6}
                  fill="#3b82f6"
                  opacity={isActive ? 0.12 : 0}
                  style={{ transition: 'all 0.25s ease-out', cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              )}
              <circle
                cx={pt.x} cy={pt.y} r={radius}
                fill={pt.value > 0 ? '#3b82f6' : isDark ? '#333' : '#e2e8f0'}
                stroke={isDark ? '#171717' : '#fff'}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{
                  cursor: pt.value > 0 ? 'pointer' : 'default',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  filter: isActive ? 'url(#dotShadow)' : undefined,
                }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              <text x={pt.x} y={padT + chartH + 17} textAnchor="middle" fontSize="9.5" fontWeight={isActive ? 700 : 500} fill={isActive ? '#3b82f6' : (isDark ? '#525252' : '#94a3b8')} style={{ transition: 'fill 0.2s' }}>
                {pt.date}
              </text>
            </g>
          )
        })}

        {activePoint && (
          <line
            x1={activePoint.x} y1={padT}
            x2={activePoint.x} y2={padT + chartH}
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.4"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {activePoint && (
        <div
          className={`absolute px-3 py-2 rounded-lg shadow-xl z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150 ${isDark ? 'bg-neutral-800/95 border border-blue-500/30' : 'bg-white/95 border border-blue-200'}`}
          style={{
            left: `${(activePoint.x / W) * 100}%`,
            top: `${Math.max(((activePoint.y - 56) / H) * 100, 2)}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className={`text-[10px] font-medium ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{activePoint.date}</div>
          <div className="text-sm font-bold text-blue-500 tabular-nums mt-0.5">{formatDuration(activePoint.value)}</div>
        </div>
      )}
    </div>
  )
}

const STORAGE_KEY = 'study-stats-date-range'

function getSavedRange(): { start: string; end: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function saveRange(start: string, end: string) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ start, end })) } catch {}
}

export default function StudyStatsPage() {
  const { isDark } = useTheme()
  const { records } = useTimer()

  const [viewMode, setViewMode] = useState<'item' | 'group'>('item')
  const today = new Date()
  const defaultStart = (() => { const d = new Date(today); d.setDate(d.getDate() - 29); return formatDateStr(d) })()
  const defaultEnd = formatDateStr(today)

  const savedRef = useRef<{ start: string; end: string } | null>(null)
  const initializedRef = useRef(false)

  const [startDate, setStartDateState] = useState(() => {
    const saved = getSavedRange()
    savedRef.current = saved
    return saved?.start ?? defaultStart
  })
  const [endDate, setEndDateState] = useState(() => savedRef.current?.end ?? defaultEnd)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }
    saveRange(startDate, endDate)
  }, [startDate, endDate])

  const setStartDate = useCallback((v: string) => setStartDateState(v), [])
  const setEndDate = useCallback((v: string) => setEndDateState(v), [])

  const cardBg = isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'
  const textPrimary = isDark ? 'text-white' : 'text-slate-800'
  const textMuted = isDark ? 'text-neutral-500' : 'text-slate-400'
  const inputClass = isDark ? 'bg-neutral-800 border-neutral-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-500'

  const filteredRecords = useMemo(() => {
    const startMs = new Date(startDate + 'T00:00:00').getTime()
    const endMs = new Date(endDate + 'T23:59:59').getTime()
    return records.filter(r => r.started_at >= startMs && r.started_at <= endMs)
  }, [records, startDate, endDate])

  const totalSeconds = useMemo(() => filteredRecords.reduce((s, r) => s + r.duration_seconds, 0), [filteredRecords])
  const dayCount = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00').getTime()
    const end = new Date(endDate + 'T23:59:59').getTime()
    return Math.max(Math.ceil((end - start) / 86400000) + 1, 1)
  }, [startDate, endDate])
  const avgPerDay = dayCount > 0 ? Math.round(totalSeconds / dayCount) : 0

  const itemData = useMemo(() => {
    const map = new Map<string, number>()
    filteredRecords.forEach(r => map.set(r.item_name, (map.get(r.item_name) || 0) + r.duration_seconds))
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [filteredRecords])

  const groupData = useMemo(() => {
    const map = new Map<string, number>()
    filteredRecords.forEach(r => map.set(r.group_name, (map.get(r.group_name) || 0) + r.duration_seconds))
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [filteredRecords])

  const last7Days = useMemo(() => {
    const result: { date: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const ds = formatDateStr(d)
      const start = new Date(ds + 'T00:00:00').getTime()
      const end = new Date(ds + 'T23:59:59').getTime()
      const val = records.filter(r => r.started_at >= start && r.started_at <= end).reduce((s, r) => s + r.duration_seconds, 0)
      result.push({ date: ds.slice(5).replace('-', '/'), value: val })
    }
    return result
  }, [records, today.toDateString()])

  const todayStr = formatDateStr(today)
  const todayStart = new Date(todayStr + 'T00:00:00').getTime()
  const todayEnd = new Date(todayStr + 'T23:59:59').getTime()
  const todayRecords = records.filter(r => r.started_at >= todayStart && r.started_at <= todayEnd)
  const todayTotal = todayRecords.reduce((s, r) => s + r.duration_seconds, 0)

  const todayItemData = useMemo(() => {
    const map = new Map<string, number>()
    todayRecords.forEach(r => map.set(r.item_name, (map.get(r.item_name) || 0) + r.duration_seconds))
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [todayRecords])

  const todayGroupData = useMemo(() => {
    const map = new Map<string, number>()
    todayRecords.forEach(r => map.set(r.group_name, (map.get(r.group_name) || 0) + r.duration_seconds))
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [todayRecords])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className={`text-xl font-bold ${textPrimary}`}>学习统计</h1>
        <p className={`text-sm mt-1 ${textMuted}`}>查看你的待办集学习情况，用数据驱动进步</p>
      </div>

      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className={`text-[10px] font-medium uppercase tracking-wider mb-1 block ${textMuted}`}>开始日期</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm outline-none transition-colors w-[155px] ${inputClass}`} />
          </div>
          <div>
            <label className={`text-[10px] font-medium uppercase tracking-wider mb-1 block ${textMuted}`}>结束日期</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm outline-none transition-colors w-[155px] ${inputClass}`} />
          </div>
          <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 29); setStartDate(formatDateStr(d)); setEndDate(formatDateStr(new Date())) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}>
            近30天
          </button>
          <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setStartDate(formatDateStr(d)); setEndDate(formatDateStr(new Date())) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}>
            近7天
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>总学习时长</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{formatDurationFull(totalSeconds)}</p>
        </div>
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>日均学习时长</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{formatDurationFull(avgPerDay)}</p>
        </div>
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>记录条数</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{filteredRecords.length}</p>
        </div>
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>统计天数</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{dayCount}天</p>
        </div>
      </div>

      <div className={`rounded-xl border p-1 inline-flex gap-1 ${isDark ? 'bg-neutral-800/60 border-neutral-700/40' : 'bg-slate-100 border-slate-200/60'}`}>
        {(['item', 'group'] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === mode ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : (isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-700')}`}>
            {mode === 'item' ? '按待办项' : '按待办组'}
          </button>
        ))}
      </div>

      <InteractivePieChart data={viewMode === 'item' ? itemData : groupData} isDark={isDark} />

      <div>
        <h2 className={`text-base font-semibold mb-3 ${textPrimary}`}>最近七天学习趋势</h2>
        <InteractiveLineChart data={last7Days} isDark={isDark} />
      </div>

      <div className={`rounded-2xl border p-5 space-y-4 ${cardBg}`}>
        <h2 className={`text-base font-semibold ${textPrimary}`}>今日学习情况</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={`${isDark ? 'bg-neutral-800/60' : 'bg-slate-50'} rounded-xl p-4`}>
            <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>今日总时长</p>
            <p className={`text-lg font-bold tabular-nums ${textPrimary}`}>{formatDurationFull(todayTotal)}</p>
          </div>
          <div className={`${isDark ? 'bg-neutral-800/60' : 'bg-slate-50'} rounded-xl p-4`}>
            <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>今日记录数</p>
            <p className={`text-lg font-bold tabular-nums ${textPrimary}`}>{todayRecords.length}</p>
          </div>
          <div className={`${isDark ? 'bg-neutral-800/60' : 'bg-slate-50'} rounded-xl p-4`}>
            <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>待办项数</p>
            <p className={`text-lg font-bold tabular-nums ${textPrimary}`}>{new Set(todayRecords.map(r => r.item_id)).size}</p>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className={`text-sm font-medium mb-2 ${textMuted}`}>按待办项分布</h3>
            <InteractivePieChart data={todayItemData} isDark={isDark} />
          </div>
          <div>
            <h3 className={`text-sm font-medium mb-2 ${textMuted}`}>按待办组分布</h3>
            <InteractivePieChart data={todayGroupData} isDark={isDark} />
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useTimer } from './TimerContext'
import { useTheme } from './ThemeProvider'

interface HomePageProps {
  imageCache: Record<string, string>
  hasBg?: boolean
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calcTimeLeft(target: string): TimeLeft | null {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  return `${m}m`
}

interface DayData {
  date: string
  dayOfMonth: number
  weekday: number
  seconds: number
  isToday: boolean
  isFuture: boolean
}

function HeatmapTooltip({ day, visible, isDark }: { day: DayData | null; visible: boolean; isDark: boolean }) {
  if (!day || !visible || day.isFuture) return null

  return (
    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 animate-in fade-in duration-150 ${isDark ? 'bg-neutral-800 text-neutral-200 border border-neutral-700' : 'bg-slate-800 text-white shadow-lg'}`}>
      <div className="font-medium">{day.date}</div>
      <div className={day.seconds > 0 ? 'text-blue-300' : 'text-slate-400'}>
        {day.seconds > 0 ? `学习了 ${formatDuration(day.seconds)}` : '无记录'}
        {day.isToday && ' · 今天'}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-current" style={{ borderTopColor: isDark ? '#262626' : '#1e293b' }} />
    </div>
  )
}

function DigitalClock({ timeLeft, isDarkMode }: { timeLeft: TimeLeft; isDarkMode: boolean }) {
  const h = String(timeLeft.hours).padStart(2, '0')
  const m = String(timeLeft.minutes).padStart(2, '0')
  const s = String(timeLeft.seconds).padStart(2, '0')

  const numColor = 'bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent'
  const colonColor = isDarkMode ? 'text-slate-500' : 'text-slate-400'
  const numBg = isDarkMode
    ? 'bg-[#1c1c1e] shadow-[4px_4px_8px_rgba(0,0,0,0.4),_-2px_-2px_6px_rgba(50,50,55,0.3)]'
    : 'bg-[#f0f4f8] shadow-[4px_4px_8px_rgba(163,177,198,0.4),_-2px_-2px_6px_rgba(255,255,255,0.9)]'

  return (
    <div className="flex items-center gap-0.5 mt-3">
      <span className={`inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-mono text-2xl sm:text-3xl font-bold tabular-nums tracking-wider ${numBg} ${numColor}`}>
        {h}
      </span>
      <span className={`text-2xl sm:text-3xl font-bold tabular-ns animate-pulse ${colonColor}`}>:</span>
      <span className={`inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-mono text-2xl sm:text-3xl font-bold tabular-nums tracking-wider ${numBg} ${numColor}`}>
        {m}
      </span>
      <span className={`text-2xl sm:text-3xl font-bold tabular-ns animate-pulse ${colonColor}`}>:</span>
      <span className={`inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-mono text-2xl sm:text-3xl font-bold tabular-nums tracking-wider ${numBg} ${numColor}`}>
        {s}
      </span>
    </div>
  )
}

export default function HomePage({ imageCache, hasBg = false }: HomePageProps) {
  const [examDate, setExamDate] = useState<string | null>(null)
  const [countdownName, setCountdownName] = useState('倒计时')
  const [quotes, setQuotes] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const { records } = useTimer()
  const { isDark } = useTheme()
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  const [pendingReviewCount, setPendingReviewCount] = useState(0)

  useEffect(() => {
    invoke<[string | null, string[], string | null, boolean, string]>('get_home_settings').then(([date, qs, , , name]) => {
      setExamDate(date)
      setQuotes(qs)
      setCountdownName(name || '倒计时')
    }).catch(console.error)

    Promise.all([
      invoke<any[]>('get_review_queue'),
      invoke<any[]>('get_mistakes')
    ]).then(([queue, mistakes]) => {
      const now = Date.now() / 1000
      const mistakeIds = new Set(mistakes.map((m: any) => m.id))
      let count = 0
      queue.forEach((item: any) => {
        if (item.review_stage >= 3) return
        if (!item.mistake_id || !mistakeIds.has(item.mistake_id)) return
        if (item.next_review_at && item.next_review_at > now) return
        count++
      })
      setPendingReviewCount(count)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!examDate) return
    setTimeLeft(calcTimeLeft(examDate))
    const timer = setInterval(() => setTimeLeft(calcTimeLeft(examDate)), 1000)
    return () => clearInterval(timer)
  }, [examDate])

  const nextQuote = useCallback(() => {
    if (quotes.length <= 1) return
    setQuoteIdx(i => (i + 1) % quotes.length)
  }, [quotes.length])

  const pad = (n: number) => String(n).padStart(2, '0')

  const isDarkMode = isDark && !hasBg

  const cardStyle = hasBg
    ? 'bg-white/[0.92] rounded-[24px] shadow-[6px_6px_16px_rgba(0,0,0,0.25),_-4px_-4px_12px_rgba(255,255,255,0.7)] backdrop-blur-md'
    : (isDarkMode
      ? 'bg-[#1c1c1e] rounded-[24px] shadow-[6px_6px_12px_rgba(0,0,0,0.5),_-4px_-4px_10px_rgba(50,50,55,0.3)]'
      : 'bg-[#f0f4f8] rounded-[24px] shadow-[6px_6px_12px_rgba(163,177,198,0.35),_-6px_-6px_12px_rgba(255,255,255,0.9)]')
  const textPrimary = hasBg ? 'text-slate-800' : (isDarkMode ? 'text-slate-200' : 'text-slate-700')
  const textSecondary = hasBg ? 'text-slate-500' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')
  const textMuted = hasBg ? 'text-slate-400' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')
  const activeShadow = hasBg
    ? 'active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]'
    : (isDarkMode
      ? 'active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(50,50,55,0.3)]'
      : 'active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]')
  const reviewCardStyle = pendingReviewCount > 0
    ? (hasBg
      ? 'bg-gradient-to-br from-orange-50 to-red-50 shadow-[6px_6px_12px_rgba(200,160,140,0.35),_-4px_-4px_10px_rgba(255,255,255,0.7)]'
      : (isDarkMode
        ? 'bg-gradient-to-br from-orange-900/25 to-red-900/25 shadow-[6px_6px_12px_rgba(80,40,30,0.25),_-4px_-4px_10px_rgba(45,42,48,0.3)]'
        : 'bg-gradient-to-br from-orange-50/80 to-red-50/80 shadow-[6px_6px_12px_rgba(200,160,140,0.25),_-6px_-6px_12px_rgba(255,255,255,0.9)]'))
    : cardStyle

  const now = useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const monthDays = useMemo(() => {
    const days: DayData[] = []
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const todayStr = now.toISOString().split('T')[0]

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentYear, currentMonth, d)
      const dateStr = date.toISOString().split('T')[0]
      const dayRecords = records.filter(r => {
        const rDate = new Date(r.started_at).toISOString().split('T')[0]
        return rDate === dateStr
      })
      const totalSeconds = dayRecords.reduce((s, r) => s + r.duration_seconds, 0)

      days.push({
        date: dateStr,
        dayOfMonth: d,
        weekday: date.getDay(),
        seconds: totalSeconds,
        isToday: dateStr === todayStr,
        isFuture: date > now,
      })
    }
    return days
  }, [currentYear, currentMonth, records, now])

  const monthTotalSeconds = useMemo(() => monthDays.reduce((s, d) => s + d.seconds, 0), [monthDays])
  const activeDays = useMemo(() => monthDays.filter(d => d.seconds > 0 && !d.isFuture).length, [monthDays])

  const getHeatColor = (seconds: number, isFuture: boolean) => {
    if (isFuture || seconds === 0) return isDarkMode ? 'bg-[#2a2a2c]' : 'bg-slate-200'
    if (seconds < 300) return isDarkMode ? 'bg-blue-900/40' : 'bg-blue-200'
    if (seconds < 1800) return isDarkMode ? 'bg-blue-800/50' : 'bg-blue-300'
    if (seconds < 3600) return isDarkMode ? 'bg-blue-700/60' : 'bg-blue-400'
    if (seconds < 7200) return isDarkMode ? 'bg-blue-600/70' : 'bg-blue-500'
    return isDarkMode ? 'bg-blue-500/80' : 'bg-blue-600'
  }

  const handleDayClick = (day: DayData) => {
    if (day.isFuture || day.seconds === 0) return
    window.dispatchEvent(new CustomEvent('navigate-to-stats', { detail: { date: day.date } }))
  }

  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <div className="h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="flex flex-col items-center gap-3">

          {!hasBg && (
            <div className="text-center mb-1">
              <h1 className={`text-xl font-bold ${isDarkMode ? 'bg-gradient-to-r from-blue-400 to-indigo-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} bg-clip-text text-transparent`}>
                言念错题本
              </h1>
              <p className={`text-sm mt-0.5 ${textMuted}`}>记录每一道错题，成就更好的自己</p>
            </div>
          )}

          <div className="flex gap-4 items-start">

            <div className={`rounded-[24px] p-5 ${cardStyle} ${activeShadow} transition-all hover:scale-[1.005] active:scale-[0.998]`}>
              <h2 className={`text-base font-bold mb-3 text-center ${textPrimary}`}>{countdownName}</h2>
              {examDate ? (
                timeLeft ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline justify-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                      <span className="text-5xl sm:text-6xl font-black tabular-nums leading-none tracking-tight">{timeLeft.days}</span>
                      <span className="text-lg sm:text-xl font-bold">天</span>
                    </div>
                    <DigitalClock timeLeft={timeLeft} isDarkMode={isDarkMode} />
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-4xl">🎉</span>
                    <p className={`text-sm font-semibold mt-2 ${textSecondary}`}>考研日已到，祝你金榜题名！</p>
                  </div>
                )
              ) : (
                <div className="text-center py-6">
                  <svg className={`w-8 h-8 mx-auto mb-2 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <p className={`${textSecondary} text-sm`}>尚未设置考研日期</p>
                </div>
              )}
            </div>

            <div
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-review'))}
              className={`rounded-[20px] p-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] w-[140px] shrink-0 h-fit self-start ${reviewCardStyle} ${activeShadow}`}
            >
              <div className="flex flex-col items-center text-center gap-0.5">
                <h2 className={`text-sm font-semibold ${textPrimary}`}>错题回顾</h2>
                {pendingReviewCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                )}
                <p className={`text-3xl font-black tabular-nums leading-tight ${pendingReviewCount > 0 ? 'text-orange-600' : textPrimary}`}>
                  {pendingReviewCount}
                </p>
                <p className={`text-xs ${textMuted}`}>今日待复习</p>
              </div>
            </div>

            <div className={`rounded-[20px] p-3.5 w-fit ${cardStyle} ${activeShadow} transition-all hover:scale-[1.005] active:scale-[0.998]`}>
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between mb-1.5 w-full">
                  <div>
                    <h3 className={`text-sm font-semibold ${textPrimary}`}>{currentYear}年{currentMonth + 1}月 热力图</h3>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                      共{formatDuration(monthTotalSeconds)} · {activeDays}天活跃 · 日均{activeDays > 0 ? formatDuration(Math.round(monthTotalSeconds / activeDays)) : '0m'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                      {[0, 1, 2, 3, 4].map(i => {
                        const colors = isDarkMode
                          ? ['bg-[#2a2a2c]', 'bg-blue-900/40', 'bg-blue-800/50', 'bg-blue-700/60', 'bg-blue-600/70']
                          : ['bg-slate-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600']
                        return <div key={i} className={`w-[10px] h-[10px] rounded-sm ${colors[i]}`} />
                      })}
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-[3px]" style={{ width: 'fit-content' }}>
                {weekdayLabels.map(label => (
                  <div key={label} className={`w-[24px] h-[18px] text-center text-[9px] leading-none flex items-center justify-center font-medium ${textMuted}`}>{label}</div>
                ))}
                {(() => {
                  const firstDay = monthDays[0]
                  if (!firstDay) return null
                  const offset = firstDay.weekday === 0 ? 6 : firstDay.weekday - 1
                  return Array.from({ length: offset }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-[24px] h-[24px]" />
                  ))
                })()}
                {monthDays.map(day => {
                  const color = getHeatColor(day.seconds, day.isFuture)
                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => handleDayClick(day)}
                      className={`relative w-[24px] h-[24px] rounded cursor-pointer transition-all hover:scale-125 hover:z-20 hover:shadow-md ${color} ${day.isToday ? 'ring-1.5 ring-blue-400' : ''}`}
                    >
                      <HeatmapTooltip day={hoveredDay} visible={hoveredDay?.date === day.date} isDark={isDark} />
                    </div>
                  )
                })}
                </div>
              </div>
            </div>
          </div>

          {quotes.length > 0 && (
            <div onClick={nextQuote} className={`rounded-[20px] px-4 py-3 cursor-pointer transition-all hover:scale-[1.005] active:scale-[0.998] ${activeShadow} ${cardStyle} flex items-start gap-2`}>
              <svg className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
              <div>
                <p className={`text-sm leading-relaxed italic ${textPrimary}`}>&ldquo;{quotes[quoteIdx]}&rdquo;</p>
                {quotes.length > 1 && <p className={`text-xs mt-1 ${textMuted}`}>点击换句 · {quoteIdx + 1}/{quotes.length}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

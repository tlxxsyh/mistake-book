import { useTheme } from './ThemeProvider'
import { useTimer } from './TimerContext'

function formatTimeShort(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function TimerBar() {
  const { isDark } = useTheme()
  const { running, paused, currentItemName, groupName, elapsedSeconds, totalSeconds, timerType } = useTimer()

  if (!running) return null

  const isCountdown = totalSeconds !== null && totalSeconds > 0
  const displayTime = isCountdown ? Math.max(totalSeconds! - elapsedSeconds, 0) : elapsedSeconds
  const hasHomeBg = document.querySelector('[style*="background-image"]') !== null
  const isDarkMode = isDark && !hasHomeBg

  return (
    <div className={`fixed top-0 left-[68px] right-0 z-[100] flex items-center justify-between px-5 py-2.5 border-b shadow-sm animate-in slide-in-from-top fade-in duration-300 ${hasHomeBg ? 'bg-white/[0.06] backdrop-blur-sm' : (isDarkMode ? 'bg-[#1c1c1e]/95 backdrop-blur-sm shadow-[0px_4px_12px_rgba(0,0,0,0.4)]' : 'bg-[#f0f4f8]/95 backdrop-blur-sm shadow-[0px_4px_12px_rgba(163,177,198,0.25)]')}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500'} ${paused ? '' : 'animate-pulse'}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{currentItemName || '计时中'}</p>
          {groupName && <p className="text-[11px] text-slate-400 dark:text-neutral-500 truncate">{groupName}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold tabular-nums tracking-wider min-w-[70px] text-right ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {formatTimeShort(displayTime)}
        </span>
        {isCountdown && (
          <span className={`text-xs tabular-nums ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
            / {formatTimeShort(totalSeconds!)}
          </span>
        )}
        {paused && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">已暂停</span>
        )}
      </div>
    </div>
  )
}

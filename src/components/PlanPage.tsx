import { useState, useEffect, useMemo, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useTheme } from './ThemeProvider'
import { useNotify } from './NotifyProvider'

interface PlanItem {
  id: string
  title: string
  scope: string
  target_date: string
  completed: boolean
  created_at: number
}

type ViewMode = 'day' | 'week' | 'month'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const nd = new Date(monday)
    nd.setDate(monday.getDate() + i)
    dates.push(nd)
  }
  return dates
}

function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = []
  const firstDay = new Date(year, month, 1)
  let startWeekday = firstDay.getDay()
  if (startWeekday === 0) startWeekday = 7
  const prevMonth = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    dates.push(new Date(year, month - 1, prevMonth - i))
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(new Date(year, month, d))
  }
  while (dates.length % 7 !== 0) {
    const nextLen = dates.length - (startWeekday - 1 + daysInMonth)
    dates.push(new Date(year, month + 1, nextLen + 1))
  }
  return dates
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export default function PlanPage() {
  const { isDark } = useTheme()
  const { message } = useNotify()
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null)
  const [inputTitle, setInputTitle] = useState('')
  const [inputScope, setInputScope] = useState('daily')
  const [inputTargetDate, setInputTargetDate] = useState('')

  const cardBg = isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'
  const textPrimary = isDark ? 'text-white' : 'text-slate-800'
  const textSecondary = isDark ? 'text-neutral-300' : 'text-slate-600'
  const textMuted = isDark ? 'text-neutral-500' : 'text-slate-400'

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = useCallback(async () => {
    try {
      const data = await invoke<PlanItem[]>('get_plans')
      setPlans(data.sort((a, b) => a.target_date.localeCompare(b.target_date)))
    } catch {}
  }, [])

  const todayStr = useMemo(() => formatDate(new Date()), [])

  const plansByDate = useMemo(() => {
    const map = new Map<string, PlanItem[]>()
    plans.forEach(p => {
      const arr = map.get(p.target_date) || []
      arr.push(p)
      map.set(p.target_date, arr)
    })
    return map
  }, [plans])

  const currentStr = useMemo(() => formatDate(currentDate), [currentDate])

  const dayPlans = useMemo(
    () => plansByDate.get(currentStr) || [],
    [plansByDate, currentStr]
  )

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const monthDates = useMemo(
    () => getMonthDates(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  )

  const dayCompletedCount = dayPlans.filter(p => p.completed).length
  const dayTotalCount = dayPlans.length

  const weeklyStats = useMemo(() => {
    let total = 0
    let done = 0
    weekDates.forEach(d => {
      const ds = formatDate(d)
      const items = plansByDate.get(ds) || []
      total += items.length
      done += items.filter(p => p.completed).length
    })
    return { total, done }
  }, [weekDates, plansByDate])

  const monthlyStats = useMemo(() => {
    let total = 0
    let done = 0
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth()
    plans.forEach(p => {
      const pd = new Date(p.target_date + 'T00:00:00')
      if (pd.getFullYear() === y && pd.getMonth() === m) {
        total++
        if (p.completed) done++
      }
    })
    return { total, done }
  }, [plans, currentDate])

  const weeklyPlans = useMemo(() => {
    const monday = weekDates[0]
    const mondayStr = formatDate(monday)
    return plans.filter(p => p.scope === 'weekly' && p.target_date === mondayStr)
  }, [plans, weekDates])

  const monthlyPlans = useMemo(() => {
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth()
    const monthFirst = `${y}-${String(m + 1).padStart(2, '0')}-01`
    return plans.filter(p => p.scope === 'monthly' && p.target_date === monthFirst)
  }, [plans, currentDate])

  const allTimeStats = useMemo(() => {
    const total = plans.length
    const done = plans.filter(p => p.completed).length
    return { total, done }
  }, [plans])

  const handleAdd = async () => {
    if (!inputTitle.trim()) return
    const plan: PlanItem = {
      id: genId(),
      title: inputTitle.trim(),
      scope: inputScope,
      target_date: inputTargetDate || currentStr,
      completed: false,
      created_at: Date.now(),
    }
    try {
      const updated = await invoke<PlanItem[]>('add_plan', { plan })
      setPlans(updated.sort((a, b) => a.target_date.localeCompare(b.target_date)))
    } catch {}
    setShowAddModal(false)
    setEditingPlan(null)
    setInputTitle('')
    setInputScope('daily')
    setInputTargetDate('')
  }

  const handleToggle = async (id: string) => {
    try {
      const [, updated] = await invoke<[boolean, PlanItem[]]>('toggle_plan_complete', { id })
      setPlans(updated.sort((a, b) => a.target_date.localeCompare(b.target_date)))
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条学习计划吗？')) return
    try {
      const updated = await invoke<PlanItem[]>('delete_plan', { id })
      setPlans(updated.sort((a, b) => a.target_date.localeCompare(b.target_date)))
    } catch {
      message('删除失败，请重试', 'error')
    }
  }

  const handleEdit = (plan: PlanItem) => {
    setEditingPlan(plan)
    setInputTitle(plan.title)
    setInputScope(plan.scope || 'daily')
    setInputTargetDate(plan.target_date)
    setShowAddModal(true)
  }

  const handleUpdate = async () => {
    if (!editingPlan || !inputTitle.trim()) return
    try {
      const updated = await invoke<PlanItem[]>('update_plan', {
        id: editingPlan.id,
        title: inputTitle.trim(),
        scope: inputScope,
        target_date: inputTargetDate,
      })
      setPlans(updated.sort((a, b) => a.target_date.localeCompare(b.target_date)))
    } catch {}
    setShowAddModal(false)
    setEditingPlan(null)
    setInputTitle('')
    setInputScope('daily')
    setInputTargetDate('')
  }

  const openAddForDate = (date?: string) => {
    setEditingPlan(null)
    setInputTitle('')
    const scope = viewMode === 'day' ? 'daily' : viewMode === 'week' ? 'weekly' : 'monthly'
    setInputScope(scope)
    if (scope === 'weekly') {
      const monday = weekDates[0]
      setInputTargetDate(formatDate(monday))
    } else if (scope === 'monthly') {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      setInputTargetDate(`${y}-${String(m + 1).padStart(2, '0')}-01`)
    } else {
      setInputTargetDate(date || currentStr)
    }
    setShowAddModal(true)
  }

  const navigateDate = (dir: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (viewMode === 'day') d.setDate(d.getDate() + dir)
      else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  const goToday = () => setCurrentDate(new Date())

  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      const d = currentDate
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
    }
    if (viewMode === 'week') {
      const wd = weekDates
      return `${formatDate(wd[0])} ~ ${formatDate(wd[6])}`
    }
    return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
  }, [viewMode, currentDate, weekDates])

  function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
      <div className={`${cardBg} rounded-xl border p-4`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{label}</p>
        <p className={`text-lg font-bold tabular-nums ${textPrimary}`}>{value}</p>
        {sub && <p className={`text-[10px] mt-0.5 ${textMuted}`}>{sub}</p>}
      </div>
    )
  }

  function ProgressBar({ done, total }: { done: number; total: number }) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-medium tabular-nums shrink-0 w-10 text-right ${textSecondary}`}>
          {done}/{total}
        </span>
      </div>
    )
  }

  function GoalRow({ plan, color }: { plan: PlanItem; color: 'green' | 'purple' }) {
    const badgeClass = color === 'purple'
      ? isDark ? 'bg-purple-900/30 text-purple-300 border-purple-800/40' : 'bg-purple-50 text-purple-700 border-purple-200'
      : isDark ? 'bg-green-900/30 text-green-300 border-green-800/40' : 'bg-green-50 text-green-700 border-green-200'
    const bgClass = color === 'purple'
      ? isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-100'
      : isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-100'

    return (
      <div className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${plan.completed ? (isDark ? 'opacity-50' : 'opacity-50') : ''} ${bgClass}`}>
        <button
          onClick={() => handleToggle(plan.id)}
          className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            plan.completed
              ? (color === 'purple' ? 'bg-purple-500 border-purple-500' : 'bg-green-500 border-green-500') + ' text-white'
              : isDark ? 'border-neutral-600 hover:border-blue-400' : 'border-slate-300 hover:border-blue-400'
          }`}
        >
          {plan.completed && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
        <span className={`flex-1 text-sm font-medium transition-all ${plan.completed ? `line-through ${isDark ? 'text-neutral-600' : 'text-slate-400'}` : textPrimary}`}>
          {plan.title}
        </span>
        <span className={`text-[10px] shrink-0 px-2 py-0.5 rounded-full font-medium border ${badgeClass}`}>
          {color === 'purple' ? '月目标' : '周目标'}
        </span>
        <button onClick={() => handleEdit(plan)} className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${textMuted}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
        </button>
        <button onClick={() => handleDelete(plan.id)} className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
        </button>
      </div>
    )
  }

  function PlanRow({ plan }: { plan: PlanItem }) {
    return (
      <div
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          plan.completed
            ? isDark ? 'bg-neutral-800/50' : 'bg-slate-50'
            : isDark ? 'bg-neutral-800/80 hover:bg-neutral-800' : 'bg-blue-50/50 hover:bg-blue-50'
        }`}
      >
        <button
          onClick={() => handleToggle(plan.id)}
          className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            plan.completed
              ? 'bg-blue-500 border-blue-500 text-white'
              : isDark ? 'border-neutral-600 hover:border-blue-400' : 'border-slate-300 hover:border-blue-400'
          }`}
        >
          {plan.completed && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
        <span
          className={`flex-1 text-sm transition-all ${
            plan.completed
              ? `line-through ${isDark ? 'text-neutral-600' : 'text-slate-400'}`
              : textPrimary
          }`}
        >
          {plan.title}
        </span>
        <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded ${
          plan.scope === 'monthly'
            ? isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-600'
            : plan.scope === 'weekly'
              ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
              : isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-600'
        }`}>
          {plan.scope === 'monthly' ? '月' : plan.scope === 'weekly' ? '周' : '日'}
        </span>
        <button
          onClick={() => handleEdit(plan)}
          className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${textMuted}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
        <button
          onClick={() => handleDelete(plan.id)}
          className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    )
  }

  function DayCell({ date, isCurrentMonth }: { date: Date; isCurrentMonth: boolean }) {
    const ds = formatDate(date)
    const items = plansByDate.get(ds) || []
    const done = items.filter(p => p.completed).length
    const isToday = ds === todayStr
    const isSelected = ds === currentStr && viewMode === 'month'

    return (
      <div
        onClick={() => { setCurrentDate(date); setViewMode('day'); }}
        className={`min-h-[72px] p-1.5 rounded-xl border cursor-pointer transition-all ${
          isSelected
            ? isDark ? 'bg-blue-900/30 border-blue-500/40' : 'bg-blue-50 border-blue-200'
            : isToday
              ? isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-amber-50/50 border-amber-200/60'
              : isCurrentMonth
                ? isDark ? 'border-neutral-800 hover:border-neutral-700' : 'border-slate-100 hover:border-slate-200'
                : isDark ? 'border-transparent' : 'border-transparent'
        } ${!isCurrentMonth ? 'opacity-35' : ''}`}
      >
        <span className={`text-[11px] font-medium leading-none ${
          isToday
            ? 'text-blue-500 font-bold'
            : isCurrentMonth
              ? textSecondary
              : textMuted
        }`}>
          {date.getDate()}
        </span>
        {items.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {items.slice(0, 3).map(p => (
              <div
                key={p.id}
                className={`text-[9px] truncate px-1 py-px rounded ${
                  p.completed
                    ? isDark ? 'bg-neutral-700/50 text-neutral-500 line-through' : 'bg-slate-100 text-slate-400 line-through'
                    : isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {p.title}
              </div>
            ))}
            {items.length > 3 && (
              <div className={`text-[8px] ${textMuted}`}>+{items.length - 3}</div>
            )}
          </div>
        )}
        {items.length > 0 && (
          <div className="mt-0.5 flex gap-0.5">
            <div className={`h-0.5 rounded-full flex-1 ${done > 0 ? 'bg-blue-500' : isDark ? 'bg-neutral-700' : 'bg-slate-200'}`} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${textPrimary}`}>学习计划</h1>
          <p className={`text-sm mt-0.5 ${textMuted}`}>制定计划，追踪进度，让每一天都有目标</p>
        </div>
        <button
          onClick={() => openAddForDate()}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1.5 ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新建计划
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="总计划数"
          value={String(allTimeStats.total)}
          sub={`${allTimeStats.done} 已完成`}
        />
        <StatCard
          label="今日完成"
          value={`${dayCompletedCount}/${dayTotalCount}`}
          sub={dayTotalCount > 0 ? `完成率 ${Math.round(dayCompletedCount / dayTotalCount * 100)}%` : undefined}
        />
        <StatCard
          label="本周完成"
          value={`${weeklyStats.done}/${weeklyStats.total}`}
          sub={weeklyStats.total > 0 ? `完成率 ${Math.round(weeklyStats.done / weeklyStats.total * 100)}%` : undefined}
        />
        <StatCard
          label="本月完成"
          value={`${monthlyStats.done}/${monthlyStats.total}`}
          sub={monthlyStats.total > 0 ? `完成率 ${Math.round(monthlyStats.done / monthlyStats.total * 100)}%` : undefined}
        />
      </div>

      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-neutral-800' : 'border-slate-100'} flex-wrap gap-3`}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigateDate(-1)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={goToday} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}>
              今天
            </button>
            <span className={`text-sm font-semibold min-w-[160px] text-center ${textPrimary}`}>{dateLabel}</span>
            <button onClick={() => navigateDate(1)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          <div className={`rounded-lg p-0.5 flex ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
            {([
              { key: 'day' as ViewMode, label: '日' },
              { key: 'week' as ViewMode, label: '周' },
              { key: 'month' as ViewMode, label: '月' },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setViewMode(m.key)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === m.key
                    ? 'bg-blue-500 text-white shadow-sm'
                    : isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {viewMode === 'day' && (
            <div className="space-y-3">
              <ProgressBar done={dayCompletedCount} total={dayTotalCount} />
              {dayPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className={`w-12 h-12 mb-3 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <p className={`text-sm ${textMuted}`}>今天还没有计划</p>
                  <button
                    onClick={() => openAddForDate()}
                    className={`mt-3 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isDark ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    添加今日计划
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayPlans.map(p => <PlanRow key={p.id} plan={p} />)}
                  <button
                    onClick={() => openAddForDate()}
                    className={`w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-medium transition-colors ${
                      isDark ? 'border-neutral-700 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}
                  >
                    + 添加计划
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'week' && (
            <div className="space-y-5">
              <div className={`${isDark ? 'bg-green-900/10 border-green-800/30' : 'bg-emerald-50 border-emerald-100'} rounded-xl border p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-500'}`} />
                    <span className={`text-sm font-semibold ${textPrimary}`}>本周目标</span>
                  </div>
                  <button
                    onClick={() => openAddForDate()}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${isDark ? 'text-green-400 hover:bg-green-900/20' : 'text-green-600 hover:bg-green-100'}`}
                  >
                    + 添加周目标
                  </button>
                </div>
                {weeklyPlans.length === 0 ? (
                  <p className={`text-xs py-3 text-center ${textMuted}`}>暂无周目标，点击上方按钮添加</p>
                ) : (
                  <div className="space-y-2">
                    {weeklyPlans.map(p => <GoalRow key={p.id} plan={p} color="green" />)}
                  </div>
                )}
              </div>

              <div>
                <h3 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${textSecondary}`}>
                  <svg className={`w-3.5 h-3.5 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                  每日计划
                </h3>
                <ProgressBar done={weeklyStats.done} total={weeklyStats.total} />
                <div className="grid grid-cols-7 gap-2 mt-3">
                {WEEKDAY_LABELS.map(label => (
                  <div key={label} className={`text-center text-[11px] font-medium pb-1.5 ${textMuted}`}>{label}</div>
                ))}
                {weekDates.map(d => {
                  const ds = formatDate(d)
                  const items = plansByDate.get(ds) || []
                  const done = items.filter(p => p.completed).length
                  const isToday = ds === todayStr
                  return (
                    <div
                      key={ds}
                      onClick={() => { setCurrentDate(d); setViewMode('day'); }}
                      className={`rounded-xl border p-2 cursor-pointer transition-all ${
                        isToday
                          ? isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                          : isDark ? 'bg-neutral-800/50 border-neutral-800 hover:border-neutral-700' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`text-xs font-semibold text-center mb-1 ${isToday ? 'text-blue-500' : textPrimary}`}>
                        {d.getDate()}
                      </div>
                      {items.length > 0 ? (
                        <>
                          <div className="space-y-0.5">
                            {items.slice(0, 2).map(p => (
                              <div key={p.id} className={`text-[9px] truncate px-1 py-px rounded ${p.completed ? (isDark ? 'bg-neutral-700/50 text-neutral-500 line-through' : 'bg-slate-200 text-slate-400 line-through') : (isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700')}`}>
                                {p.title}
                              </div>
                            ))}
                            {items.length > 2 && <div className={`text-[8px] ${textMuted}`}>+{items.length - 2}</div>}
                          </div>
                          <div className="mt-1 h-1 rounded-full overflow-hidden bg-slate-100 dark:bg-neutral-800">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${items.length > 0 ? Math.round(done / items.length * 100) : 0}%` }} />
                          </div>
                        </>
                      ) : (
                        <div className="py-3 flex items-center justify-center">
                          <div className={`w-4 h-[1px] rounded ${isDark ? 'bg-neutral-700' : 'bg-slate-200'}`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              </div>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="space-y-5">
              <div className={`${isDark ? 'bg-purple-900/10 border-purple-800/30' : 'bg-violet-50 border-violet-100'} rounded-xl border p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'}`} />
                    <span className={`text-sm font-semibold ${textPrimary}`}>本月目标</span>
                  </div>
                  <button
                    onClick={() => openAddForDate()}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${isDark ? 'text-purple-400 hover:bg-purple-900/20' : 'text-purple-600 hover:bg-purple-100'}`}
                  >
                    + 添加月目标
                  </button>
                </div>
                {monthlyPlans.length === 0 ? (
                  <p className={`text-xs py-3 text-center ${textMuted}`}>暂无月目标，点击上方按钮添加</p>
                ) : (
                  <div className="space-y-2">
                    {monthlyPlans.map(p => <GoalRow key={p.id} plan={p} color="purple" />)}
                  </div>
                )}
              </div>

              <div>
                <h3 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${textSecondary}`}>
                  <svg className={`w-3.5 h-3.5 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                  日历总览
                </h3>
                <ProgressBar done={monthlyStats.done} total={monthlyStats.total} />
                <div className="grid grid-cols-7 gap-1.5 mt-3">
                {WEEKDAY_LABELS.map(label => (
                  <div key={label} className={`text-center text-[11px] font-medium py-1 ${textMuted}`}>{label}</div>
                ))}
                {monthDates.map(d => {
                  const ds = formatDate(d)
                  const isCurrentMonth = d.getMonth() === currentDate.getMonth()
                  return <DayCell key={ds} date={d} isCurrentMonth={isCurrentMonth} />
                })}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingPlan(null); }} />
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-5 ${cardBg}`}>
            <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>
              {editingPlan ? '编辑计划' : '新建计划'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>计划内容</label>
                <input
                  autoFocus
                  value={inputTitle}
                  onChange={e => setInputTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') editingPlan ? handleUpdate() : handleAdd() }}
                  placeholder="输入计划内容..."
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${
                    isDark
                      ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-400'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>计划范围</label>
                  <select
                    value={inputScope}
                    onChange={e => setInputScope(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer ${
                      isDark
                        ? 'bg-neutral-800 border-neutral-700 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400'
                    }`}
                  >
                    <option value="daily">日计划</option>
                    <option value="weekly">周计划</option>
                    <option value="monthly">月计划</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>目标日期</label>
                  <input
                    type="date"
                    value={inputTargetDate}
                    onChange={e => setInputTargetDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border outline-none cursor-pointer ${
                      isDark
                        ? 'bg-neutral-800 border-neutral-700 text-white focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:invert'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400'
                    }`}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-5">
              <button
                onClick={() => { setShowAddModal(false); setEditingPlan(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                取消
              </button>
              <button
                onClick={editingPlan ? handleUpdate : handleAdd}
                disabled={!inputTitle.trim()}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  inputTitle.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : isDark ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {editingPlan ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

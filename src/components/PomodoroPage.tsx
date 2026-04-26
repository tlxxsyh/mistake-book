import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useTheme } from './ThemeProvider'
import { useTimer, type TimerType, type TodoGroupData, type TodoItemData } from './TimerContext'
import { useNotify } from './NotifyProvider'

const TIMER_OPTIONS: { value: TimerType; label: string }[] = [
  { value: 'count_up', label: '正向计时' },
  { value: 'countdown_25', label: '倒计时 25 分钟' },
  { value: 'countdown_35', label: '倒计时 35 分钟' },
  { value: 'countdown_custom', label: '自定义倒计时' },
]

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function CircularTimer({ elapsed, total, running, paused }: { elapsed: number; total: number | null; running: boolean; paused: boolean }) {
  const { isDark } = useTheme()
  const pct = total ? Math.min((elapsed / total) * 100, 100) : (elapsed % 3600) / 36
  const circumference = 2 * Math.PI * 120
  const offset = circumference - (pct / 100) * circumference
  const isCountdown = total !== null && total > 0

  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
        <circle cx="140" cy="140" r="120" fill="none" stroke={isDark ? '#262626' : '#f1f5f9'} strokeWidth="8" />
        <circle cx="140" cy="140" r="120" fill="none" stroke={running && !paused ? '#3b82f6' : (paused ? '#f59e0b' : '#94a3b8')} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-bold tabular-nums tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>{formatTime(isCountdown && total ? Math.max(total - elapsed, 0) : elapsed)}</span>
        {total && isCountdown && (
          <span className={`text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>目标 {formatTime(total)}</span>
        )}
        <span className={`text-xs mt-1.5 px-3 py-0.5 rounded-full ${running && !paused ? 'bg-blue-500/15 text-blue-500' : (paused ? 'bg-amber-500/15 text-amber-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500')}`}>
          {running && !paused ? '计时中...' : (paused ? '已暂停' : '准备就绪')}
        </span>
      </div>
    </div>
  )
}

export default function PomodoroPage() {
  const { isDark } = useTheme()
  const { message } = useNotify()
  const {
    groups, items, running, paused, currentItemId, currentItemName, groupName,
    elapsedSeconds, totalSeconds,
    startTimer, pauseTimer, resumeTimer, stopTimer, saveGroupsAndItems,
  } = useTimer()

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [editingItem, setEditingItem] = useState<{ item: TodoItemData; group: TodoGroupData } | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)

  const cardBg = isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'
  const inputClass = isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-500'
  const textMuted = isDark ? 'text-neutral-500' : 'text-slate-400'
  const textPrimary = isDark ? 'text-white' : 'text-slate-800'

  const activeItems = items.filter(i => i.group_id === activeGroupId)
  const activeGroup = groups.find(g => g.id === activeGroupId)
  const selectedItem = items.find(i => i.id === selectedItemId)

  const handleAddGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    const group: TodoGroupData = { id: uuidv4(), name, sort_order: groups.length }
    await saveGroupsAndItems([...groups, group], items)
    setNewGroupName(''); setShowAddGroup(false); setActiveGroupId(group.id)
  }

  const handleDeleteGroup = async (gid: string) => {
    if (running) return
    if (!confirm('确定要删除这个待办分组吗？分组下所有待办也将被删除。')) return
    const newGroups = groups.filter(g => g.id !== gid)
    const newItems = items.filter(i => i.group_id !== gid)
    await saveGroupsAndItems(newGroups, newItems)
    if (activeGroupId === gid) setActiveGroupId(null)
    if (selectedItem?.group_id === gid) setSelectedItemId(null)
  }

  const handleSaveItem = async (item: TodoItemData) => {
    if (!activeGroup) return
    if (editingItem) {
      const updated = items.map(i => i.id === item.id ? item : i)
      await saveGroupsAndItems(groups, updated)
    } else {
      await saveGroupsAndItems(groups, [...items, { ...item, id: uuidv4(), group_id: activeGroup.id }])
    }
    setEditingItem(null); setShowAddItem(false)
  }

  const handleDeleteItem = async (iid: string) => {
    if (running || currentItemId === iid) return
    if (!confirm('确定要删除这个待办事项吗？')) return
    await saveGroupsAndItems(groups, items.filter(i => i.id !== iid))
    if (selectedItemId === iid) setSelectedItemId(null)
  }

  const handleSelectItem = (item: TodoItemData) => {
    if (running) return
    setSelectedItemId(item.id)
  }

  const handleStartTimer = () => {
    if (!selectedItem || !activeGroup) return
    startTimer(selectedItem, activeGroup)
    message(`已开始计时：${selectedItem.name}`, 'success')
  }

  const handlePauseTimer = () => {
    pauseTimer()
    message('计时已暂停', 'info')
  }

  const handleResumeTimer = () => {
    resumeTimer()
    message('计时已继续', 'success')
  }

  const handleStopTimer = () => {
    if (elapsedSeconds < 60) {
      message('学习时长不足1分钟，本次记录将不计入统计', 'warning')
    } else {
      const mins = Math.floor(elapsedSeconds / 60)
      const secs = elapsedSeconds % 60
      message(`本次学习时长：${mins}分${secs > 0 ? `${secs}秒` : ''}，已保存到统计`, 'success')
    }
    stopTimer()
    setSelectedItemId(null)
  }

  const getTimerLabel = (type: TimerType, customMin?: number) => {
    const found = TIMER_OPTIONS.find(o => o.value === type)
    if (found) return found.label
    if (type === 'countdown_custom') return `自定义 ${customMin}分`
    return type
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full p-6 overflow-hidden">
      <aside className={`w-full lg:w-[340px] shrink-0 rounded-2xl border shadow-sm overflow-y-auto ${cardBg}`}>
        <div className={`p-4 border-b ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-base font-semibold ${textPrimary}`}>待办事项</h2>
            {!running && (
              <button onClick={() => { setShowAddGroup(true); setNewGroupName('') }} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-blue-400' : 'hover:bg-slate-100 text-slate-400 hover:text-blue-500'}`} title="新建组">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </button>
            )}
          </div>

          {showAddGroup && (
            <div className="flex gap-2 mb-3">
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddGroup()} placeholder="组名称..." className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputClass}`} autoFocus />
              <button onClick={handleAddGroup} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">确定</button>
              <button onClick={() => setShowAddGroup(false)} className={`px-3 py-2 rounded-xl text-sm ${textMuted}`}>✕</button>
            </div>
          )}

          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {groups.length === 0 && !showAddGroup && (
              <p className={`text-sm text-center py-6 ${textMuted}`}>还没有待办组，点击 + 新建</p>
            )}
            {groups.map(g => (
              <div key={g.id} onClick={() => { setActiveGroupId(g.id); setShowAddItem(false) }} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeGroupId === g.id ? (isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700') : (isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-slate-50 text-slate-600')}`}>
                <span className="text-sm font-medium truncate">{g.name}</span>
                <span className={`text-xs shrink-0 ml-2 ${textMuted}`}>{items.filter(i => i.group_id === g.id).length}</span>
              </div>
            ))}
          </div>
        </div>

        {activeGroup && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${textPrimary}`}>{activeGroup.name}</h3>
              {!running && (
                <button onClick={() => { setShowAddItem(true); setEditingItem(null) }} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-green-400' : 'hover:bg-slate-100 text-slate-400 hover:text-green-500'}`} title="新建事项">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </button>
              )}
            </div>

            {showAddItem && (
              <ItemForm group={activeGroup} onSave={handleSaveItem} onCancel={() => setShowAddItem(false)} />
            )}

            {editingItem && (
              <ItemForm group={editingItem.group} initial={editingItem.item} onSave={handleSaveItem} onCancel={() => setEditingItem(null)} />
            )}

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {activeItems.length === 0 && !showAddItem && (
                <p className={`text-xs text-center py-4 ${textMuted}`}>暂无事项</p>
              )}
              {activeItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    currentItemId === item.id
                      ? (isDark ? 'bg-emerald-900/20 border border-emerald-800/40' : 'bg-emerald-50 border border-emerald-200')
                      : selectedItemId === item.id
                        ? (isDark ? 'bg-blue-900/20 border border-blue-800/40' : 'bg-blue-50 border border-blue-200')
                        : (isDark ? 'hover:bg-neutral-800' : 'hover:bg-slate-50')
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${textPrimary}`}>{item.name}</p>
                    <p className={`text-[11px] mt-0.5 ${textMuted}`}>{getTimerLabel(item.timer_type, item.custom_minutes)}</p>
                  </div>
                  {!running && selectedItemId === item.id && (
                    <div className={`w-2 h-2 rounded-full shrink-0 ml-2 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
                  )}
                  {!running && selectedItemId !== item.id && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingItem({ item, group: activeGroup }) }} className={`p-1 rounded-md hover:bg-blue-500/10 ${isDark ? 'text-blue-400' : 'text-blue-500'} transition-colors`} title="编辑">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id) }} className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-colors" title="删除">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {activeGroup && !running && (
              <button onClick={() => handleDeleteGroup(activeGroup.id)} className={`w-full mt-3 py-2 text-xs rounded-xl transition-colors ${isDark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-900/20' : 'text-red-400/60 hover:text-red-500 hover:bg-red-50'}`}>
                删除 "{activeGroup.name}" 组
              </button>
            )}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center">
        {running ? (
          <div className="w-full max-w-[420px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CircularTimer elapsed={elapsedSeconds} total={totalSeconds} running={running} paused={paused} />

            <div className="text-center">
              <p className={`text-sm font-medium ${textPrimary}`}>{currentItemName}</p>
              <p className={`text-xs mt-1 ${textMuted}`}>{groupName}</p>
            </div>

            <div className="flex items-center justify-center gap-4">
              {paused ? (
                <button onClick={handleResumeTimer} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform" title="继续">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
              ) : (
                <button onClick={handlePauseTimer} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform" title="暂停">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                </button>
              )}
              <button onClick={handleStopTimer} className={`w-16 h-16 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md ${isDark ? 'bg-red-900/40 text-red-400 border border-red-800/40 hover:bg-red-900/60' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`} title="结束">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            </div>
          </div>
        ) : selectedItem ? (
          <div className="w-full max-w-[420px] space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <CircularTimer elapsed={0} total={selectedItem.timer_type === 'count_up' ? null : (selectedItem.timer_type === 'countdown_custom' ? selectedItem.custom_minutes * 60 : (selectedItem.timer_type === 'countdown_25' ? 25 * 60 : 35 * 60))} running={false} paused={false} />

            <div className="text-center">
              <p className={`text-base font-medium ${textPrimary}`}>{selectedItem.name}</p>
              <p className={`text-xs mt-1 ${textMuted}`}>{getTimerLabel(selectedItem.timer_type, selectedItem.custom_minutes)} · {activeGroup?.name}</p>
            </div>

            <div className="flex items-center justify-center">
              <button onClick={handleStartTimer} className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform" title="开始计时">
                <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
              <svg className={`w-12 h-12 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={`text-lg font-medium ${textPrimary}`}>选择一个待办事项开始计时</p>
              <p className={`text-sm mt-1 ${textMuted}`}>在左侧创建待办组和事项，然后点击选择</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ItemForm({ group, initial, onSave, onCancel }: { group: TodoGroupData; initial?: TodoItemData; onSave: (item: TodoItemData) => Promise<void>; onCancel: () => void }) {
  const { isDark } = useTheme()
  const [name, setName] = useState(initial?.name ?? '')
  const [timerType, setTimerType] = useState<TimerType>(initial?.timer_type ?? 'countdown_25')
  const [customMin, setCustomMin] = useState(initial?.custom_minutes ?? 30)

  const inputClass = isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-500'

  return (
    <div className={`rounded-xl border p-3 space-y-2.5 mb-2 ${isDark ? 'border-neutral-700 bg-neutral-900/50' : 'border-slate-200 bg-slate-50/80'}`}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="事项名称..." className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${inputClass}`} autoFocus />
      <select value={timerType} onChange={e => setTimerType(e.target.value as TimerType)} className={`w-full px-3 py-2 rounded-lg text-sm border outline-none appearance-none cursor-pointer ${inputClass}`}>
        {TIMER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {timerType === 'countdown_custom' && (
        <div className="flex items-center gap-2">
          <input type="number" value={customMin} onChange={e => setCustomMin(Math.max(1, parseInt(e.target.value) || 1))} min="1" max="180" className={`flex-1 px-3 py-2 rounded-lg text-sm border outline-none ${inputClass}`} />
          <span className={`text-xs ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>分钟</span>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave({ id: initial?.id ?? '', group_id: group.id, name: name.trim(), timer_type: timerType, custom_minutes: customMin })} disabled={!name.trim()} className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors">保存</button>
        <button onClick={onCancel} className={`px-4 py-1.5 rounded-lg text-sm ${isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-700'}`}>取消</button>
      </div>
    </div>
  )
}

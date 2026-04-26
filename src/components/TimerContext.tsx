import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { v4 as uuidv4 } from 'uuid'

export type TimerType = 'count_up' | 'countdown_25' | 'countdown_35' | 'countdown_custom'

export interface TodoGroupData {
  id: string
  name: string
  sort_order: number
}

export interface TodoItemData {
  id: string
  group_id: string
  name: string
  timer_type: TimerType
  custom_minutes: number
}

export interface TimerRecordData {
  id: string
  item_id: string
  group_id: string
  item_name: string
  group_name: string
  duration_seconds: number
  started_at: number
  ended_at: number
}

interface TimerState {
  running: boolean
  paused: boolean
  currentItemId: string | null
  currentItemName: string | null
  groupName: string | null
  elapsedSeconds: number
  totalSeconds: number | null
  timerType: TimerType
}

interface TimerContextType extends TimerState {
  groups: TodoGroupData[]
  items: TodoItemData[]
  records: TimerRecordData[]
  startTimer: (item: TodoItemData, group: TodoGroupData) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  loadTodoData: () => void
  loadRecords: () => void
  saveGroupsAndItems: (groups: TodoGroupData[], items: TodoItemData[]) => Promise<void>
  addRecord: (record: TimerRecordData) => Promise<void>
}

const TimerContext = createContext<TimerContextType>({} as TimerContextType)

export function useTimer() { return useContext(TimerContext) }

const TIMER_MAP: Record<TimerType, number> = {
  count_up: 0,
  countdown_25: 25 * 60,
  countdown_35: 35 * 60,
  countdown_custom: 0,
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>({
    running: false, paused: false, currentItemId: null, currentItemName: null,
    groupName: null, elapsedSeconds: 0, totalSeconds: null, timerType: 'count_up',
  })
  const [groups, setGroups] = useState<TodoGroupData[]>([])
  const [items, setItems] = useState<TodoItemData[]>([])
  const [records, setRecords] = useState<TimerRecordData[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const accumulatedRef = useRef<number>(0)

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  useEffect(() => {
    if (state.running && !state.paused) {
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const delta = Math.floor((now - startTimeRef.current) / 1000)
        const newElapsed = accumulatedRef.current + delta
        setState(prev => {
          const total = prev.totalSeconds ?? 0
          if (prev.timerType !== 'count_up' && newElapsed >= total) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            return { ...prev, running: false, elapsedSeconds: total }
          }
          return { ...prev, elapsedSeconds: newElapsed }
        })
      }, 1000)
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (!state.running && !state.paused && state.elapsedSeconds > 0) {
        accumulatedRef.current = 0
      }
    }
  }, [state.running, state.paused])

  const startTimer = useCallback((item: TodoItemData, group: TodoGroupData) => {
    accumulatedRef.current = 0
    const total = item.timer_type === 'countdown_custom' ? item.custom_minutes * 60 : TIMER_MAP[item.timer_type]
    setState({
      running: true, paused: false,
      currentItemId: item.id, currentItemName: item.name,
      groupName: group.name, elapsedSeconds: 0,
      totalSeconds: total === 0 ? null : total,
      timerType: item.timer_type,
    })
  }, [])

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    accumulatedRef.current = state.elapsedSeconds
    setState(prev => ({ ...prev, paused: true }))
  }, [state.elapsedSeconds])

  const resumeTimer = useCallback(() => {
    setState(prev => ({ ...prev, paused: false }))
  }, [])

  const stopTimer = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const duration = state.elapsedSeconds
    if (duration >= 60 && state.currentItemId) {
      try {
        const record: TimerRecordData = {
          id: uuidv4(), item_id: state.currentItemId!, group_id: '',
          item_name: state.currentItemName!, group_name: state.groupName || '',
          duration_seconds: duration, started_at: Date.now() - duration * 1000, ended_at: Date.now(),
        }
        await invoke('add_timer_record', { record })
        setRecords(prev => [record, ...prev])
      } catch (e) { console.error('保存计时记录失败:', e) }
    }
    accumulatedRef.current = 0
    setState({
      running: false, paused: false, currentItemId: null, currentItemName: null,
      groupName: null, elapsedSeconds: 0, totalSeconds: null, timerType: 'count_up',
    })
  }, [state.elapsedSeconds, state.currentItemId, state.currentItemName, state.groupName])

  const loadTodoData = useCallback(async () => {
    try {
      const [gs, _its] = await invoke<[TodoGroupData[], TodoItemData[]]>('get_todo_data')
      setGroups(gs)
      const allItems: TodoItemData[] = await invoke('get_todo_items')
      setItems(allItems)
    } catch (e) { console.error(e) }
  }, [])

  const loadRecords = useCallback(async () => {
    try {
      const data: TimerRecordData[] = await invoke('get_timer_records')
      setRecords(data)
    } catch (e) { console.error(e) }
  }, [])

  const saveGroupsAndItems = useCallback(async (gs: TodoGroupData[], its: TodoItemData[]) => {
    await invoke('save_todo_data', { groups: gs, items: its })
    setGroups(gs)
    setItems(its)
  }, [])

  const addRecord = useCallback(async (record: TimerRecordData) => {
    await invoke('add_timer_record', { record })
    setRecords(prev => [record, ...prev])
  }, [])

  useEffect(() => { loadTodoData(); loadRecords() }, [loadTodoData, loadRecords])

  return (
    <TimerContext.Provider value={{ ...state, groups, items, records, startTimer, pauseTimer, resumeTimer, stopTimer, loadTodoData, loadRecords, saveGroupsAndItems, addRecord }}>
      {children}
    </TimerContext.Provider>
  )
}

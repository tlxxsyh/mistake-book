import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useTheme } from './ThemeProvider'

type MessageType = 'success' | 'error' | 'info' | 'warning'

interface MessageItem {
  id: number
  type: MessageType
  content: string
}

interface DialogOptions {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'normal'
}

interface NotifyContextType {
  message: (content: string, type?: MessageType) => void
  confirm: (options: DialogOptions) => Promise<boolean>
}

const NotifyContext = createContext<NotifyContextType>({ message: () => {}, confirm: async () => false })

export function useNotify() {
  return useContext(NotifyContext)
}

function MessageIcon({ type }: { type: MessageType }) {
  const icons: Record<MessageType, React.ReactNode> = {
    success: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    error: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>,
    info: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
    warning: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  }
  return icons[type]
}

const typeStyles: Record<MessageType, { bg: string; border: string; text: string; iconColor: string }> = {
  success: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', iconColor: 'text-emerald-500' },
  error: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', iconColor: 'text-red-500' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', iconColor: 'text-blue-500' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', iconColor: 'text-amber-500' },
}

function ToastContainer({ messages, onRemove }: { messages: MessageItem[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-[360px] max-w-[calc(100vw-48px)] pointer-events-none">
      {messages.map(msg => (
        <div key={msg.id} onClick={() => onRemove(msg.id)} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm cursor-pointer animate-in slide-in-from-right-full fade-in duration-300 ${typeStyles[msg.type].bg} ${typeStyles[msg.type].border}`}>
          <span className={`shrink-0 mt-0.5 ${typeStyles[msg.type].iconColor}`}>{MessageIcon({ type: msg.type })}</span>
          <p className={`flex-1 text-sm font-medium leading-relaxed ${typeStyles[msg.type].text}`}>{msg.content}</p>
          <button onClick={(e) => { e.stopPropagation(); onRemove(msg.id) }} className={`shrink-0 p-0.5 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${typeStyles[msg.type].iconColor}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  )
}

function ConfirmDialog({ options, open, onClose }: { options: DialogOptions; open: boolean; onClose: (result: boolean) => void }) {
  const { isDark } = useTheme()
  if (!open) return null

  const isDanger = options.type === 'danger'
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={() => onClose(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-slate-200'}`}>
        <div className="p-6">
          {options.title && <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{options.title}</h3>}
          <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>{options.content}</p>
        </div>
        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-slate-100 bg-slate-50/80'}`}>
          <button onClick={() => onClose(false)} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>{options.cancelText || '\u53D6\u6D88'}</button>
          <button onClick={() => onClose(true)} className={`px-5 py-2 rounded-xl text-sm font-medium text-white transition-all shadow-md ${isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25'}`}>{options.confirmText || '\u786E\u5B9A'}</button>
        </div>
      </div>
    </div>
  )
}

let msgIdCounter = 0

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [dialog, setDialog] = useState<DialogOptions & { open: boolean; resolve: ((r: boolean) => void) | null }>({ open: false, resolve: null, content: '' })
  const timerMap = useRef<Map<number, NodeJS.Timeout>>(new Map())

  const removeMsg = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    const t = timerMap.current.get(id)
    if (t) { clearTimeout(t); timerMap.current.delete(id) }
  }, [])

  const message = useCallback((content: string, type: MessageType = 'info') => {
    const id = ++msgIdCounter
    setMessages(prev => [...prev, { id, type, content }])
    const timer = setTimeout(() => removeMsg(id), 3500)
    timerMap.current.set(id, timer)
  }, [removeMsg])

  const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ ...options, open: true, resolve })
    })
  }, [])

  const handleDialogClose = useCallback((result: boolean) => {
    setDialog(prev => {
      prev.resolve?.(result)
      return { ...prev, open: false, resolve: null }
    })
  }, [])

  return (
    <NotifyContext.Provider value={{ message, confirm }}>
      {children}
      <ToastContainer messages={messages} onRemove={removeMsg} />
      <ConfirmDialog options={dialog} open={dialog.open} onClose={handleDialogClose} />
    </NotifyContext.Provider>
  )
}

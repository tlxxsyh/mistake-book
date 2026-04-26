import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

function AppLoading() {
  useEffect(() => {
    const el = document.getElementById('loading-screen')
    if (el) {
      el.style.opacity = '0'
      el.style.visibility = 'hidden'
      setTimeout(() => el.remove(), 500)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-white animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/40 animate-ping opacity-60" style={{ animationDuration: '2s' }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-neutral-300 tracking-wide">言念错题本</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    invoke<[string | null, string[], string | null, boolean]>('get_home_settings').then(([,,,_dark]) => {
      setIsDark(_dark)
      if (_dark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const toggleTheme = useCallback(async () => {
    const next = !isDark
    setIsDark(next)
    if (next) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    try { await invoke('set_dark_mode', { isDark: next }) } catch (e) { console.error(e) }
  }, [isDark])

  if (!loaded) return <AppLoading />

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

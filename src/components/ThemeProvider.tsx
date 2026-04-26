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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    invoke<[string | null, string[], string | null, boolean]>('get_home_settings')
      .then(([,,,_dark]) => {
        setIsDark(_dark)
        if (_dark) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      })
      .catch((e) => console.error('[ThemeProvider] Failed to load settings:', e))
      .finally(() => setLoaded(true))
  }, [])

  const toggleTheme = useCallback(async () => {
    const next = !isDark
    setIsDark(next)
    if (next) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    try { await invoke('set_dark_mode', { isDark: next }) } catch (e) { console.error(e) }
  }, [isDark])

  if (!loaded) {
    return (
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
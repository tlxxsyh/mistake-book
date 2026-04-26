import { useState } from 'react'
import type { Page } from '../App'
import { useTheme } from './ThemeProvider'

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  hasHomeBg?: boolean
  onWidthChange?: (width: number) => void
}

export default function Sidebar({ currentPage, onPageChange, hasHomeBg, onWidthChange }: SidebarProps) {
  const { isDark, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(true)

  const toggle = () => {
    setCollapsed(prev => !prev)
    onWidthChange?.(collapsed ? 180 : 68)
  }

  const iconSize = collapsed ? 'w-6 h-6' : 'w-5 h-5'

  const items: { id: Page; title: string; icon: React.JSX.Element }[] = [
    {
      id: 'dashboard',
      title: '\u9996\u9875',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      id: 'home',
      title: '\u9519\u9898\u5217\u8868',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      id: 'plan',
      title: '\u5B66\u4E60\u8BA1\u5212',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      id: 'notes',
      title: '\u4FBF\u7B7E',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
    },
    {
      id: 'pomodoro',
      title: '\u756A\u8304\u949F',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'stats',
      title: '\u7EDF\u8BA1',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      id: 'studyStats',
      title: '\u5B66\u4E60\u7EDF\u8BA1',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
      ),
    },
    {
      id: 'review',
      title: '\u9519\u9898\u56DE\u987E',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      title: '\u8BBE\u7F6E',
      icon: (
        <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378.138-.75.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  const w = collapsed ? 68 : 180

  const activeBg = hasHomeBg ? 'bg-white/20 text-white' : (isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600')
  const inactiveHover = hasHomeBg ? 'text-white/70 hover:text-white hover:bg-white/10' : (isDark ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50')

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 border-r shadow-sm flex flex-col py-5 z-50 ${hasHomeBg ? 'bg-white/10 backdrop-blur-xl border-white/10' : (isDark ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800/60' : 'bg-white/90 backdrop-blur-md border-slate-200/60')}`}
      style={{ width: w, transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="px-2 mb-6 overflow-hidden">
        <div
          className={`flex items-center gap-2.5 h-10 ${collapsed ? 'justify-center px-0' : 'px-3'}`}
        >
          <div className="w-[36px] h-[36px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <svg className={`${iconSize} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className={`text-sm font-bold whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'} ${hasHomeBg ? 'text-white' : (isDark ? 'text-neutral-200' : 'text-slate-800')}`} style={{ transitionDelay: collapsed ? '0ms' : '80ms' }}>
            言念错题本
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 w-full px-2 flex-1 overflow-hidden">
        {items.map(item => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`group relative w-full rounded-lg flex items-center transition-all duration-150 gap-2.5 ${collapsed ? 'justify-center' : 'justify-start px-3'} h-10 ${isActive ? activeBg : inactiveHover}`}
              title={collapsed ? item.title : undefined}
            >
              {isActive && !collapsed && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${hasHomeBg ? 'bg-white/80' : 'bg-blue-500'}`} />
              )}
              {isActive && collapsed && (
                <span className={`absolute inset-0 rounded-lg ring-1.5 ${hasHomeBg ? 'ring-white/30' : (isDark ? 'ring-blue-500/40' : 'ring-blue-400/50')}`} />
              )}
              {item.icon}
              <span className={`text-sm font-medium whitespace-nowrap truncate overflow-hidden transition-opacity duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`} style={{ transitionDelay: collapsed ? '0ms' : '80ms' }}>
                {item.title}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1.5 w-full px-2 pb-2 overflow-hidden">
        <button onClick={toggleTheme} className={`w-full rounded-lg flex items-center transition-all duration-150 gap-2.5 ${collapsed ? 'justify-center' : 'justify-start px-3'} h-10 ${hasHomeBg ? 'text-white/70 hover:text-yellow-300 hover:bg-white/10' : (isDark ? 'text-yellow-400 hover:text-yellow-300 hover:bg-neutral-800/60' : 'text-slate-400 hover:text-amber-600 hover:bg-slate-50')}`} title={isDark ? '切换到亮色模式' : '切换到暗黑模式'}>
          {isDark ? (
            <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
          ) : (
            <svg className={`${iconSize} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
          )}
          <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`} style={{ transitionDelay: collapsed ? '0ms' : '80ms' }}>{isDark ? '亮色模式' : '暗黑模式'}</span>
        </button>
        <button onClick={toggle} className={`w-full rounded-lg flex items-center transition-all duration-150 gap-2.5 ${collapsed ? 'justify-center' : 'justify-start px-3'} h-10 ${hasHomeBg ? 'text-white/50 hover:text-white hover:bg-white/10' : (isDark ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50')}`} title="展开/折叠菜单">
          <svg className={`${iconSize} shrink-0 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`} style={{ transitionDelay: collapsed ? '0ms' : '80ms' }}>折叠</span>
        </button>
      </div>
    </aside>
  )
}

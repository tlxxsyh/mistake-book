import { useMemo, useState } from 'react'
import type { Mistake } from '../App'
import { useTheme } from './ThemeProvider'

interface WordCloudProps {
  title: string
  subtitle: string
  data: { label: string; value: number }[]
  isDark: boolean
}

const WORD_COLORS = [
  '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af',
  '#60a5fa', '#93c5fd', '#bfdbfe',
]

function WordCloud({ title, subtitle, data, isDark }: WordCloudProps) {
  if (data.length === 0) {
    return (
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'} flex flex-col items-center justify-center min-h-[240px]`}>
        <svg className="w-10 h-10 mb-3 text-slate-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
        <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>暂无数据</p>
      </div>
    )
  }

  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'}`}>
      <div className={`px-5 py-3.5 border-b ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>{subtitle}</p>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-x-3 gap-y-2 items-center justify-center min-h-[180px]">
          {data.map((item, i) => {
            const ratio = item.value / maxVal
            const fontSize = Math.round(12 + ratio * 22)
            const opacity = 0.55 + ratio * 0.45
            const color = WORD_COLORS[i % WORD_COLORS.length]
            return (
              <span
                key={item.label}
                className="inline-flex items-center cursor-default transition-transform hover:scale-110 hover:z-10 select-none"
                style={{
                  fontSize: `${fontSize}px`,
                  fontWeight: ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 500,
                  color: color,
                  opacity,
                  lineHeight: 1.3,
                  textShadow: isDark ? `0 1px 8px rgba(59,130,246,${ratio * 0.3})` : undefined,
                }}
                title={`${item.label}: ${item.value}`}
              >
                {item.label}
              </span>
            )
          })}
        </div>
        <div className={`mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
          {data.slice(0, 8).map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`text-xs truncate max-w-[100px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{item.label}</span>
              <span className={`text-xs font-medium tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{item.value}</span>
            </div>
          ))}
          {data.length > 8 && (
            <span className={`text-xs ${isDark ? 'text-neutral-600' : 'text-slate-400'}`}>+{data.length - 8} 更多</span>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatsPageProps {
  mistakes: Mistake[]
}

export default function StatsPage({ mistakes }: StatsPageProps) {
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'tag' | 'source'>('tag')

  const tagByCount = useMemo(() => {
    const map = new Map<string, number>()
    mistakes.forEach(m => m.tags?.forEach(t => t && map.set(t, (map.get(t) || 0) + 1)))
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [mistakes])

  const sourceByCount = useMemo(() => {
    const map = new Map<string, number>()
    mistakes.forEach(m => m.source && map.set(m.source, (map.get(m.source) || 0) + 1))
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [mistakes])

  const tagByErrors = useMemo(() => {
    const map = new Map<string, number>()
    mistakes.forEach(m => m.tags?.forEach(t => t && map.set(t, (map.get(t) || 0) + (m.wrong_count || 0))))
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [mistakes])

  const sourceByErrors = useMemo(() => {
    const map = new Map<string, number>()
    mistakes.forEach(m => m.source && map.set(m.source, (map.get(m.source) || 0) + (m.wrong_count || 0)))
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [mistakes])

  const totalMistakes = mistakes.length
  const totalTags = tagByCount.length
  const totalSources = sourceByCount.length
  const totalErrors = mistakes.reduce((s, m) => s + (m.wrong_count || 0), 0)

  const cardBg = isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'
  const textPrimary = isDark ? 'text-white' : 'text-slate-800'
  const textMuted = isDark ? 'text-neutral-500' : 'text-slate-400'

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className={`text-xl font-bold ${textPrimary}`}>错题统计</h1>
        <p className={`text-sm mt-1 ${textMuted}`}>基于错题数据的词云分析</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>错题总数</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{totalMistakes}</p>
        </div>
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>标签种类</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{totalTags}</p>
        </div>
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>题源种类</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{totalSources}</p>
        </div>
        <div className={`${cardBg} rounded-xl border p-4`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>总错误次数</p>
          <p className={`text-xl font-bold tabular-nums ${textPrimary}`}>{totalErrors}</p>
        </div>
      </div>

      <div className={`rounded-xl border p-1 flex gap-1 w-fit ${isDark ? 'bg-neutral-800/60 border-neutral-700/40' : 'bg-slate-100 border-slate-200/60'}`}>
        {(['tag', 'source'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : (isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-700')}`}
          >
            {tab === 'tag' ? '按标签分析' : '按题源分析'}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {activeTab === 'tag' ? (
          <>
            <WordCloud
              title="标签词云（按错题数量）"
              subtitle={`共 ${totalTags} 个标签，${totalMistakes} 道错题`}
              data={tagByCount}
              isDark={isDark}
            />
            <WordCloud
              title="标签词云（按错误次数）"
              subtitle={`共 ${totalTags} 个标签，${totalErrors} 次错误`}
              data={tagByErrors}
              isDark={isDark}
            />
          </>
        ) : (
          <>
            <WordCloud
              title="题源词云（按错题数量）"
              subtitle={`共 ${totalSources} 个题源，${totalMistakes} 道错题`}
              data={sourceByCount}
              isDark={isDark}
            />
            <WordCloud
              title="题源词云（按错误次数）"
              subtitle={`共 ${totalSources} 个题源，${totalErrors} 次错误`}
              data={sourceByErrors}
              isDark={isDark}
            />
          </>
        )}
      </div>
    </div>
  )
}

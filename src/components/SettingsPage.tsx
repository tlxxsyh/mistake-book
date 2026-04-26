import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useTheme } from './ThemeProvider'
import { useNotify } from './NotifyProvider'

interface SettingsPageProps {
  dataDir: string
  defaultDir: string
  customDir: string
  savingSettings: boolean
  onCustomDirChange: (dir: string) => void
  onSaveSettings: () => Promise<void>
  onResetToDefault: () => Promise<void>
}

export default function SettingsPage({
  dataDir, defaultDir, customDir, savingSettings,
  onCustomDirChange, onSaveSettings, onResetToDefault
}: SettingsPageProps) {
  const { isDark, toggleTheme } = useTheme()
  const { message } = useNotify()

  const [examDate, setExamDate] = useState('')
  const [countdownName, setCountdownName] = useState('倒计时')
  const [quotes, setQuotes] = useState<string[]>([''])
  const [newQuote, setNewQuote] = useState('')
  const [bgPreview, setBgPreview] = useState<string | null>(null)
  const [hasBg, setHasBg] = useState(false)

  const loadHomeSettings = useCallback(async () => {
    try {
      const [date, qs, bg, , name]: [string | null, string[], string | null, boolean, string] = await invoke('get_home_settings')
      if (date) setExamDate(date)
      if (qs.length > 0) setQuotes(qs)
      if (name) setCountdownName(name)
      setHasBg(!!bg)
      if (bg) {
        const src = await invoke<string>('read_image', { path: bg })
        setBgPreview(src)
      }
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadHomeSettings() }, [loadHomeSettings])

  const handleChooseFolder = async () => {
    const selected = await open({ directory: true, multiple: false, title: '选择数据存储目录' })
    if (selected) onCustomDirChange(selected as string)
  }

  const handleSaveExamDate = async () => {
    try {
      await invoke('set_exam_date', { date: examDate || null })
      message(examDate ? '\u5012\u8BA1\u65F6\u65E5\u671F\u5DF2\u4FDD\u5B58' : '\u5DF2\u6E05\u9664\u5012\u8BA1\u65F6\u65E5\u671F', 'success')
    } catch (e) { console.error(e); message('\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5', 'error') }
  }

  const handleSaveCountdownName = async () => {
    try {
      await invoke('set_countdown_name', { name: countdownName.trim() || '倒计时' })
      message('倒计时名称已保存', 'success')
    } catch (e) { console.error(e); message('保存失败，请重试', 'error') }
  }

  const handleAddQuote = () => {
    const q = newQuote.trim()
    if (!q) return
    setQuotes([...quotes, q])
    setNewQuote('')
    invoke('set_quotes', { quotes: [...quotes, q] }).catch(console.error)
  }

  const handleRemoveQuote = (idx: number) => {
    const next = quotes.filter((_, i) => i !== idx)
    setQuotes(next.length > 0 ? next : [''])
    invoke('set_quotes', { quotes: next.length > 0 ? next : [] }).catch(console.error)
  }

  const handleUpdateQuote = (idx: number, val: string) => {
    const next = [...quotes]
    next[idx] = val
    setQuotes(next)
  }

  const handleSaveQuotes = () => {
    const clean = quotes.filter(q => q.trim())
    invoke('set_quotes', { quotes: clean }).catch(console.error)
  }

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setBgPreview(base64)
      setHasBg(true)
      try { await invoke('set_home_background', { base64Data: base64 }) } catch (err) { console.error(err) }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemoveBg = async () => {
    setBgPreview(null)
    setHasBg(false)
    try { await invoke('set_home_background', { base64Data: null }) } catch (e) { console.error(e) }
  }

  const cardClass = isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200/60'
  const cardBorderClass = isDark ? 'border-neutral-800' : 'border-slate-100'
  const inputClass = isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400'

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>设置</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>管理你的应用配置和个性化设置</p>
      </div>

      <div className="space-y-6">
        {/* 外观 */}
        <div className={`${cardClass} rounded-2xl border shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${cardBorderClass}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              外观
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>暗黑模式</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>{isDark ? '当前为暗黑模式' : '当前为亮色模式'}</p>
              </div>
              <button onClick={toggleTheme} className={`relative w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${isDark ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 倒计时 */}
        <div className={`${cardClass} rounded-2xl border shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${cardBorderClass}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
              考研倒计时
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>倒计时名称</label>
              <div className="flex gap-2">
                <input type="text" value={countdownName} onChange={e => setCountdownName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveCountdownName()} placeholder="倒计时" maxLength={20} className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} />
                <button onClick={handleSaveCountdownName} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium whitespace-nowrap">保存</button>
              </div>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>首页倒计时组件的标题文字，留空则默认显示「倒计时」</p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>考试日期</label>
              <div className="flex gap-2">
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} max="2099-12-31" className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`} />
                <button onClick={handleSaveExamDate} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium whitespace-nowrap">保存日期</button>
              </div>
            </div>
          </div>
        </div>

        {/* 一言 */}
        <div className={`${cardClass} rounded-2xl border shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${cardBorderClass}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
              激励一言
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {quotes.map((q, idx) => (
                <div key={idx} className={`flex items-start gap-2 p-3 rounded-xl group ${isDark ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 ${isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-slate-200 text-slate-600'}`}>{idx + 1}</span>
                  <input
                    value={q}
                    onChange={e => handleUpdateQuote(idx, e.target.value)}
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${isDark ? 'text-white placeholder:text-neutral-500' : 'text-slate-700 placeholder:text-slate-400'}`}
                    placeholder={`一言 #${idx + 1}`}
                  />
                  <button onClick={() => handleRemoveQuote(idx)} className={`flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 rounded-lg transition-all ${isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-400 hover:bg-red-50'}`} title="删除">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newQuote}
                onChange={e => setNewQuote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddQuote()}
                placeholder='输入新的激励语，回车添加...'
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClass}`}
              />
              <button onClick={handleAddQuote} disabled={!newQuote.trim()} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all text-sm font-medium whitespace-nowrap disabled:opacity-40">添加</button>
              <button onClick={handleSaveQuotes} className={`px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/40' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>保存全部</button>
            </div>
          </div>
        </div>

        {/* 首页背景 */}
        <div className={`${cardClass} rounded-2xl border shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${cardBorderClass}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              首页背景图
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {bgPreview && (
              <div className="relative rounded-xl overflow-hidden max-h-[240px]">
                <img src={bgPreview} alt="首页背景预览" className="w-full object-cover" style={{ maxHeight: 240 }} />
                <button onClick={handleRemoveBg} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            {!hasBg && (
              <div className={`rounded-xl border-2 border-dashed p-8 text-center ${isDark ? 'border-neutral-700 text-neutral-500' : 'border-slate-200 text-slate-400'}`}>
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                <p className="text-sm">尚未设置背景图</p>
                <p className="text-xs mt-1 opacity-60">上传一张喜欢的图片作为首页背景</p>
              </div>
            )}
            <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium ${isDark ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              上传图片
              <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* 数据存储 */}
        <div className={`${cardClass} rounded-2xl border shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${cardBorderClass}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
              数据存储
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>当前存储位置</label>
              <div className={`px-4 py-3 rounded-xl text-sm break-all font-mono border ${isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{dataDir}</div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>自定义存储位置</label>
              <div className="flex gap-2">
                <input type="text" value={customDir} onChange={e => onCustomDirChange(e.target.value)} placeholder="留空则使用默认位置" className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`} />
                <button onClick={handleChooseFolder} className={`px-4 py-2.5 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>浏览...</button>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>更改后将自动迁移旧数据到新位置并删除旧数据</p>
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-200/60 dark:border-neutral-800">
              <button onClick={onSaveSettings} disabled={savingSettings} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm font-medium disabled:opacity-50">{savingSettings ? '保存中...' : '保存设置'}</button>
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div className={`${cardClass} rounded-2xl border shadow-sm overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${cardBorderClass}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
              关于
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>言念错题本</h3>
                <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>版本 1.0.0 · 基于 Tauri + React 构建</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

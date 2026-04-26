import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { invoke } from '@tauri-apps/api/core'
import Sidebar from './components/Sidebar'
import MistakeForm from './components/MistakeForm'
import MistakeCard, { DetailModal } from './components/MistakeCard'
import SettingsPage from './components/SettingsPage'
import HomePage from './components/HomePage'
import PomodoroPage from './components/PomodoroPage'
import StatsPage from './components/StatsPage'
import StudyStatsPage from './components/StudyStatsPage'
import ReviewPage from './components/ReviewPage'
import PlanPage from './components/PlanPage'
import NotesPage from './components/NotesPage'
import TimerBar from './components/TimerBar'
import { ThemeProvider, useTheme } from './components/ThemeProvider'
import { NotifyProvider, useNotify } from './components/NotifyProvider'
import { TimerProvider } from './components/TimerContext'

export type Page = 'dashboard' | 'home' | 'notes' | 'plan' | 'pomodoro' | 'stats' | 'studyStats' | 'review' | 'settings'

export interface Mistake {
  id: string
  question_text: string
  question_images: string[]
  answer_text: string
  answer_images: string[]
  subject: string
  source: string
  is_favorite: boolean
  tags: string[]
  note: string
  created_at: number
  wrong_count: number
  correct_count: number
  last_reviewed_at: number | null
}

export interface FormData {
  questionText: string
  questionImages: string[]
  answerText: string
  answerImages: string[]
  subjectInput: string
  sourceInput: string
  isFavorite: boolean
  tagInput: string
  currentTags: string[]
  noteInput: string
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [imageCache, setImageCache] = useState<Record<string, string>>({})
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [editingMistakeId, setEditingMistakeId] = useState<string | null>(null)
  const [viewingMistake, setViewingMistake] = useState<Mistake | null>(null)
  const [dataDir, setDataDir] = useState('')
  const [defaultDir, setDefaultDir] = useState('')
  const [customDir, setCustomDir] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [homeBgImage, setHomeBgImage] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(68)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const [selectedSubject, setSelectedSubject] = useState<string>('全部')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('全部')
  const [selectedTag, setSelectedTag] = useState<string>('全部')
  const [sortBy, setSortBy] = useState<'time_desc' | 'time_asc' | 'wrong_desc' | 'wrong_asc' | 'correct_desc' | 'correct_asc'>('time_desc')

  const { isDark } = useTheme()
  const { message } = useNotify()

  const defaultFormData: FormData = {
    questionText: '',
    questionImages: [],
    answerText: '',
    answerImages: [],
    subjectInput: '',
    sourceInput: '',
    isFavorite: false,
    tagInput: '',
    currentTags: [],
    noteInput: ''
  }

  const [formData, setFormData] = useState<FormData>(defaultFormData)

  const resetForm = () => {
    setFormData(defaultFormData)
    setEditingMistakeId(null)
  }

  const loadMistakes = useCallback(async () => {
    try {
      const data = await invoke<Mistake[]>('get_mistakes')
      setMistakes(data.sort((a, b) => b.created_at - a.created_at))
    } catch (e) { console.error(e) }
  }, [])

  const loadMetadata = useCallback(async () => {
    try {
      const info = await invoke<{ data_dir: string; default_data_dir: string; custom_data_dir: string | null }>('get_data_dir_info')
      setDataDir(info.data_dir)
      setDefaultDir(info.default_data_dir)
      setCustomDir(info.custom_data_dir || '')
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      await Promise.all([loadMistakes(), loadMetadata()])
      if (mounted) setIsInitialized(true)
    }
    init()
    return () => { mounted = false }
  }, [loadMistakes, loadMetadata])

  const loadImage = useCallback(async (imagePath: string): Promise<string> => {
    if (!imagePath) return ''
    if (imageCache[imagePath]) return imageCache[imagePath]
    try {
      const data = await invoke<string>('read_image', { path: imagePath })
      setImageCache(prev => ({ ...prev, [imagePath]: data }))
      return data
    } catch { return '' }
  }, [imageCache])

  const openEditForm = (mistake: Mistake) => {
    setEditingMistakeId(mistake.id)
    setFormData({
      questionText: mistake.question_text,
      questionImages: [...mistake.question_images],
      answerText: mistake.answer_text,
      answerImages: [...mistake.answer_images],
      subjectInput: mistake.subject,
      sourceInput: mistake.source,
      isFavorite: mistake.is_favorite,
      tagInput: '',
      currentTags: [...mistake.tags],
      noteInput: mistake.note
    })
    setShowAddPanel(true)
  }

  const handleSaveMistake = async () => {
    if (!formData.questionText.trim()) {
      message('请输入题目内容', 'warning')
      return
    }

    const newId = uuidv4()

    try {
      if (editingMistakeId) {
        await invoke('update_mistake', {
          id: editingMistakeId,
          questionText: formData.questionText,
          questionImages: formData.questionImages,
          answerText: formData.answerText,
          answerImages: formData.answerImages,
          subject: formData.subjectInput,
          source: formData.sourceInput,
          tags: formData.currentTags,
          note: formData.noteInput,
        })
        message('错题已更新', 'success')
      } else {
        await invoke('add_mistake', {
          id: newId,
          questionText: formData.questionText,
          questionImages: formData.questionImages,
          answerText: formData.answerText,
          answerImages: formData.answerImages,
          subject: formData.subjectInput,
          source: formData.sourceInput,
          tags: formData.currentTags,
          note: formData.noteInput,
        })
        message('错题已添加', 'success')

        try {
          await invoke('add_to_review_queue', { mistakeId: newId })
        } catch (e) { console.error('添加到复习队列失败:', e) }
      }

      setShowAddPanel(false)
      resetForm()
      await loadMistakes()
    } catch (e) {
      console.error(e)
      message('操作失败，请重试', 'error')
    }
  }

  const handleDeleteMistake = async (id: string) => {
    if (!confirm('确定要删除这道错题吗？')) return
    try {
      await invoke('delete_mistake', { id })
      if (viewingMistake?.id === id) setViewingMistake(null)
      await loadMistakes()
      message('已删除', 'success')
    } catch (e) {
      console.error(e)
      message('删除失败', 'error')
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      await invoke('toggle_favorite', { id })
      await loadMistakes()
    } catch (e) { console.error(e) }
  }

  const handleRecordReview = async (id: string, isCorrect: boolean) => {
    try {
      await invoke('record_review', { id, isCorrect })
      await loadMistakes()
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ date: string }>
      if (customEvent.detail?.date) {
        localStorage.setItem('stats-start-date', customEvent.detail.date)
        localStorage.setItem('stats-end-date', customEvent.detail.date)
        setCurrentPage('stats')
      }
    }
    window.addEventListener('navigate-to-stats', handler)
    return () => window.removeEventListener('navigate-to-stats', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      setCurrentPage('review')
    }
    window.addEventListener('navigate-to-review', handler)
    return () => window.removeEventListener('navigate-to-review', handler)
  }, [])

  useEffect(() => {
    if (currentPage !== 'dashboard') {
      setHomeBgImage(null)
      return
    }
    invoke<[string | null, string[], string | null]>('get_home_settings').then(([, , bg]) => {
      if (bg) {
        invoke<string>('read_image', { path: bg }).then(setHomeBgImage).catch(() => setHomeBgImage(null))
      } else {
        setHomeBgImage(null)
      }
    }).catch(() => setHomeBgImage(null))
  }, [currentPage])

  const hasBg = !!homeBgImage

  const allSubjects = useMemo(() => {
    const subjects = new Set(mistakes.map(m => m.subject).filter(Boolean))
    return Array.from(subjects).sort()
  }, [mistakes])

  const allSources = useMemo(() => {
    const sources = new Set(mistakes.map(m => m.source).filter(Boolean))
    return Array.from(sources).sort()
  }, [mistakes])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    mistakes.forEach(m => m.tags?.forEach(t => t && tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [mistakes])

  const filteredMistakes = useMemo(() => {
    let result = mistakes.filter(m => {
      if (selectedSubject !== '全部' && m.subject !== selectedSubject) return false
      if (showFavoritesOnly && !m.is_favorite) return false
      if (selectedSource !== '全部' && m.source !== selectedSource) return false
      if (selectedTag !== '全部' && !m.tags.includes(selectedTag)) return false
      if (searchKeyword.trim()) {
        const keyword = searchKeyword.toLowerCase().trim()
        const matchText = m.question_text?.toLowerCase().includes(keyword)
        const matchNote = m.note?.toLowerCase().includes(keyword)
        const matchAnswer = m.answer_text?.toLowerCase().includes(keyword)
        if (!matchText && !matchNote && !matchAnswer) return false
      }
      return true
    })

    result.sort((a, b) => {
      switch (sortBy) {
        case 'time_desc': return b.created_at - a.created_at
        case 'time_asc': return a.created_at - b.created_at
        case 'wrong_desc': return b.wrong_count - a.wrong_count
        case 'wrong_asc': return a.wrong_count - b.wrong_count
        case 'correct_desc': return b.correct_count - a.correct_count
        case 'correct_asc': return a.correct_count - b.correct_count
        default: return 0
      }
    })

    return result
  }, [mistakes, selectedSubject, showFavoritesOnly, searchKeyword, selectedSource, selectedTag, sortBy])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const dir = customDir || null
      const newDir = await invoke<string>('set_custom_data_dir', { dir })
      setDataDir(newDir)
      message('设置已保存，数据已迁移到新位置', 'success')
      setImageCache({})
      loadMistakes()
    } catch (e) {
      console.error(e)
      message('保存设置失败', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!confirm('确定要重置到默认数据目录吗？')) return
    try {
      await invoke('set_custom_data_dir', { dir: null })
      setCustomDir('')
      const info = await invoke<{ data_dir: string; default_data_dir: string }>('get_data_dir_info')
      setDataDir(info.data_dir)
      setDefaultDir(info.default_data_dir)
      setImageCache({})
      loadMistakes()
      message('已重置为默认目录', 'success')
    } catch (e) {
      console.error(e)
      message('重置失败', 'error')
    }
  }

  const renderPage = () => {
    if (!isInitialized) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>正在加载数据...</p>
          </div>
        </div>
      )
    }

    if (currentPage === 'dashboard') {
      return (
        <div className="min-h-screen">
          <HomePage imageCache={imageCache} hasBg={!!homeBgImage} />
        </div>
      )
    }
    if (currentPage === 'home') {
      return (
        <div>
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            <FilterBar
              subjects={allSubjects}
              sources={allSources}
              tags={allTags}
              selectedSubject={selectedSubject}
              selectedSource={selectedSource}
              selectedTag={selectedTag}
              showFavoritesOnly={showFavoritesOnly}
              searchKeyword={searchKeyword}
              sortBy={sortBy}
              totalCount={filteredMistakes.length}
              onSelectSubject={setSelectedSubject}
              onSelectSource={setSelectedSource}
              onSelectTag={setSelectedTag}
              onToggleFavorites={() => setShowFavoritesOnly(prev => !prev)}
              onSearchChange={setSearchKeyword}
              onSortChange={setSortBy}
              isDark={isDark}
              actionButtons={
                <div className="flex items-center gap-2">
                  {filteredMistakes.length > 0 && (
                    <button
                      onClick={() => {
                        const randomIndex = Math.floor(Math.random() * filteredMistakes.length)
                        setViewingMistake(filteredMistakes[randomIndex])
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${isDark ? 'bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 border border-purple-500/30' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.69c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032.441.046.662M4.5 12l3 3m-3-3l-3 3" />
                      </svg>
                      随机复习
                    </button>
                  )}
                  <button
                    onClick={() => {
                      resetForm()
                      setShowAddPanel(true)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${isDark ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    添加错题
                  </button>
                </div>
              }
            />

            {filteredMistakes.length === 0 ? (
              <EmptyState isDark={isDark} />
            ) : (
              <div className="space-y-4">
                {filteredMistakes.map(mistake => (
                  <MistakeCard
                    key={mistake.id}
                    mistake={mistake}
                    imageCache={imageCache}
                    onToggleFavorite={handleToggleFavorite}
                    onDelete={handleDeleteMistake}
                    onEdit={openEditForm}
                    onViewDetail={(m) => setViewingMistake(m)}
                    onRecordReview={handleRecordReview}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }
    if (currentPage === 'notes') {
      return <NotesPage />
    }
    if (currentPage === 'plan') {
      return <PlanPage />
    }
    if (currentPage === 'pomodoro') {
      return <PomodoroPage />
    }
    if (currentPage === 'stats') {
      return <StatsPage mistakes={mistakes} />
    }
    if (currentPage === 'studyStats') {
      return <StudyStatsPage />
    }
    if (currentPage === 'review') {
      return (
        <ReviewPage
          mistakes={mistakes}
          imageCache={imageCache}
          onRecordReview={handleRecordReview}
          onViewDetail={(m) => setViewingMistake(m)}
        />
      )
    }
    return (
      <SettingsPage
        dataDir={dataDir}
        defaultDir={defaultDir}
        customDir={customDir}
        savingSettings={savingSettings}
        onCustomDirChange={setCustomDir}
        onSaveSettings={handleSaveSettings}
        onResetToDefault={handleResetToDefault}
      />
    )
  }

  return (
    <div className={`h-screen flex overflow-hidden ${isDark ? 'bg-neutral-950 text-white' : 'bg-[#F8FAFC] text-slate-900'}`} style={currentPage === 'dashboard' && homeBgImage ? { backgroundImage: `url(${homeBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : undefined}>
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} hasHomeBg={hasBg} onWidthChange={setSidebarWidth} />
      <main className="flex-1 h-screen overflow-hidden relative" style={{ marginLeft: sidebarWidth }}>
        <TimerBar />
        <div className={`h-full transition-[padding-top] ease-out duration-500 ${currentPage === 'dashboard' ? (hasBg ? 'pt-0' : 'pt-[52px]') + ' overflow-hidden' : (hasBg ? 'pt-0' : 'pt-[52px]') + ' overflow-y-auto'}`}>
          {renderPage()}
          <BackToTop />
        </div>
      </main>

      <MistakeForm
        show={showAddPanel}
        editingId={editingMistakeId}
        formData={formData}
        imageCache={imageCache}
        allSubjects={allSubjects}
        allTags={allTags}
        allSources={allSources}
        onFormChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onReset={resetForm}
        onClose={() => setShowAddPanel(false)}
        onSave={handleSaveMistake}
      />

      <DetailModal
        mistake={viewingMistake}
        imageCache={imageCache}
        onClose={() => setViewingMistake(null)}
        onEdit={(m) => { setViewingMistake(null); openEditForm(m) }}
        onDelete={handleDeleteMistake}
        onRecordReview={handleRecordReview}
      />
    </div>
  )
}

function FilterBar({
  subjects, sources, tags,
  selectedSubject, selectedSource, selectedTag,
  showFavoritesOnly, searchKeyword, sortBy, totalCount,
  onSelectSubject, onSelectSource, onSelectTag,
  onToggleFavorites, onSearchChange, onSortChange,
  isDark, actionButtons
}: {
  subjects: string[]
  sources: string[]
  tags: string[]
  selectedSubject: string
  selectedSource: string
  selectedTag: string
  showFavoritesOnly: boolean
  searchKeyword: string
  sortBy: 'time_desc' | 'time_asc' | 'wrong_desc' | 'wrong_asc' | 'correct_desc' | 'correct_asc'
  totalCount: number
  onSelectSubject: (s: string) => void
  onSelectSource: (s: string) => void
  onSelectTag: (s: string) => void
  onToggleFavorites: () => void
  onSearchChange: (v: string) => void
  onSortChange: (v: 'time_desc' | 'time_asc' | 'wrong_desc' | 'wrong_asc' | 'correct_desc' | 'correct_asc') => void
  isDark: boolean
  actionButtons?: React.ReactNode
}) {
  const [showFilters, setShowFilters] = useState(false)

  const sortOptions = [
    { value: 'time_desc', label: '最新优先' },
    { value: 'time_asc', label: '最早优先' },
    { value: 'wrong_desc', label: '做错次数多' },
    { value: 'wrong_asc', label: '做错次数少' },
    { value: 'correct_desc', label: '做对次数多' },
    { value: 'correct_asc', label: '做对次数少' },
  ] as const

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <div className={`flex-1 relative ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-slate-200'} border rounded-xl`}>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索题目、答案、备注..."
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none bg-transparent ${isDark ? 'text-neutral-200 placeholder:text-neutral-600' : 'text-slate-700 placeholder:text-slate-400'}`}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          筛选
        </button>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
          className={`px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer ${isDark ? 'bg-neutral-800 text-neutral-300 border border-neutral-700' : 'bg-white text-slate-600 border border-slate-200/60'}`}
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className={`px-3 py-2 rounded-xl text-xs font-medium ${isDark ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' : 'bg-white text-slate-500 border border-slate-200/60'}`}>
          共 {totalCount} 题
        </div>
        {actionButtons}
      </div>

      {showFilters && (
        <div className={`p-4 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
          <div>
            <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>学科</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button onClick={() => onSelectSubject('全部')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedSubject === '全部' ? 'bg-blue-500 text-white' : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}>全部</button>
              {subjects.map(s => (
                <button key={s} onClick={() => onSelectSubject(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedSubject === s ? 'bg-blue-500 text-white' : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}>{s}</button>
              ))}
            </div>
          </div>

          {sources.length > 0 && (
            <div>
              <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>题源</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button onClick={() => onSelectSource('全部')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedSource === '全部' ? 'bg-indigo-500 text-white' : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}>全部</button>
                {sources.map(s => (
                  <button key={s} onClick={() => onSelectSource(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedSource === s ? 'bg-indigo-500 text-white' : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>标签</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button onClick={() => onSelectTag('全部')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedTag === '全部' ? 'bg-emerald-500 text-white' : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}>全部</button>
                {tags.map(t => (
                  <button key={t} onClick={() => onSelectTag(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedTag === t ? 'bg-emerald-500 text-white' : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}>{t}</button>
                ))}
              </div>
            </div>
          )}

          <button onClick={onToggleFavorites} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${showFavoritesOnly ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}>
            <svg className="w-3.5 h-3.5" fill={showFavoritesOnly ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {showFavoritesOnly ? '仅显示收藏' : '显示收藏'}
          </button>
        </div>
      )}
    </div>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)
  const { isDark } = useTheme()

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 ${isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-white text-slate-600 hover:bg-slate-100'} border ${isDark ? 'border-neutral-700' : 'border-slate-200'}`}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  )
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <div className={`text-center py-16 px-4 ${isDark ? 'text-neutral-400' : 'text-slate-400'}`}>
      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p className="text-base font-medium mb-1">暂无错题</p>
      <p className="text-sm">点击上方"添加错题"按钮开始记录</p>
    </div>
  )
}

export default function AppWrapper() {
  return (
    <ThemeProvider>
      <NotifyProvider>
        <TimerProvider>
          <App />
        </TimerProvider>
      </NotifyProvider>
    </ThemeProvider>
  )
}

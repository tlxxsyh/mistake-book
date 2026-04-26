import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useTheme } from './ThemeProvider'
import { useNotify } from './NotifyProvider'

interface NoteLink {
  url: string
  name: string
}

interface NoteItem {
  id: string
  title: string
  content: string
  links: NoteLink[]
  images: string[]
  tags: string[]
  is_pinned: boolean
  created_at: number
  updated_at: number
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function NotesPage() {
  const { isDark } = useTheme()
  const { message } = useNotify()
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null)
  const [inputTitle, setInputTitle] = useState('')
  const [inputContent, setInputContent] = useState('')
  const [inputLinks, setInputLinks] = useState<NoteLink[]>([])
  const [inputImages, setInputImages] = useState<string[]>([])
  const [inputTagInput, setInputTagInput] = useState('')
  const [inputTags, setInputTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const textPrimary = isDark ? 'text-white' : 'text-slate-800'
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-400'
  const textSecondary = isDark ? 'text-neutral-300' : 'text-slate-500'
  const cardBg = isDark ? 'bg-neutral-900' : 'bg-white'

  const loadNotes = useCallback(async () => {
    try {
      const data = await invoke<NoteItem[]>('get_all_notes')
      setNotes(data)
    } catch {}
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const openAddModal = () => {
    setEditingNote(null)
    setInputTitle('')
    setInputContent('')
    setInputLinks([])
    setInputImages([])
    setInputTags([])
    setInputTagInput('')
    setShowModal(true)
  }

  const openEditModal = (note: NoteItem) => {
    setEditingNote(note)
    setInputTitle(note.title)
    setInputContent(note.content)
    setInputLinks(note.links && note.links.length > 0 ? [...note.links] : [])
    setInputImages(note.images && note.images.length > 0 ? [...note.images] : [])
    setInputTags(note.tags && note.tags.length > 0 ? [...note.tags] : [])
    setInputTagInput('')
    setShowModal(true)
  }

  const handleAddImage = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
      })
      if (!selected) return
      for (const filePath of selected) {
        try {
          const dataUrl = await invoke<string>('read_image', { path: filePath })
          setInputImages(prev => [...prev, dataUrl])
        } catch {}
      }
    } catch {}
  }

  const handlePasteImage = useCallback((e: ClipboardEvent) => {
    if (!showModal) return
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string
            setInputImages(prev => [...prev, dataUrl])
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }, [showModal])

  useEffect(() => {
    document.addEventListener('paste', handlePasteImage)
    return () => document.removeEventListener('paste', handlePasteImage)
  }, [handlePasteImage])

  const handleAddTag = () => {
    const tag = inputTagInput.trim()
    if (tag && !inputTags.includes(tag)) {
      setInputTags(prev => [...prev, tag])
      setInputTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setInputTags(prev => prev.filter(t => t !== tag))
  }

  const handleSave = async () => {
    const title = inputTitle.trim()
    if (!title) return

    const now = Date.now()
    const cleanLinks = inputLinks.filter(l => l.url.trim()).map(l => ({ url: l.url.trim(), name: l.name.trim() }))
    const cleanImages = inputImages.filter(img => img)

    if (editingNote) {
      try {
        const updated = await invoke<NoteItem[]>('update_note', {
          id: editingNote.id,
          title: title || undefined,
          content: inputContent.trim() || undefined,
          links: cleanLinks.length > 0 ? cleanLinks : undefined,
          images: cleanImages.length > 0 ? cleanImages : undefined,
          tags: inputTags.length > 0 ? inputTags : undefined,
        })
        setNotes(updated)
      } catch {}
    } else {
      const note: NoteItem = {
        id: genId(),
        title,
        content: inputContent.trim(),
        links: cleanLinks,
        images: cleanImages,
        tags: inputTags,
        is_pinned: false,
        created_at: now,
        updated_at: now,
      }
      try {
        const updated = await invoke<NoteItem[]>('add_note', { note })
        setNotes(updated)
      } catch {}
    }
    setShowModal(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条便签吗？')) return
    try {
      const updated = await invoke<NoteItem[]>('delete_note', { id })
      setNotes(updated)
    } catch {
      message('删除失败，请重试', 'error')
    }
  }

  const handleTogglePin = async (id: string) => {
    try {
      const [, updated] = await invoke<[boolean, NoteItem[]]>('toggle_note_pin', { id })
      setNotes(updated)
    } catch {}
  }

  const handleOpenUrl = async (url: string) => {
    if (!url) return
    try { await openUrl(url) } catch {}
  }

  const filteredNotes = selectedTag
    ? notes.filter(n => n.tags?.includes(selectedTag))
    : notes

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned)
  const normalNotes = filteredNotes.filter(n => !n.is_pinned)

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).sort()

  return (
    <div className="max-w-[1100px] mx-auto p-8 flex gap-5">
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${textPrimary}`}>便签</h1>
            <p className={`text-sm mt-0.5 ${textMuted}`}>记录备忘录、待办事项、常用链接</p>
          </div>
          <button onClick={openAddModal} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1.5 ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            新建便签
          </button>
        </div>

        {filteredNotes.length === 0 && (
          <div className={`rounded-2xl border p-10 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200/60'} flex flex-col items-center justify-center`}>
            <svg className={`w-14 h-14 mb-4 ${isDark ? 'text-neutral-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <p className={`text-base font-medium ${textSecondary}`}>{selectedTag ? `没有包含「${selectedTag}」标签的便签` : '暂无便签'}</p>
            <p className={`text-sm mt-1 ${textMuted}`}>{selectedTag ? '点击其他标签或清除筛选' : '点击上方按钮创建你的第一条便签'}</p>
          </div>
        )}

        {pinnedNotes.length > 0 && (
          <div>
            <div className={`flex items-center gap-1.5 mb-2 px-1`}>
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>置顶便签</span>
              {selectedTag && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{selectedTag}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pinnedNotes.map(note => renderNoteCard(note))}
            </div>
          </div>
        )}

        {normalNotes.length > 0 && (
          <div>
            {pinnedNotes.length > 0 && (
              <div className={`flex items-center gap-1.5 mb-2 px-1`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>全部便签</span>
                {selectedTag && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{selectedTag}</span>}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {normalNotes.map(note => renderNoteCard(note))}
            </div>
          </div>
        )}
      </div>

      {allTags.length > 0 && (
        <aside className={`w-[180px] shrink-0 rounded-xl border p-4 h-fit sticky top-6 ${cardBg} ${isDark ? 'border-neutral-800' : 'border-slate-200/60'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>标签</h3>
            {selectedTag && (
              <button onClick={() => setSelectedTag(null)} className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                清除
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => {
              const isActive = selectedTag === tag
              const count = notes.filter(n => n.tags?.includes(tag)).length
              const tagCls = isActive
                ? 'bg-blue-500 text-white shadow-sm'
                : (isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800')
              const countCls = isActive ? 'text-blue-200' : (isDark ? 'text-neutral-500' : 'text-slate-400')
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isActive ? null : tag)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${tagCls}`}
                >
                  <span>{tag}</span>
                  <span className={`text-[10px] ${countCls}`}>({count})</span>
                </button>
              )
            })}
          </div>
        </aside>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${cardBg} ${isDark ? 'border-neutral-700' : 'border-slate-200'} max-h-[90vh] flex flex-col`}>
            <div className={`px-5 py-4 border-b shrink-0 ${isDark ? 'border-neutral-800' : 'border-slate-100'} flex items-center justify-between`}>
              <h3 className={`text-base font-semibold ${textPrimary}`}>{editingNote ? '编辑便签' : '新建便签'}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>标题 *</label>
                <input autoFocus value={inputTitle} onChange={e => setInputTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder="输入标题..." className={`w-full px-3 py-2 rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30' : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30'}`} />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>内容</label>
                <textarea value={inputContent} onChange={e => setInputContent(e.target.value)} placeholder="记录备忘录或待办事项..." rows={4} className={`w-full px-3 py-2 rounded-xl text-sm outline-none transition-all resize-none ${isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30' : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30'}`} />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>标签</label>
                <div className="flex gap-1.5 mb-2">
                  <input value={inputTagInput} onChange={e => setInputTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }} placeholder="输入标签后按回车添加" className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all ${isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500' : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 focus:border-blue-400'}`} />
                  <button onClick={handleAddTag} className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>添加</button>
                </div>
                {inputTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {inputTags.map(tag => (
                      <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400 transition-colors"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className={`flex items-center justify-between mb-2`}>
                  <label className={`text-xs font-medium ${textSecondary}`}>链接</label>
                  <button onClick={() => setInputLinks(prev => [...prev, { url: '', name: '' }])} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    添加链接
                  </button>
                </div>
                {inputLinks.length === 0 && <p className={`text-[11px] italic ${textMuted} py-2`}>暂无链接，点击「添加链接」按钮添加</p>}
                <div className="space-y-2">
                  {inputLinks.map((link, idx) => (
                    <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-xl ${isDark ? 'bg-neutral-800/60' : 'bg-slate-50'}`}>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <input value={link.name} onChange={e => setInputLinks(prev => prev.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))} placeholder="链接名称" className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all ${isDark ? 'bg-neutral-700 border border-neutral-600 text-white placeholder-neutral-500 focus:border-blue-500' : 'bg-white border border-slate-200 text-slate-800 placeholder-slate-300 focus:border-blue-400'}`} />
                        <input value={link.url} onChange={e => setInputLinks(prev => prev.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))} placeholder="https://..." className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all ${isDark ? 'bg-neutral-700 border border-neutral-600 text-white placeholder-neutral-500 focus:border-blue-500' : 'bg-white border border-slate-200 text-slate-800 placeholder-slate-300 focus:border-blue-400'}`} />
                      </div>
                      <button onClick={() => setInputLinks(prev => prev.filter((_, i) => i !== idx))} className={`mt-1 p-1 rounded-lg shrink-0 transition-colors ${isDark ? 'hover:bg-red-500/10 text-neutral-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className={`flex items-center justify-between mb-2`}>
                  <label className={`text-xs font-medium ${textSecondary}`}>图片（{inputImages.length}张）</label>
                  <div className="flex gap-1.5">
                    <button onClick={handleAddImage} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${isDark ? 'text-green-400 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-50'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                      上传图片
                    </button>
                  </div>
                </div>
                <p className={`text-[10px] italic ${textMuted} mb-2`}>支持粘贴截图或点击上传</p>
                {inputImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {inputImages.map((img, idx) => (
                      <div key={idx} className={`relative group rounded-lg overflow-hidden aspect-square ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setInputImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`px-5 py-4 border-t shrink-0 flex justify-end gap-2.5 ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
              <button onClick={() => setShowModal(false)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>取消</button>
              <button onClick={handleSave} disabled={!inputTitle.trim()} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1.5 ${inputTitle.trim() ? (isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20') : (isDark ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed')}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImages && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" onClick={() => setLightboxImages(null)}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <button
            onClick={() => setLightboxImages(null)}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % lightboxImages.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </>
          )}

          <div className="relative z-10 max-w-[85vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImages[lightboxIndex]} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" key={lightboxIndex} />
            {lightboxImages.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {lightboxImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            )}
            <p className="text-center text-white/50 text-xs mt-2">{lightboxIndex + 1} / {lightboxImages.length}</p>
          </div>
        </div>
      )}
    </div>
  )

  function ImageCarousel({ images, isDark, onOpenLightbox }: { images: string[]; isDark: boolean; onOpenLightbox: (idx: number) => void }) {
    const [current, setCurrent] = useState(0)
    const total = images.length

    const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); setCurrent(c => (c - 1 + total) % total) }
    const goNext = (e: React.MouseEvent) => { e.stopPropagation(); setCurrent(c => (c + 1) % total) }

    if (total === 1) {
      return (
        <div className="aspect-video cursor-pointer" onClick={() => onOpenLightbox(0)}>
          <img src={images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )
    }

    return (
      <div className="group aspect-video relative">
        <div className="cursor-pointer h-full" onClick={() => onOpenLightbox(current)}>
          <img src={images[current]} alt="" className="w-full h-full object-cover transition-opacity duration-200" loading="lazy" key={images[current]} />
        </div>

        <button onClick={goPrev} className={`absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md ${isDark ? 'bg-black/60 text-white hover:bg-black/80' : 'bg-white/80 text-slate-700 hover:bg-white'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <button onClick={goNext} className={`absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md ${isDark ? 'bg-black/60 text-white hover:bg-black/80' : 'bg-white/80 text-slate-700 hover:bg-white'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>

        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? (isDark ? 'bg-white w-3' : 'bg-slate-800 w-3') : (isDark ? 'bg-white/40 hover:bg-white/60' : 'bg-slate-400/50 hover:bg-slate-400')}`}
            />
          ))}
        </div>

        <span className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium backdrop-blur-sm ${isDark ? 'bg-black/50 text-white/70' : 'bg-white/70 text-slate-600'}`}>
          {current + 1}/{total}
        </span>
      </div>
    )
  }

  function renderNoteCard(note: NoteItem) {
    return (
      <div key={note.id} className={`group relative rounded-xl border overflow-hidden transition-all hover:shadow-md cursor-default ${note.is_pinned ? (isDark ? 'bg-yellow-500/[0.06] border-yellow-500/[0.2]' : 'bg-yellow-50 border-yellow-200') : (cardBg + ' ' + (isDark ? 'border-neutral-800' : 'border-slate-200/60'))}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`text-sm font-semibold leading-tight ${textPrimary} line-clamp-2`}>{note.title}</h3>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id) }} className={`p-1 rounded-lg transition-colors ${note.is_pinned ? 'text-yellow-500' : (isDark ? 'hover:bg-neutral-800 text-neutral-500 hover:text-yellow-400' : 'hover:bg-slate-100 text-slate-300 hover:text-yellow-500')}`} title={note.is_pinned ? '取消置顶' : '置顶'}>
                <svg className="w-4 h-4" fill={note.is_pinned ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor" strokeWidth={note.is_pinned ? 0 : 1.5}><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); openEditModal(note) }} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-500 hover:text-white' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'}`} title="编辑">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/10 text-neutral-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`} title="删除">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          </div>

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {note.tags.map(tag => (
                <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{tag}</span>
              ))}
            </div>
          )}

          {note.content && (
            <p className={`text-xs leading-relaxed mb-2 whitespace-pre-wrap break-words ${textSecondary}`}>{note.content}</p>
          )}

          {note.images && note.images.length > 0 && (
            <div className={`relative rounded-lg overflow-hidden mb-2 ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
              <ImageCarousel images={note.images} isDark={isDark} onOpenLightbox={(idx) => { setLightboxImages(note.images); setLightboxIndex(idx) }} />
            </div>
          )}

          {note.links && note.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {note.links.map((link, idx) =>
                link.url ? (
                  <button key={idx} onClick={(e) => { e.stopPropagation(); handleOpenUrl(link.url) }} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all max-w-full ${isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}>
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                    <span className="truncate max-w-[120px]">{link.name || (() => { try { return new URL(link.url).hostname } catch { return link.url } })()}</span>
                    <svg className="w-2.5 h-2.5 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-5 5m5-5h-7.5" /></svg>
                  </button>
                ) : null
              )}
            </div>
          )}

          <div className={`pt-2 border-t flex items-center justify-between ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
            <span className={`text-[10px] ${textMuted}`}>{formatTime(note.updated_at)}</span>
            {note.is_pinned && <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>}
          </div>
        </div>
      </div>
    )
  }
}

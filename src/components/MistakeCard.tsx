import { useState } from 'react'
import katex from 'katex'
import type { Mistake } from '../App'
import { ImageCarousel, ImageViewer } from './ImageCarousel'
import { useTheme } from './ThemeProvider'

interface MistakeCardProps {
  mistake: Mistake
  imageCache: Record<string, string>
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (mistake: Mistake) => void
  onViewDetail: (mistake: Mistake) => void
  onRecordReview?: (id: string, isCorrect: boolean) => Promise<void>
}

export default function MistakeCard({ mistake, imageCache, onToggleFavorite, onDelete, onEdit, onViewDetail, onRecordReview }: MistakeCardProps) {
  const { isDark } = useTheme()
  const renderMath = (text: string) => {
    try {
      const processed = text.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
        try { return katex.renderToString(tex.trim(), { throwOnError: false, displayMode: false }) } catch { return `$${tex}$` }
      }).replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        try { return katex.renderToString(tex.trim(), { throwOnError: false, displayMode: true }) } catch { return `$$${tex}$$` }
      })
      return processed
    } catch { return text }
  }

  const hasImages = mistake.question_images.length > 0 || mistake.answer_images.length > 0

  return (
    <div>
      <div onClick={() => onViewDetail(mistake)} className={`group rounded-2xl shadow-sm hover:shadow-lg overflow-hidden transition-all duration-300 cursor-pointer ${isDark ? 'bg-neutral-900 border-neutral-800 shadow-black/20 hover:shadow-black/40' : 'bg-white border-slate-200/60 shadow-slate-200/50'}`}>
        <div className="flex items-stretch p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {mistake.subject && <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{mistake.subject}</span>}
                  {mistake.source && <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-500'}`}>{mistake.source}</span>}
                  {mistake.is_favorite && (
                    <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  )}
                  {hasImages && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isDark ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                      {mistake.question_images.length + mistake.answer_images.length}
                    </span>
                  )}
                  {mistake.tags.length > 0 && (
                    <span className="flex gap-1">
                      {mistake.tags.slice(0, 3).map(t => <span key={t} className={`px-1.5 py-0.5 rounded-full text-[10px] ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>{t}</span>)}
                      {mistake.tags.length > 3 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-slate-100 text-slate-400'}`}>+{mistake.tags.length - 3}</span>}
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>{mistake.question_text || '无题目描述'}</p>
                {mistake.note && <p className={`text-xs mt-1 line-clamp-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>{mistake.note}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onEdit(mistake) }} className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${isDark ? 'text-neutral-500 hover:text-blue-400 hover:bg-neutral-800' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title="编辑">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(mistake.id) }} className={`p-1.5 rounded-lg transition-all ${mistake.is_favorite ? 'text-yellow-400' : `opacity-0 group-hover:opacity-100 ${isDark ? 'text-neutral-500 hover:text-yellow-400 hover:bg-neutral-800' : 'text-slate-300 hover:text-yellow-400 hover:bg-yellow-50'}`}`} title={mistake.is_favorite ? '取消收藏' : '收藏'}>
                    <svg className="w-4 h-4" fill={mistake.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (!confirm('确定要删除这道错题吗？')) return; onDelete(mistake.id) }} className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${isDark ? 'text-neutral-500 hover:text-red-400 hover:bg-neutral-800' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} title="删除">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <span className={`text-[10px] whitespace-nowrap ${isDark ? 'text-neutral-600' : 'text-slate-300'}`}>{new Date(mistake.created_at).toLocaleDateString('zh-CN')}</span>
                {(mistake.wrong_count > 0 || mistake.correct_count > 0) && (
                  <div className={`flex items-center gap-1.5 text-[9px] ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                    <span className="flex items-center gap-0.5 text-red-400">
                      ✗ {mistake.wrong_count}
                    </span>
                    <span className="flex items-center gap-0.5 text-green-400">
                      ✓ {mistake.correct_count}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DetailModalProps {
  mistake: Mistake | null
  imageCache: Record<string, string>
  onClose: () => void
  onEdit: (mistake: Mistake) => void
  onDelete: (id: string) => void
  onRecordReview?: (id: string, isCorrect: boolean) => Promise<void>
}

export function DetailModal({ mistake, imageCache, onClose, onEdit, onDelete, onRecordReview }: DetailModalProps) {
  const { isDark } = useTheme()
  const [viewerImages, setViewerImages] = useState<string[] | null>(null)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [reviewing, setReviewing] = useState(false)

  if (!mistake) return null

  const renderMath = (text: string) => {
    try {
      const processed = text.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
        try { return katex.renderToString(tex.trim(), { throwOnError: false, displayMode: false }) } catch { return `$${tex}$` }
      }).replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        try { return katex.renderToString(tex.trim(), { throwOnError: false, displayMode: true }) } catch { return `$$${tex}$$` }
      })
      return processed
    } catch { return text }
  }

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className={`relative rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 flex flex-col ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
        <header className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-neutral-800 bg-neutral-900' : 'border-slate-100 bg-gradient-to-r from-slate-50 to-white'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>错题详情</h2>
                <p className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-slate-400'}`}>{mistake.question_text || '无题目描述'}</p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-xl transition-all shrink-0 ${isDark ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto ${isDark ? 'divide-neutral-800' : 'divide-slate-100'} grid grid-cols-1 lg:grid-cols-2 divide-x`}>
            {/* 左侧：图片区 */}
            <div className={`p-5 space-y-5 ${isDark ? 'bg-black/20' : 'bg-slate-50/30'}`}>
              {/* 题目图片 */}
              <section>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  题目图片 ({mistake.question_images.length})
                </h3>
                <ImageCarousel
                  images={mistake.question_images}
                  imageCache={imageCache}
                  maxHeight={320}
                  emptyLabel="暂无题目图片"
                  onImageClick={(i) => { setViewerImages(mistake.question_images); setViewerIndex(i) }}
                />
              </section>

              {/* 答案图片 */}
              <section>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  答案图片 ({mistake.answer_images.length})
                </h3>
                <ImageCarousel
                  images={mistake.answer_images}
                  imageCache={imageCache}
                  maxHeight={280}
                  emptyLabel="暂无答案图片"
                  onImageClick={(i) => { setViewerImages(mistake.answer_images); setViewerIndex(i) }}
                />
              </section>
            </div>

            {/* 右侧：文字和属性 */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(85vh-64px)]">
              {/* 题目文字 */}
              <section>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.279.193 3.48.217.79.013 1.579.023 2.37.011v2.288c0 .39.39.652.77.512a24.74 24.74 0 007.38-2.69.75.75 0 00.43-.702 34.83 34.83 0 00-.055-5.89.75.75 0 00-.71-.644c-1.79.143-3.54.468-5.23.98a.75.75 0 01-.72-.207A33.67 33.67 0 0112 8.25c-.79 0-1.58.01-2.37.011" /></svg>
                  题目文字
                </h3>
                <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'bg-blue-900/30 text-neutral-300' : 'bg-blue-50/50 text-slate-700'}`}>{mistake.question_text || '-'}</div>
              </section>

              {/* 答案文字 */}
              <section>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                  答案 / 解析
                </h3>
                {mistake.answer_text ? (
                  <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${isDark ? 'bg-green-900/30 text-neutral-300' : 'bg-green-50/50 text-slate-700'}`} dangerouslySetInnerHTML={{ __html: renderMath(mistake.answer_text) }} />
                ) : (
                  <div className={`px-4 py-3 rounded-xl text-sm italic ${isDark ? 'bg-green-900/10 text-neutral-500' : 'bg-green-50/30 text-slate-400'}`}>-</div>
                )}
              </section>

              {/* 属性信息 */}
              <section>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                  属性信息
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] uppercase tracking-wider mb-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>学科</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>{mistake.subject || '-'}</p>
                    </div>
                    <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] uppercase tracking-wider mb-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>题源</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>{mistake.source || '-'}</p>
                    </div>
                  </div>

                  {mistake.tags.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">标签</p>
                      <div className="flex flex-wrap gap-2">
                        {mistake.tags.map(tag => (
                          <span key={tag} className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium hover:transition-colors cursor-default ${isDark ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {mistake.note && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">备注</p>
                      <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap border ${isDark ? 'bg-amber-900/20 text-neutral-300 border-amber-800/30' : 'bg-amber-50/60 text-slate-700 border-amber-100/50'}`}>{mistake.note}</div>
                    </div>
                  )}

                  <div className={`flex items-center gap-4 pt-2 text-xs ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                    <span>创建于 {new Date(mistake.created_at).toLocaleString('zh-CN')}</span>
                    {mistake.is_favorite && (
                      <span className="inline-flex items-center gap-1 text-yellow-500">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                        已收藏
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>

        <footer className={`flex items-center justify-between px-6 py-3 border-t shrink-0 ${isDark ? 'border-neutral-800 bg-black/20' : 'border-slate-100 bg-slate-50/50'}`}>
          {onRecordReview && (
            <div className="flex items-center gap-2">
              {(mistake.wrong_count > 0 || mistake.correct_count > 0) && (
                <div className={`flex items-center gap-2 mr-2 text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  <span className="flex items-center gap-1 text-red-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    {mistake.wrong_count}
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {mistake.correct_count}
                  </span>
                </div>
              )}
              <button
                onClick={() => { setReviewing(true); onRecordReview(mistake.id, false).finally(() => setReviewing(false)) }}
                disabled={reviewing}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${reviewing ? 'opacity-50 cursor-wait' : ''} ${isDark ? 'text-red-400 border-red-800/50 hover:bg-red-900/20 active:scale-95' : 'text-red-600 border-red-200 hover:bg-red-50 active:scale-95'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                做错了
              </button>
              <button
                onClick={() => { setReviewing(true); onRecordReview(mistake.id, true).finally(() => setReviewing(false)) }}
                disabled={reviewing}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${reviewing ? 'opacity-50 cursor-wait' : ''} ${isDark ? 'text-green-400 border-green-800/50 hover:bg-green-900/20 active:scale-95' : 'text-green-600 border-green-200 hover:bg-green-50 active:scale-95'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                做对了
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(mistake)} className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all ${isDark ? 'text-blue-400 hover:bg-neutral-800' : 'text-blue-600 hover:bg-blue-50'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              编辑
            </button>
            <button onClick={() => { if (!confirm('确定要删除这道错题吗？')) return; onDelete(mistake.id) }} className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all ${isDark ? 'text-red-400 hover:bg-neutral-800' : 'text-red-600 hover:bg-red-50'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              删除
            </button>
          </div>
        </footer>
      </div>
    </div>

    {viewerImages && (
      <ImageViewer
        images={viewerImages}
        imageCache={imageCache}
        initialIndex={viewerIndex}
        onClose={() => setViewerImages(null)}
      />
    )}
    </>
  )
}

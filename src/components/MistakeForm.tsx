import { useEffect, useCallback, useState } from 'react'
import { ImageCarousel, ImageViewer } from './ImageCarousel'
import { useTheme } from './ThemeProvider'

interface FormData {
  questionImages: string[]
  questionText: string
  answerImages: string[]
  answerText: string
  subjectInput: string
  sourceInput: string
  isFavorite: boolean
  tagInput: string
  currentTags: string[]
  noteInput: string
}

type PasteTarget = 'question' | 'answer' | null

interface MistakeFormProps {
  show: boolean
  editingId: string | null
  formData: FormData
  imageCache: Record<string, string>
  allSubjects: string[]
  allTags: string[]
  allSources: string[]
  onFormChange: (data: Partial<FormData>) => void
  onReset: () => void
  onClose: () => void
  onSave: () => void
}

export default function MistakeForm({
  show, editingId, formData, imageCache,
  allSubjects, allTags, allSources, onFormChange, onClose, onSave
}: MistakeFormProps) {
  const { isDark } = useTheme()
  const [pasteTarget, setPasteTarget] = useState<PasteTarget>(null)
  const [viewerImages, setViewerImages] = useState<string[] | null>(null)
  const [viewerIndex, setViewerIndex] = useState(0)

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!show || !pasteTarget) return
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string
            if (pasteTarget === 'question') {
              onFormChange({ questionImages: [...formData.questionImages, dataUrl] })
            } else {
              onFormChange({ answerImages: [...formData.answerImages, dataUrl] })
            }
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }, [show, pasteTarget, formData.questionImages, formData.answerImages, onFormChange])

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const addTag = () => {
    const tag = formData.tagInput.trim()
    if (tag && !formData.currentTags.includes(tag)) {
      onFormChange({ currentTags: [...formData.currentTags, tag], tagInput: '' })
    } else {
      onFormChange({ tagInput: '' })
    }
  }

  const removeQuestionImage = (index: number) => {
    onFormChange({ questionImages: formData.questionImages.filter((_, i) => i !== index) })
  }

  const removeAnswerImage = (index: number) => {
    onFormChange({ answerImages: formData.answerImages.filter((_, i) => i !== index) })
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
      <div onClick={e => e.stopPropagation()} className={`relative w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 ${isDark ? 'bg-neutral-900 shadow-black/40 border border-neutral-800' : 'bg-white shadow-slate-300/50 border border-slate-200/60'}`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-neutral-800 bg-neutral-900' : 'border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{editingId ? '编辑错题' : '添加新错题'}</span>
          <button onClick={() => { onClose(); }} className={`transition-colors ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-slate-400 hover:text-slate-600'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-60px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* 题目区域 */}
            <FormField label="题目" labelColor="blue" labelIcon={
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            }>
              {formData.questionImages.length > 0 ? (
                <div onClick={() => setPasteTarget('question')} className={`mb-3 cursor-pointer transition-all ${pasteTarget === 'question' ? 'ring-2 ring-blue-200 bg-blue-50/30 rounded-xl p-1 -m-1' : ''}`}>
                  <ImageCarousel
                    images={formData.questionImages}
                    maxHeight={180}
                    onDelete={removeQuestionImage}
                    onImageClick={(i) => { setViewerImages(formData.questionImages); setViewerIndex(i) }}
                  />
                </div>
              ) : (
                <DropZone hint="点击选中后 Ctrl+V 粘贴题目截图（可粘贴多张）" color="blue" isActive={pasteTarget === 'question'} onClick={() => setPasteTarget('question')} />
              )}

              <input type="text" value={formData.questionText} onChange={e => onFormChange({ questionText: e.target.value })} placeholder="题目简要描述（如题号、关键词等）..." className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 border' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 border'}`} />
            </FormField>

            {/* 答案区域 */}
            <FormField label="答案 / 解析" labelColor="green" labelIcon={
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }>
              {formData.answerImages.length > 0 ? (
                <div onClick={() => setPasteTarget('answer')} className={`mb-3 cursor-pointer transition-all ${pasteTarget === 'answer' ? 'ring-2 ring-green-200 bg-green-50/30 rounded-xl p-1 -m-1' : ''}`}>
                  <ImageCarousel
                    images={formData.answerImages}
                    maxHeight={160}
                    onDelete={removeAnswerImage}
                    onImageClick={(i) => { setViewerImages(formData.answerImages); setViewerIndex(i) }}
                  />
                </div>
              ) : (
                <DropZone hint="点击选中后 Ctrl+V 粘贴答案截图（可粘贴多张，与题目独立）" color="green" small isActive={pasteTarget === 'answer'} onClick={() => setPasteTarget('answer')} />
              )}

              <textarea value={formData.answerText} onChange={e => onFormChange({ answerText: e.target.value })} placeholder='输入答案或解析... 支持数学公式 LaTeX：行内用 $x^2$，独立公式用 $$\frac{a}{b}$$' rows={4} className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono ${isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 border' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 border'}`} />
            </FormField>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>学科</label>
              <input type="text" list="subject-list" value={formData.subjectInput} onChange={e => onFormChange({ subjectInput: e.target.value })} placeholder="如：高等数学、线性代数..." className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 border' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 border'}`} />
              <datalist id="subject-list">{allSubjects.map(s => <option key={s} value={s} />)}</datalist>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>题源</label>
              <input type="text" list="source-list" value={formData.sourceInput} onChange={e => onFormChange({ sourceInput: e.target.value })} placeholder="如：2024年真题、张宇1000题..." className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 border' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 border'}`} />
              <datalist id="source-list">{allSources.map(s => <option key={s} value={s} />)}</datalist>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>标签</label>
              <input type="text" list="tag-list" value={formData.tagInput} onChange={e => onFormChange({ tagInput: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="输入标签后按回车..." className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 border' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 border'}`} />
              <datalist id="tag-list">{allTags.map(t => <option key={t} value={t} />)}</datalist>
              {formData.currentTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.currentTags.map(tag => (
                    <span key={tag} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                      {tag}
                      <button onClick={() => onFormChange({ currentTags: formData.currentTags.filter(t => t !== tag) })} className="hover:text-blue-900 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>备注</label>
              <textarea value={formData.noteInput} onChange={e => onFormChange({ noteInput: e.target.value })} placeholder="记录解题思路、易错点、注意事项..." rows={3} className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 border' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 border'}`} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={() => onFormChange({ isFavorite: !formData.isFavorite })} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${formData.isFavorite ? (isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') : (isDark ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}>
                <svg className={`w-5 h-5 ${formData.isFavorite ? 'fill-current' : ''}`} fill={formData.isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                {formData.isFavorite ? '已收藏' : '收藏'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => { onClose(); }} className={`px-5 py-2.5 border rounded-xl transition-all text-sm font-medium ${isDark ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>取消</button>
                <button onClick={onSave} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm font-medium">{editingId ? '保存修改' : '保存错题'}</button>
              </div>
            </div>
          </div>
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
    </div>
    </div>
  )
}

function FormField({ children, label, labelColor, labelIcon }: { children: React.ReactNode; label: string; labelColor: string; labelIcon: React.JSX.Element }) {
  const { isDark } = useTheme()
  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>
        <span className="inline-flex items-center gap-1.5">{labelIcon}{label}</span>
      </label>
      {children}
    </div>
  )
}

function DropZone({ hint, color, small, isActive, onClick }: { hint: string; color?: string; small?: boolean; isActive?: boolean; onClick?: () => void }) {
  const { isDark } = useTheme()
  const borderColor = color === 'green' ? (isActive ? 'border-green-500' : (isDark ? 'border-neutral-600' : 'border-green-300')) : (isActive ? 'border-blue-500' : (isDark ? 'border-neutral-600' : 'border-blue-300'))
  const hoverBorder = color === 'green' ? 'hover:border-green-400' : 'hover:border-blue-400'
  const ringColor = color === 'green' ? 'ring-green-200' : 'ring-blue-200'
  return (
    <div onClick={onClick} className={`border-2 border-dashed ${borderColor} rounded-${small ? 'xl' : '2xl'} p-${small ? '4' : '6'} text-center mb-3 ${hoverBorder} transition-all cursor-pointer ${isActive ? `ring-2 ${ringColor} shadow-sm` : (isDark ? 'bg-neutral-800/30' : 'bg-slate-50/50')}`}>
      <svg className={`w-${small ? '6' : '8'} h-${small ? '6' : '8'} ${isActive ? (color === 'green' ? 'text-green-400' : 'text-blue-400') : (isDark ? 'text-neutral-600' : 'text-slate-300')} mx-auto mb-${small ? '1' : '2'} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
      <p className={`text-${small ? 'xs' : 'sm'} ${isActive ? (color === 'green' ? 'text-green-600 font-medium' : 'text-blue-600 font-medium') : (isDark ? 'text-neutral-500' : 'text-slate-400')}`}>{hint}</p>
      {isActive && (
        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${color === 'green' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          已选中，请粘贴
        </div>
      )}
    </div>
  )
}

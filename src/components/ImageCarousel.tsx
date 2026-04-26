import { useState, useCallback, useEffect } from 'react'

interface ImageCarouselProps {
  images: string[]
  imageCache?: Record<string, string>
  maxHeight?: number
  emptyLabel?: string
  onImageClick?: (index: number) => void
  onDelete?: (index: number) => void
  deleteOnlyNew?: boolean
  badgeText?: (idx: number) => string
}

export function ImageCarousel({ images, imageCache, maxHeight = 200, emptyLabel = '暂无图片', onImageClick, onDelete, deleteOnlyNew, badgeText }: ImageCarouselProps) {
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    if (currentIdx >= images.length) {
      setCurrentIdx(images.length > 0 ? images.length - 1 : 0)
    }
  }, [images.length, currentIdx])

  if (images.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center bg-white/60">
        <svg className="w-7 h-7 text-slate-300 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
        <p className="text-xs text-slate-400">{emptyLabel}</p>
      </div>
    )
  }

  const isPath = (src: string) => !src.startsWith('data:')
  const getSrc = (src: string) => isPath(src) ? (imageCache?.[src] || '') : src
  const hasSrc = (src: string) => isPath(src) ? !!imageCache?.[src] : true

  const goPrev = () => setCurrentIdx(i => i > 0 ? i - 1 : images.length - 1)
  const goNext = () => setCurrentIdx(i => i < images.length - 1 ? i + 1 : 0)

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm relative group/carousel">
      <div className="relative" style={{ minHeight: Math.min(maxHeight * 0.6, 120) }}>
        {hasSrc(images[currentIdx]) ? (
          <img
            src={getSrc(images[currentIdx])}
            alt={`图片 ${currentIdx + 1}`}
            className={`w-full object-contain mx-auto cursor-zoom-in transition-opacity duration-200`}
            style={{ maxHeight }}
            onClick={() => onImageClick?.(currentIdx)}
          />
        ) : (
          <div className="w-full flex items-center justify-center bg-slate-100 animate-pulse" style={{ height: maxHeight }}>
            <span className="text-xs text-slate-400">加载中...</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <>
          <button onClick={goPrev} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all shadow-md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={goNext} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all shadow-md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            {images.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentIdx(idx)} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIdx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>

          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded-md backdrop-blur-sm">
            {currentIdx + 1}/{images.length}
          </span>
        </>
      )}

      {badgeText && (
        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-500/80 text-white text-[10px] rounded-md pointer-events-none">
          {badgeText(currentIdx)}
        </span>
      )}

      {onDelete && !deleteOnlyNew && images.length > 0 && (
        <button onClick={() => onDelete(currentIdx)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-sm z-10">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  )
}

interface ImageViewerProps {
  images: string[]
  imageCache?: Record<string, string>
  initialIndex?: number
  onClose: () => void
}

export function ImageViewer({ images, imageCache, initialIndex = 0, onClose }: ImageViewerProps) {
  const [idx, setIdx] = useState(initialIndex)

  const goPrev = useCallback(() => setIdx(i => i > 0 ? i - 1 : images.length - 1), [images.length])
  const goNext = useCallback(() => setIdx(i => i < images.length - 1 ? i + 1 : 0), [images.length])

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') goPrev()
    if (e.key === 'ArrowRight') goNext()
  }, [onClose, goPrev, goNext])

  const isPath = (src: string) => !src.startsWith('data:')
  const getSrc = (src: string) => isPath(src) ? (imageCache?.[src] || '') : src

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onKeyDown={handleKey}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />

      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2.5 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all" title="关闭 (Esc)">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {images.length > 1 && (
        <>
          <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-all border border-white/20" title="上一张 (←)">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={goNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-all border border-white/20" title="下一张 (→)">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </>
      )}

      <div className="relative z-10 max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        <img
          src={getSrc(images[idx])}
          alt={`放大图 ${idx + 1}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
          draggable={false}
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
          <button onClick={goPrev} className="hover:text-blue-300 transition-colors">‹</button>
          <span>{idx + 1} / {images.length}</span>
          <button onClick={goNext} className="hover:text-blue-300 transition-colors">›</button>
        </div>
      )}
    </div>
  )
}

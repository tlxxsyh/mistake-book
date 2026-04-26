import { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Mistake } from '../App'
import { useTheme } from './ThemeProvider'

interface ReviewQueueItem {
  mistake_id: string
  added_at: number
  consecutive_correct: number
  review_stage: number // 0: 初始阶段, 1: 7天间隔, 2: 30天间隔, 3: 完全掌握
  next_review_at?: number | null
}

interface ReviewPageProps {
  mistakes: Mistake[]
  imageCache: Record<string, string>
  onRecordReview: (id: string, isCorrect: boolean) => Promise<void>
  onViewDetail: (mistake: Mistake) => void
}

export default function ReviewPage({ mistakes, imageCache, onRecordReview, onViewDetail }: ReviewPageProps) {
  const { isDark } = useTheme()
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const loadReviewQueue = async () => {
    try {
      const queue = await invoke<ReviewQueueItem[]>('get_review_queue')
      setReviewQueue(queue)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    loadReviewQueue()
  }, [])

  useEffect(() => {
    loadReviewQueue()
  }, [mistakes.length])

  const pendingReviews = useMemo(() => {
    const now = Date.now() / 1000
    return reviewQueue.filter(item => {
      if (item.review_stage >= 3) return false // 完全掌握的不再显示
      
      const mistake = mistakes.find(m => m.id === item.mistake_id)
      if (!mistake) return false

      // 如果有下次复习时间，检查是否到了时间
      if (item.next_review_at && item.next_review_at > now) {
        return false
      }

      return true
    }).map(item => ({
      ...item,
      mistake: mistakes.find(m => m.id === item.mistake_id)!
    })).filter(item => item.mistake)
  }, [reviewQueue, mistakes])

  const completedReviews = useMemo(() => {
    return reviewQueue.filter(item => item.review_stage >= 3).map(item => ({
      ...item,
      mistake: mistakes.find(m => m.id === item.mistake_id)
    })).filter(item => item.mistake)
  }, [reviewQueue, mistakes])

  const totalNotMastered = useMemo(() => {
    return reviewQueue.filter(item => item.review_stage < 3 && mistakes.some(m => m.id === item.mistake_id)).length
  }, [reviewQueue, mistakes])

  const currentMistake = pendingReviews[currentIndex]?.mistake

  const handleReview = async (isCorrect: boolean) => {
    if (!currentMistake || reviewing) return
    setReviewing(true)
    try {
      await onRecordReview(currentMistake.id, isCorrect)
      await invoke('update_review_queue', { mistakeId: currentMistake.id, isCorrect })
      await loadReviewQueue()
      if (isCorrect && currentIndex < pendingReviews.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (!isCorrect) {
        setCurrentIndex(0)
      }
    } catch (e) { console.error(e) }
    finally { setReviewing(false) }
  }

  const cardBg = 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800'
  const textPrimary = 'text-slate-700 dark:text-neutral-200'
  const textSecondary = 'text-slate-500 dark:text-neutral-400'
  const textMuted = 'text-slate-400 dark:text-neutral-500'

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${textPrimary}`}>错题回顾</h1>
            <div className={`text-sm mt-1 ${textMuted}`}>
              {pendingReviews.length > 0
                ? `今日待复习：${pendingReviews.length} 道题`
                : totalNotMastered > 0
                  ? `队列中共 ${totalNotMastered} 道题未完全掌握`
                  : '太棒了！所有错题都已掌握'
              }
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalNotMastered > 0 && (
              <div className={`px-3 py-1.5 text-xs font-medium rounded-lg ${isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-600'}`}>
                未掌握: {totalNotMastered}
              </div>
            )}
            {completedReviews.length > 0 && (
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {showCompleted ? '隐藏' : '显示'}已掌握 ({completedReviews.length})
              </button>
            )}
          </div>
        </div>

        {/* 当前复习卡片 */}
        {currentMistake ? (
          <div className={`rounded-xl border p-6 ${cardBg}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`text-sm ${textMuted}`}>
                进度：{currentIndex + 1} / {pendingReviews.length}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const stage = pendingReviews[currentIndex]?.review_stage || 0
                  const stageInfo = {
                    0: { label: '初始复习', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                    1: { label: '7天间隔', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
                    2: { label: '30天间隔', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
                  }[stage] || { label: '未知', color: 'bg-gray-100 text-gray-700' }

                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageInfo.color}`}>
                      {stageInfo.label}
                      {pendingReviews[currentIndex]?.consecutive_correct > 0 && ` (已答对${pendingReviews[currentIndex].consecutive_correct}次)`}
                    </span>
                  )
                })()}
                {pendingReviews[currentIndex]?.next_review_at && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-500'}`}>
                    下次复习: {new Date(pendingReviews[currentIndex].next_review_at! * 1000).toLocaleDateString('zh-CN')}
                  </span>
                )}
              </div>
            </div>

            {/* 题目内容 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {currentMistake.subject && (
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                    {currentMistake.subject}
                  </span>
                )}
                {currentMistake.source && (
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-500'}`}>
                    {currentMistake.source}
                  </span>
                )}
                {(currentMistake.wrong_count > 0 || currentMistake.correct_count > 0) && (
                  <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                    <span className="flex items-center gap-1 text-red-400">✗ {currentMistake.wrong_count}</span>
                    <span className="flex items-center gap-1 text-green-400">✓ {currentMistake.correct_count}</span>
                  </div>
                )}
              </div>

              <p className={`text-base leading-relaxed ${textPrimary} whitespace-pre-wrap`}>
                {currentMistake.question_text || '无题目描述'}
              </p>

              {currentMistake.answer_text && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-neutral-800">
                  <p className={`text-xs font-medium mb-2 ${textMuted}`}>答案 / 解析</p>
                  <p className={`text-sm leading-relaxed ${textSecondary} whitespace-pre-wrap`}>
                    {currentMistake.answer_text}
                  </p>
                </div>
              )}

              {currentMistake.note && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  <p className={`text-xs italic ${textMuted}`}>{currentMistake.note}</p>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleReview(false)}
                disabled={reviewing}
                className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all border active:scale-95 ${reviewing ? 'opacity-50 cursor-wait' : ''} ${isDark ? 'text-red-400 border-red-800/50 hover:bg-red-900/20' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                做错了，明天再复习
              </button>
              <button
                onClick={() => handleReview(true)}
                disabled={reviewing}
                className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all border active:scale-95 ${reviewing ? 'opacity-50 cursor-wait' : ''} ${isDark ? 'text-green-400 border-green-800/50 hover:bg-green-900/20' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                做对了
                {pendingReviews[currentIndex]?.consecutive_correct === 1 && '，再答对一次即可掌握'}
              </button>
            </div>

            {/* 导航 */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-neutral-800">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : `${isDark ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'}`}`}
              >
                ← 上一题
              </button>
              <button
                onClick={() => onViewDetail(currentMistake)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                查看详情 →
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(pendingReviews.length - 1, currentIndex + 1))}
                disabled={currentIndex === pendingReviews.length - 1}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${currentIndex === pendingReviews.length - 1 ? 'opacity-30 cursor-not-allowed' : `${isDark ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'}`}`}
              >
                下一题 →
              </button>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl border p-12 text-center ${cardBg}`}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={`text-lg font-medium ${textSecondary}`}>太棒了！</p>
            <p className={`text-sm mt-2 ${textMuted}`}>
              {totalNotMastered > 0 ? '今日待复习题目已完成' : '所有错题都已掌握'}
            </p>
          </div>
        )}

        {/* 已完成的复习 */}
        {showCompleted && completedReviews.length > 0 && (
          <div className={`rounded-xl border p-5 ${cardBg}`}>
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>已掌握的错题（连续答对2次）</h3>
            <div className="space-y-2">
              {completedReviews.map((item, idx) => (
                <div key={item.mistake_id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-neutral-800' : 'bg-slate-50'}`}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className={`text-sm truncate ${textPrimary}`}>{item.mistake?.question_text || '无题目描述'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] ${textMuted}`}>{item.mistake?.subject}</span>
                      <span className="flex items-center gap-1 text-[10px] text-green-400">
                        ✓ {item.mistake?.correct_count || 0}次正确
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-green-500 font-medium">已掌握</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

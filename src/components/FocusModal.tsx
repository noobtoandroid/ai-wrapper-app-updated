'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Share2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { type Message } from '@/store/chatStore'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  message: Message | null
  onClose: () => void
}

export function FocusModal({ message, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  // Close on Escape key
  useEffect(() => {
    if (!message) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [message, onClose])

  const handleCopy = useCallback(async () => {
    if (!message) return
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* unavailable */ }
  }, [message])

  const handleShare = useCallback(async () => {
    if (!message) return
    try {
      if (navigator.share) {
        await navigator.share({ text: message.content })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } else {
        await navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* dismissed */ }
  }, [message])

  const isUser = message?.role === 'user'

  return (
    <AnimatePresence>
      {message && (
        <>
          {/* Backdrop */}
          <motion.div
            key="focus-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="focus-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="absolute bottom-0 left-0 right-0 z-50 flex flex-col bg-surface-900 rounded-t-[22px] border-t border-surface-800/60 shadow-2xl safe-bottom"
            style={{ maxHeight: '88dvh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-surface-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-3 flex-shrink-0 border-b border-surface-800/50">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  isUser ? 'bg-brand-700' : 'bg-surface-700'
                )}>
                  {isUser ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" fill="currentColor" className="text-brand-100" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" className="text-brand-200 opacity-70" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" fill="currentColor" className="text-brand-400" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" className="text-brand-500 opacity-70" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-surface-100 leading-none">
                    {isUser ? 'You' : 'AI Assistant'}
                  </p>
                  <p className="text-[11px] text-surface-500 mt-0.5">
                    {message.timestamp ? formatTime(message.timestamp) : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* Scrollable content — text is fully selectable here */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              {isUser ? (
                <p className="text-[16px] leading-relaxed text-surface-100 whitespace-pre-wrap break-words text-selectable">
                  {message.content}
                </p>
              ) : (
                <div className="prose-focus text-selectable">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2.5 px-5 pt-3 pb-4 border-t border-surface-800/50 flex-shrink-0">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px]',
                  'text-[14px] font-medium transition-all active:scale-[0.97] touch-manipulation',
                  copied
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                )}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                onClick={handleShare}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px]',
                  'text-[14px] font-medium transition-all active:scale-[0.97] touch-manipulation',
                  shared
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'bg-brand-700/20 text-brand-400 hover:bg-brand-700/30 border border-brand-700/30'
                )}
              >
                {shared ? <Check size={15} /> : <Share2 size={15} />}
                {shared ? 'Shared!' : 'Share'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

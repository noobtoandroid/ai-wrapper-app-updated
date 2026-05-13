'use client'

import { useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Square, X, Pencil } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { cn } from '@/lib/utils'

export function ChatInput() {
  // Fine-grained selectors — this component will NOT re-render when messages
  // stream in (only when these specific fields change).
  const draft         = useChatStore((s) => s.draft)
  const setDraft      = useChatStore((s) => s.setDraft)
  const sendMessage   = useChatStore((s) => s.sendMessage)
  const editMessage   = useChatStore((s) => s.editMessage)
  const stopGeneration = useChatStore((s) => s.stopGeneration)
  const isStreaming   = useChatStore((s) => s.isStreaming)
  const isTyping      = useChatStore((s) => s.isTyping)
  const isOffline     = useChatStore((s) => s.isOffline)
  const editingId     = useChatStore((s) => s.editingId)
  const setEditingId  = useChatStore((s) => s.setEditingId)
  const activeModel   = useChatStore((s) => s.activeModel)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef  = useRef(false)
  const isActive    = isStreaming || isTyping
  const isEditing   = !!editingId

  // Reset the sending lock once generation completes or stops
  useEffect(() => {
    if (!isActive) sendingRef.current = false
  }, [isActive])

  // Focus textarea and place cursor at end when editing starts
  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editingId])

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [])

  useEffect(() => { adjustHeight() }, [draft, adjustHeight])

  const handleSend = useCallback(() => {
    if (sendingRef.current || isActive) return
    const text = (textareaRef.current?.value ?? draft).trim()
    if (!text) return
    sendingRef.current = true
    if (editingId) {
      editMessage(editingId, text)
    } else {
      sendMessage(text)
    }
    setDraft('')
  }, [isActive, editingId, draft, sendMessage, editMessage, setDraft])

  const handleStop = useCallback(() => {
    sendingRef.current = false
    stopGeneration()
  }, [stopGeneration])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setDraft('')
  }, [setEditingId, setDraft])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
        return
      }
      if (e.key === 'Escape' && isEditing) handleCancelEdit()
    },
    [handleSend, handleCancelEdit, isEditing]
  )

  const canSend = draft.trim().length > 0 && !isActive

  // Friendly model label: "nvidia/nemotron-3-super-120b-a12b:free" → "nemotron · 120B"
  const modelLabel = activeModel
    ? (() => {
        const slug  = activeModel.split('/')[1]?.replace(/:free$/, '') ?? ''
        const name  = slug.split('-')[0]
        const param = slug.match(/(\d+(?:\.\d+)?b)/i)?.[1]?.toUpperCase()
        return param ? `${name} · ${param}` : slug.split('-').slice(0, 2).join('-')
      })()
    : null

  return (
    <div className="px-3 pb-3 pt-1.5 bg-surface-950/90 backdrop-blur-md safe-bottom">
      {/* Offline notice */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="text-center text-[12px] text-orange-400 py-1.5 mb-1.5 bg-orange-400/8 rounded-xl">
              You&apos;re offline — messages will send when reconnected.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {/* Input field */}
        <div className={cn(
          'flex-1 relative rounded-[22px] border overflow-hidden transition-all duration-200',
          'bg-surface-850',
          isEditing
            ? 'border-brand-600/50 shadow-[0_0_0_3px_rgba(79,70,229,0.1)]'
            : 'border-surface-700/40 focus-within:border-surface-600/60'
        )}>
          {/* Edit indicator */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
                  <div className="flex items-center gap-1.5 text-[12px] text-brand-400 font-medium">
                    <Pencil size={11} />
                    Editing message
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="p-0.5 rounded-full text-surface-500 hover:text-surface-300 transition-colors touch-manipulation"
                    aria-label="Cancel edit"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isEditing ? 'Edit your message…' : 'Message AI Assistant'}
            rows={1}
            className={cn(
              'w-full bg-transparent text-surface-100 placeholder-surface-600',
              'text-[15px] leading-relaxed px-4 py-3 resize-none outline-none',
              'text-selectable',
              isEditing && 'pt-1.5'
            )}
            style={{ maxHeight: '140px' }}
          />

          {/* Model badge */}
          {modelLabel && !isEditing && (
            <div className="px-4 pb-2 -mt-1">
              <span className="text-[10px] text-surface-700 font-medium tracking-wide uppercase">
                {modelLabel}
              </span>
            </div>
          )}
        </div>

        {/* Send / Stop button */}
        <div className="relative flex-shrink-0 w-11 h-11">
          <AnimatePresence>
            {isActive && (
              <motion.button
                key="stop"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'backOut' }}
                onClick={handleStop}
                className="absolute inset-0 rounded-full bg-red-500 flex items-center justify-center shadow-fab active:scale-95 transition-transform touch-manipulation"
                aria-label="Stop generation"
              >
                <Square size={15} fill="white" className="text-white" />
              </motion.button>
            )}
          </AnimatePresence>

          {!isActive && (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'absolute inset-0 rounded-full flex items-center justify-center shadow-fab transition-all touch-manipulation',
                canSend
                  ? 'bg-brand-600 text-white active:scale-95 hover:bg-brand-500'
                  : 'bg-surface-800 text-surface-700 cursor-default'
              )}
              aria-label={isEditing ? 'Save edit' : 'Send message'}
            >
              <Send size={15} className={canSend ? 'translate-x-0.5 -translate-y-0.5' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

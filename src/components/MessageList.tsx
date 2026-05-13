'use client'

import { useEffect, useRef, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useChatStore } from '@/store/chatStore'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

export function MessageList() {
  // Fine-grained selectors — this component re-renders when messages / typing state change,
  // but NOT when unrelated state (draft, editingId, etc.) changes.
  const messages   = useChatStore((s) => s.messages)
  const isTyping   = useChatStore((s) => s.isTyping)
  const isStreaming = useChatStore((s) => s.isStreaming)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolledUp  = useRef(false)
  const lastScrollTop   = useRef(0)
  const prevMsgCount    = useRef(messages.length)

  // Track manual scroll-up during generation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const isScrollingUp = el.scrollTop < lastScrollTop.current
      if (isScrollingUp && (isStreaming || isTyping)) {
        userScrolledUp.current = true
      }
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
        userScrolledUp.current = false
      }
      lastScrollTop.current = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [isStreaming, isTyping])

  // Scroll to bottom on new content — instant when a new message is added,
  // smooth otherwise (streaming tokens).
  useEffect(() => {
    const newMessage = messages.length > prevMsgCount.current
    prevMsgCount.current = messages.length

    if (newMessage) {
      userScrolledUp.current = false
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    } else if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'end' })
    }
  }, [messages])

  // Resume auto-scroll when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      userScrolledUp.current = false
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [isStreaming])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto no-scrollbar">
      {/* Empty state */}
      <AnimatePresence initial={false}>
        {messages.length === 0 && !isTyping && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[70vh] gap-5 px-8 text-center"
          >
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-brand-700/30 to-brand-600/10 border border-brand-700/25 flex items-center justify-center shadow-[0_0_32px_rgba(67,56,202,0.15)]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="currentColor" className="text-brand-400" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" className="text-brand-500 opacity-70" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <p className="text-[18px] font-semibold text-surface-100 tracking-tight">AI Assistant</p>
              <p className="text-[14px] text-surface-500 leading-relaxed max-w-[260px]">
                Ask me anything — questions, ideas, code, writing, and more.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <div className="flex flex-col gap-3 py-4">
        {messages.map((msg, i) => (
          <MemoizedBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
          />
        ))}

        <AnimatePresence>
          {isTyping && <TypingIndicator key="typing" />}
        </AnimatePresence>
      </div>

      <div ref={bottomRef} className="h-4" />
    </div>
  )
}

// Memoize so only the streaming bubble re-renders per token.
// Non-streaming messages keep their object reference and skip re-renders.
const MemoizedBubble = memo(MessageBubble, (prev, next) =>
  prev.message === next.message && prev.isLast === next.isLast
)

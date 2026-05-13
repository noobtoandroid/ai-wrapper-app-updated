'use client'

import { useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, RefreshCw, Pencil, Trash2,
  RotateCcw, AlertCircle, Share2, CornerUpRight, Maximize2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { type Message, useChatStore } from '@/store/chatStore'
import { cn, formatTime } from '@/lib/utils'
import { useFocusMessage } from '@/contexts/FocusContext'

interface Props {
  message: Message
  isLast: boolean
}

/**
 * Close any unclosed code fence so react-markdown doesn't garble partial streaming content.
 * e.g. "```python\ndef foo():" → "```python\ndef foo():\n```"
 */
function normalizeContent(content: string, isStreaming?: boolean): string {
  if (!isStreaming) return content
  const fences = content.match(/^```/gm) ?? []
  if (fences.length % 2 !== 0) return content + '\n```'
  return content
}

function MessageBubbleInner({ message, isLast: _isLast }: Props) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  // Fine-grained selectors — this component only re-renders when these specific
  // values change, not on every streaming token of OTHER messages.
  const isActive       = useChatStore((s) => s.isStreaming || s.isTyping)
  const copyMessage    = useChatStore((s) => s.copyMessage)
  const regenerate     = useChatStore((s) => s.regenerateResponse)
  const retry          = useChatStore((s) => s.retryMessage)
  const deleteMsg      = useChatStore((s) => s.deleteMessage)
  const resend         = useChatStore((s) => s.resendMessage)
  const setEditingId   = useChatStore((s) => s.setEditingId)

  const { openFocus } = useFocusMessage()

  const isUser  = message.role === 'user'
  const isError = !!message.isError

  const handleCopy = useCallback(async () => {
    await copyMessage(message.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [copyMessage, message.id])

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: message.content })
      } else {
        await navigator.clipboard.writeText(message.content)
      }
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch { /* dismissed */ }
  }, [message.content])

  const handleEdit       = useCallback(() => setEditingId(message.id), [setEditingId, message.id])
  const handleResend     = useCallback(() => { if (!isActive) resend(message.id) }, [resend, message.id, isActive])
  const handleRegenerate = useCallback(() => { if (!isActive) regenerate(message.id) }, [regenerate, message.id, isActive])
  const handleRetry      = useCallback(() => { if (!isActive) retry(message.id) }, [retry, message.id, isActive])
  const handleDelete     = useCallback(() => deleteMsg(message.id), [deleteMsg, message.id])
  const handleFocus      = useCallback((e: React.MouseEvent) => {
    // Don't open focus when tapping action buttons or links
    if ((e.target as HTMLElement).closest('button, a')) return
    openFocus(message.id)
  }, [openFocus, message.id])

  const displayContent = normalizeContent(message.content, message.isStreaming)

  return (
    <div className={cn('flex items-end gap-2 px-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* AI avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-700 to-brand-600 flex items-center justify-center flex-shrink-0 self-end mb-0.5 shadow-[0_2px_8px_rgba(67,56,202,0.3)]">
          {isError ? (
            <AlertCircle size={13} className="text-orange-300" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="currentColor" className="text-brand-100" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" className="text-brand-200 opacity-60" />
            </svg>
          )}
        </div>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Bubble */}
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleFocus}
          className={cn(
            'relative px-4 py-3 shadow-bubble leading-relaxed text-[15px]',
            'select-contain cursor-default',
            isUser
              ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-[18px] rounded-br-[5px]'
              : isError
              ? 'bg-orange-500/8 border border-orange-500/25 text-orange-200 rounded-[18px] rounded-bl-[5px]'
              : 'bg-surface-800/90 text-surface-100 rounded-[18px] rounded-bl-[5px]',
          )}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap break-words text-selectable leading-[1.65]">
              {message.content}
            </span>
          ) : (
            <div className="prose-chat break-words min-w-0 text-selectable">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {displayContent}
              </ReactMarkdown>
              {message.isStreaming && <span className="streaming-cursor" aria-hidden />}
            </div>
          )}

          {/* Subtle focus hint on AI bubbles */}
          {!isUser && !message.isStreaming && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity duration-200">
              <Maximize2 size={10} className="text-surface-400" />
            </div>
          )}
        </motion.div>

        {/* Action row — always visible on mobile, hover-reveal on desktop */}
        <div
          className={cn(
            'flex items-center gap-0.5 px-1 transition-opacity duration-200',
            isUser ? 'flex-row-reverse' : 'flex-row',
            // Mobile: show at reduced opacity so actions are discoverable
            // Desktop: hide until hover
            'opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100'
          )}
        >
          <span className="text-[11px] text-surface-600 px-1 mr-0.5 tabular-nums">
            {formatTime(message.timestamp)}
          </span>

          {/* User message actions */}
          {isUser && (
            <>
              <ActionBtn label="Edit" onClick={handleEdit} disabled={isActive}>
                <Pencil size={11} />
              </ActionBtn>
              <ActionBtn label="Resend" onClick={handleResend} disabled={isActive}>
                <CornerUpRight size={11} />
              </ActionBtn>
              <ActionBtn label="Delete" onClick={handleDelete} disabled={isActive} danger>
                <Trash2 size={11} />
              </ActionBtn>
            </>
          )}

          {/* AI message actions */}
          {!isUser && !isError && (
            <>
              <ActionBtn label={copied ? 'Copied!' : 'Copy'} onClick={handleCopy}>
                {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              </ActionBtn>
              <ActionBtn label={shared ? 'Shared!' : 'Share'} onClick={handleShare}>
                {shared ? <Check size={11} className="text-green-400" /> : <Share2 size={11} />}
              </ActionBtn>
              {!message.isStreaming && (
                <ActionBtn label="Regenerate" onClick={handleRegenerate} disabled={isActive}>
                  <RefreshCw size={11} />
                </ActionBtn>
              )}
              <ActionBtn label="Delete" onClick={handleDelete} disabled={isActive} danger>
                <Trash2 size={11} />
              </ActionBtn>
            </>
          )}

          {/* Error actions */}
          {!isUser && isError && (
            <>
              <ActionBtn label="Retry" onClick={handleRetry} disabled={isActive}>
                <RotateCcw size={11} className="text-orange-400" />
              </ActionBtn>
              <ActionBtn label="Delete" onClick={handleDelete} disabled={isActive} danger>
                <Trash2 size={11} />
              </ActionBtn>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Export as memo — prevents re-renders for messages whose props haven't changed
export const MessageBubble = memo(MessageBubbleInner)

// ─── Code block with copy button ─────────────────────────────────────────────
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* unavailable */ }
  }, [code])

  return (
    <div
      className="relative my-2.5 rounded-[11px] overflow-hidden bg-[#0d1117] border border-surface-700/40"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-surface-900/80 border-b border-surface-700/30">
        <span className="text-[11px] text-surface-500 font-medium font-mono tracking-wide">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-surface-400 hover:text-surface-200 transition-colors touch-manipulation no-select px-2 py-0.5 rounded hover:bg-surface-700/50"
          aria-label="Copy code"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-green-400"
              >
                <Check size={11} /> Copied
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1"
              >
                <Copy size={11} /> Copy
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      {/* Code */}
      <pre className="overflow-x-auto p-4 text-[13px] leading-[1.7] text-[#e6edf3]">
        <code className="text-selectable font-mono">{code}</code>
      </pre>
    </div>
  )
}

// ─── Action icon button ───────────────────────────────────────────────────────
function ActionBtn({
  children, label, onClick, disabled, danger,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'p-1.5 rounded-full transition-colors touch-manipulation no-select',
        danger
          ? 'text-surface-600 hover:text-red-400 hover:bg-red-400/10 active:bg-red-400/20'
          : 'text-surface-600 hover:text-surface-300 hover:bg-surface-700/60 active:bg-surface-700',
        disabled && 'opacity-30 cursor-default pointer-events-none'
      )}
    >
      {children}
    </button>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Wifi, WifiOff, Settings, Download, Check, Copy } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatTime } from '@/lib/utils'
import { type Message } from '@/store/chatStore'
import { cn } from '@/lib/utils'

function buildMarkdown(messages: Message[]): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const header = `# Chat Export — ${date}\n\n---\n\n`
  const body = messages
    .filter((m) => !m.isError && !m.isStreaming)
    .map((m) => {
      const role = m.role === 'user' ? '**You**' : '**AI Assistant**'
      const time = m.timestamp ? formatTime(m.timestamp) : ''
      return `${role} · ${time}\n\n${m.content}`
    })
    .join('\n\n---\n\n')
  return header + body
}

export function ChatHeader() {
  const clearMessages = useChatStore((s) => s.clearMessages)
  const isOffline     = useChatStore((s) => s.isOffline)
  const isStreaming   = useChatStore((s) => s.isStreaming)
  const messages      = useChatStore((s) => s.messages)
  const { setSettingsOpen, userApiKey } = useSettingsStore()

  const [exported, setExported] = useState(false)

  const handleExport = useCallback(async () => {
    if (messages.filter((m) => !m.isError).length === 0) return
    const content  = buildMarkdown(messages)
    const filename = `chat-${new Date().toISOString().slice(0, 10)}.md`

    // Mobile: try native share
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Chat Export', text: content })
        setExported(true)
        setTimeout(() => setExported(false), 2000)
        return
      }
    } catch { /* dismissed */ }

    // Desktop / fallback: download as .md file
    try {
      const blob = new Blob([content], { type: 'text/markdown' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setExported(true)
      setTimeout(() => setExported(false), 2000)
    } catch {
      // Last resort: clipboard
      try {
        await navigator.clipboard.writeText(content)
        setExported(true)
        setTimeout(() => setExported(false), 2000)
      } catch { /* unavailable */ }
    }
  }, [messages])

  const hasMessages = messages.filter((m) => !m.isError).length > 0

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="flex items-center justify-between px-4 py-3 bg-surface-900/85 backdrop-blur-md border-b border-surface-800/40 safe-top z-20"
    >
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-700 to-brand-600 flex items-center justify-center shadow-[0_2px_10px_rgba(67,56,202,0.35)]">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="currentColor" className="text-brand-100" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" className="text-brand-200 opacity-75" />
            </svg>
          </div>
          {/* Online / typing pulse */}
          <motion.div
            animate={{ scale: isStreaming ? [1, 1.35, 1] : 1, opacity: isStreaming ? [1, 0.6, 1] : 1 }}
            transition={{ duration: 0.9, repeat: isStreaming ? Infinity : 0 }}
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-900',
              isOffline ? 'bg-surface-600' : isStreaming ? 'bg-brand-400' : 'bg-green-500'
            )}
          />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-surface-100 leading-none tracking-tight">
            AI Assistant
          </p>
          <p className="text-[12px] text-surface-500 mt-0.5">
            {isOffline ? 'Offline' : isStreaming ? 'Thinking…' : 'Ready'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5">
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 8 }}
              className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1 mr-1"
            >
              <WifiOff size={11} className="text-orange-400" />
              <span className="text-[11px] text-orange-400 font-medium">Offline</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!isOffline && (
          <div className="p-2 opacity-30">
            <Wifi size={13} className="text-surface-400" />
          </div>
        )}

        {/* Export */}
        {hasMessages && (
          <button
            onClick={handleExport}
            className="p-2 rounded-full hover:bg-surface-800 active:bg-surface-700 transition-colors touch-manipulation"
            aria-label="Export conversation"
            title="Export as Markdown"
          >
            {exported
              ? <Check size={16} className="text-green-400" />
              : <Download size={16} className="text-surface-400" />
            }
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="relative p-2 rounded-full hover:bg-surface-800 active:bg-surface-700 transition-colors touch-manipulation"
          aria-label="Settings"
        >
          <Settings size={16} className="text-surface-400" />
          {userApiKey && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-400" />
          )}
        </button>

        {/* Clear */}
        <button
          onClick={clearMessages}
          className="p-2 rounded-full hover:bg-surface-800 active:bg-surface-700 transition-colors touch-manipulation"
          aria-label="Clear chat"
        >
          <Trash2 size={16} className="text-surface-400" />
        </button>
      </div>
    </motion.header>
  )
}

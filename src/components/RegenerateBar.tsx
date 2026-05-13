'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'

export function RegenerateBar() {
  const { messages, isStreaming, isTyping, regenerateLastResponse } = useChatStore()
  const lastMsg = messages[messages.length - 1]
  const showRegen = lastMsg?.role === 'assistant' && !isStreaming && !isTyping && messages.length > 0

  return (
    <AnimatePresence>
      {showRegen && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="flex justify-center px-4 pb-1"
        >
          <button
            onClick={regenerateLastResponse}
            className="flex items-center gap-2 text-[13px] text-surface-400 hover:text-surface-200 active:scale-95 transition-all py-1.5 px-4 rounded-full bg-surface-850 border border-surface-700/50 hover:bg-surface-800"
          >
            <RefreshCw size={13} />
            <span>Regenerate response</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { motion } from 'framer-motion'
import { useChatStore } from '@/store/chatStore'

export function TypingIndicator() {
  const statusMessage = useChatStore((s) => s.statusMessage)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex items-end gap-2 px-3"
    >
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0 mb-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill="currentColor" className="text-brand-100" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" className="text-brand-200 opacity-60" />
        </svg>
      </div>

      <div className="bg-surface-800 rounded-[18px] rounded-bl-[6px] px-4 py-3 shadow-bubble">
        {statusMessage ? (
          <motion.p
            key={statusMessage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[13px] text-surface-400 italic"
          >
            {statusMessage}
          </motion.p>
        ) : (
          <div className="flex items-center gap-[5px]">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block w-[7px] h-[7px] rounded-full bg-surface-400"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

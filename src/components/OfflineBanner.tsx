'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'

export function OfflineHandler() {
  const { isOffline, setOffline } = useChatStore()

  useEffect(() => {
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    setOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [setOffline])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-orange-500/90 text-white text-[13px] font-medium px-4 py-2 rounded-full shadow-fab backdrop-blur-sm"
        >
          <WifiOff size={14} />
          <span>No internet connection</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

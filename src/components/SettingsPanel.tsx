'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Eye, EyeOff, Check, Trash2, ExternalLink, ShieldCheck } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { cn } from '@/lib/utils'

export function SettingsPanel() {
  const { userApiKey, settingsOpen, setUserApiKey, clearUserApiKey, setSettingsOpen } =
    useSettingsStore()

  const [draft, setDraft] = useState(userApiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync draft when panel opens
  useEffect(() => {
    if (settingsOpen) {
      setDraft(userApiKey)
      setSaved(false)
      setShowKey(false)
    }
  }, [settingsOpen, userApiKey])

  const handleSave = useCallback(() => {
    const key = draft.trim()
    setUserApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [draft, setUserApiKey])

  const handleClear = useCallback(() => {
    clearUserApiKey()
    setDraft('')
    setSaved(false)
  }, [clearUserApiKey])

  const hasKey = userApiKey.length > 0
  const draftChanged = draft.trim() !== userApiKey

  const maskedKey = userApiKey
    ? userApiKey.slice(0, 8) + '••••••••••••••••' + userApiKey.slice(-4)
    : ''

  return (
    <AnimatePresence>
      {settingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 z-30"
            onClick={() => setSettingsOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-surface-900 rounded-t-[20px] border-t border-surface-800 shadow-2xl safe-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-[16px] font-semibold text-surface-100">Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 rounded-full text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors touch-manipulation"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-6 space-y-5">
              {/* Status indicator */}
              <div className={cn(
                'flex items-center gap-2.5 p-3 rounded-[14px] border',
                hasKey
                  ? 'bg-green-500/8 border-green-500/25'
                  : 'bg-surface-800 border-surface-700/50'
              )}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  hasKey ? 'bg-green-500/20' : 'bg-surface-700'
                )}>
                  <ShieldCheck size={14} className={hasKey ? 'text-green-400' : 'text-surface-500'} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-surface-100">
                    {hasKey ? 'Using your API key' : 'Using shared key'}
                  </p>
                  <p className="text-[11px] text-surface-500 mt-0.5">
                    {hasKey
                      ? `Key ending in ${userApiKey.slice(-4)} — your requests are private`
                      : 'Add your own OpenRouter key for private usage'}
                  </p>
                </div>
              </div>

              {/* API Key section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-surface-300 flex items-center gap-1.5">
                    <Key size={12} className="text-surface-500" />
                    OpenRouter API Key
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-0.5 transition-colors"
                  >
                    Get a key <ExternalLink size={10} />
                  </a>
                </div>

                {/* Input */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showKey ? 'text' : 'password'}
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setSaved(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                    placeholder="sk-or-v1-..."
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={cn(
                      'w-full bg-surface-800 border rounded-[12px] px-4 py-3 pr-12',
                      'text-[14px] text-surface-100 placeholder-surface-600',
                      'outline-none transition-all',
                      'focus:border-brand-600/60 focus:bg-surface-750',
                      'border-surface-700/60',
                      'font-mono'
                    )}
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-300 transition-colors touch-manipulation"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                    type="button"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <p className="text-[11px] text-surface-600 leading-relaxed">
                  Stored locally on this device only. Never sent anywhere except OpenRouter.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={handleSave}
                  disabled={!draftChanged && !draft.trim()}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px]',
                    'text-[14px] font-medium transition-all touch-manipulation',
                    draftChanged && draft.trim()
                      ? 'bg-brand-600 text-white active:scale-[0.98]'
                      : saved
                      ? 'bg-green-600/80 text-white'
                      : 'bg-surface-800 text-surface-500 cursor-default'
                  )}
                >
                  {saved ? (
                    <><Check size={15} /> Saved</>
                  ) : (
                    'Save Key'
                  )}
                </button>

                {hasKey && (
                  <button
                    onClick={handleClear}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-[12px] bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all touch-manipulation text-[14px] font-medium"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

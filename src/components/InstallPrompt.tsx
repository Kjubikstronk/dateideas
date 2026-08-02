import { useEffect, useState } from 'react'

/**
 * Not in lib.dom.d.ts yet — Chromium-only event that hands us a deferred,
 * re-triggerable install prompt instead of the browser's own mini-infobar.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'our-dates-install-dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag — it never fills in `display-mode`.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ identifies as "Macintosh" with a touchscreen bolted on.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * Messaging and social apps open links in an embedded webview with no
 * install affordance at all — Safari/Chrome's share sheet isn't reachable
 * from inside them. The only fix is leaving to a real browser first.
 */
function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Messenger/i.test(navigator.userAgent)
}

/**
 * A from-scratch "add to home screen" nudge, because the browser's own
 * install UI is unreliable exactly where it matters most here: Chrome only
 * offers it after its own engagement heuristics are satisfied (easy to
 * never hit on a phone used for one thing), and iOS Safari has no automatic
 * prompt at all — "Add to Home Screen" only exists buried in the share
 * sheet, undiscoverable unless someone tells you it's there.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
  )

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Stops Chrome's own mini-infobar so only our pill offers the install.
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => dismiss()

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  if (dismissed || isStandalone()) return null

  const ios = isIOS()
  const inApp = isInAppBrowser()

  // Android/desktop Chrome with no captured prompt and nothing else useful
  // to say — the browser's own menu is the only route, not worth nagging.
  if (!ios && !inApp && !deferred) return null

  const message = inApp
    ? 'Open this link in Safari or Chrome to install our dates on your home screen.'
    : ios
      ? 'Add our dates to your home screen: tap Share, then "Add to Home Screen".'
      : 'Install our dates on your home screen for the full-screen app feel.'

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 border-[3px] border-[var(--color-ink)] bg-[var(--color-lav)] p-3 shadow-[4px_4px_0_var(--color-ink)]"
    >
      <p className="flex-1 text-sm">{message}</p>
      <div className="flex shrink-0 flex-col gap-2">
        {!ios && !inApp && deferred ? (
          <button
            type="button"
            className="pixel-btn pixel-btn-primary legend px-3 py-1"
            onClick={async () => {
              await deferred.prompt()
              const { outcome } = await deferred.userChoice
              if (outcome === 'accepted') dismiss()
              else setDeferred(null)
            }}
          >
            install
          </button>
        ) : null}
        <button type="button" className="pixel-btn legend px-2 py-1" onClick={dismiss}>
          later
        </button>
      </div>
    </div>
  )
}

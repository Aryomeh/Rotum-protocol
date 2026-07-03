'use client'

// Thin wrapper around Monetag's rewarded-ad SDK.
//
// Your app preloads the SDK tag in app/layout.tsx's <head>:
//   <script src="//libtl.com/sdk.js" data-zone="11234708" data-sdk="show_11234708"></script>
//
// This module waits for that tag's function (window.show_11234708) to become
// available, and falls back to injecting the tag itself if it's somehow
// missing. Ad format in use: Rewarded Interstitial.

let sdkReadyPromise: Promise<void> | null = null

function getZoneId(): string {
  const zoneId = process.env.NEXT_PUBLIC_MONETAG_ZONE_ID
  if (!zoneId) {
    throw new Error('NEXT_PUBLIC_MONETAG_ZONE_ID is not set')
  }
  return zoneId
}

function waitForSdkFunction(fnName: string, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any)[fnName] === 'function') {
      resolve()
      return
    }
    const start = Date.now()
    const interval = setInterval(() => {
      if (typeof (window as any)[fnName] === 'function') {
        clearInterval(interval)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Ad SDK did not load in time'))
      }
    }, 100)
  })
}

function loadAdSdk(zoneId: string): Promise<void> {
  if (sdkReadyPromise) return sdkReadyPromise

  const fnName = `show_${zoneId}`

  sdkReadyPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Ad SDK can only load in the browser'))
      return
    }

    // Already loaded (function defined) — nothing to do.
    if (typeof (window as any)[fnName] === 'function') {
      resolve()
      return
    }

    const existing = document.querySelector(`script[data-zone="${zoneId}"]`)
    if (existing) {
      // Tag is preloaded in layout.tsx <head> — just wait for the SDK
      // to finish initializing and define the function.
      waitForSdkFunction(fnName).then(resolve).catch(reject)
      return
    }

    // Fallback: tag wasn't found for some reason — inject it ourselves.
    const script = document.createElement('script')
    script.src = '//libtl.com/sdk.js'
    script.setAttribute('data-zone', zoneId)
    script.setAttribute('data-sdk', fnName)
    script.async = true
    script.onerror = () => reject(new Error('Failed to load ad SDK'))
    document.head.appendChild(script)
    waitForSdkFunction(fnName).then(resolve).catch(reject)
  })

  return sdkReadyPromise
}

/**
 * Shows a rewarded interstitial ad. Resolves true once the user has watched
 * it, rejects if the ad fails to load, is skipped, or the SDK isn't ready.
 */
export async function showRewardedAd(): Promise<boolean> {
  const zoneId = getZoneId()
  await loadAdSdk(zoneId)

  const fn = (window as any)[`show_${zoneId}`]
  if (typeof fn !== 'function') {
    throw new Error('Ad SDK not ready — please try again')
  }

  await fn()
  return true
}
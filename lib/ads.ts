'use client'

// Thin wrapper around Monetag's rewarded-ad SDK.
//
// IMPORTANT: once you sign up with Monetag, they'll give you a Zone ID from
// your dashboard and an exact embed snippet. Their snippet usually looks like:
//
//   <script src="https://libtl.com/sdk.js" data-zone="XXXXXXX" data-sdk="show_XXXXXXX"></script>
//
// and you call it with `show_XXXXXXX().then(...)`. Double check the function
// name and behavior (does it resolve only on full view, or also on skip?)
// against your actual Monetag dashboard docs, since these details can change
// per account/zone type. Set your zone id below via env var.

let sdkLoadPromise: Promise<void> | null = null

function getZoneId(): string {
  const zoneId = process.env.NEXT_PUBLIC_MONETAG_ZONE_ID
  if (!zoneId) {
    throw new Error('NEXT_PUBLIC_MONETAG_ZONE_ID is not set')
  }
  return zoneId
}

function loadAdSdk(zoneId: string): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise

  sdkLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Ad SDK can only load in the browser'))
      return
    }
    const existing = document.querySelector(`script[data-zone="${zoneId}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://libtl.com/sdk.js'
    script.setAttribute('data-zone', zoneId)
    script.setAttribute('data-sdk', `show_${zoneId}`)
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load ad SDK'))
    document.head.appendChild(script)
  })

  return sdkLoadPromise
}

/**
 * Shows a rewarded ad. Resolves true once the user has watched it (per
 * Monetag's rewarded-interstitial behavior), rejects if the ad fails to
 * load or the SDK isn't configured.
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
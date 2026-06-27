import crypto from 'crypto'
import type { TelegramInitData, TelegramUser } from './types'

// ── Validate Telegram initData on the server ──────────────
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

export function validateTelegramInitData(initDataRaw: string): {
  valid: boolean
  data: TelegramInitData | null
  user: TelegramUser | null
} {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    const params   = new URLSearchParams(initDataRaw)
    const hash     = params.get('hash')

    if (!hash) return { valid: false, data: null, user: null }

    // Build check string: all fields except hash, sorted alphabetically
    params.delete('hash')
    const checkString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    // HMAC-SHA256 with key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex')

    if (expectedHash !== hash) return { valid: false, data: null, user: null }

    // Check auth_date not older than 24h
    const authDate = parseInt(params.get('auth_date') || '0', 10)
    const now      = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) return { valid: false, data: null, user: null }

    const userRaw = params.get('user')
    const user: TelegramUser | null = userRaw ? JSON.parse(userRaw) : null

    const data: TelegramInitData = {
      user:          user ?? undefined,
      auth_date:     authDate,
      hash,
      start_param:   params.get('start_param') ?? undefined,
      chat_instance: params.get('chat_instance') ?? undefined,
      chat_type:     params.get('chat_type') ?? undefined,
    }

    return { valid: true, data, user }
  } catch {
    return { valid: false, data: null, user: null }
  }
}

// ── Generate referral invite link ─────────────────────────
export function buildReferralLink(botUsername: string, referralCode: string): string {
  return `https://t.me/${botUsername}?startapp=${referralCode}`
}

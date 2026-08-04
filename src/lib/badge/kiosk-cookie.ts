/** HttpOnly cookie so the kiosk capability secret is not required on every URL. */
export const KIOSK_COOKIE = 'beacon_kiosk_token'

export const KIOSK_COOKIE_MAX_AGE_SEC = 60 * 60 * 12 // 12 hours tablet shift

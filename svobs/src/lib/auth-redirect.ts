const DEFAULT_REDIRECT = '/sifre-degistir'

/** Auth callbacks may return only to a path on this application. */
export function safeAuthRedirect(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return DEFAULT_REDIRECT
  const origin = 'https://auth-redirect.invalid'
  try {
    const url = new URL(value, origin)
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : DEFAULT_REDIRECT
  } catch {
    return DEFAULT_REDIRECT
  }
}

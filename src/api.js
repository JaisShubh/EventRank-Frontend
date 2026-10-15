const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiRequest(path, options = {}) {
  const { token, body, headers: suppliedHeaders, ...fetchOptions } = options
  const headers = new Headers(suppliedHeaders || {})
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', 'Bearer ' + token)
  const response = await fetch(API_BASE + (path.startsWith('/') ? path : '/' + path), {
    ...fetchOptions,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const data = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.message || 'The request could not be completed')
    error.status = response.status
    throw error
  }
  return data
}
import { useState } from 'react'
import { apiRequest } from './api.js'

export default function AuthDialog({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('participant')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await apiRequest('/auth/' + mode, {
        method: 'POST',
        body: mode === 'login' ? { email, password } : { name, email, password, role },
      })
      localStorage.setItem('eventrank_token', result.token)
      localStorage.setItem('eventrank_user', JSON.stringify(result.user))
      onAuthenticated(result)
      onClose()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog-card auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="dialog-close" onClick={onClose} aria-label="Close">Ã—</button>
      <div className="section-kicker">WELCOME TO EVENTRANK</div>
      <h2 id="auth-title">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
      <form className="dialog-form" onSubmit={submit}>
        {mode === 'register' && <label>Name<input autoComplete="name" minLength="2" maxLength="80" required value={name} onChange={(event) => setName(event.target.value)} /></label>}
        {mode === 'register' && <fieldset className="role-picker"><legend>I want to join as</legend>
          <label className={`role-option ${role === 'community' ? 'selected' : ''}`}><input type="radio" name="role" value="community" checked={role === 'community'} onChange={() => setRole('community')} /><span><strong>Community organizer</strong><small>Host hackathons, workshops, and campus events.</small></span></label>
          <label className={`role-option ${role === 'participant' ? 'selected' : ''}`}><input type="radio" name="role" value="participant" checked={role === 'participant'} onChange={() => setRole('participant')} /><span><strong>Participant</strong><small>Discover events, check in, and share reviews.</small></span></label>
        </fieldset>}
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="search-button dialog-submit" disabled={busy}>{busy ? 'Please waitâ€¦' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <p className="dialog-switch">{mode === 'login' ? 'New to EventRank?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
    </section>
  </div>
}
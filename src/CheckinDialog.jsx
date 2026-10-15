import { useState } from 'react'
import { apiRequest } from './api.js'

export default function CheckinDialog({ token, onClose, onRequireAuth }) {
  const params = new URLSearchParams(window.location.search)
  const eventId = params.get('eventId') || params.get('event_id') || ''
  const qrToken = params.get('token') || ''
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function startCheckin() {
    setError('')
    setMessage('')
    if (!token) {
      setMessage('Sign in first, then return here and check in.')
      onRequireAuth()
      return
    }
    if (!eventId || !qrToken) {
      setError('This check-in link is missing its event or QR token.')
      return
    }
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.')
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const result = await apiRequest('/checkins', {
          method: 'POST',
          token,
          body: { eventId, token: qrToken, lat: position.coords.latitude, lng: position.coords.longitude },
        })
        setMessage(result.already_checked_in ? 'You are already checked in.' : 'Check-in verified. Enjoy the event!')
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setBusy(false)
      }
    }, (locationError) => {
      setError(locationError.code === 1 ? 'Allow location access to verify you are at the venue.' : 'Could not get your location. Please try again at the venue.')
      setBusy(false)
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
  }

  return <div className="dialog-backdrop" role="presentation">
    <section className="dialog-card checkin-dialog" role="dialog" aria-modal="true" aria-labelledby="checkin-title">
      <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
      <div className="section-kicker">EVENTRANK CHECK-IN</div>
      <h2 id="checkin-title">Verify your attendance</h2>
      <p>Sign in and allow location access while you are at the event venue.</p>
      {message && <p className="checkin-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="search-button dialog-submit" disabled={busy} onClick={startCheckin}>{busy ? 'Checking location…' : token ? 'Check in at this venue' : 'Sign in to check in'}</button>
    </section>
  </div>
}

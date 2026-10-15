import { useEffect, useState } from 'react'
import { apiRequest } from './api.js'

function formatEventDate(value) {
  if (!value) return 'Date to be announced'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export default function EventDetail({ eventId, token, user, onClose, onRequireAuth }) {
  const [event, setEvent] = useState(null)
  const [reviews, setReviews] = useState([])
  const [insights, setInsights] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [joining, setJoining] = useState(false)
  const [rating, setRating] = useState(9)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const eventHasEnded = event ? new Date(event.start_time || event.startTime).getTime() <= Date.now() : false
  const canReview = Boolean(token && user?.role === 'participant' && participation?.participating && eventHasEnded)

  useEffect(() => {
    let active = true
    setBusy(true)
    Promise.all([
      apiRequest('/events/' + encodeURIComponent(eventId)),
      apiRequest('/events/' + encodeURIComponent(eventId) + '/reviews'),
      apiRequest('/events/' + encodeURIComponent(eventId) + '/insights'),
      token ? apiRequest('/events/' + encodeURIComponent(eventId) + '/participation', { token }) : Promise.resolve(null),
    ]).then(([eventResult, reviewResult, insightResult, participationResult]) => {
      if (!active) return
      setEvent(eventResult.event)
      setReviews(reviewResult.reviews || [])
      setInsights(insightResult)
      setParticipation(participationResult)
      setError('')
    }).catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [eventId, token])

  async function joinEvent() {
    if (!token || !user) { onRequireAuth(); return }
    if (user.role !== 'participant') {
      setError('Community organizer accounts cannot join events as participants.')
      return
    }
    setJoining(true)
    setError('')
    try {
      await apiRequest('/events/' + encodeURIComponent(eventId) + '/participate', { method: 'POST', token, body: {} })
      const status = await apiRequest('/events/' + encodeURIComponent(eventId) + '/participation', { token })
      setParticipation(status)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setJoining(false)
    }
  }

  async function submitReview(formEvent) {
    formEvent.preventDefault()
    if (!token) { onRequireAuth(); return }
    setSaving(true)
    setError('')
    try {
      await apiRequest('/events/' + encodeURIComponent(eventId) + '/reviews', {
        method: 'POST', token, body: { rating: Number(rating), comment },
      })
      const [reviewResult, insightResult] = await Promise.all([
        apiRequest('/events/' + encodeURIComponent(eventId) + '/reviews'),
        apiRequest('/events/' + encodeURIComponent(eventId) + '/insights'),
      ])
      setReviews(reviewResult.reviews || [])
      setInsights(insightResult)
      setComment('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog-card event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
      <button className="dialog-close" onClick={onClose} aria-label="Close event details">Ã—</button>
      {busy && <p>Loading eventâ€¦</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {event && <>
        <div className="section-kicker">{event.category}</div><h2 id="event-dialog-title">{event.title}</h2>
        <p>{event.description || 'Event details'}</p>
        <div className="event-detail-meta"><span>{formatEventDate(event.start_time || event.startTime)}</span><span>{event.venue}</span><span>EventRank {Number(event.composite_score || event.score || 0).toFixed(1)}</span><span>{event.turnout_count || 0} verified check-ins</span></div>
        <div className="participation-banner"><div><strong>{participation?.participating ? 'You’re on the list' : 'Want to be there?'}</strong><small>{participation?.registered_count ?? event.registeredCount ?? 0} of {participation?.capacity ?? event.capacity ?? 100} spots claimed</small></div>{participation?.participating ? <button className="participation-button joined" disabled>Participating ✓</button> : user?.role === 'community' ? <span className="participation-note">Participant accounts can join</span> : <button className="participation-button" onClick={joinEvent} disabled={joining || ((participation?.registered_count ?? event.registeredCount ?? 0) >= (participation?.capacity ?? event.capacity ?? 100))}>{joining ? 'Joining...' : ((participation?.registered_count ?? event.registeredCount ?? 0) >= (participation?.capacity ?? event.capacity ?? 100)) ? 'Event full' : !token ? 'Sign in to participate' : 'Participate'}</button>}</div>
        {insights && <p className="insight-summary">{insights.total_reviews} reviews Â· average rating {insights.average_rating}/10 Â· {insights.verified_attendees} verified attendees</p>}
        <h3>Student reviews</h3>
        <div className="review-list">{reviews.length ? reviews.map((review) => <article className="review-item" key={review.id || review._id}><div className="review-meta"><strong>{review.verified_attendee ? 'Verified attendee' : 'Student review'}</strong><span>{review.rating}/10</span></div><p>{review.comment || 'Rating only'}</p></article>) : <p>No reviews yet.</p>}</div>
        {canReview ? <>
          <h3>Share your review</h3>
          <form className="dialog-form" onSubmit={submitReview}>
            <label>Rating (1 to 10)<input type="number" min="1" max="10" required value={rating} onChange={(event) => setRating(event.target.value)} /></label>
            <label>Comment<textarea maxLength="5000" rows="3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should other students know?" /></label>
            <button className="search-button dialog-submit" disabled={saving}>{saving ? 'Saving...' : 'Submit review'}</button>
          </form>
        </> : <p className="participation-note">{!token ? 'Sign in as a participant to review this event after it ends.' : user?.role !== 'participant' ? 'Only participants can review events.' : !participation?.participating ? 'Join the event to unlock a review after it ends.' : 'Reviews open after the event ends.'}</p>}
      </>}
    </section>
  </div>
}
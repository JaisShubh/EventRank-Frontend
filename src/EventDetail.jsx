import { useEffect, useState } from 'react'
import { apiRequest } from './api.js'

function formatEventDate(value) {
  if (!value) return 'Date to be announced'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export default function EventDetail({ eventId, token, onClose, onRequireAuth }) {
  const [event, setEvent] = useState(null)
  const [reviews, setReviews] = useState([])
  const [insights, setInsights] = useState(null)
  const [rating, setRating] = useState(9)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    setBusy(true)
    Promise.all([
      apiRequest('/events/' + encodeURIComponent(eventId)),
      apiRequest('/events/' + encodeURIComponent(eventId) + '/reviews'),
      apiRequest('/events/' + encodeURIComponent(eventId) + '/insights'),
    ]).then(([eventResult, reviewResult, insightResult]) => {
      if (!active) return
      setEvent(eventResult.event)
      setReviews(reviewResult.reviews || [])
      setInsights(insightResult)
      setError('')
    }).catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [eventId])

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
        {insights && <p className="insight-summary">{insights.total_reviews} reviews Â· average rating {insights.average_rating}/10 Â· {insights.verified_attendees} verified attendees</p>}
        <h3>Student reviews</h3>
        <div className="review-list">{reviews.length ? reviews.map((review) => <article className="review-item" key={review.id || review._id}><div className="review-meta"><strong>{review.verified_attendee ? 'Verified attendee' : 'Student review'}</strong><span>{review.rating}/10</span></div><p>{review.comment || 'Rating only'}</p></article>) : <p>No reviews yet. Be the first to share your experience.</p>}</div>
        <h3>Share your review</h3>
        <form className="dialog-form" onSubmit={submitReview}>
          <label>Rating (1â€“10)<input type="number" min="1" max="10" required value={rating} onChange={(event) => setRating(event.target.value)} /></label>
          <label>Comment<textarea maxLength="5000" rows="3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should other students know?" /></label>
          <button className="search-button dialog-submit" disabled={saving}>{saving ? 'Savingâ€¦' : token ? 'Submit review' : 'Sign in to review'}</button>
        </form>
      </>}
    </section>
  </div>
}
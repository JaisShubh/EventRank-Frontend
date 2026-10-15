import { useEffect, useState } from 'react'
import { apiRequest } from './api.js'

const blankEvent = { title: '', category: 'Hackathon', description: '', venue: '', startTime: '', capacity: '100' }

function displayDate(value) {
  if (!value) return 'Date to be announced'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function Dashboard({ user, token, onClose, onOpenEvent, onCreated }) {
  const [events, setEvents] = useState([])
  const [checkins, setCheckins] = useState([])
  const [draft, setDraft] = useState(blankEvent)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isCommunity = user.role === 'community'

  async function loadDashboard() {
    setBusy(true)
    setError('')
    try {
      if (isCommunity) {
        const result = await apiRequest('/events/mine', { token })
        setEvents(result.events || [])
      } else {
        const result = await apiRequest('/checkins/mine', { token })
        setCheckins(result.checkins || [])
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { loadDashboard() }, [token, user.role])

  async function createEvent(event) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setMessage('')
    try {
      await apiRequest('/events', {
        method: 'POST',
        token,
        body: { ...draft, capacity: Number(draft.capacity), startTime: new Date(draft.startTime).toISOString() },
      })
      setDraft(blankEvent)
      setShowForm(false)
      setMessage('Your event is live in Discover.')
      await loadDashboard()
      await onCreated?.()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCreating(false)
    }
  }

  return <div className="dashboard-backdrop">
    <section className="dashboard-panel" aria-labelledby="dashboard-title">
      <div className="dashboard-topline"><button className="dashboard-back" onClick={onClose}>← Discover</button><span className="section-kicker">YOUR EVENTRANK</span></div>
      <div className="dashboard-heading"><div><div className="section-kicker">{isCommunity ? 'COMMUNITY ORGANIZER' : 'PARTICIPANT'}</div><h2 id="dashboard-title">Welcome, {user.name}</h2><p>{user.email}</p></div><div className="dashboard-avatar">{user.name?.[0]?.toUpperCase() || 'E'}</div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="dashboard-message" role="status">{message}</p>}
      {isCommunity ? <>
        <div className="dashboard-section-heading"><div><h3>Your events</h3><p>Manage the hackathons, workshops, and meetups you host.</p></div><button className="search-button" onClick={() => { setShowForm(!showForm); setError('') }}>{showForm ? 'Cancel' : '+ Add an event'}</button></div>
        {showForm && <form className="dialog-form event-create-form" onSubmit={createEvent}>
          <label>Event name<input required minLength="2" maxLength="160" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Campus Buildathon" /></label>
          <label>Event type<select required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Hackathon</option><option>Workshop</option><option>Tech talk</option><option>Music</option><option>Cultural</option><option>Meetup</option><option>Other</option></select></label>
          <label>Description<textarea rows="3" maxLength="10000" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What will participants do?" /></label>
          <label>Venue<input required maxLength="240" value={draft.venue} onChange={(event) => setDraft({ ...draft, venue: event.target.value })} placeholder="Building, room, or online" /></label>
          <div className="dashboard-form-row"><label>Date and time<input type="datetime-local" required value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label><label>Capacity<input type="number" min="1" max="1000000" required value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: event.target.value })} /></label></div>
          <button className="search-button dialog-submit" disabled={creating}>{creating ? 'Publishing...' : 'Publish event'}</button>
        </form>}
        {busy ? <p className="dashboard-empty">Loading your events...</p> : events.length ? <div className="dashboard-list">{events.map((event) => <article className="dashboard-event" key={event.id}><div><span className="section-kicker">{event.category}</span><h4>{event.title}</h4><p>{displayDate(event.start_time || event.startTime)} · {event.venue}</p></div><span className="dashboard-count">{event.turnout_count || 0} checked in</span><button className="card-arrow" aria-label={'View ' + event.title} onClick={() => onOpenEvent(event.id)}>↗</button></article>)}</div> : <div className="dashboard-empty"><span>✳</span><h3>Your first event starts here</h3><p>Create a hackathon, workshop, or other campus event to share it with participants.</p></div>}
      </> : <>
        <div className="dashboard-section-heading"><div><h3>Your check-ins</h3><p>Events you have attended with verified check-in.</p></div><button className="search-button" onClick={onClose}>Explore events</button></div>
        {busy ? <p className="dashboard-empty">Loading your activity...</p> : checkins.length ? <div className="dashboard-list">{checkins.filter((checkin) => checkin.eventId).map((checkin) => { const event = checkin.eventId; return <article className="dashboard-event" key={checkin._id}><div><span className="section-kicker">{event.category}</span><h4>{event.title}</h4><p>{displayDate(event.startTime)} · {event.venue}</p></div><span className="checkin-success">Verified</span><button className="card-arrow" aria-label={'View ' + event.title} onClick={() => onOpenEvent(event._id)}>↗</button></article> })}</div> : <div className="dashboard-empty"><span>✳</span><h3>Your campus story is just starting</h3><p>Explore hackathons and workshops, then check in when you arrive to add them here.</p></div>}
      </>}
    </section>
  </div>
}

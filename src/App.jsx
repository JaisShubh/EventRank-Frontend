import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthDialog from './AuthDialog.jsx'
import EventDetail from './EventDetail.jsx'
import CheckinDialog from './CheckinDialog.jsx'
import Dashboard from './Dashboard.jsx'
import { apiRequest } from './api.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const categories = ['All events', 'Hackathon', 'Workshop', 'Music', 'Tech talk', 'Cultural']
const interestCards = [
  { name: 'Hackathon', label: 'Build something bold', icon: '⌘', tone: 'interest-violet' },
  { name: 'Workshop', label: 'Pick up a new skill', icon: '◈', tone: 'interest-blue' },
  { name: 'Music', label: 'Find your after-hours', icon: '♫', tone: 'interest-orange' },
  { name: 'Tech talk', label: 'Ideas worth sharing', icon: '✳', tone: 'interest-green' },
  { name: 'Cultural', label: 'Celebrate campus life', icon: '✺', tone: 'interest-pink' },
  { name: 'All events', label: 'See what’s happening', icon: '↗', tone: 'interest-cream' },
]

const demoEvents = [
  { id: 1, title: 'Buildspace: The Campus AI Hackathon', category: 'Hackathon', organizer: 'Developer Student Club', venue: 'Innovation Lab · Block C', start_time: '2026-10-19T09:30:00', score: 9.4, turnout_count: 186, description: 'A full day to turn ambitious ideas into useful AI products. Bring a team, leave with a working prototype.', color: 'violet', icon: '✳' },
  { id: 2, title: 'After Hours: Open Air Sessions', category: 'Music', organizer: 'The Sound Society', venue: 'Central Amphitheatre', start_time: '2026-10-20T18:00:00', score: 9.1, turnout_count: 142, description: 'Live sets from campus artists, late evening food stalls, and a little room to dance under the lights.', color: 'orange', icon: '♫' },
  { id: 3, title: 'Designing for the Real World', category: 'Workshop', organizer: 'Product Club', venue: 'Studio 04 · Design Wing', start_time: '2026-10-22T14:00:00', score: 8.9, turnout_count: 78, description: 'A practical product design workshop on research, rapid prototyping, and making ideas feel inevitable.', color: 'blue', icon: '◈' },
  { id: 4, title: 'RoboClash: Machines in Motion', category: 'Tech talk', organizer: 'Robotics & IoT Club', venue: 'Engineering Courtyard', start_time: '2026-10-24T11:00:00', score: 8.7, turnout_count: 96, description: 'Meet the teams building autonomous bots, see them compete, and get a peek inside the workshop.', color: 'green', icon: '⌘' },
]

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function formatDate(value) {
  if (!value) return 'Date to be announced'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function App() {
  const [events, setEvents] = useState(demoEvents)
  const [category, setCategory] = useState('All events')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const routeEventId = location.pathname.split('/')[2] || ''
  const [token, setToken] = useState(() => localStorage.getItem('eventrank_token') || '')
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('eventrank_user') || 'null') } catch { return null } })
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    apiRequest('/auth/me', { token }).then((result) => {
      if (!active) return
      setUser(result.user)
      localStorage.setItem('eventrank_user', JSON.stringify(result.user))
    }).catch((error) => {
      if (!active || error.status !== 401) return
      localStorage.removeItem('eventrank_token')
      localStorage.removeItem('eventrank_user')
      setToken('')
      setUser(null)
      if (location.pathname === '/profile') setAuthOpen(true)
    })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (location.pathname === '/profile' && !token) setAuthOpen(true)
  }, [location.pathname, token])

  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/events`)
      .then((response) => { if (!response.ok) throw new Error('Events service unavailable'); return response.json() })
      .then((data) => { if (active && Array.isArray(data.events)) { setEvents(data.events); setNotice('') } })
      .catch(() => { if (active) setNotice('Showing a preview while the campus events service is offline.') })
    return () => { active = false }
  }, [])

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      const text = `${event.title} ${event.category} ${event.organizer} ${event.venue}`.toLowerCase()
      const selectedCategory = category === 'All events' || event.category?.toLowerCase() === category.toLowerCase()
      return selectedCategory && text.includes(query.trim().toLowerCase())
    })
    return [...filtered].sort((a, b) => sortBy === 'upcoming' ? new Date(a.start_time) - new Date(b.start_time) : sortBy === 'attending' ? (b.turnout_count || 0) - (a.turnout_count || 0) : (b.score || 0) - (a.score || 0))
  }, [category, events, query, sortBy])

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="EventRank home"><span className="brand-mark">e</span><span>event<span className="brand-accent">rank</span></span></a>
        <nav className="main-nav" aria-label="Main navigation"><a className="nav-item active" href="#discover">Discover</a><a className="nav-item" href="#rankings">Rankings</a><a className="nav-item" href="#about">How it works</a></nav>
        <div className="top-actions">{user ? <><span className="user-greeting">Hi, {user.name}</span><button className="login-button" onClick={() => { localStorage.removeItem('eventrank_token'); localStorage.removeItem('eventrank_user'); setToken(''); setUser(null); navigate('/') }}>Log out</button></> : <button className="login-button" onClick={() => setAuthOpen(true)}>Log in</button>}<button className="profile-button" aria-label={user ? 'Open dashboard' : 'Sign in to view profile'} onClick={() => user && token ? navigate('/profile') : setAuthOpen(true)}>{user?.name?.[0]?.toUpperCase() || 'S'}</button></div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-inner">
            <div className="eyebrow"><span className="live-dot" /> YOUR CAMPUS, A LITTLE CLOSER</div>
            <h1>Find your <span>next thing.</span></h1>
            <p className="hero-copy">The talks, late nights, big ideas, and little moments that make campus yours.</p>
            <div className="search-panel">
              <Icon name="search" size={20} /><input aria-label="Search campus events" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “design”, “music”, or “hackathon”" /><kbd>↵</kbd>
              <button className="search-button" onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })}>Explore <Icon name="arrow" size={16} /></button>
            </div>
            <div className="hero-footnote"><span><Icon name="sparkle" size={15} /> Student-ranked, not algorithm-guessed</span><span>Made for campus life</span></div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-star">✳</div><span className="art-label label-a">ideas happen here</span><span className="art-label label-b">meet you there ↗</span></div>
        </section>

        <section className="interest-section" aria-labelledby="interest-title">
          <div className="interest-heading"><div><div className="section-kicker">A GOOD PLACE TO START</div><h2 id="interest-title">What are you in the mood for?</h2></div><span>Pick a path, see what’s on.</span></div>
          <div className="interest-grid">{interestCards.map((item) => <button key={item.name} className={`interest-card ${item.tone}`} onClick={() => { setCategory(item.name); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }) }}><span className="interest-copy"><strong>{item.name === 'All events' ? 'Explore all' : item.name}</strong><small>{item.label}</small></span><span className="interest-illustration" aria-hidden="true">{item.icon}</span><span className="interest-arrow">↗</span></button>)}</div>
        </section>

        <section className="content-section" id="discover">
          <div className="section-topline"><div><div className="section-kicker">THE CAMPUS EDIT</div><h2>Good things are happening.</h2><p className="section-description">Find your people. Try something new. Make a story out of a Tuesday.</p></div><a className="text-link" href="#rankings">See campus rankings <Icon name="arrow" size={16}/></a></div>
          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="browse-controls"><div className="category-list" aria-label="Filter by category">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="sort-control">Sort <select aria-label="Sort events" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="score">Top ranked</option><option value="upcoming">Coming up</option><option value="attending">Most attending</option></select></label></div>

          <div className="event-grid">
            {visibleEvents.map((event, index) => <article className={`event-card ${index === 0 ? 'featured-card' : ''}`} key={event.id}>
              <div className={`event-art ${event.color || ['violet', 'orange', 'blue', 'green'][index % 4]}`}><span className="art-category">{event.category || 'Campus'}</span><span className="event-glyph">{event.icon || ['✳', '♫', '◈', '⌘'][index % 4]}</span><span className="art-orb"/><span className="art-grain"/></div>
              <div className="card-content"><div className="card-meta"><span>{event.organizer || 'Campus club'}</span><span className="rank-score"><span>★</span> {Number(event.score || 0).toFixed(1)}</span></div><h3>{event.title}</h3><p className="event-description">{event.description || 'A chance to meet people, learn something new, and enjoy what campus has to offer.'}</p><div className="event-details"><span><Icon name="calendar" size={15}/>{formatDate(event.start_time)}</span><span><Icon name="pin" size={15}/>{event.venue || 'Campus venue'}</span></div><div className="card-footer"><span className="attendee-count"><span className="attendee-stack"><i>S</i><i>A</i><i>+</i></span>{event.turnout_count || 0} checked in</span><button className="card-arrow" aria-label={`View ${event.title}`} onClick={() => navigate('/events/' + encodeURIComponent(event.id || event._id))}><Icon name="arrow" size={18}/></button></div></div>
            </article>)}
          </div>
          {visibleEvents.length === 0 && <div className="empty-state"><span>✳</span><h3>No events found</h3><p>Try another search or choose a different category.</p><button onClick={() => { setQuery(''); setCategory('All events') }}>Clear filters</button></div>}
        </section>

        <section className="trust-strip" id="rankings"><div className="trust-icon">✦</div><div><div className="section-kicker">A BETTER WAY TO PICK</div><h2>Good events earn their reputation.</h2><p>Rankings bring together student reviews and verified attendance, so the best events rise for the right reasons.</p></div><div className="trust-stats"><div><strong>01</strong><span>Show up</span></div><div><strong>02</strong><span>Share your take</span></div><div><strong>03</strong><span>Help your campus choose</span></div></div></section>
      </main>
      <footer className="footer" id="about"><a className="brand" href="#top"><span className="brand-mark">e</span><span>event<span className="brand-accent">rank</span></span></a><span>Campus life, in good company.</span><span>© 2026 EventRank</span></footer>
      {location.pathname === '/profile' && user && token && <Dashboard user={user} token={token} onClose={() => navigate('/')} onOpenEvent={(eventId) => navigate('/events/' + encodeURIComponent(eventId))} onCreated={async () => { const result = await apiRequest('/events'); setEvents(result.events || []) }} />}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onAuthenticated={(result) => { setToken(result.token); setUser(result.user); setNotice('Signed in as ' + result.user.name) }} />}
      {routeEventId && <EventDetail eventId={routeEventId} token={token} onClose={() => navigate('/')} onRequireAuth={() => setAuthOpen(true)} />}
      {location.pathname === '/checkin' && <CheckinDialog token={token} onClose={() => navigate('/')} onRequireAuth={() => setAuthOpen(true)} />}      {notice && <button className="notice-dismiss" onClick={() => setNotice('')} aria-label="Dismiss message">×</button>}
    </div>
  )
}

export default App

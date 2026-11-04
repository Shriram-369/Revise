import { useEffect, useState } from 'react';
import { api, useGet, today, conf } from './api.js';
import TopicView from './TopicView.jsx';

export const Card = ({ t, onOpen }) => {
  const late = t.nextReview < today();
  return (
    <div className={`card ${conf(t)}`} role="button" tabIndex={0} onClick={() => onOpen(t)} onKeyDown={e => e.key === 'Enter' && onOpen(t)}>
      <b>{t.title}</b>
      <div className="meta">
        <span className={`pill ${conf(t)}`}>{conf(t)}</span>
        <span className="pill">{t.subject}</span>
        {t.tags.map(x => <span key={x} className="pill">#{x}</span>)}
      </div>
      <small className={late ? 'over' : 'mute'}>{t.difficulty}, revised {t.history.length}x, {late ? 'overdue since' : 'next'} {t.nextReview}</small>
    </div>
  );
};

export function Today({ user, setUser, tick, onChange, onEdit, onReview }) {
  const [due] = useGet(`/topics?due=${today()}&limit=100`, tick);
  const [s] = useGet(`/topics/stats?today=${today()}`, tick);
  const [open, setOpen] = useState(null);
  const items = due?.items || [];
  const done = s?.doneToday || 0;
  const setGoal = async e => {
    const dailyGoal = +e.target.value;
    if (dailyGoal >= 1 && dailyGoal <= 100) setUser(await api.patch('/auth/me', { dailyGoal }));
  };
  return (
    <>
      <div className="goal">
        Daily goal <input className="num" type="number" min="1" max="100" defaultValue={user.dailyGoal} onBlur={setGoal} aria-label="Daily goal" />
        <b> {done}/{user.dailyGoal} revised</b>
        {s?.streak > 0 && <span className="mute">, {s.streak} day streak</span>}
        <div className="bar"><i style={{ width: Math.min(100, (done / user.dailyGoal) * 100) + '%' }} /></div>
      </div>
      <div className="top">
        <h3>Due today ({items.length})</h3>
        {items.length > 0 && <button className="b" onClick={() => onReview(items)}>Start review session</button>}
      </div>
      <div className="grid">{items.map(t => <Card key={t._id} t={t} onOpen={setOpen} />)}</div>
      {due && !items.length && <p className="mute">Nothing due. Add a topic you studied recently, or check Insights for what is coming.</p>}
      {open && <TopicView t={open} onClose={() => setOpen(null)} onChange={onChange} onEdit={t => { setOpen(null); onEdit(t); }} />}
    </>
  );
}

export default function Topics({ tick, onChange, onEdit }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  useEffect(() => { const id = setTimeout(() => { setQ(text); setPage(1); }, 300); return () => clearTimeout(id); }, [text]);

  const qs = new URLSearchParams({ page, ...(q && { q }), ...(subject && { subject }), ...(level && { conf: level }) });
  const [data, err] = useGet('/topics?' + qs, tick);
  const [s] = useGet(`/topics/stats?today=${today()}`, tick);

  return (
    <>
      <div className="filters">
        <input placeholder="Search titles, notes, tags, code" value={text} onChange={e => setText(e.target.value)} aria-label="Search" />
        <select value={subject} onChange={e => { setSubject(e.target.value); setPage(1); }} aria-label="Subject">
          <option value="">All subjects</option>
          {Object.keys(s?.bySubject || {}).map(x => <option key={x}>{x}</option>)}
        </select>
        <select value={level} onChange={e => { setLevel(e.target.value); setPage(1); }} aria-label="Confidence">
          <option value="">Any confidence</option>
          {['weak', 'medium', 'strong'].map(x => <option key={x}>{x}</option>)}
        </select>
      </div>
      {err && <p className="over" role="alert">{err}</p>}
      <div className="grid">{data?.items.map(t => <Card key={t._id} t={t} onOpen={setOpen} />)}</div>
      {data && !data.items.length && <p className="mute">No topics match. Try a different search, or add your first topic.</p>}
      {data?.pages > 1 && (
        <div className="acts">
          <button className="b g" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="mute">Page {data.page} of {data.pages}</span>
          <button className="b g" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      {open && <TopicView t={open} onClose={() => setOpen(null)} onChange={onChange} onEdit={t => { setOpen(null); onEdit(t); }} />}
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { api, today } from './api.js';
import { Body, Rate } from './TopicView.jsx';

const KEYS = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' };

export default function Review({ items, onDone }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = items[i];

  const rate = useCallback(async rating => {
    setBusy(true);
    try { await api.post(`/topics/${t._id}/revise`, { rating, today: today() }); setShow(false); setI(x => x + 1); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }, [t]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') return onDone();
      if (!t || busy || ['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return;
      if (!show && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setShow(true); }
      else if (show && KEYS[e.key]) rate(KEYS[e.key]);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [t, show, busy, rate, onDone]);

  if (!t) return (
    <div className="blk">
      <h2>Session complete</h2>
      <p>You revised {items.length} topic{items.length === 1 ? '' : 's'}.</p>
      <button className="b" onClick={onDone}>Back to Today</button>
    </div>
  );

  return (
    <div className="blk">
      <div className="top"><b>{i + 1} of {items.length}</b><button className="b g" onClick={onDone}>End session (Esc)</button></div>
      <div className="bar"><i style={{ width: (i / items.length) * 100 + '%' }} /></div>
      <h2>{t.title}</h2>
      <p className="mute">{t.subject}. Try to recall the key ideas before you reveal.</p>
      {show ? <><Body t={t} /><h4>How well did you remember it?</h4><Rate onRate={rate} /></> : <button className="b" onClick={() => setShow(true)}>Show answer (Space)</button>}
    </div>
  );
}

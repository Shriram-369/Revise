import { useEffect, useMemo, useRef } from 'react';
import hljs from 'highlight.js/lib/common';
import { api, today, conf } from './api.js';

export function Modal({ onClose, children }) {
  const ref = useRef();
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()}>{children}</dialog>;
}

export function Code({ c }) {
  const html = useMemo(() => {
    const lang = (c.lang || '').toLowerCase();
    return hljs.getLanguage(lang) ? hljs.highlight(c.body, { language: lang }).value : hljs.highlightAuto(c.body).value;
  }, [c]);
  return (
    <>
      <h4>{c.title} <small className="mute">{c.lang}</small></h4>
      <pre><code className="hljs" dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </>
  );
}

export function Body({ t }) {
  return (
    <>
      {t.link && <p><a href={t.link} target="_blank" rel="noopener noreferrer">{t.link}</a></p>}
      {t.notes && <p className="notes">{t.notes}</p>}
      {t.code.map((c, i) => <Code key={i} c={c} />)}
      {t.cards.length > 0 && (
        <>
          <h4>Flashcards, click a question to reveal</h4>
          {t.cards.map((c, i) => <details key={i}><summary>{c.q}</summary><p className="ans">{c.a}</p></details>)}
        </>
      )}
    </>
  );
}

export const Rate = ({ onRate }) => (
  <div className="acts">
    {['again', 'hard', 'good', 'easy'].map((k, i) => (
      <button key={k} className={`b ${i < 2 ? 'g' : ''}`} onClick={() => onRate(k)}>{k[0].toUpperCase() + k.slice(1)} <small>({i + 1})</small></button>
    ))}
  </div>
);

export default function TopicView({ t, onClose, onChange, onEdit }) {
  const rate = async rating => { await api.post(`/topics/${t._id}/revise`, { rating, today: today() }); onChange(); onClose(); };
  const del = async () => { if (confirm('Delete this topic?')) { await api.del('/topics/' + t._id); onChange(); onClose(); } };
  return (
    <Modal onClose={onClose}>
      <div className="top"><h2>{t.title}</h2><button className="b g" onClick={onClose}>Close</button></div>
      <div className="meta">
        <span className={`pill ${conf(t)}`}>{conf(t)}</span><span className="pill">{t.subject}</span><span className="pill">{t.difficulty}</span>
        {t.tags.map(x => <span key={x} className="pill">#{x}</span>)}
      </div>
      <p className="mute">First studied {t.firstStudied}. Next revision {t.nextReview}. Current interval {t.interval} days.</p>
      <Body t={t} />
      <h4>How well did you remember it?</h4>
      <Rate onRate={rate} />
      <h4>History</h4>
      <p className="mute">{t.history.slice(-8).reverse().map(h => `${h.date} ${h.rating}`).join(', ') || 'Not revised yet.'}</p>
      <div className="acts"><button className="b g" onClick={() => onEdit(t)}>Edit</button><button className="b g" onClick={del}>Delete</button></div>
    </Modal>
  );
}

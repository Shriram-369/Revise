import { useEffect, useMemo, useRef, useState } from 'react';
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

const thumb = url => url.replace('/upload/', '/upload/w_400,h_260,c_fill,q_auto,f_auto/');

export function Gallery({ images = [], onRemove }) {
  const [big, setBig] = useState(null);
  if (!images.length) return null;
  return (
    <>
      <h4>Images</h4>
      <div className="gallery">
        {images.map(im => (
          <figure key={im._id}>
            <button type="button" className="thumb" onClick={() => setBig(im)} aria-label="View larger">
              <img src={thumb(im.url)} alt={im.caption || 'Topic image'} loading="lazy" />
            </button>
            {im.caption && <figcaption>{im.caption}</figcaption>}
            {onRemove && <button type="button" className="rm" aria-label="Remove image" onClick={() => onRemove(im)}>&times;</button>}
          </figure>
        ))}
      </div>
      {big && (
        <Modal onClose={() => setBig(null)}>
          <div className="top"><b>{big.caption}</b><button className="b g" onClick={() => setBig(null)}>Close</button></div>
          <img className="big" src={big.url} alt={big.caption || 'Topic image'} />
        </Modal>
      )}
    </>
  );
}

export function Body({ t, onRemoveImage }) {
  return (
    <>
      {t.link && <p><a href={t.link} target="_blank" rel="noopener noreferrer">{t.link}</a></p>}
      {t.notes && <p className="notes">{t.notes}</p>}
      <Gallery images={t.images} onRemove={onRemoveImage} />
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
  const [imgs, setImgs] = useState(t.images || []);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const rate = async rating => { await api.post(`/topics/${t._id}/revise`, { rating, today: today() }); onChange(); onClose(); };
  const del = async () => { if (confirm('Delete this topic and its images?')) { await api.del('/topics/' + t._id); onChange(); onClose(); } };

  const send = async file => {
    if (!file || busy) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('caption', caption);
      fd.append('image', file);
      setImgs((await api.post(`/topics/${t._id}/images`, fd)).images);
      setCaption('');
      onChange();
    } catch (x) { setErr(x.message); }
    finally { setBusy(false); }
  };
  const removeImg = async im => {
    if (!confirm('Remove this image?')) return;
    try { setImgs((await api.del(`/topics/${t._id}/images/${im._id}`)).images); onChange(); }
    catch (x) { setErr(x.message); }
  };
  // Lets you paste a screenshot straight from the clipboard.
  const onPaste = e => {
    const f = [...e.clipboardData.files].find(x => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); send(f); }
  };

  return (
    <Modal onClose={onClose}>
      <div onPaste={onPaste}>
        <div className="top"><h2>{t.title}</h2><button className="b g" onClick={onClose}>Close</button></div>
        <div className="meta">
          <span className={`pill ${conf(t)}`}>{conf(t)}</span><span className="pill">{t.subject}</span><span className="pill">{t.difficulty}</span>
          {t.tags.map(x => <span key={x} className="pill">#{x}</span>)}
        </div>
        <p className="mute">First studied {t.firstStudied}. Next revision {t.nextReview}. Current interval {t.interval} days.</p>
        <Body t={{ ...t, images: imgs }} onRemoveImage={removeImg} />
        <div className="uploader">
          <input placeholder="Caption (optional)" maxLength={200} value={caption} onChange={e => setCaption(e.target.value)} aria-label="Image caption" />
          <label className="b g filebtn">{busy ? 'Uploading...' : 'Add image'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={busy} onChange={e => { send(e.target.files[0]); e.target.value = ''; }} />
          </label>
        </div>
        <small className="mute">JPG, PNG, WebP or GIF, up to 5 MB, 10 images per topic. You can also paste a screenshot here.</small>
        {err && <p className="over" role="alert">{err}</p>}
        <h4>How well did you remember it?</h4>
        <Rate onRate={rate} />
        <h4>History</h4>
        <p className="mute">{t.history.slice(-8).reverse().map(h => `${h.date} ${h.rating}`).join(', ') || 'Not revised yet.'}</p>
        <div className="acts"><button className="b g" onClick={() => onEdit(t)}>Edit</button><button className="b g" onClick={del}>Delete</button></div>
      </div>
    </Modal>
  );
}

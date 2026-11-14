import { useRef, useState } from 'react';
import { api, today } from './api.js';
import { Modal, thumb } from './TopicView.jsx';

const MAX_BYTES = 5 * 1024 * 1024;
const OK_TYPE = /^image\/(png|jpe?g|webp|gif)$/;

export default function TopicForm({ topic, onClose, onSaved }) {
  const [d, setD] = useState(() => ({
    title: '', subject: '', difficulty: 'medium', firstStudied: today(), link: '', notes: '', code: [], cards: [],
    ...topic, tags: (topic.tags || []).join(', ')
  }));
  const [id, setId] = useState(topic._id);
  const [existing, setExisting] = useState(topic.images || []);
  const [queue, setQueue] = useState([]); // images chosen but not uploaded yet
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = useRef(false);

  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const field = k => ({ value: d[k], onChange: e => set(k, e.target.value) });
  const patch = (k, i, p) => set(k, d[k].map((x, j) => (j === i ? { ...x, ...p } : x)));
  const drop = (k, i) => set(k, d[k].filter((_, j) => j !== i));
  const close = () => (changed.current ? onSaved() : onClose());

  const addFiles = files => {
    const next = [];
    let msg = '';
    for (const f of files) {
      if (!OK_TYPE.test(f.type)) msg = `${f.name || 'Pasted file'} is not a JPG, PNG, WebP or GIF image`;
      else if (f.size > MAX_BYTES) msg = `${f.name || 'Pasted image'} is larger than 5 MB`;
      else if (existing.length + queue.length + next.length >= 10) msg = 'A topic can have up to 10 images';
      else next.push({ id: Math.random().toString(36).slice(2), file: f, caption: '', preview: URL.createObjectURL(f) });
    }
    setErr(msg);
    if (next.length) setQueue(q => [...q, ...next]);
  };
  const unqueue = q => { URL.revokeObjectURL(q.preview); setQueue(list => list.filter(x => x.id !== q.id)); };
  const caption = (q, v) => setQueue(list => list.map(x => (x.id === q.id ? { ...x, caption: v } : x)));
  const removeExisting = async im => {
    if (!confirm('Remove this image?')) return;
    try { setExisting((await api.del(`/topics/${id}/images/${im._id}`)).images); changed.current = true; }
    catch (x) { setErr(x.message); }
  };
  // Lets you paste a screenshot straight from the clipboard.
  const onPaste = e => {
    const files = [...e.clipboardData.files].filter(f => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); addFiles(files); }
  };

  const save = async e => {
    e.preventDefault();
    setBusy(true); setErr('');
    const b = {
      title: d.title, subject: d.subject || 'General', difficulty: d.difficulty, firstStudied: d.firstStudied, link: d.link, notes: d.notes,
      tags: d.tags.split(',').map(s => s.trim()).filter(Boolean),
      code: d.code.filter(c => c.body?.trim()).map(c => ({ title: c.title || '', lang: c.lang || 'plaintext', body: c.body })),
      cards: d.cards.filter(c => c.q?.trim()).map(c => ({ q: c.q, a: c.a || '' }))
    };
    try {
      let tid = id;
      if (tid) await api.put('/topics/' + tid, b);
      else { tid = (await api.post('/topics', { ...b, today: today() }))._id; setId(tid); }
      changed.current = true;

      // The topic exists now, so upload the queued images one by one.
      const left = [];
      let failMsg = '', imgs = null;
      for (const q of queue) {
        try {
          const fd = new FormData();
          fd.append('caption', q.caption);
          fd.append('image', q.file);
          imgs = (await api.post(`/topics/${tid}/images`, fd)).images;
          URL.revokeObjectURL(q.preview);
        } catch (x) { left.push(q); failMsg = x.message; }
      }
      if (imgs) setExisting(imgs);
      setQueue(left);
      if (left.length) setErr(`Topic saved, but ${left.length} image(s) did not upload: ${failMsg}. Fix the problem and press Save again, or remove those images.`);
      else onSaved();
    } catch (x) { setErr(x.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={close}>
      <form onSubmit={save} onPaste={onPaste}>
        <div className="top"><h2>{topic._id ? 'Edit topic' : 'New topic'}</h2><button type="button" className="b g" onClick={close}>Cancel</button></div>
        <label>Title<input required maxLength={200} {...field('title')} /></label>
        <div className="two">
          <label>Subject<input placeholder="DSA, React, System design" {...field('subject')} /></label>
          <label>Tags, comma separated<input placeholder="arrays, two-pointers" {...field('tags')} /></label>
        </div>
        <div className="two">
          <label>Difficulty<select {...field('difficulty')}><option>easy</option><option>medium</option><option>hard</option></select></label>
          <label>First studied<input type="date" required {...field('firstStudied')} /></label>
        </div>
        <label>Link (video, article, problem)<input type="url" placeholder="https://" {...field('link')} /></label>
        <label>Notes<textarea className="prose" rows={5} {...field('notes')} /></label>

        <h4>Code snippets</h4>
        {d.code.map((c, i) => (
          <div className="blk" key={i}>
            <div className="two">
              <input placeholder="Title, e.g. Binary search" value={c.title || ''} onChange={e => patch('code', i, { title: e.target.value })} />
              <input placeholder="Language: js, python, cpp, java" value={c.lang || ''} onChange={e => patch('code', i, { lang: e.target.value })} />
            </div>
            <textarea rows={8} spellCheck={false} placeholder="Paste code here" value={c.body || ''} onChange={e => patch('code', i, { body: e.target.value })} />
            <button type="button" className="b g" onClick={() => drop('code', i)}>Remove</button>
          </div>
        ))}
        <button type="button" className="b g" onClick={() => set('code', [...d.code, {}])}>Add code snippet</button>

        <h4>Flashcards</h4>
        {d.cards.map((c, i) => (
          <div className="blk" key={i}>
            <input placeholder="Question" value={c.q || ''} onChange={e => patch('cards', i, { q: e.target.value })} />
            <textarea className="prose" rows={2} placeholder="Answer" value={c.a || ''} onChange={e => patch('cards', i, { a: e.target.value })} />
            <button type="button" className="b g" onClick={() => drop('cards', i)}>Remove</button>
          </div>
        ))}
        <button type="button" className="b g" onClick={() => set('cards', [...d.cards, {}])}>Add flashcard</button>

        <h4>Images</h4>
        {(existing.length > 0 || queue.length > 0) && (
          <div className="gallery">
            {existing.map(im => (
              <figure key={im._id}>
                <img className="pv" src={thumb(im.url)} alt={im.caption || 'Topic image'} />
                <button type="button" className="rm" aria-label="Remove image" onClick={() => removeExisting(im)}>&times;</button>
              </figure>
            ))}
            {queue.map(q => (
              <figure key={q.id}>
                <img className="pv" src={q.preview} alt="Selected image preview" />
                <input className="cap" placeholder="Caption (optional)" maxLength={200} value={q.caption} onChange={e => caption(q, e.target.value)} aria-label="Image caption" />
                <button type="button" className="rm" aria-label="Remove image" onClick={() => unqueue(q)}>&times;</button>
              </figure>
            ))}
          </div>
        )}
        <label className="b g filebtn" style={{ display: 'inline-block' }}>Add images
          <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { addFiles([...e.target.files]); e.target.value = ''; }} />
        </label>
        <div><small className="mute">JPG, PNG, WebP or GIF, up to 5 MB each, 10 per topic. You can paste screenshots here too. Images upload when you save.</small></div>

        {err && <p className="over" role="alert">{err}</p>}
        <p><button className="b" disabled={busy}>{busy ? 'Saving...' : 'Save topic'}</button></p>
      </form>
    </Modal>
  );
}

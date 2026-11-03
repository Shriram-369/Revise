import { useState } from 'react';
import { api, today } from './api.js';
import { Modal } from './TopicView.jsx';

export default function TopicForm({ topic, onClose, onSaved }) {
  const [d, setD] = useState(() => ({
    title: '', subject: '', difficulty: 'medium', firstStudied: today(), link: '', notes: '', code: [], cards: [],
    ...topic, tags: (topic.tags || []).join(', ')
  }));
  const [err, setErr] = useState('');
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const field = k => ({ value: d[k], onChange: e => set(k, e.target.value) });
  const patch = (k, i, p) => set(k, d[k].map((x, j) => (j === i ? { ...x, ...p } : x)));
  const drop = (k, i) => set(k, d[k].filter((_, j) => j !== i));

  const save = async e => {
    e.preventDefault();
    const b = {
      title: d.title, subject: d.subject || 'General', difficulty: d.difficulty, firstStudied: d.firstStudied, link: d.link, notes: d.notes,
      tags: d.tags.split(',').map(s => s.trim()).filter(Boolean),
      code: d.code.filter(c => c.body?.trim()).map(c => ({ title: c.title || '', lang: c.lang || 'plaintext', body: c.body })),
      cards: d.cards.filter(c => c.q?.trim()).map(c => ({ q: c.q, a: c.a || '' }))
    };
    try {
      if (topic._id) await api.put('/topics/' + topic._id, b);
      else await api.post('/topics', { ...b, today: today() });
      onSaved();
    } catch (x) { setErr(x.message); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={save}>
        <div className="top"><h2>{topic._id ? 'Edit topic' : 'New topic'}</h2><button type="button" className="b g" onClick={onClose}>Cancel</button></div>
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

        {err && <p className="over" role="alert">{err}</p>}
        <p><button className="b">Save topic</button></p>
      </form>
    </Modal>
  );
}

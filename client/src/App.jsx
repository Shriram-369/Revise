import { useEffect, useState } from 'react';
import { api, today } from './api.js';
import Topics, { Today } from './Topics.jsx';
import Insights from './Insights.jsx';
import Review from './Review.jsx';
import TopicForm from './TopicForm.jsx';

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try { onAuth(await api.post('/auth/' + mode, { email: f.get('email'), password: f.get('password') })); }
    catch (x) { setErr(x.message); }
  };
  return (
    <form className="blk auth" onSubmit={submit}>
      <h1>Revise</h1>
      <p className="mute">Revise what you have studied, right when you are about to forget it.</p>
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password (8+ characters)<input name="password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      {err && <p className="over" role="alert">{err}</p>}
      <div className="acts">
        <button className="b">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="b g" onClick={() => { setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? 'Create an account' : 'I have an account'}
        </button>
      </div>
    </form>
  );
}

const ICONS = {
  today: 'M8 2v3M16 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  topics: 'M4 6h16M4 12h16M4 18h10',
  insights: 'M4 20V10M10 20V4M16 20v-7M22 20H2'
};
const TITLES = { today: 'Today', topics: 'All topics', insights: 'Insights' };
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState('today');
  const [editing, setEditing] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [tick, setTick] = useState(0);
  const [dark, setDark] = useState(() => localStorage.theme ? localStorage.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  const refresh = () => setTick(t => t + 1);

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => { api.get('/auth/me').then(setUser).catch(() => setUser(null)); }, []);

  if (user === undefined) return null;
  if (!user) return <Auth onAuth={setUser} />;

  const logout = async () => { await api.post('/auth/logout'); setUser(null); };
  const backup = async () => {
    const data = await api.get('/topics/export');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `revise-backup-${today()}.json`;
    a.click();
  };
  const restore = async e => {
    try { await api.post('/topics/import', { topics: JSON.parse(await e.target.files[0].text()) }); refresh(); }
    catch (x) { alert('Restore failed: ' + x.message); }
    e.target.value = '';
  };

  const shared = { tick, onChange: refresh, onEdit: setEditing };
  const go = k => { setReviewing(null); setTab(k); refresh(); };
  const dateText = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="logo">R</span>Revise</div>
        <nav>
          {Object.keys(TITLES).map(k => (
            <button key={k} className={k === tab && !reviewing ? 'on' : ''} onClick={() => go(k)}>
              <Icon d={ICONS[k]} /><span>{TITLES[k]}</span>
            </button>
          ))}
        </nav>
        <div className="side-actions">
          <button className="b" onClick={() => setEditing({})}>+ Add topic</button>
          <button className="side-link" onClick={backup}>Backup</button>
          <label className="side-link">Restore<input type="file" accept=".json" hidden onChange={restore} /></label>
          <button className="side-link" onClick={() => setDark(!dark)}>{dark ? 'Light mode' : 'Dark mode'}</button>
          <button className="side-link" onClick={logout}>Sign out</button>
          <small className="side-user">{user.email}</small>
        </div>
      </aside>

      <main className="main">
        <div className="pagehead">
          <h1>{reviewing ? 'Review session' : TITLES[tab]}</h1>
          <span className="mute">{dateText}</span>
        </div>
        {reviewing ? (
          <Review items={reviewing} onDone={() => { setReviewing(null); refresh(); }} />
        ) : (
          <>
            {tab === 'today' && <Today user={user} setUser={setUser} onReview={setReviewing} {...shared} />}
            {tab === 'topics' && <Topics {...shared} />}
            {tab === 'insights' && <Insights tick={tick} />}
          </>
        )}
      </main>

      {editing && <TopicForm topic={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

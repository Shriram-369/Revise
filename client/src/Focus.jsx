import { useCallback, useEffect, useRef, useState } from 'react';
import { api, useGet, today } from './api.js';

const CFG_KEY = 'revise.timer.cfg', RUN_KEY = 'revise.timer.run';
const DEFAULTS = { focus: 25, short: 5, long: 15, rounds: 4, auto: false };
const PRESETS = [
  ['Classic 25/5', { focus: 25, short: 5, long: 15, rounds: 4 }],
  ['Deep work 50/10', { focus: 50, short: 10, long: 20, rounds: 3 }],
  ['Marathon 90/20', { focus: 90, short: 20, long: 30, rounds: 2 }]
];
const IDLE = { phase: 'focus', round: 1, status: 'idle', endsAt: 0, left: 0, total: 0 };
const LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };

const read = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k)) }; } catch { return d; } };
export const fmt = ms => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const hm = sec => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const beep = () => {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.2;
    o.start(); o.stop(c.currentTime + 0.6);
  } catch { /* sound is optional */ }
};

// The timer works from timestamps, so it stays accurate in background tabs and survives a refresh.
export function useTimer(onSaved) {
  const [cfg, setCfg] = useState(() => read(CFG_KEY, DEFAULTS));
  const [t, setT] = useState(() => read(RUN_KEY, IDLE));
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState('');
  const done = useRef(false);
  const cb = useRef(onSaved);
  cb.current = onSaved;

  useEffect(() => localStorage.setItem(CFG_KEY, JSON.stringify(cfg)), [cfg]);
  useEffect(() => localStorage.setItem(RUN_KEY, JSON.stringify(t)), [t]);
  useEffect(() => {
    if (t.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [t.status]);

  const ms = ph => cfg[ph] * 60000;
  const remaining = t.status === 'running' ? Math.max(0, t.endsAt - now) : t.status === 'paused' ? t.left : ms(t.phase);
  const total = t.status === 'idle' ? ms(t.phase) : t.total;

  const save = useCallback(async seconds => {
    if (seconds < 60) return; // ignore very short sessions
    const startedAt = new Date(Date.now() - seconds * 1000);
    try {
      await api.post('/sessions', { date: startedAt.toLocaleDateString('en-CA'), startedAt: startedAt.toISOString(), seconds, source: 'pomodoro' });
      setErr(''); cb.current();
    } catch (x) { setErr(`Could not save ${Math.round(seconds / 60)} min of study time: ${x.message}. You can add it manually.`); }
  }, []);

  const next = useCallback((from, auto) => {
    let phase, round = from.round;
    if (from.phase === 'focus') phase = from.round % cfg.rounds === 0 ? 'long' : 'short';
    else { phase = 'focus'; round = from.phase === 'long' ? 1 : from.round + 1; }
    const len = cfg[phase] * 60000;
    return auto ? { phase, round, status: 'running', total: len, endsAt: Date.now() + len, left: len } : { ...IDLE, phase, round };
  }, [cfg]);

  useEffect(() => {
    if (t.status !== 'running' || remaining > 0 || done.current) return;
    done.current = true;
    if (t.phase === 'focus') save(Math.round(t.total / 1000));
    beep();
    setT(next(t, cfg.auto));
  }, [t, remaining, cfg.auto, save, next]);
  useEffect(() => { done.current = false; }, [t.phase, t.round, t.status]);

  useEffect(() => {
    document.title = t.status === 'idle' ? 'Revise' : `${fmt(remaining)} ${LABEL[t.phase]} | Revise`;
  }, [t.status, t.phase, remaining]);

  const start = () => { const len = ms(t.phase); setT({ ...t, status: 'running', total: len, endsAt: Date.now() + len, left: len }); setNow(Date.now()); };
  const pause = () => setT({ ...t, status: 'paused', left: Math.max(0, t.endsAt - Date.now()) });
  const resume = () => { setT({ ...t, status: 'running', endsAt: Date.now() + t.left }); setNow(Date.now()); };
  const stop = () => {
    if (t.phase === 'focus' && t.status !== 'idle') save(Math.round((t.total - remaining) / 1000));
    setT(IDLE);
  };
  const skip = () => setT(next(t, false));
  // Restart the current phase from its full length, without saving anything.
  const reset = () => setT({ ...IDLE, phase: t.phase, round: t.round });
  return { cfg, setCfg, t, remaining, total, start, pause, resume, stop, skip, reset, err };
}

export function MiniClock({ timer, onOpen }) {
  const { t, remaining } = timer;
  if (t.status === 'idle') return null;
  return (
    <button className="mini" onClick={onOpen} aria-label="Open focus timer">
      <span>{LABEL[t.phase]}{t.status === 'paused' ? ' (paused)' : ''}</span><b>{fmt(remaining)}</b>
    </button>
  );
}

export default function Focus({ timer, tick }) {
  const { cfg, setCfg, t, remaining, total, start, pause, resume, stop, skip, reset, err } = timer;
  const [n, setN] = useState(0);
  const [add, setAdd] = useState('');
  const [msg, setMsg] = useState('');
  const dep = `${tick}-${n}`;
  const [sum] = useGet(`/sessions/summary?today=${today()}`, dep);
  const [list] = useGet(`/sessions?date=${today()}`, dep);
  const idle = t.status === 'idle', running = t.status === 'running', paused = t.status === 'paused';
  const pct = total ? Math.min(100, (1 - remaining / total) * 100) : 0;
  const maxSec = Math.max(1, ...(sum ? sum.days.map(d => d.seconds) : [0]));
  const commit = (k, v, min, max) => setCfg({ ...cfg, [k]: Math.min(max, Math.max(min, Math.round(+v) || min)) });
  const act = async fn => { setMsg(''); try { await fn(); setN(x => x + 1); } catch (x) { setMsg(x.message); } };
  const minutes = v => Math.round(+v);
  const onReset = () => {
    const mins = Math.floor((total - remaining) / 60000);
    if (t.phase === 'focus' && mins >= 1 && !confirm(`Reset this round? The ${mins} min studied so far will not be saved. Use "Stop and save" to keep it.`)) return;
    reset();
  };

  return (
    <>
      <div className={`timer ${t.phase}`}>
        <div>{LABEL[t.phase]}{t.phase === 'focus' ? `, round ${t.round} of ${cfg.rounds}` : ''}</div>
        <div className="clock">{fmt(remaining)}</div>
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
        <div className="acts">
          {idle && <button className="b" onClick={start}>Start</button>}
          {running && <button className="b" onClick={pause}>Pause</button>}
          {paused && <button className="b" onClick={resume}>Resume</button>}
          {!idle && <button className="b g" onClick={stop}>{t.phase === 'focus' ? 'Stop and save' : 'Stop'}</button>}
          {!idle && <button className="b g" onClick={onReset}>Reset</button>}
          {t.phase !== 'focus' && <button className="b g" onClick={skip}>Skip break</button>}
        </div>
      </div>
      {err && <p className="over" role="alert">{err}</p>}

      <h3>Timer settings</h3>
      <div className="blk">
        <div className="acts">
          {PRESETS.map(([name, p]) => <button key={name} className="b g" disabled={!idle} onClick={() => setCfg({ ...cfg, ...p })}>{name}</button>)}
        </div>
        <div className="set">
          {[['focus', 'Focus (min)', 1, 180], ['short', 'Short break (min)', 1, 60], ['long', 'Long break (min)', 1, 90], ['rounds', 'Rounds before long break', 1, 10]].map(([k, label, min, max]) => (
            <label key={k}>{label}
              <input type="number" min={min} max={max} key={cfg[k]} defaultValue={cfg[k]} disabled={!idle} onBlur={e => commit(k, e.target.value, min, max)} />
            </label>
          ))}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={cfg.auto} onChange={e => setCfg({ ...cfg, auto: e.target.checked })} />
          Start the next phase automatically
        </label>
        {!idle && <small className="mute">Stop the timer to change the lengths.</small>}
      </div>

      <h3>Study time</h3>
      <div className="stats">
        <div><b>{hm(sum?.today || 0)}</b>today</div>
        <div><b>{hm(sum?.week || 0)}</b>last 7 days</div>
        <div><b>{hm(sum?.total || 0)}</b>all time</div>
      </div>
      {sum && (
        <div className="bars" role="img" aria-label="Study time for the last 14 days">
          {sum.days.map(d => (
            <div key={d.date} title={`${d.date}: ${hm(d.seconds)}`}>
              <i style={{ height: Math.max(2, (d.seconds / maxSec) * 100) + '%' }} /><small>{d.date.slice(8)}</small>
            </div>
          ))}
        </div>
      )}
      <p className="mute">Only focus time counts. Stopping early saves what you completed, and anything under 1 minute is ignored.</p>

      <h3>Today's sessions</h3>
      {list?.map(s => (
        <div className="blk srow" key={s._id}>
          <span>{new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <small className="mute">{s.source}</small></span>
          <span>
            <input type="number" min="1" max="720" key={s.seconds} defaultValue={Math.round(s.seconds / 60)} aria-label="Minutes"
              onBlur={e => { const m = minutes(e.target.value); if (m >= 1 && m <= 720 && m * 60 !== s.seconds) act(() => api.put(`/sessions/${s._id}`, { seconds: m * 60 })); }} /> min
          </span>
          <button className="b g" onClick={() => confirm('Delete this session?') && act(() => api.del(`/sessions/${s._id}`))}>Delete</button>
        </div>
      ))}
      {list && !list.length && <p className="mute">No sessions yet today. Press Start and your first one will appear here.</p>}
      <div className="srow">
        <input type="number" min="1" max="720" placeholder="Minutes studied without the timer" value={add} onChange={e => setAdd(e.target.value)} aria-label="Minutes to add" />
        <button className="b g" onClick={() => { const m = minutes(add); if (m >= 1 && m <= 720) act(async () => { await api.post('/sessions', { date: today(), seconds: m * 60, source: 'manual' }); setAdd(''); }); else setMsg('Enter 1 to 720 minutes'); }}>Add time</button>
      </div>
      {msg && <p className="over" role="alert">{msg}</p>}
    </>
  );
}

import { useGet, today } from './api.js';

export default function Insights({ tick }) {
  const [s, err] = useGet(`/topics/stats?today=${today()}`, tick);
  if (!s) return <p className="mute">{err || 'Loading...'}</p>;
  const max = Math.max(1, ...s.heat.map(h => h.count));
  return (
    <>
      <div className="stats">
        <div><b>{s.streak}</b>day streak</div>
        <div><b>{s.week}</b>revisions in 7 days</div>
        <div><b>{s.total}</b>topics</div>
        <div><b>{s.weak}</b>weak topics</div>
      </div>
      <h3>Last 12 weeks</h3>
      <div className="heat" role="img" aria-label="Revision activity for the last 84 days">
        {s.heat.map(h => <i key={h.date} title={`${h.date}: ${h.count} revised`} style={{ opacity: h.count ? 0.3 + (0.7 * h.count) / max : 0.1 }} />)}
      </div>
      <h3>Coming up</h3>
      <div className="upcoming">
        {s.upcoming.map(u => <div key={u.date} className="blk"><small className="mute">{u.date}</small><b>{u.count}</b></div>)}
      </div>
      <h3>By subject</h3>
      {Object.entries(s.bySubject).map(([name, v]) => (
        <div key={name}>
          {name}: {v.total} topic{v.total === 1 ? '' : 's'}, {v.weak} weak
          <div className="bar"><i style={{ width: (v.weak / v.total) * 100 + '%', background: 'var(--weak)' }} /></div>
        </div>
      ))}
      {!s.total && <p className="mute">Add a few topics and your progress will show up here.</p>}
    </>
  );
}

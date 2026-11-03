import { useEffect, useState } from 'react';

async function request(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body && JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { status: res.status });
  return data;
}

export const api = {
  get: p => request(p),
  post: (p, b) => request(p, 'POST', b),
  put: (p, b) => request(p, 'PUT', b),
  patch: (p, b) => request(p, 'PATCH', b),
  del: p => request(p, 'DELETE')
};

export const today = () => new Date().toLocaleDateString('en-CA');
export const conf = t => (t.interval < 3 ? 'weak' : t.interval < 21 ? 'medium' : 'strong');

// Fetches `path` whenever it (or `dep`) changes.
export function useGet(path, dep) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setError('');
    api.get(path).then(d => live && setData(d)).catch(e => live && setError(e.message));
    return () => { live = false; };
  }, [path, dep]);
  return [data, error];
}

import { useEffect, useState } from 'react';

type Health = { status: string; database: string };

// Asks the backend "are you alive?" once, when the component first appears, and shows the answer
export function ApiStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setFailed(true));
  }, []); // [] = run only once, after the first render

  if (failed) {
    return <p className="mt-6 text-sm text-danger">API not reachable. Is the backend running?</p>;
  }

  if (!health) {
    return <p className="mt-6 text-sm text-text-secondary">Checking the API…</p>;
  }

  const ok = health.status === 'ok';
  return (
    <p className={`mt-6 text-sm ${ok ? 'text-success' : 'text-danger'}`}>
      API: {health.status} · database: {health.database}
    </p>
  );
}

import { ApiStatus } from './components/ApiStatus';

// The whole app. For now, one page that proves the frontend runs and can reach the API.
export function App() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-border p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-primary">GeoAnnotator</h1>
        <p className="text-sm text-text-secondary mt-1">The frontend is running.</p>
        <ApiStatus />
      </div>
    </main>
  );
}

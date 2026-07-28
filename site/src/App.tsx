import { useEffect, useState } from 'react';
import PublicDocPage from './components/PublicDocPage';
import ImmersiveLanding from './components/ImmersiveLanding';

const PUBLIC_ROUTES = new Set(['privacy', 'terms', 'deletion', 'support']);

function readHashRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').trim();
}

export default function App() {
  const [route, setRoute] = useState(readHashRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(readHashRoute());
    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  if (PUBLIC_ROUTES.has(route)) {
    return <PublicDocPage routeId={route as 'privacy' | 'terms' | 'deletion' | 'support'} />;
  }

  return <ImmersiveLanding />;
}

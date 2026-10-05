import { useCallback, useEffect, useState } from 'react';

const routes = new Set(['splash', 'intro/1', 'intro/2', 'intro/3', 'login', 'signup']);

function readRoute() {
  const route = window.location.hash.replace(/^#\/?/, '');
  return routes.has(route) ? route : 'splash';
}

export default function useRoute() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback(next => {
    if (routes.has(next)) window.location.hash = `/${next}`;
  }, []);

  return [route, navigate];
}

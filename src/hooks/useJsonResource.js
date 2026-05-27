import { useEffect, useState } from 'react';
import { normalizeDataValues } from '../utils/dataNormalization';

export function useJsonResource(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      return undefined;
    }

    let ignored = false;
    const controller = new AbortController();

    setData(null);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${url}`);
        }

        return response.json();
      })
      .then((json) => {
        if (!ignored) {
          setData(normalizeDataValues(json));
        }
      })
      .catch((fetchError) => {
        if (!ignored && fetchError.name !== 'AbortError') {
          setError(fetchError);
        }
      });

    return () => {
      ignored = true;
      controller.abort();
    };
  }, [url]);

  return { data, error, isLoading: Boolean(url && !data && !error) };
}

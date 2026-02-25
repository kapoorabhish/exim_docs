import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay (ms).
 * Use this for search inputs to avoid firing API calls on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(search, 300);
 * useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
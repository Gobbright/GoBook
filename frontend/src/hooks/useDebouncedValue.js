import { useEffect, useState } from 'react';

// Returns `value`, but only updated `delay` ms after it stops changing —
// use as an effect dependency to avoid firing a fetch on every keystroke.
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

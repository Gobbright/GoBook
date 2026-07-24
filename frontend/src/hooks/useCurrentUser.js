import { useEffect, useState } from 'react';

import { getStoredUser, USER_SESSION_EVENT } from '../services/authToken.js';

export function useCurrentUser() {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    function syncUser(event) {
      setUser(event?.detail?.user ?? getStoredUser());
    }

    function syncFromStorage(event) {
      if (!event.key || event.key === 'gobook.user' || event.key === 'gobook.token') {
        setUser(getStoredUser());
      }
    }

    window.addEventListener(USER_SESSION_EVENT, syncUser);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(USER_SESSION_EVENT, syncUser);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  return user;
}
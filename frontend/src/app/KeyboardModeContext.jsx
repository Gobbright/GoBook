import { createContext, useContext, useEffect, useState } from 'react';

const KeyboardModeContext = createContext(null);
const STORAGE_KEY = 'gobook.keyboardMode';

function getInitialKeyboardMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== 'off';
}

export function KeyboardModeProvider({ children }) {
  const [keyboardMode, setKeyboardMode] = useState(getInitialKeyboardMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, keyboardMode ? 'on' : 'off');
  }, [keyboardMode]);

  function toggleKeyboardMode() {
    setKeyboardMode((v) => !v);
  }

  return (
    <KeyboardModeContext.Provider value={{ keyboardMode, toggleKeyboardMode }}>
      {children}
    </KeyboardModeContext.Provider>
  );
}

export function useKeyboardMode() {
  const ctx = useContext(KeyboardModeContext);
  if (!ctx) throw new Error('useKeyboardMode must be used within a KeyboardModeProvider');
  return ctx;
}

import { useState, useEffect } from 'react';

const FREE_SONGS_LIMIT = 2;
const STORAGE_KEY = 'mixingmusic_free_songs_count';

export interface FreeSongState {
  count: number;
  remaining: number;
  isExhausted: boolean;
  incrementCount: () => void;
  resetCount: () => void;
}

export function useFreeSongLimit(): FreeSongState {
  const [count, setCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedCount = localStorage.getItem(STORAGE_KEY);
    if (storedCount) {
      const parsed = parseInt(storedCount, 10);
      setCount(Math.min(parsed, FREE_SONGS_LIMIT));
    }
    setIsInitialized(true);
  }, []);

  const incrementCount = () => {
    setCount(prev => {
      const newCount = Math.min(prev + 1, FREE_SONGS_LIMIT);
      localStorage.setItem(STORAGE_KEY, newCount.toString());
      return newCount;
    });
  };

  const resetCount = () => {
    setCount(0);
    localStorage.removeItem(STORAGE_KEY);
  };

  const remaining = Math.max(0, FREE_SONGS_LIMIT - count);
  const isExhausted = count >= FREE_SONGS_LIMIT;

  return {
    count,
    remaining,
    isExhausted,
    incrementCount,
    resetCount,
  };
}

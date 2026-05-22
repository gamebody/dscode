

import { useSyncExternalStore } from 'react';

const TERMINAL_PADDING_X = 8;

type TerminalSize = { columns: number; rows: number };

let cachedSize: TerminalSize = {
  columns: (process.stdout.columns || 60) - TERMINAL_PADDING_X,
  rows: process.stdout.rows || 20,
};

const listeners = new Set<() => void>();
let resizeHandlerRegistered = false;

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (!resizeHandlerRegistered) {
    resizeHandlerRegistered = true;
    process.stdout.on('resize', handleResize);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && resizeHandlerRegistered) {
      process.stdout.off('resize', handleResize);
      resizeHandlerRegistered = false;
    }
  };
}

function getSnapshot(): TerminalSize {
  return cachedSize;
}

function handleResize() {
  cachedSize = {
    columns: (process.stdout.columns || 60) - TERMINAL_PADDING_X,
    rows: process.stdout.rows || 20,
  };
  for (const listener of listeners) {
    listener();
  }
}

export function useTerminalSize(): TerminalSize {
  return useSyncExternalStore(subscribe, getSnapshot);
}

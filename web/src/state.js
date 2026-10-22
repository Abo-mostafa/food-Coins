// Small observable app state shared by scenes and DOM views.
const listeners = new Set();

export const state = {
  user: null,
  progress: null,
  wallet: null,
  practice: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state, patch);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

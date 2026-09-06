import { useSyncExternalStore } from 'react';

export const KEYBINDINGS_STORAGE_KEY = 'prism-bastion-keybindings-v1';
export const defaultKeybindings = {
  pause: 'Space', launch: 'N', speed: 'G', advancedDraft: 'V',
  moveLeft: 'Alt+ArrowLeft', moveRight: 'Alt+ArrowRight',
  thoughtPlayback: 'Space', thoughtPrevious: 'PageUp', thoughtNext: 'PageDown', thoughtRestart: 'R',
} as const;
export type KeybindingAction = keyof typeof defaultKeybindings;
export type Keybindings = Record<KeybindingAction, string | null>;
export const isReservedPageBinding = (action: KeybindingAction, binding: string): boolean =>
  action.startsWith('thought') && (binding === 'ArrowLeft' || binding === 'ArrowRight');
export const keybindingActions = Object.keys(defaultKeybindings) as KeybindingAction[];
const events = new EventTarget();
let fallback: string | null = null;
let storageWriteFailed = false;
const validBinding = (value: unknown): value is string => typeof value === 'string'
  && /^(Ctrl\+)?(Alt\+)?(Shift\+)?(Meta\+)?([A-Z0-9]|F([1-9]|1[0-2])|Space|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown|Insert|Delete|Backspace)$/.test(value);
const scope = (action: KeybindingAction): string => action.startsWith('thought') ? 'thought' : 'game';
export const findKeybindingConflict = (bindings: Keybindings, action: KeybindingAction, key: string): KeybindingAction | undefined =>
  keybindingActions.find((other) => other !== action && scope(other) === scope(action) && bindings[other] === key);
const readStored = (): string | null => {
  if (storageWriteFailed) return fallback;
  try { return globalThis.localStorage ? globalThis.localStorage.getItem(KEYBINDINGS_STORAGE_KEY) : fallback; }
  catch { return fallback; }
};
export const parseKeybindings = (raw: string | null): Keybindings => {
  const bindings: Keybindings = { ...defaultKeybindings };
  try {
    const saved: unknown = JSON.parse(raw ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return bindings;
    for (const action of keybindingActions) {
      const value: unknown = (saved as Record<string, unknown>)[action];
      if (value === null || (validBinding(value) && !isReservedPageBinding(action, value))) bindings[action] = value;
    }
    for (const action of keybindingActions) {
      const key = bindings[action];
      if (key && findKeybindingConflict(bindings, action, key)) return { ...defaultKeybindings };
    }
  } catch { /* Invalid preferences fall back to defaults. */ }
  return bindings;
};
export const getKeybindings = (): Keybindings => parseKeybindings(readStored());
export const saveKeybindings = (bindings: Keybindings): void => {
  const value = JSON.stringify(bindings);
  fallback = value;
  try { globalThis.localStorage?.setItem(KEYBINDINGS_STORAGE_KEY, value); storageWriteFailed = false; }
  catch { storageWriteFailed = true; }
  events.dispatchEvent(new Event('change'));
};
const subscribe = (listener: () => void): (() => void) => {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === KEYBINDINGS_STORAGE_KEY || event.key === null) { fallback = null; storageWriteFailed = false; listener(); }
  };
  events.addEventListener('change', listener);
  globalThis.addEventListener?.('storage', onStorage);
  return () => {
    events.removeEventListener('change', listener);
    globalThis.removeEventListener?.('storage', onStorage);
  };
};
export const useKeybindings = (): Keybindings => parseKeybindings(useSyncExternalStore(subscribe, readStored, () => null));
type KeyEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>;
export const bindingFromEvent = (event: KeyEvent): string | null => {
  const key = event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const binding = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.metaKey ? 'Meta+' : ''}${key}`;
  return validBinding(binding) ? binding : null;
};
export const matchesKeybinding = (event: KeyEvent, binding: string | null): boolean => binding !== null && bindingFromEvent(event) === binding;
export const shouldIgnoreGameShortcut = (event: KeyboardEvent): boolean => event.defaultPrevented || event.repeat || event.isComposing
  || Boolean(document.querySelector('[aria-modal="true"]'))
  || (event.target instanceof Element && (Boolean(event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))
    || ((event.key === ' ' || event.key === 'Enter') && Boolean(event.target.closest('button, a')))));

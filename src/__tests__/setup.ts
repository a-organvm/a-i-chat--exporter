import { vi } from 'vitest';

vi.mock('vite-plugin-monkey/dist/client', () => ({
  GM_deleteValue: undefined,
  GM_getValue: undefined,
  GM_setValue: undefined,
  unsafeWindow: undefined,
}));

vi.stubGlobal('location', {
  href: 'https://chatgpt.com/c/test-chat',
  host: 'chatgpt.com',
  hostname: 'chatgpt.com',
  origin: 'https://chatgpt.com',
  pathname: '/c/test-chat',
});

// jsdom is not used (test environment is `node`), so modules that touch the DOM
// at import time — e.g. i18n.ts reading window.localStorage — need a stub.
vi.stubGlobal('window', {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
});

// Node < 21 has no global `navigator`; i18n.ts destructures navigator.language at
// import time, so the whole suite fails to load on the CI Node version without this.
vi.stubGlobal('navigator', {
  language: 'en-US',
  languages: ['en-US'],
  clipboard: { writeText: () => Promise.resolve() },
});

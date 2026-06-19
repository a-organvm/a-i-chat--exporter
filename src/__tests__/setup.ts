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

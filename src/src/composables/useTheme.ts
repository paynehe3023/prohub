import { computed, ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'prohub-theme';
const themeMode = ref<ThemeMode>('system');
const systemPrefersDark = ref(false);
let mediaQuery: MediaQueryList | null = null;
let initialized = false;

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function readStoredMode(): ThemeMode {
  if (!isBrowser()) return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  const legacyDark = window.localStorage.getItem('prohub-dark');
  if (legacyDark === 'true') return 'dark';
  if (legacyDark === 'false') return 'light';
  return 'system';
}

function resolveDark(mode = themeMode.value) {
  return mode === 'dark' || (mode === 'system' && systemPrefersDark.value);
}

export function applyTheme(mode = themeMode.value) {
  if (!isBrowser()) return;
  const dark = resolveDark(mode);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

function handleSystemThemeChange(event: MediaQueryListEvent) {
  systemPrefersDark.value = event.matches;
  if (themeMode.value === 'system') applyTheme();
}

export function initializeTheme() {
  if (!isBrowser()) return;
  themeMode.value = readStoredMode();
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = mediaQuery.matches;
  applyTheme();

  if (initialized) return;
  initialized = true;
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  } else {
    mediaQuery.addListener(handleSystemThemeChange);
  }
}

export function useTheme() {
  initializeTheme();

  const isDark = computed(() => resolveDark());
  const resolvedMode = computed(() => (isDark.value ? 'dark' : 'light'));

  function setTheme(mode: ThemeMode) {
    themeMode.value = mode;
    if (isBrowser()) window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyTheme(mode);
  }

  function cycleTheme() {
    const nextMode: ThemeMode = themeMode.value === 'system'
      ? 'light'
      : themeMode.value === 'light'
        ? 'dark'
        : 'system';
    setTheme(nextMode);
  }

  return {
    themeMode,
    isDark,
    resolvedMode,
    setTheme,
    cycleTheme,
    applyTheme,
  };
}

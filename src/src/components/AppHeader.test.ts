import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';

const notificationsResponse = {
  notifications: [
    { id: '1', title: '通知 1' },
    { id: '2', title: '通知 2' },
  ],
};

vi.mock('@tabler/icons-vue', () => ({
  IconSun: defineComponent({ name: 'IconSun', setup: () => () => h('svg') }),
  IconMoon: defineComponent({ name: 'IconMoon', setup: () => () => h('svg') }),
  IconX: defineComponent({ name: 'IconX', setup: () => () => h('svg') }),
  IconShieldCheck: defineComponent({ name: 'IconShieldCheck', setup: () => () => h('svg') }),
  IconBolt: defineComponent({ name: 'IconBolt', setup: () => () => h('svg') }),
  IconMail: defineComponent({ name: 'IconMail', setup: () => () => h('svg') }),
  IconCopy: defineComponent({ name: 'IconCopy', setup: () => () => h('svg') }),
  IconCheck: defineComponent({ name: 'IconCheck', setup: () => () => h('svg') }),
  IconSearch: defineComponent({ name: 'IconSearch', setup: () => () => h('svg') }),
  IconBell: defineComponent({ name: 'IconBell', setup: () => () => h('svg') }),
}));

vi.mock('../composables/useTheme', () => ({
  useTheme: () => ({
    isDark: ref(false),
    themeMode: ref('light'),
    cycleTheme: vi.fn(),
  }),
}));

vi.mock('../composables/useHideOnScroll', () => ({
  useHideOnScroll: () => ({ hidden: ref(false) }),
}));

vi.mock('../config/tools', () => ({ tools: [] }));

vi.mock('../config/api', () => ({
  apiConfig: { endpoints: { notifications: '/notifications' } },
  apiFetch: vi.fn(async () => notificationsResponse),
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    RouterLink: defineComponent({
      name: 'RouterLinkStub',
      props: { to: { type: [String, Object], required: true } },
      setup(_, { slots }) {
        return () => h('a', slots.default?.());
      },
    }),
  };
});

vi.mock('./FeedbackModal.vue', () => ({
  default: defineComponent({
    name: 'FeedbackModalStub',
    props: { open: { type: Boolean, default: false } },
    emits: ['update:open', 'submitted', 'copied'],
    setup(props) {
      return () => (props.open ? h('div', { 'data-feedback-modal': 'open' }) : null);
    },
  }),
}));

vi.mock('./DonateModal.vue', () => ({
  default: defineComponent({
    name: 'DonateModalStub',
    props: { open: { type: Boolean, default: false } },
    emits: ['update:open'],
    setup(props) {
      return () => (props.open ? h('div', { 'data-donate-modal': 'open' }) : null);
    },
  }),
}));

import AppHeader from './AppHeader.vue';
import { apiFetch } from '../config/api';

function installDomMocks() {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    configurable: true,
  });

  Object.defineProperty(window, 'dispatchEvent', {
    value: vi.fn(),
    configurable: true,
  });

  Object.defineProperty(window, 'addEventListener', {
    value: vi.fn(),
    configurable: true,
  });

  Object.defineProperty(window, 'removeEventListener', {
    value: vi.fn(),
    configurable: true,
  });

  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    configurable: true,
  });
}

describe('AppHeader notification badge', () => {
  beforeEach(() => {
    installDomMocks();
    vi.mocked(apiFetch).mockResolvedValue(notificationsResponse as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('初始会显示未读红点，并在通知已读后消失', async () => {
    const wrapper = mount(AppHeader, {
      attachTo: document.body,
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    await nextTick();
    await nextTick();

    expect(apiFetch).toHaveBeenCalledWith('/notifications');
    expect(wrapper.find('[aria-label="有新通知"]').exists()).toBe(true);

    window.localStorage.getItem = vi.fn(() => JSON.stringify(['1', '2']));
    await (wrapper.vm as unknown as { refreshNotificationReadState: () => void }).refreshNotificationReadState();
    await nextTick();

    expect(wrapper.find('[aria-label="有新通知"]').exists()).toBe(false);
  });
});
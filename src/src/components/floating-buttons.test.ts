import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import BgSwitcher from './BgSwitcher.vue';
import FloatingToolbar from './FloatingToolbar.vue';

vi.mock('@tabler/icons-vue', () => ({
  IconPhoto: defineComponent({ name: 'IconPhoto', setup: () => () => h('svg') }),
  IconCheck: defineComponent({ name: 'IconCheck', setup: () => () => h('svg') }),
  IconCoffee: defineComponent({ name: 'IconCoffee', setup: () => () => h('svg') }),
  IconMessageCircle: defineComponent({ name: 'IconMessageCircle', setup: () => () => h('svg') }),
  IconX: defineComponent({ name: 'IconX', setup: () => () => h('svg') }),
  IconLoader2: defineComponent({ name: 'IconLoader2', setup: () => () => h('svg') }),
  IconPaperclip: defineComponent({ name: 'IconPaperclip', setup: () => () => h('svg') }),
  IconSend: defineComponent({ name: 'IconSend', setup: () => () => h('svg') }),
  IconTrash: defineComponent({ name: 'IconTrash', setup: () => () => h('svg') }),
}));

vi.mock('../composables/useHideOnScroll', () => ({
  useHideOnScroll: () => ({ hidden: ref(false) }),
}));

vi.mock('./FeedbackModal.vue', () => ({
  default: defineComponent({
    name: 'FeedbackModalStub',
    props: { open: { type: Boolean, default: false } },
    emits: ['update:open', 'submitted', 'copied'],
    setup(props) {
      return () => props.open ? h('div', { 'data-feedback-modal': 'open' }) : null;
    },
  }),
}));

vi.mock('./DonateModal.vue', () => ({
  default: defineComponent({
    name: 'DonateModalStub',
    props: { open: { type: Boolean, default: false } },
    emits: ['update:open'],
    setup(props) {
      return () => props.open ? h('div', { 'data-donate-modal': 'open' }) : null;
    },
  }),
}));

function installDomMocks() {
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

  Object.defineProperty(window, 'fetch', {
    value: vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [] }),
    })),
    configurable: true,
  });

  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    configurable: true,
  });

  Object.defineProperty(window, 'setTimeout', {
    value: ((handler: TimerHandler, timeout?: number) => setTimeout(handler, timeout)) as typeof window.setTimeout,
    configurable: true,
  });

  Object.defineProperty(window, 'clearTimeout', {
    value: ((id: number | undefined) => clearTimeout(id)) as typeof window.clearTimeout,
    configurable: true,
  });

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    configurable: true,
  });

  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
  Object.defineProperty(document.documentElement, 'clientWidth', { value: 1440, configurable: true });
}

describe('floating buttons', () => {
  beforeEach(() => {
    installDomMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('BgSwitcher 使用统一的圆角毛玻璃胶囊样式', async () => {
    const wrapper = mount(BgSwitcher, {
      attachTo: document.body,
      global: {
        stubs: { Transition: false, Teleport: true },
      },
    });

    await nextTick();
    const button = wrapper.get('button[aria-label="换背景"]');
    expect(button.classes()).toEqual(expect.arrayContaining([
      'rounded-xl',
      'bg-white/80',
      'backdrop-blur-md',
      'inline-flex',
    ]));

    await button.trigger('click');
    await nextTick();
    expect(wrapper.find('.liquid-glass').exists()).toBe(true);
  });

  it('FloatingToolbar 的反馈和赞赏按钮使用统一样式并能打开弹窗', async () => {
    const wrapper = mount(FloatingToolbar, {
      attachTo: document.body,
      global: {
        stubs: { Transition: false, Teleport: true },
      },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.classes()).toEqual(expect.arrayContaining([
        'rounded-xl',
        'bg-white/80',
        'backdrop-blur-md',
        'inline-flex',
      ]));
    }

    await buttons[0].trigger('click');
    await nextTick();
    expect(wrapper.find('[data-feedback-modal="open"]').exists()).toBe(true);

    await buttons[1].trigger('click');
    await nextTick();
    expect(wrapper.find('[data-donate-modal="open"]').exists()).toBe(true);
  });
});
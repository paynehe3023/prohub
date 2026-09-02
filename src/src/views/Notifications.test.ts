import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';

const notificationsResponse = {
  notifications: [
    { id: '1', title: '通知 1', content: '内容 1', level: 'info', createdAt: '2026-09-02T00:00:00.000Z' },
    { id: '2', title: '通知 2', content: '内容 2', level: 'warning', createdAt: '2026-09-02T01:00:00.000Z' },
  ],
};

vi.mock('@tabler/icons-vue', () => ({
  IconBellOff: defineComponent({ name: 'IconBellOff', setup: () => () => h('svg') }),
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ params: {} }),
  };
});

vi.mock('../config/api', () => ({
  apiConfig: { endpoints: { notifications: '/notifications' } },
  apiFetch: vi.fn(async () => notificationsResponse),
}));

import Notifications from './Notifications.vue';
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

describe('Notifications.vue', () => {
  beforeEach(() => {
    installDomMocks();
    vi.mocked(apiFetch).mockResolvedValue(notificationsResponse as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('加载通知后会计算未读数，并支持一键已读', async () => {
    const wrapper = mount(Notifications, {
      attachTo: document.body,
      global: { stubs: { IconBellOff: true } },
    });

    await nextTick();
    await nextTick();

    expect(apiFetch).toHaveBeenCalledWith('/notifications');
    expect(wrapper.text()).toContain('一键已读（2）');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('prohub-notifications-read', JSON.stringify([]));

    await wrapper.get('button').trigger('click');
    await nextTick();

    expect(window.localStorage.setItem).toHaveBeenCalledWith('prohub-notifications-read', JSON.stringify(['1', '2']));
    expect(window.dispatchEvent).toHaveBeenCalled();
  });

  it('点击单条通知会写入已读集合并打开详情', async () => {
    const wrapper = mount(Notifications, {
      attachTo: document.body,
      global: { stubs: { IconBellOff: true } },
    });

    await nextTick();
    await nextTick();

    await wrapper.get('article').trigger('click');
    await nextTick();

    expect(window.localStorage.setItem).toHaveBeenCalledWith('prohub-notifications-read', expect.stringContaining('1'));
    expect(wrapper.text()).toContain('返回通知列表');
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
});
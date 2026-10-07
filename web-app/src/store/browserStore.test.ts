import { beforeEach, describe, expect, it } from 'vitest';
import { useBrowserStore } from './browserStore';

const initial = useBrowserStore.getState();
const store = () => useBrowserStore.getState();
const urls = () => store().tabs.map(t => t.url);

beforeEach(() => {
  localStorage.clear();
  useBrowserStore.setState(initial, true);
});

describe('opening and closing tabs', () => {
  it('opens a tab at the end and makes it active', () => {
    store().openTab('https://a.test/');
    const tab = store().tabs.at(-1);
    expect(tab?.url).toBe('https://a.test/');
    expect(store().activeTabId).toBe(tab?.id);
  });

  it('opens a new-tab page by default', () => {
    store().openTab();
    expect(store().tabs.at(-1)?.url).toBe('about:newtab');
  });

  it('inherits incognito from the active tab unless told otherwise', () => {
    store().openIncognito('https://private.test/');
    store().openTab('https://next.test/');
    expect(store().tabs.at(-1)?.isIncognito).toBe(true);
    store().openTab('https://public.test/', false);
    expect(store().tabs.at(-1)?.isIncognito).toBe(false);
  });

  it('activates the tab that takes the closed one\'s place', () => {
    store().openTab('https://a.test/');
    store().openTab('https://b.test/');
    store().openTab('https://c.test/');
    const [, a, b, c] = store().tabs;
    store().setActiveTab(b.id);
    store().closeTab(b.id);
    expect(store().activeTabId).toBe(c.id);
    store().closeTab(c.id);
    expect(store().activeTabId).toBe(a.id);
  });

  it('keeps the active tab when a background tab closes', () => {
    store().openTab('https://a.test/');
    store().openTab('https://b.test/');
    const [first, , b] = store().tabs;
    store().closeTab(first.id);
    expect(store().activeTabId).toBe(b.id);
  });

  it('replaces the last tab with a new-tab page instead of leaving none', () => {
    const [only] = store().tabs;
    store().closeTab(only.id);
    expect(urls()).toEqual(['about:newtab']);
    expect(store().activeTabId).toBe(store().tabs[0].id);
    expect(store().tabs[0].id).not.toBe(only.id);
  });

  it('ignores an unknown id', () => {
    store().closeTab('missing');
    expect(store().tabs).toHaveLength(1);
    expect(store().recentlyClosed).toHaveLength(0);
  });

  it('remembers at most 20 closed tabs, newest first', () => {
    for (let i = 0; i < 22; i++) {
      store().openTab(`https://t${i}.test/`);
      store().closeTab(store().tabs.at(-1)!.id);
    }
    expect(store().recentlyClosed).toHaveLength(20);
    expect(store().recentlyClosed[0].url).toBe('https://t21.test/');
    expect(store().recentlyClosed[19].url).toBe('https://t2.test/');
  });

  it('reopens the most recently closed tab', () => {
    store().openTab('https://gone.test/');
    store().closeTab(store().tabs.at(-1)!.id);
    store().reopenLastClosed();
    expect(store().tabs.at(-1)?.url).toBe('https://gone.test/');
    expect(store().activeTabId).toBe(store().tabs.at(-1)?.id);
    expect(store().recentlyClosed).toHaveLength(0);
    store().reopenLastClosed();
    expect(store().tabs).toHaveLength(2);
  });

  it('closes every other tab and keeps the chosen one active', () => {
    store().openTab('https://a.test/');
    store().openTab('https://b.test/');
    const keep = store().tabs[1];
    store().closeOtherTabs(keep.id);
    expect(urls()).toEqual(['https://a.test/']);
    expect(store().activeTabId).toBe(keep.id);
    expect(store().recentlyClosed.map(r => r.url)).toEqual(['about:newtab', 'https://b.test/']);
  });

  it('closes all tabs down to one new-tab page', () => {
    store().openTab('https://a.test/');
    store().closeAllTabs();
    expect(urls()).toEqual(['about:newtab']);
    expect(store().recentlyClosed).toHaveLength(2);
  });
});

describe('moving, duplicating and pinning', () => {
  beforeEach(() => {
    store().closeAllTabs();
    store().navigateTo('https://a.test/');
    store().openTab('https://b.test/');
    store().openTab('https://c.test/');
  });

  it('moves a tab to the drop target\'s index', () => {
    const [a, , c] = store().tabs;
    store().moveTab(c.id, 0);
    expect(urls()).toEqual(['https://c.test/', 'https://a.test/', 'https://b.test/']);
    store().moveTab(a.id, 2);
    expect(urls()).toEqual(['https://c.test/', 'https://b.test/', 'https://a.test/']);
  });

  it('does nothing when moving an unknown tab', () => {
    store().moveTab('missing', 0);
    expect(urls()).toEqual(['https://a.test/', 'https://b.test/', 'https://c.test/']);
  });

  it('duplicates a tab next to the original and activates the copy', () => {
    const a = store().tabs[0];
    store().duplicateTab(a.id);
    expect(urls()).toEqual(['https://a.test/', 'https://a.test/', 'https://b.test/', 'https://c.test/']);
    expect(store().activeTabId).toBe(store().tabs[1].id);
    expect(store().tabs[1].id).not.toBe(a.id);
  });

  it('toggles pin and mute', () => {
    const a = store().tabs[0];
    store().pinTab(a.id);
    store().muteTab(a.id);
    expect(store().tabs[0]).toMatchObject({ isPinned: true, isMuted: true });
    store().pinTab(a.id);
    expect(store().tabs[0].isPinned).toBe(false);
  });
});

describe('navigation history', () => {
  it('records navigation and walks back and forward', () => {
    const id = store().tabs[0].id;
    store().navigateTo('https://one.test/', id);
    store().navigateTo('http://two.test/', id);
    let tab = store().tabs[0];
    expect(tab).toMatchObject({ url: 'http://two.test/', canGoBack: true, canGoForward: false, securityLevel: 'warning' });

    store().goBack(id);
    tab = store().tabs[0];
    expect(tab).toMatchObject({ url: 'https://one.test/', canGoBack: true, canGoForward: true });

    store().goForward(id);
    expect(store().tabs[0].url).toBe('http://two.test/');
  });

  it('drops the forward history when navigating from the middle', () => {
    const id = store().tabs[0].id;
    store().navigateTo('https://one.test/', id);
    store().navigateTo('https://two.test/', id);
    store().goBack(id);
    store().navigateTo('https://three.test/', id);
    expect(store().tabs[0].history).toEqual(['about:newtab', 'https://one.test/', 'https://three.test/']);
    expect(store().tabs[0].canGoForward).toBe(false);
  });

  it('stops at either end of the history', () => {
    const id = store().tabs[0].id;
    store().goBack(id);
    expect(store().tabs[0].historyIndex).toBe(0);
    store().navigateTo('https://one.test/', id);
    store().goForward(id);
    expect(store().tabs[0].historyIndex).toBe(1);
  });
});

describe('search URL', () => {
  it('uses the chosen engine and encodes the query', () => {
    store().updateSettings({ searchEngine: 'duckduckgo' });
    expect(store().getSearchUrl('a b&c')).toBe(`${store().getSearchEngines().duckduckgo.url}a%20b%26c`);
  });

  it('uses the custom URL when the custom engine is chosen', () => {
    store().updateSettings({ searchEngine: 'custom', customSearchUrl: 'https://search.test/?q=' });
    expect(store().getSearchUrl('x')).toBe('https://search.test/?q=x');
  });
});

describe('persistence', () => {
  it('saves settings and pinned sites, not open tabs', () => {
    store().updateSettings({ searchEngine: 'brave' });
    store().openTab('https://secret.test/');
    const saved = JSON.parse(localStorage.getItem('ebrowser-settings') ?? '{}');
    expect(saved.state.settings.searchEngine).toBe('brave');
    expect(saved.state.pinnedSites).toBeDefined();
    expect(saved.state.tabs).toBeUndefined();
  });
});

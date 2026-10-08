import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Toolbar from './Toolbar';
import { useBrowserStore } from '@/store/browserStore';

vi.mock('@/utils/database', () => ({
  bookmarkDB: { isBookmarked: async () => false, search: async () => [] },
  historyDB: {
    getRecent: async () => [],
    search: async () => [{ url: 'https://docs.example.com/guide', title: 'Guide', visitCount: 3 }],
  },
}));

const initial = useBrowserStore.getState();
const history = () => useBrowserStore.getState().getActiveTab()?.history ?? [];

beforeEach(() => {
  localStorage.clear();
  useBrowserStore.setState(initial, true);
});

async function typeIntoAddressBar(value: string) {
  render(<Toolbar />);
  const input = document.getElementById('address-bar-input') as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  return input;
}

describe('Enter in the address bar', () => {
  it('navigates once, to the highlighted suggestion, when suggestions are showing', async () => {
    const input = await typeIntoAddressBar('guide');
    await screen.findByText('Guide');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(history()).toEqual(['about:newtab', 'https://docs.example.com/guide']);
  });

  it('navigates once, to what was typed, before suggestions have loaded', async () => {
    const input = await typeIntoAddressBar('example.com');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(history()).toEqual(['about:newtab', 'https://example.com/']);
  });
});

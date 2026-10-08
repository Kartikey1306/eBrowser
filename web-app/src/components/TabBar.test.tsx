import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TabBar from './TabBar';
import { useBrowserStore } from '@/store/browserStore';

const initial = useBrowserStore.getState();
const store = () => useBrowserStore.getState();
const titles = () => store().tabs.map(t => t.title);

beforeEach(() => {
  localStorage.clear();
  useBrowserStore.setState(initial, true);
  store().closeAllTabs();
  store().updateTab(store().tabs[0].id, { title: 'A' });
  for (const title of ['B', 'C']) {
    store().openTab(`https://${title.toLowerCase()}.test/`);
    store().updateTab(store().tabs.at(-1)!.id, { title });
  }
});

const tab = (title: string) => {
  const el = screen.getAllByRole('tab').find(t => t.getAttribute('title') === title);
  if (!el) throw new Error(`no tab titled ${title}`);
  return el;
};

const dataTransfer = () => ({ dataTransfer: { effectAllowed: '', dropEffect: '' } });

function dragTab(from: string, onto: string) {
  fireEvent.dragStart(tab(from), dataTransfer());
  fireEvent.dragOver(tab(onto), dataTransfer());
  fireEvent.drop(tab(onto), dataTransfer());
  fireEvent.dragEnd(tab(from), dataTransfer());
}

describe('tab drag and drop', () => {
  it('makes every tab draggable', () => {
    render(<TabBar />);
    for (const title of ['A', 'B', 'C']) expect(tab(title)).toHaveAttribute('draggable', 'true');
  });

  it('moves a tab to the position of the tab it is dropped on', () => {
    render(<TabBar />);
    dragTab('C', 'A');
    expect(titles()).toEqual(['C', 'A', 'B']);
    dragTab('C', 'B');
    expect(titles()).toEqual(['A', 'B', 'C']);
  });

  it('uses a pinned tab\'s place in the tab list, not its place among pinned tabs', () => {
    store().pinTab(store().tabs[2].id);
    render(<TabBar />);
    dragTab('A', 'C');
    expect(titles()).toEqual(['B', 'C', 'A']);
  });

  it('clears the drop highlight when the drag ends', () => {
    render(<TabBar />);
    fireEvent.dragStart(tab('A'), dataTransfer());
    fireEvent.dragOver(tab('B'), dataTransfer());
    expect(tab('B').className).toContain('ring-2');
    fireEvent.dragEnd(tab('A'), dataTransfer());
    expect(tab('B').className).not.toContain('ring-2');
  });
});

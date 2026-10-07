import { describe, expect, it } from 'vitest';
import {
  cleanTrackingParams,
  extractPageTitle,
  formatDisplayUrl,
  formatURL,
  getDomain,
  getFaviconUrl,
  getInternalPageName,
  getReadableFileSize,
  getSecurityLevel,
  INTERNAL_PAGES,
  isBlockedDomain,
  isInternalPage,
  isSearchQuery,
  isValidURL,
  normalizeInput,
  parseURL,
  resolveRelativeURL,
} from './url';

describe('parseURL', () => {
  it('splits an https URL and marks it secure', () => {
    const parsed = parseURL('https://docs.example.com:8443/a/b?x=1#top');
    expect(parsed).toMatchObject({
      protocol: 'https:',
      hostname: 'docs.example.com',
      port: '8443',
      pathname: '/a/b',
      search: '?x=1',
      hash: '#top',
      isInternal: false,
      isSecure: true,
      domain: 'example.com',
      displayUrl: 'docs.example.com:8443/a/b?x=1#top',
    });
    expect(parsed?.faviconUrl).toBe('https://www.google.com/s2/favicons?domain=docs.example.com&sz=32');
  });

  it('treats plain http as not secure', () => {
    expect(parseURL('http://example.com/')?.isSecure).toBe(false);
  });

  it('treats internal pages as internal and secure, with no favicon request', () => {
    const parsed = parseURL('about:newtab');
    expect(parsed?.isInternal).toBe(true);
    expect(parsed?.isSecure).toBe(true);
    expect(parsed?.faviconUrl).toBe('');
  });

  it('returns null for input that is not a URL', () => {
    expect(parseURL('not a url')).toBeNull();
    expect(parseURL('')).toBeNull();
  });
});

describe('formatDisplayUrl', () => {
  it('drops the scheme and a bare root path', () => {
    expect(formatDisplayUrl(new URL('https://example.com/'))).toBe('example.com');
  });

  it('keeps port, path, query and fragment', () => {
    expect(formatDisplayUrl(new URL('http://example.com:8080/p?q=1#h'))).toBe('example.com:8080/p?q=1#h');
  });
});

describe('normalizeInput', () => {
  it('opens a new tab for empty or blank input', () => {
    expect(normalizeInput('')).toBe('about:newtab');
    expect(normalizeInput('   ')).toBe('about:newtab');
  });

  it('passes internal and data URLs through unchanged', () => {
    expect(normalizeInput('about:blank')).toBe('about:blank');
    expect(normalizeInput('ebrowser://settings')).toBe('ebrowser://settings');
    expect(normalizeInput('data:text/plain,hi')).toBe('data:text/plain,hi');
  });

  it('keeps a full URL, normalised by the URL parser', () => {
    expect(normalizeInput('  https://Example.com/Path  ')).toBe('https://example.com/Path');
    expect(normalizeInput('http://example.com')).toBe('http://example.com/');
  });

  it('adds https to something that looks like a domain', () => {
    expect(normalizeInput('example.com')).toBe('https://example.com/');
    expect(normalizeInput('example.com/a?b=c')).toBe('https://example.com/a?b=c');
  });

  it('searches for anything with a space, and encodes the query', () => {
    expect(normalizeInput('what is 2.5 & 3')).toBe('https://www.google.com/search?q=what%20is%202.5%20%26%203');
  });

  it('searches for a single word and for a leading dot', () => {
    expect(normalizeInput('weather')).toBe('https://www.google.com/search?q=weather');
    expect(normalizeInput('.hidden')).toBe('https://www.google.com/search?q=.hidden');
  });
});

describe('isSearchQuery', () => {
  it('is true for text with spaces or without a dotted host', () => {
    expect(isSearchQuery('hello world')).toBe(true);
    expect(isSearchQuery('weather')).toBe(true);
  });

  it('is false for internal pages and domains', () => {
    expect(isSearchQuery('about:blank')).toBe(false);
    expect(isSearchQuery('ebrowser://history')).toBe(false);
    expect(isSearchQuery('example.com')).toBe(false);
    expect(isSearchQuery('https://example.com/x')).toBe(false);
  });
});

describe('getSecurityLevel', () => {
  it('grades by scheme', () => {
    expect(getSecurityLevel('https://example.com')).toBe('secure');
    expect(getSecurityLevel('http://example.com')).toBe('warning');
    expect(getSecurityLevel('about:newtab')).toBe('local');
    expect(getSecurityLevel('ebrowser://settings')).toBe('local');
    expect(getSecurityLevel('chrome-extension://abc/page.html')).toBe('extension');
    expect(getSecurityLevel('moz-extension://abc/page.html')).toBe('extension');
    expect(getSecurityLevel('file:///etc/hosts')).toBe('local');
  });

  it('is local for empty or unparseable input', () => {
    expect(getSecurityLevel('')).toBe('local');
    expect(getSecurityLevel('not a url')).toBe('local');
  });
});

describe('getDomain', () => {
  it('returns the hostname, or the input when it is not a URL', () => {
    expect(getDomain('https://sub.example.com/x')).toBe('sub.example.com');
    expect(getDomain('nonsense')).toBe('nonsense');
  });
});

describe('getFaviconUrl', () => {
  it('builds a favicon URL for http(s) pages only', () => {
    expect(getFaviconUrl('https://example.com/a')).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
    expect(getFaviconUrl('http://example.com', 64)).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64');
    expect(getFaviconUrl('about:blank')).toBe('');
    expect(getFaviconUrl('not a url')).toBe('');
  });
});

describe('cleanTrackingParams', () => {
  it('removes tracking parameters in any case and keeps the rest', () => {
    const cleaned = cleanTrackingParams('https://example.com/p?id=7&utm_source=x&UTM_Medium=y&fbclid=z&q=keep');
    expect(cleaned).toBe('https://example.com/p?id=7&q=keep');
  });

  it('leaves a URL without tracking parameters alone', () => {
    expect(cleanTrackingParams('https://example.com/p?id=7')).toBe('https://example.com/p?id=7');
  });

  it('returns unparseable input unchanged', () => {
    expect(cleanTrackingParams('not a url')).toBe('not a url');
  });
});

describe('isBlockedDomain', () => {
  const blocklist = ['*.tracker.test', 'ads.example.com'];

  it('matches a wildcard entry on the apex and on subdomains', () => {
    expect(isBlockedDomain('tracker.test', blocklist)).toBe(true);
    expect(isBlockedDomain('a.b.tracker.test', blocklist)).toBe(true);
  });

  it('does not match a lookalike that only shares a suffix', () => {
    expect(isBlockedDomain('eviltracker.test', blocklist)).toBe(false);
  });

  it('matches a plain entry exactly, and not its subdomains', () => {
    expect(isBlockedDomain('ads.example.com', blocklist)).toBe(true);
    expect(isBlockedDomain('x.ads.example.com', blocklist)).toBe(false);
    expect(isBlockedDomain('example.com', blocklist)).toBe(false);
  });

  it('blocks nothing with an empty list', () => {
    expect(isBlockedDomain('tracker.test', [])).toBe(false);
  });
});

describe('extractPageTitle', () => {
  it('reads and trims the title element', () => {
    expect(extractPageTitle('<html><head><TITLE lang="en">  Hello  </TITLE></head></html>')).toBe('Hello');
  });

  it('is empty when there is no title', () => {
    expect(extractPageTitle('<html></html>')).toBe('');
  });
});

describe('isValidURL and resolveRelativeURL', () => {
  it('validates with the URL parser', () => {
    expect(isValidURL('https://example.com')).toBe(true);
    expect(isValidURL('example.com')).toBe(false);
  });

  it('resolves against a base, and returns the input when the base is bad', () => {
    expect(resolveRelativeURL('https://example.com/a/b', '../c')).toBe('https://example.com/c');
    expect(resolveRelativeURL('not a base', 'c')).toBe('c');
  });
});

describe('getReadableFileSize', () => {
  it('formats bytes with binary units and one decimal', () => {
    expect(getReadableFileSize(0)).toBe('0 B');
    expect(getReadableFileSize(1023)).toBe('1023 B');
    expect(getReadableFileSize(1024)).toBe('1 KB');
    expect(getReadableFileSize(1536)).toBe('1.5 KB');
    expect(getReadableFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('formatURL', () => {
  it('shows host and path without the scheme or a bare root', () => {
    expect(formatURL('https://example.com/')).toBe('example.com');
    expect(formatURL('https://example.com/docs?x=1')).toBe('example.com/docs');
    expect(formatURL('plain text')).toBe('plain text');
  });
});

describe('internal pages', () => {
  it('recognises internal schemes', () => {
    expect(isInternalPage(INTERNAL_PAGES.NEWTAB)).toBe(true);
    expect(isInternalPage(INTERNAL_PAGES.SETTINGS)).toBe(true);
    expect(isInternalPage('chrome://flags')).toBe(true);
    expect(isInternalPage('https://example.com')).toBe(false);
  });

  it('names internal pages for display', () => {
    expect(getInternalPageName(INTERNAL_PAGES.NEWTAB)).toBe('New Tab');
    expect(getInternalPageName(INTERNAL_PAGES.HOME)).toBe('New Tab');
    expect(getInternalPageName(INTERNAL_PAGES.BLANK)).toBe('Blank');
    expect(getInternalPageName(INTERNAL_PAGES.READING_LIST)).toBe('Reading List');
    expect(getInternalPageName('https://example.com')).toBe('https://example.com');
  });
});

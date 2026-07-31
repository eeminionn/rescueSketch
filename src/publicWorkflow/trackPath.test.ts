import {
  assertSafeTrackPath,
  createCommunityTrackPath,
  sanitizeGitHubLogin,
  sanitizeTrackSlug,
} from './trackPath';

describe('public track path safety', () => {
  it('creates stable, ASCII, namespaced community paths', () => {
    const path = createCommunityTrackPath({
      githubLogin: 'Mentor Ñandú',
      githubId: 12345,
      slug: 'Final / Rescue Line 2026',
      shortId: 'a1b2c3d4',
    });
    expect(path).toBe(
      'communityTracks/mentor-nandu-12345/final-rescue-line-2026-a1b2c3d4/track.json',
    );
    expect(() => assertSafeTrackPath(path)).not.toThrow();
  });

  it('uses safe fallbacks and rejects traversal or malformed identifiers', () => {
    expect(sanitizeGitHubLogin('!!!')).toBe('user');
    expect(sanitizeTrackSlug('///')).toBe('track');
    expect(() =>
      createCommunityTrackPath({ githubLogin: 'x', githubId: 0, slug: 'x', shortId: 'abcd' }),
    ).toThrow();
    expect(() =>
      createCommunityTrackPath({ githubLogin: 'x', githubId: 1, slug: 'x', shortId: '../bad' }),
    ).toThrow();
    expect(() => assertSafeTrackPath('communityTracks/a-1/../track.json')).toThrow();
  });
});

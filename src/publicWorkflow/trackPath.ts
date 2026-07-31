const fallbackSegment = 'track';

function normalizeSegment(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48);
  return normalized.length > 0 ? normalized : fallback;
}

export function sanitizeGitHubLogin(login: string): string {
  return normalizeSegment(login, 'user');
}

export function sanitizeTrackSlug(slug: string): string {
  return normalizeSegment(slug, fallbackSegment);
}

export function createCommunityTrackPath(input: {
  githubLogin: string;
  githubId: number;
  slug: string;
  shortId: string;
}): string {
  if (!Number.isSafeInteger(input.githubId) || input.githubId < 1) {
    throw new RangeError('githubId must be a positive safe integer.');
  }
  if (!/^[a-zA-Z0-9]{4,32}$/u.test(input.shortId)) {
    throw new RangeError('shortId must contain 4-32 ASCII letters or digits.');
  }
  return `communityTracks/${sanitizeGitHubLogin(input.githubLogin)}-${input.githubId}/${sanitizeTrackSlug(input.slug)}-${input.shortId}/track.json`;
}

export function assertSafeTrackPath(path: string): void {
  if (
    path.includes('\\') ||
    path.includes('..') ||
    path.startsWith('/') ||
    !/^communityTracks\/[a-z0-9-]+-\d+\/[a-z0-9-]+-[a-zA-Z0-9]{4,32}\/track\.json$/u.test(path)
  ) {
    throw new RangeError('Track path is outside the RescueSketch communityTracks namespace.');
  }
}

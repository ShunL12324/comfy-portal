import { REFRESH_ARTWORKS } from '../../../../assets/illustrations/refresh-artworks';

// One shuffle bag is shared by every refresh surface, including across navigation.
export function createArtworkCycle(count: number, random: () => number = Math.random) {
  let remaining: number[] = [];
  let previous = -1;
  return () => {
    if (count < 1) throw new Error('Refresh gallery must contain an artwork');
    if (!remaining.length) remaining = Array.from({ length: count }, (_, i) => i);
    const candidates = remaining.filter(index => count === 1 || index !== previous);
    const index = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    remaining.splice(remaining.indexOf(index), 1);
    previous = index;
    return index;
  };
}
export const nextRefreshArtwork = createArtworkCycle(REFRESH_ARTWORKS.length);

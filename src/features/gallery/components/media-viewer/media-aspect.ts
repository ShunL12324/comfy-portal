/**
 * Width / height of media already decoded somewhere in the app, by URI. Grid
 * tiles and viewer pages report what they load, so the viewer can size its
 * opening and closing transitions before its own page has loaded.
 */
const aspects = new Map<string, number>();

export function rememberAspect(uri: string, width: number, height: number) {
  if (width > 0 && height > 0) aspects.set(uri, width / height);
}

export function knownAspect(uri: string): number | undefined {
  return aspects.get(uri);
}

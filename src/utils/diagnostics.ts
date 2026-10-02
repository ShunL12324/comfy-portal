/**
 * Timestamped diagnostic trail for hard-to-reproduce runtime problems, such as
 * generation progress going quiet. Dev builds print each line to the Metro
 * console (`[cp:scope] hh:mm:ss.mmm event {data}`); every build keeps the
 * most recent lines in memory so they can be exported later.
 */
const MAX_LINES = 1000;
const lines: string[] = [];

export function diag(scope: string, event: string, data?: Record<string, unknown>) {
  const time = new Date().toISOString().slice(11, 23);
  const line = `[cp:${scope}] ${time} ${event}${data ? ` ${JSON.stringify(data)}` : ''}`;
  lines.push(line);
  if (lines.length > MAX_LINES) lines.shift();
  if (__DEV__) console.log(line);
}

/** The retained trail, oldest first. */
export function diagnosticsText(): string {
  return lines.join('\n');
}

/** Hides credentials in URLs before they are logged. */
export function redactUrl(url: string): string {
  return url.replace(/([?&]token=)[^&]*/i, '$1***');
}

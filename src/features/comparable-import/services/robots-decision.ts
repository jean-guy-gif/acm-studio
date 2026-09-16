import { BOT_TOKEN, parseRobots } from '@/features/comparable-import/utils/robots-policy';

// Decides, from a robots.txt READ BY THE EXTENSION (the advisor's browser, same
// address the pages are fetched from), whether a listing path may be requested.
// Pure and environment-agnostic — the policy lives in the app, never the extension.
//
// Status handling follows RFC 9309 §2.3.1 ("Access Results"):
//   - 2xx → parse the file and obey it;
//   - 4xx → "Unavailable Status": there is effectively no robots.txt, so the robot
//           MAY access the resources → ALLOWED. 401, 403, 404 and 410 all land here
//           (a portal answering 403 to robots.txt — Maisons et Appartements does —
//           must NOT block the whole portal);
//   - 5xx → "Unreachable Status": the robot MUST assume a complete disallow →
//           REFUSED; a failed read (no status at all) is treated the same way;
//   - 429 → NOT an unavailability but "Too Many Requests" — a request to slow down.
//           We listen and back off rather than read it as "crawl freely" → REFUSED.
//           (Deliberate deviation from the plain 4xx rule, for the one 4xx that asks
//           us to wait.)

export type RobotsSource = { ok: true; status: number; text: string } | { ok: false };

export function decideRobotsAllowed(source: RobotsSource, path: string): boolean {
  if (!source.ok) {
    return false; // read failed → unreachable → refused
  }
  const { status } = source;
  if (status >= 200 && status <= 299) {
    return parseRobots(source.text, BOT_TOKEN).isAllowed(path);
  }
  if (status === 429) {
    return false; // Too Many Requests: back off, never conclude "crawl freely"
  }
  if (status >= 400 && status <= 499) {
    return true; // RFC 9309 §2.3.1: an unavailable robots.txt → allowed
  }
  return false; // 5xx (unreachable), and anything unexpected → refused
}

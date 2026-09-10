import { BOT_TOKEN, parseRobots } from '@/features/comparable-import/utils/robots-policy';

// Decides, from a robots.txt READ BY THE EXTENSION (the advisor's browser, same
// address the pages are fetched from), whether a listing path may be requested.
// Pure and environment-agnostic — the policy lives in the app, never the extension.
//
// The distinction the mission insists on: a genuine 404 means "no robots.txt" and
// fail-OPENS (protocol); a REFUSED read (403/429/5xx, or a failed fetch) is NOT a
// 404 — when the extension is available and the read is blocked, we must NOT
// conclude "allowed". Fail-open on a block would silently re-open the very door
// robots is meant to keep the tool honest about.

export type RobotsSource = { ok: true; status: number; text: string } | { ok: false };

// robots.txt is "absent" for these statuses → allowed (the protocol default).
const ABSENT_STATUSES = new Set([404, 410]);

export function decideRobotsAllowed(source: RobotsSource, path: string): boolean {
  if (!source.ok) {
    return false; // the read itself failed / was blocked → do not conclude allowed
  }
  if (source.status === 200) {
    return parseRobots(source.text, BOT_TOKEN).isAllowed(path);
  }
  if (ABSENT_STATUSES.has(source.status)) {
    return true; // no robots.txt → allowed
  }
  return false; // 401 / 403 / 429 / 5xx … → a refusal, not an absence → not allowed
}

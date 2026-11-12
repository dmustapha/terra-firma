// File: web/lib/concurrency.ts
// Process-wide admission control for expensive server work (Hindsight card builds, SSE streams).
import "server-only";

/** Thrown when a limiter is full and its wait queue is full: map to 503 + Retry-After. */
export class Busy extends Error {
  constructor(public retryAfter: number) {
    super("busy");
  }
}

/**
 * At most `max` holders at once; up to `queueMax` callers wait (FIFO) for a slot, everyone after that is refused
 * with Busy. queueMax 0 means "refuse immediately when full".
 */
export function createLimiter(max: number, queueMax: number, retryAfter = 5) {
  let active = 0;
  const waiting: (() => void)[] = [];
  const release = () => {
    const next = waiting.shift();
    if (next) next(); // hand the slot over directly; `active` is unchanged
    else active--;
  };
  const waitForSlot = (waitMs?: number) =>
    new Promise<void>((resolve, reject) => {
      const timer =
        waitMs == null
          ? undefined
          : setTimeout(() => {
              const i = waiting.indexOf(grant);
              if (i >= 0) waiting.splice(i, 1); // not handed a slot yet: leave the queue, slot accounting untouched
              reject(new Busy(retryAfter));
            }, waitMs);
      const grant = () => {
        clearTimeout(timer);
        resolve();
      };
      waiting.push(grant);
    });
  return {
    get active() {
      return active;
    },
    get queued() {
      return waiting.length;
    },
    /**
     * Resolves with a release function once a slot is held; release exactly once. With `waitMs`, a queued caller that
     * has not been handed a slot in time leaves the queue and gets Busy, so it fails fast (503) instead of riding into
     * the platform's function timeout (504).
     */
    async acquire(waitMs?: number): Promise<() => void> {
      if (active < max) active++;
      else if (waiting.length < queueMax) await waitForSlot(waitMs);
      else throw new Busy(retryAfter);
      let done = false;
      return () => {
        if (done) return;
        done = true;
        release();
      };
    },
  };
}

/** Global cap on concurrent /api/stream connections (each holds an upstream socket or poller for up to 55 s). */
export const streamSlots = createLimiter(20, 0, 10);

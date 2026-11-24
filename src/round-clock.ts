// Absolute deadline: background tabs and delayed callbacks never grant extra time.
export class RoundClock {
  private deadline: number | null = null;
  start(seconds: number | null, now = Date.now()) { this.deadline = seconds === null ? null : now + seconds * 1000; }
  stop() { this.deadline = null; }
  remaining(now = Date.now()) { return this.deadline === null ? null : Math.max(0, Math.ceil((this.deadline - now) / 1000)); }
  expired(now = Date.now()) { return this.deadline !== null && now >= this.deadline; }
}

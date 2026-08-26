import { env } from "@/src/env.mjs";
import { PostHog } from "posthog-node";

// No default phone-home target: server-side analytics/telemetry only go somewhere
// if the operator explicitly sets NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST
// (their own PostHog). Empty fallbacks -> apiKey/host resolve falsy -> client stays null.
const FALLBACK_POSTHOG_KEY = "";
const FALLBACK_POSTHOG_HOST = "";

export class ServerPosthog {
  private posthog: PostHog | null;

  constructor() {
    const telemetryEnabled = env.TELEMETRY_ENABLED !== "false";

    const apiKey =
      env.NEXT_PUBLIC_POSTHOG_KEY ??
      (telemetryEnabled ? FALLBACK_POSTHOG_KEY : null);
    const host =
      env.NEXT_PUBLIC_POSTHOG_HOST ??
      (telemetryEnabled ? FALLBACK_POSTHOG_HOST : null);

    if (apiKey && host) {
      this.posthog = new PostHog(apiKey, { host });
      if (process.env.NODE_ENV === "development") this.posthog.debug();
    } else {
      this.posthog = null;
    }
  }

  capture(...args: Parameters<PostHog["capture"]>) {
    this.posthog?.capture(...args);
  }

  async shutdown() {
    await this.posthog?.shutdown();
  }

  async flush() {
    await this.posthog?.flush();
  }
}

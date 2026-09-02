import { env } from "@/src/env.mjs";
import { type Plan } from "@langfuse/shared";
import { type CloudConfigSchema } from "@langfuse/shared";

/**
 * Get the plan of the organization based on the cloud configuration. Used to add this plan to the organization object in JWT via NextAuth.
 */
export function getOrganizationPlanServerSide(
  cloudConfig?: CloudConfigSchema,
): Plan {
  if (process.env.NEXT_PUBLIC_LITEFUSE_CLOUD_REGION) {
    // in dev, grant team plan to all organizations
    // if (process.env.NEXT_PUBLIC_LITEFUSE_CLOUD_REGION === "DEV") {
    //   return "cloud:team";
    // }
    if (cloudConfig) {
      // manual plan override
      if (cloudConfig.plan) {
        switch (cloudConfig.plan) {
          case "Hobby":
            return "cloud:hobby";
          case "Core":
            return "cloud:core";
          case "Pro":
            return "cloud:pro";
          case "Team":
            return "cloud:team";
          case "Enterprise":
            return "cloud:enterprise";
          default:
            const exhaustiveCheck: never = cloudConfig.plan;
            throw new Error(`Unhandled plan case: ${exhaustiveCheck}`);
        }
      }
      if (
        cloudConfig.stripe?.activeSubscriptionId &&
        cloudConfig.stripe.resolvedPlan
      ) {
        return cloudConfig.stripe.resolvedPlan === "Team"
          ? "cloud:team"
          : "cloud:pro";
      }
    }
    return "cloud:hobby";
  }

  const selfHostedPlan = getSelfHostedInstancePlanServerSide();
  if (selfHostedPlan) {
    return selfHostedPlan;
  }
  return "oss";
}

/**
 * Plan of a self-hosted instance, resolved from the EE license key. Null when
 * no (recognized) license is configured, i.e. the base `oss` plan applies.
 */
export function getSelfHostedInstancePlanServerSide(): Plan | null {
  const licenseKey = env.LITEFUSE_EE_LICENSE_KEY;
  if (!licenseKey) return null;
  if (licenseKey.startsWith("litefuse_ee_")) {
    return "self-hosted:enterprise";
  }
  return null;
}

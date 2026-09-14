import { Job, Processor } from "bullmq";
import {
  QueueName,
  TQueueJobTypes,
  getCurrentSpan,
  logger,
  provisionAndActivateSplitProject,
} from "@langfuse/shared/src/server";
import { prisma } from "@langfuse/shared/src/db";

/**
 * Provision a split project's Doris tables + MV (Stage 1.2b). Idempotent and
 * retry-safe (jobId = projectId serialises per project). The control row's
 * EXISTENCE is the "designated to split" gate; the retention (TTL) is read
 * fresh from Project.retentionDays (single source), so a setRetention / billing
 * change re-provisions the TTL correctly (provisioning ALTERs it).
 *
 * New projects are normally provisioned INLINE by project creation
 * (provisionSplitForNewProject); this job is the retry/fallback path for that,
 * and the primary path for retention changes, legacy auto-designation and the
 * grouper's self-heal.
 *
 * The MV build is async; this job returns after CREATE has been issued. It logs
 * the readiness snapshot but does NOT block on the MV finishing — the readiness
 * gate (grouper not-ready skip / getSplitTablesReadiness) handles that.
 */
export const dorisSplitTableProvisioningProcessor: Processor = async (
  job: Job<TQueueJobTypes[QueueName.DorisSplitTableProvisioningQueue]>,
): Promise<void> => {
  const { projectId } = job.data.payload;

  const span = getCurrentSpan();
  span?.setAttribute("messaging.bullmq.job.input.projectId", projectId);

  const control = await prisma.dorisProjectTableSplit.findUnique({
    where: { projectId },
    select: { projectId: true },
  });
  if (!control) {
    // No control row → the project is no longer designated to split (e.g. the
    // row was removed before this job ran). Nothing to provision.
    logger.info(
      `[table-split] no control row for ${projectId}; skipping provisioning`,
    );
    return;
  }

  // Provision + flip LIVE (throws if the base tables are missing afterwards →
  // BullMQ retries with backoff).
  await provisionAndActivateSplitProject(projectId);
};

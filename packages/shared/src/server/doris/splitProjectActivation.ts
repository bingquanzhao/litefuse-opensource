import { prisma } from "../../db";
import { logger } from "../logger";
import { recordIncrement } from "../instrumentation";
import { enqueueDorisSplitTableProvisioning } from "../redis/dorisSplitTableProvisioningQueue";
import { publishSplitCacheInvalidation } from "./tableSplitCache";
import { SPLIT_SCHEMA_VERSION } from "./splitTableTemplates";
import {
  provisionSplitTablesForProject,
  getSplitTablesReadiness,
  type SplitTablesReadiness,
} from "./provisionSplitTables";
import {
  getSplitRetentionDays,
  upsertDorisProjectTableSplit,
} from "./dorisProjectTableSplitControl";

/**
 * Provision a designated project's split tables and flip its control row LIVE.
 * The single "provision + activate" step shared by the worker job
 * (dorisSplitTableProvisioningProcessor) and the inline project-creation path
 * (provisionSplitForNewProject). Idempotent: CREATE IF NOT EXISTS, ALTER TTL
 * re-sets the same value, the MV is created only when absent, and the flip is
 * a plain update. Retention (TTL) is read fresh from Project.retentionDays.
 *
 * Goes LIVE once the BASE tables exist (CREATE TABLE is synchronous). The MV
 * may still be building — reads route to the now-existing tables (empty until
 * data), registration goes to the lane, and the grouper's own readiness gate
 * (getSplitTablesReadiness → MV FINISHED) holds cutting until the MV is ready,
 * so no data is written before the rollup is live.
 */
export const provisionAndActivateSplitProject = async (
  projectId: string,
): Promise<SplitTablesReadiness> => {
  const retentionDays = await getSplitRetentionDays(projectId);

  logger.info(
    `[table-split] provisioning tables for ${projectId} (retentionDays=${retentionDays ?? "none"})`,
  );
  await provisionSplitTablesForProject({ projectId, retentionDays });

  const readiness = await getSplitTablesReadiness(projectId);
  if (!readiness.spansExists || !readiness.tracesScalarExists) {
    // Should not happen — CREATE TABLE is synchronous. Caller retries.
    throw new Error(
      `[table-split] base tables missing after provisioning ${projectId} (${JSON.stringify(readiness)})`,
    );
  }
  await prisma.dorisProjectTableSplit.update({
    where: { projectId },
    data: { split: true, schemaVersion: SPLIT_SCHEMA_VERSION },
  });
  await publishSplitCacheInvalidation();
  logger.info(
    `[table-split] ${projectId} live (split=true, schemaVersion=${SPLIT_SCHEMA_VERSION}); mvStatus=${readiness.mvStatus}`,
  );
  return readiness;
};

/**
 * Upper bound on how long project creation waits for the inline Doris DDL.
 * CREATE TABLE ×2 + ALTER ×2 + CREATE MV normally finish in 1–3s; a slow or
 * hung FE must not hold the create mutation for the full per-statement request
 * timeout. Past this the work is handed to the worker queue (the in-flight DDL
 * keeps running — it is idempotent, and if it completes it flips the row live
 * itself).
 */
export const INLINE_SPLIT_PROVISION_TIMEOUT_MS = 20_000;

/**
 * Designate a newly-created project for table split and provision its tables
 * INLINE, so the project is queryable by the time the create mutation returns
 * (the UI redirects into the project immediately; an async-only provision left
 * a window where Home/Tracing hit a not-yet-existing spans_<pid>).
 *
 * Table split is UNIVERSAL — every project gets its own spans_<pid> /
 * traces_scalar_<pid> tables, independent of billing (retention TTL stays
 * paid-differentiated, derived at provisioning by getSplitRetentionDays).
 *
 * Reliability contract:
 *   - the control-row write is the hard requirement and THROWS on failure (the
 *     callers compensate by deleting the just-created project);
 *   - the inline DDL is best-effort: on any error or timeout it logs, records a
 *     metric and falls back to the worker provisioning job (idempotent; the
 *     grouper self-heal re-drives it too). Project creation never fails on a
 *     Doris blip.
 */
export const provisionSplitForNewProject = async (
  projectId: string,
): Promise<void> => {
  await upsertDorisProjectTableSplit({ projectId, enqueue: false });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `inline provisioning exceeded ${INLINE_SPLIT_PROVISION_TIMEOUT_MS}ms`,
          ),
        ),
      INLINE_SPLIT_PROVISION_TIMEOUT_MS,
    );
  });
  // Keep a handle on the DDL promise: after a timeout it is still running, and
  // its eventual rejection must not surface as an unhandled rejection.
  const inline = provisionAndActivateSplitProject(projectId);
  inline.catch(() => undefined);

  try {
    await Promise.race([inline, timeout]);
    recordIncrement("langfuse.doris.split_table.inline_provision", 1, {
      outcome: "ok",
    });
    return;
  } catch (e) {
    recordIncrement("langfuse.doris.split_table.inline_provision", 1, {
      outcome: "fallback",
    });
    logger.warn(
      `[table-split] inline provisioning for ${projectId} failed (${e instanceof Error ? e.message : String(e)}); falling back to the worker job`,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  try {
    await enqueueDorisSplitTableProvisioning(projectId);
  } catch (e) {
    logger.error(
      `[table-split] provisioning enqueue for ${projectId} failed`,
      e,
    );
  }
};

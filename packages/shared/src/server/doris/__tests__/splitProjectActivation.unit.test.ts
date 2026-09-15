import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  splitUpdateMock,
  upsertControlMock,
  retentionMock,
  provisionMock,
  readinessMock,
  enqueueMock,
  publishMock,
} = vi.hoisted(() => ({
  splitUpdateMock: vi.fn(),
  upsertControlMock: vi.fn(),
  retentionMock: vi.fn(),
  provisionMock: vi.fn(),
  readinessMock: vi.fn(),
  enqueueMock: vi.fn(),
  publishMock: vi.fn(),
}));
vi.mock("../../../db", () => ({
  prisma: { dorisProjectTableSplit: { update: splitUpdateMock } },
}));
vi.mock("../../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../instrumentation", () => ({ recordIncrement: vi.fn() }));
vi.mock("../../redis/dorisSplitTableProvisioningQueue", () => ({
  enqueueDorisSplitTableProvisioning: enqueueMock,
}));
vi.mock("../tableSplitCache", () => ({
  publishSplitCacheInvalidation: publishMock,
}));
vi.mock("../provisionSplitTables", () => ({
  provisionSplitTablesForProject: provisionMock,
  getSplitTablesReadiness: readinessMock,
}));
vi.mock("../dorisProjectTableSplitControl", () => ({
  getSplitRetentionDays: retentionMock,
  upsertDorisProjectTableSplit: upsertControlMock,
}));

import { SPLIT_SCHEMA_VERSION } from "../splitTableTemplates";
import {
  provisionAndActivateSplitProject,
  provisionSplitForNewProject,
} from "../splitProjectActivation";

const PID = "cmqiwxsca0006pj070fdkn0vd";
const READY = {
  ready: false,
  spansExists: true,
  tracesScalarExists: true,
  mvStatus: "building" as const,
};

beforeEach(() => {
  splitUpdateMock.mockReset();
  upsertControlMock.mockReset();
  retentionMock.mockReset().mockResolvedValue(30);
  provisionMock.mockReset().mockResolvedValue(undefined);
  readinessMock.mockReset().mockResolvedValue(READY);
  enqueueMock.mockReset();
  publishMock.mockReset();
});

describe("provisionAndActivateSplitProject", () => {
  it("provisions with the project's retention, then flips the row live", async () => {
    const readiness = await provisionAndActivateSplitProject(PID);

    expect(provisionMock).toHaveBeenCalledWith({
      projectId: PID,
      retentionDays: 30,
    });
    expect(splitUpdateMock).toHaveBeenCalledWith({
      where: { projectId: PID },
      data: { split: true, schemaVersion: SPLIT_SCHEMA_VERSION },
    });
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(readiness).toEqual(READY);
  });

  it("throws (and does not flip) when a base table is missing afterwards", async () => {
    readinessMock.mockResolvedValue({ ...READY, tracesScalarExists: false });

    await expect(provisionAndActivateSplitProject(PID)).rejects.toThrow(
      /base tables missing/,
    );
    expect(splitUpdateMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });
});

describe("provisionSplitForNewProject", () => {
  it("designates without enqueueing, provisions inline, and skips the worker job", async () => {
    await provisionSplitForNewProject(PID);

    expect(upsertControlMock).toHaveBeenCalledWith({
      projectId: PID,
      enqueue: false,
    });
    expect(provisionMock).toHaveBeenCalledTimes(1);
    expect(splitUpdateMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("falls back to the worker job when inline provisioning fails, without throwing", async () => {
    provisionMock.mockRejectedValue(new Error("Doris FE unavailable"));

    await expect(provisionSplitForNewProject(PID)).resolves.toBeUndefined();

    expect(upsertControlMock).toHaveBeenCalledTimes(1);
    expect(splitUpdateMock).not.toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith(PID);
  });

  it("falls back to the worker job when inline provisioning times out", async () => {
    vi.useFakeTimers();
    try {
      // Never resolves within the timeout window.
      provisionMock.mockReturnValue(new Promise(() => undefined));

      const p = provisionSplitForNewProject(PID);
      await vi.advanceTimersByTimeAsync(20_001);
      await p;

      expect(enqueueMock).toHaveBeenCalledWith(PID);
      expect(splitUpdateMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("propagates a control-row write failure (caller compensates)", async () => {
    upsertControlMock.mockRejectedValue(new Error("PG down"));

    await expect(provisionSplitForNewProject(PID)).rejects.toThrow("PG down");
    expect(provisionMock).not.toHaveBeenCalled();
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});

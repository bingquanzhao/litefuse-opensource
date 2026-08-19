/** @jest-environment node */

/**
 * Bug fix coverage: simple-param filters on /api/public/v2/observations
 * (fromStartTime, toStartTime, traceId, userId, name, type, level,
 * parentObservationId, version, environment) were silently dropped by
 * buildObservationsQueryDoris because the rest-spread `...filterParams`
 * was extracted but never applied. This test inspects the generated SQL
 * to confirm they now reach the WHERE clause via deriveFilters.
 *
 * Doris filters inline literal values (with single-quote escaping) into the
 * SQL string rather than using parameterized queries — assertions therefore
 * match against the SQL text. Only projectId uses placeholder syntax via
 * the hardcoded WHERE clause.
 */

import {
  buildObservationsQueryDoris,
  filterObservationFieldsForPublicApi,
  type PublicApiObservationsQuery,
} from "@langfuse/shared/src/server";

// Table-name-safe project id (no hyphens; DORIS_PROJECT_ID_RE = [A-Za-z0-9_]+)
// so tableFor(projectId, "spans") builds a valid spans_<pid> identifier.
const projectId = "7a88fb47b4e243b8a06ca5ce950dc53a";

const baseOpts = {
  projectId,
  page: 0,
  limit: 50,
} satisfies PublicApiObservationsQuery;

describe("buildObservationsQueryDoris — simple-param filter wiring", () => {
  it("emits a start_time lower bound for fromStartTime", () => {
    const fromStartTime = "2026-05-22T00:00:00.000Z";
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      fromStartTime,
    });

    expect(baseQuery).toMatch(/o\.\s*start_time\s*>=\s*'2026-05-22 00:00:00/);
  });

  it("emits a start_time upper bound for toStartTime", () => {
    const toStartTime = "2026-05-22T01:00:00.000Z";
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      toStartTime,
    });

    expect(baseQuery).toMatch(/o\.\s*start_time\s*<\s*'2026-05-22 01:00:00/);
  });

  it("emits a trace_id equality on observations side without joining traces", () => {
    const traceId = "trace-abc";
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      traceId,
    });

    expect(baseQuery).toMatch(/o\.\s*trace_id\s*=\s*'trace-abc'/);
    expect(baseQuery).not.toMatch(/JOIN\s+spans_\S+\s+t/i);
  });

  it("joins spans as t (root span) and filters t.user_id when userId is set", () => {
    const userId = "user-xyz";
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      userId,
    });

    expect(baseQuery).toMatch(/JOIN\s+spans_\S+\s+t\b/i);
    expect(baseQuery).toMatch(/t\.\s*is_root\s*=\s*1/);
    expect(baseQuery).toMatch(/t\.\s*user_id\s*=\s*'user-xyz'/);
  });

  it("emits name + type + level + version equalities on observations", () => {
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      name: "my-span",
      type: "GENERATION",
      level: "ERROR",
      version: "v1.2.3",
    });

    expect(baseQuery).toMatch(/o\.\s*name\s*=\s*'my-span'/);
    expect(baseQuery).toMatch(/o\.\s*type\s*=\s*'GENERATION'/);
    expect(baseQuery).toMatch(/o\.\s*level\s*=\s*'ERROR'/);
    expect(baseQuery).toMatch(/o\.\s*version\s*=\s*'v1\.2\.3'/);
  });

  it("emits parent_span_id equality for parentObservationId", () => {
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      parentObservationId: "parent-span-123",
    });

    expect(baseQuery).toMatch(/o\.\s*parent_span_id\s*=\s*'parent-span-123'/);
  });

  it("emits environment equality on observations side", () => {
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      environment: "production",
    });

    expect(baseQuery).toMatch(/o\.\s*environment\s*=\s*'production'/);
  });

  it("retains projectId filter and does not JOIN when no simple filters are passed", () => {
    const { baseQuery, params } = buildObservationsQueryDoris(baseOpts);

    expect(baseQuery).toMatch(/o\.\s*project_id\s*=\s*\{projectId:\s*String\}/);
    expect(baseQuery).not.toMatch(/JOIN\s+spans_\S+\s+t/i);
    expect(params.projectId).toBe(projectId);
  });

  it("quotes reserved aliases for release and public in the select list", () => {
    const { baseQuery } = buildObservationsQueryDoris(baseOpts);

    expect(baseQuery).toMatch(/o\.`release`\s+AS\s+`release`/);
    expect(baseQuery).toMatch(/o\.`public`\s+AS\s+`public`/);
  });

  it("escapes single quotes in simple filter values", () => {
    const { baseQuery } = buildObservationsQueryDoris({
      ...baseOpts,
      name: "abc'def",
    });

    expect(baseQuery).toMatch(/o\.\s*name\s*=\s*'abc''def'/);
  });

  it("returns only core fields when fields=core is requested", () => {
    const filtered = filterObservationFieldsForPublicApi(
      {
        id: "obs-1",
        traceId: "trace-1",
        startTime: new Date("2026-05-15T10:00:00.000Z"),
        endTime: null,
        projectId,
        parentObservationId: null,
        type: "GENERATION",
        name: "should-be-removed",
        input: "should-be-removed",
        usageDetails: { input: 100, output: 50, total: 150 },
        traceName: "should-be-removed",
        modelId: "should-be-removed",
      },
      ["core"],
    );

    expect(filtered).toEqual({
      id: "obs-1",
      traceId: "trace-1",
      startTime: new Date("2026-05-15T10:00:00.000Z"),
      endTime: null,
      projectId,
      parentObservationId: null,
      type: "GENERATION",
    });
  });
});

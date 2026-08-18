import { v4 } from "uuid";
import {
  commandDoris,
  queryDoris,
  buildSplitTableStatements,
} from "@langfuse/shared/src/server";

// Regression test for emoji / 4-byte UTF-8 mojibake: Doris reports charset 33
// (utf8) but stores utf8mb4; mysql2 maps charset 33 to cesu8 (3-byte), turning
// 4-byte emoji into U+FFFD ('�') for non-JSON string columns (e.g. CAST(input AS
// STRING), name). client.ts overrides CharsetToEncoding[33] = "utf8" to fix it.
describe("Doris emoji / 4-byte UTF-8 round-trip", () => {
  const now = new Date();
  const dtStr = now.toISOString().slice(0, 19).replace("T", " ");
  const EMOJI = "hello 😀 世界 🌍 ✅";

  // All-split model: a project owns its own spans_<pid> table. Provision it and
  // round-trip through the real per-project split table (current schema — no
  // start_time_date / event_ts / is_deleted). Project id must be table-name safe
  // (no hyphens; DORIS_PROJECT_ID_RE = [A-Za-z0-9_]+).
  const projectId = v4().replace(/-/g, "");

  beforeAll(async () => {
    const { spans } = buildSplitTableStatements({
      projectId,
      retentionDays: null,
      replication: 1,
      storagePageSize: 262144,
    });
    await commandDoris({ query: spans });
  });

  it("preserves emoji through CAST(input AS STRING) and a plain string column", async () => {
    const traceId = v4();

    await commandDoris({
      query: `INSERT INTO spans_${projectId}
        (project_id, trace_id, span_id, parent_span_id, is_root,
         start_time, name, environment, input)
        VALUES
        ('${projectId}', '${traceId}', 't-${traceId}', '', 1,
         '${dtStr}', '${EMOJI}', 'default', '{"msg":"${EMOJI}"}')`,
    });

    const rows = await queryDoris<{ io: string; nm: string }>({
      query: `SELECT CAST(input AS STRING) AS io, name AS nm
              FROM spans_${projectId}
              WHERE project_id = {projectId: String} AND trace_id = {traceId: String}`,
      params: { projectId, traceId },
    });

    expect(rows).toHaveLength(1);
    // No replacement characters.
    expect(rows[0].io).not.toContain("�");
    expect(rows[0].nm).not.toContain("�");
    // Emoji + CJK survive intact.
    expect(rows[0].io).toContain("😀");
    expect(rows[0].io).toContain("🌍");
    expect(rows[0].io).toContain("世界");
    expect(rows[0].io).toContain("✅");
    expect(rows[0].nm).toEqual(EMOJI);
  });
});

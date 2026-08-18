import {
  isForeignSplitTable,
  findForeignSplitTables,
  findForbiddenTelemetryTables,
  filterVisibleTables,
} from "@/src/features/discover/server/queryUtils";

const OWN = "cmqiwxsca0006pj070fdkn0vd";
const OTHER = "cmqiwxsca0006pj070fdkn0ve";

describe("Discover split-table access control (Stage 1.7)", () => {
  describe("isForeignSplitTable", () => {
    it("another project's split table is foreign", () => {
      expect(isForeignSplitTable(`spans_${OTHER}`, OWN)).toBe(true);
      expect(isForeignSplitTable(`traces_scalar_${OTHER}`, OWN)).toBe(true);
      expect(isForeignSplitTable(`trace_metrics_agg_${OTHER}`, OWN)).toBe(true);
    });
    it("own split table is NOT foreign", () => {
      expect(isForeignSplitTable(`spans_${OWN}`, OWN)).toBe(false);
      expect(isForeignSplitTable(`traces_scalar_${OWN}`, OWN)).toBe(false);
    });
    it("shared/other tables are never foreign", () => {
      expect(isForeignSplitTable("spans", OWN)).toBe(false);
      expect(isForeignSplitTable("traces_scalar", OWN)).toBe(false);
      expect(isForeignSplitTable("scores", OWN)).toBe(false);
      expect(isForeignSplitTable("dataset_run_items_rmt", OWN)).toBe(false);
    });
  });

  describe("findForeignSplitTables", () => {
    it("catches a foreign table in the top-level FROM", () => {
      expect(
        findForeignSplitTables(`SELECT * FROM spans_${OTHER}`, OWN),
      ).toEqual([`spans_${OTHER}`]);
    });
    it("catches foreign tables in subqueries and JOINs", () => {
      const sql = `SELECT * FROM (SELECT id FROM traces_scalar_${OTHER}) t JOIN spans_${OTHER} e ON e.id = t.id`;
      const found = findForeignSplitTables(sql, OWN);
      expect(found).toContain(`traces_scalar_${OTHER}`);
      expect(found).toContain(`spans_${OTHER}`);
    });
    it("allows own split tables and shared non-telemetry tables", () => {
      expect(
        findForeignSplitTables(
          `SELECT * FROM spans_${OWN} JOIN scores s ON s.trace_id = id`,
          OWN,
        ),
      ).toEqual([]);
      expect(findForeignSplitTables(`SELECT * FROM scores`, OWN)).toEqual([]);
    });
  });

  describe("findForbiddenTelemetryTables", () => {
    it("rejects shared telemetry table names", () => {
      expect(
        findForbiddenTelemetryTables(
          `SELECT * FROM spans JOIN traces_scalar t ON t.id = id`,
          OWN,
        ),
      ).toEqual(["spans", "traces_scalar"]);
    });

    it("rejects foreign split tables but allows own split tables", () => {
      expect(
        findForbiddenTelemetryTables(
          `SELECT * FROM spans_${OWN} JOIN traces_scalar_${OTHER} t ON t.id = id`,
          OWN,
        ),
      ).toEqual([`traces_scalar_${OTHER}`]);
    });
  });

  describe("filterVisibleTables", () => {
    it("hides shared telemetry and other projects' split tables from SHOW TABLES", () => {
      const rows = [
        { Tables_in_litefuse: "spans" },
        { Tables_in_litefuse: "traces_scalar" },
        { Tables_in_litefuse: "trace_metrics_agg" },
        { Tables_in_litefuse: `spans_${OWN}` },
        { Tables_in_litefuse: `spans_${OTHER}` },
        { Tables_in_litefuse: `traces_scalar_${OTHER}` },
        { Tables_in_litefuse: "scores" },
      ];
      const visible = filterVisibleTables(rows, OWN).map(
        (r) => r.Tables_in_litefuse,
      );
      expect(visible).toEqual([`spans_${OWN}`, "scores"]);
    });
  });
});

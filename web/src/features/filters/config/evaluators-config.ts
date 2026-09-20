import { evalConfigsTableCols } from "@/src/server/api/definitions/evalConfigsTable";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";

import { i18nKey } from "@/src/features/i18n/i18nKey";
export const evaluatorFilterConfig: FilterConfig = {
  tableName: "evaluators",

  columnDefinitions: evalConfigsTableCols,

  defaultExpanded: ["status"],

  defaultSidebarCollapsed: true,

  facets: [
    {
      type: "categorical" as const,
      column: "status",
      label: i18nKey("Status"),
    },
    {
      type: "categorical" as const,
      column: "target",
      label: i18nKey("Target"),
    },
  ],
};

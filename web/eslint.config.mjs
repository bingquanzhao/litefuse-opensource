import nextConfig from "@repo/eslint-config/next";
import { tableRoutingRule } from "@repo/eslint-config/base";
import i18next from "eslint-plugin-i18next";

// Directories already migrated to react-i18next. Hardcoded UI strings are an
// error there so they cannot regress. Extend as directories are migrated; the
// zh-CN rollout gate is this list covering all of src/.
// Deprecated, and a vendored subtree that may be re-synced wholesale, so it is
// never translated and never enters the gate.
const I18N_EXCLUDED_FILES = [
  "**/*.clienttest.tsx",
  "**/*.servertest.tsx",
  "src/features/discover/**",
  "src/lib/discover-shims/**",
];

const I18N_MIGRATED_FILES = [
  "src/features/i18n/**/*.tsx",
  "src/components/nav/**/*.tsx",
  "src/components/layouts/**/*.tsx",
  "src/features/notifications/**/*.tsx",
  "src/components/ui/**/*.tsx",
  "src/components/table/**/*.tsx",
];

export default [
  ...nextConfig,

  // Table-split guard: no bare spans/traces_scalar SQL literals in the
  // query-building layer (Stage 0.7 — route through tableFor/sharedTableFor).
  tableRoutingRule([
    "src/features/**/*.ts",
    "src/pages/api/**/*.ts",
    "src/server/**/*.ts",
  ]),

  {
    name: "litefuse/web/i18n-no-literal-string",
    files: I18N_MIGRATED_FILES,
    ignores: I18N_EXCLUDED_FILES,
    plugins: { i18next },
    rules: {
      // The JSX rule cannot see text that travels as data before it is
      // rendered: column headers, option labels, tooltip copy. Those live on a
      // small set of property names, so guard them by name.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name=/^(header|label|title|description|placeholder|tooltip|message|emptyMessage)$/] > Literal[value=/^[A-Za-z][A-Za-z0-9 ,.()-]*$/]",
          message:
            "User-facing text in a data property must be an i18n key: wrap it with i18nKey() and translate it where it is rendered.",
        },
      ],
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            include: [
              "title",
              "placeholder",
              "label",
              "description",
              "tooltip",
              "aria-label",
              "alt",
            ],
          },
        },
      ],
    },
  },

  // Restrict react-icons imports
  {
    name: "langfuse/web/react-icons-restriction",
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react-icons",
                "react-icons/!(si|tb)",
                "react-icons/!(si|tb)/*",
              ],
              message:
                "Only react-icons/si and react-icons/tb are allowed. Please use lucide-react for other icons.",
            },
          ],
        },
      ],
    },
  },

  // Exceptions for specific files
  {
    name: "langfuse/web/react-icons-exceptions",
    files: [
      "src/components/nav/support-menu-dropdown.tsx",
      "src/pages/auth/sign-in.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

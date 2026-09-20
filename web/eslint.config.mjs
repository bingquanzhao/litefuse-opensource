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
  "src/components/trace2/**/*.tsx",
  "src/features/comments/**/*.tsx",
  "src/features/evals/**/*.tsx",
  "src/features/datasets/**/*.tsx",
  "src/features/batch-actions/**/*.tsx",
  "src/features/prompts/**/*.tsx",
  "src/features/score-analytics/**/*.tsx",
  "src/features/widgets/**/*.tsx",
  "src/features/models/**/*.tsx",
  "src/features/experiments/**/*.tsx",
  "src/features/playground/**/*.tsx",
  "src/components/onboarding/**/*.tsx",
  "src/features/annotation-queues/**/*.tsx",
  "src/features/automations/**/*.tsx",
  "src/features/dashboard/**/*.tsx",
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
          // Replaces the plugin defaults, so they are restated here. The last
          // two entries let symbols and key caps through while still flagging
          // hardcoded Chinese, which has appeared in this codebase before.
          words: {
            exclude: [
              "[0-9!-/:-@[-`{-~]+",
              "[A-Z_-]+",
              "[^A-Za-z\\u4e00-\\u9fff]+",
              "(Ctrl|Cmd|Alt|Shift|Enter|Esc|Tab|Backspace|Delete|Space)(\\+\\w+)?",
            ],
          },
          // Literals handed to these calls are field names, format strings and
          // ids, never text. Restates the plugin defaults, which this replaces.
          callees: {
            exclude: [
              "i18n(ext)?",
              "t",
              "require",
              "addEventListener",
              "removeEventListener",
              "postMessage",
              "getElementById",
              "dispatch",
              "commit",
              "includes",
              "indexOf",
              "endsWith",
              "startsWith",
              "watch",
              "getValues",
              "setValue",
              "resetField",
              "register",
              "trigger",
              "clearErrors",
              "setError",
              "getFieldState",
              "format",
              "formatDate",
              "parse",
              "get",
              "set",
              "has",
              "capture",
              "push",
              "replace",
              "prefetch",
              "setQueryParam",
            ],
          },
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

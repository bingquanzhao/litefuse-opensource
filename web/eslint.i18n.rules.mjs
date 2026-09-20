import i18next from "eslint-plugin-i18next";

// Shared by eslint.config.mjs (editor feedback) and eslint.i18n.config.mjs
// (the gate). This module must never import the repo eslint config: that
// chain loads eslint-plugin-only-warn, which rewrites every severity to
// "warning" and would make the gate unable to fail.
// Deprecated, and a vendored subtree that may be re-synced wholesale, so it is
// never translated and never enters the gate.
export const I18N_EXCLUDED_FILES = [
  "**/*.clienttest.tsx",
  "**/*.servertest.tsx",
  "src/features/discover/**",
  "src/lib/discover-shims/**",
];

// Every component file, plus the non-component modules that hold user-facing
// text as data: filter configs, the widget data model, survey content and the
// zod schemas whose messages a form renders. The exclusions above are the only
// exemptions, and zh-CN goes live once the gates are clean across all of them.
export const I18N_MIGRATED_FILES = [
  "src/**/*.tsx",
  "src/features/filters/config/*.ts",
  "src/features/events/config/*.ts",
  "src/features/query/dataModel*.ts",
  "src/features/score-analytics/lib/statistics-utils.ts",
  "src/features/dashboard/lib/score-analytics-utils.ts",
  "src/features/navigation/utils/*.ts",
  "src/features/onboarding/lib/questions.ts",
  "src/features/auth/lib/signupSchema.ts",
  "src/features/blobstorage-integration/types.ts",
  "src/features/models/validation.ts",
  "src/features/support-chat/formConstants.ts",
  "src/utils/date-range-utils.ts",
];

export const i18nRuleBlock = {
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
            "(Ctrl|Cmd|Alt|Shift|Esc|Backspace)(\\+\\w+)?",
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
        // A denylist, deliberately: with an `include` allowlist the plugin
        // skips every other attribute together with its entire JSX subtree,
        // which exempted every react-hook-form `render={...}` body in the
        // app. Only attributes that never carry human-readable text belong
        // here.
        "jsx-attributes": {
          exclude: [
            "className",
            "class",
            "classNames",
            "key",
            "id",
            "htmlFor",
            "href",
            "src",
            "to",
            "type",
            "name",
            "role",
            "rel",
            "target",
            "style",
            "value",
            "defaultValue",
            "variant",
            "size",
            "side",
            "align",
            "position",
            "mode",
            "scope",
            "slug",
            "path",
            "pathname",
            "testId",
            "data-.*",
            "aria-hidden",
            "autoComplete",
            "inputMode",
            "accept",
            "method",
            "encType",
            "dir",
            "lang",
            "width",
            "height",
            "fill",
            "stroke",
            "viewBox",
            "d",
            "xmlns",
          ],
        },
      },
    ],
  },
};

import en from "@/src/features/i18n/locales/en.json";
import zhCN from "@/src/features/i18n/locales/zh-CN.json";

/**
 * Display-only strings that look like identifiers but really are UI text.
 * Adding an entry is a deliberate act: check first that the SDK, the public
 * API and OpenTelemetry do not read the string you are about to translate.
 */
const ALLOWED_IDENTIFIER_LIKE_KEYS = new Set<string>([
  "API",
  "CSV",
  "JSON",
  "LLM",
  "SDK",
  "SQL",
  "URL",
  "YAML",
]);

/**
 * A key that carries no whitespace and reads like a machine identifier is
 * almost always a protocol value (an OTel attribute, an API enum, a column id)
 * that was wrapped in t() by mistake. Translating one silently breaks
 * ingestion or an API contract, and neither typecheck nor the feature tests
 * would catch it, so it is caught here instead.
 */
const IDENTIFIER_LIKE_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "snake_case or CONSTANT_CASE", regex: /_/ },
  { name: "camelCase identifier", regex: /^[a-z][A-Za-z0-9]*[A-Z]/ },
  { name: "dotted path", regex: /\.[a-z]/ },
  { name: "bare acronym", regex: /^[A-Z0-9]{3,}$/ },
  { name: "URL", regex: /^https?:\/\// },
  { name: "media type", regex: /^[a-z]+\/[a-z]+/ },
];

const enKeys = Object.keys(en as Record<string, string>);
const zhEntries = Object.entries(zhCN as Record<string, string>);

describe("locale files", () => {
  it("uses the English source text as the key", () => {
    const mismatched = Object.entries(en as Record<string, string>)
      .filter(([key, value]) => key !== value)
      .map(([key]) => key);

    expect(mismatched).toEqual([]);
  });

  it("covers exactly the same keys in every locale", () => {
    const zhKeys = zhEntries.map(([key]) => key);

    expect(zhKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    expect(enKeys.filter((key) => !zhKeys.includes(key))).toEqual([]);
  });

  it("has no empty zh-CN translation", () => {
    const untranslated = zhEntries
      .filter(([, value]) => value.trim() === "")
      .map(([key]) => key);

    expect(untranslated).toEqual([]);
  });

  it("contains no key that reads like a protocol identifier", () => {
    const offenders = enKeys
      .filter((key) => !ALLOWED_IDENTIFIER_LIKE_KEYS.has(key))
      .filter((key) => !/\s/.test(key))
      .flatMap((key) => {
        const hit = IDENTIFIER_LIKE_PATTERNS.find(({ regex }) =>
          regex.test(key),
        );
        return hit ? [`${key} (${hit.name})`] : [];
      });

    expect(offenders).toEqual([]);
  });

  it("keeps interpolation placeholders identical across locales", () => {
    const placeholders = (value: string) =>
      (value.match(/\{\{[^}]+\}\}/g) ?? []).sort();

    const drifted = zhEntries
      .filter(([key, value]) => {
        const source = (en as Record<string, string>)[key];
        if (source === undefined || value.trim() === "") return false;
        return placeholders(source).join("|") !== placeholders(value).join("|");
      })
      .map(([key]) => key);

    expect(drifted).toEqual([]);
  });
});

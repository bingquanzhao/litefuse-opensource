# UI internationalization

react-i18next with **English source strings as keys**. English never goes
through a dictionary: a missing translation renders the key, so upstream
merges that add English text can never break the UI or block a release.

## Writing UI text

```tsx
const { t } = useTranslation();
<Button>{t("Create new project")}</Button>
<Input placeholder={t("Search {{entity}}", { entity: t("prompts") })} />
```

- Static data (route tables, label maps) cannot call hooks: wrap the literal
  with `i18nKey("Tracing")` and let the rendering component call `t(value)`.
- Never wrap identifiers the SDKs, OTel or the API read (attribute names,
  enum values, column ids). Only text a person reads is a key. Translating one
  breaks ingestion silently, so `locales.clienttest.ts` rejects any key that
  reads like a machine identifier; do not add to its allowlist to get past it
  without checking what reads the string.
- Do not build sentences by concatenation; use one key with placeholders.
- Translate against [GLOSSARY.md](./GLOSSARY.md) and add any new recurring
  term to it in the same commit. Term drift across hundreds of files is the
  main quality risk of this migration.

## Locale resolution

`account preference (users.locale)` > `NEXT_LOCALE cookie` > `Accept-Language`

> `en`, restricted to `LITEFUSE_I18N_LOCALES` (server env, comma separated,
> default `en`). The server resolves cookie/header in `_app` / `_document`
> (`getI18nAppProps.ts`); the provider re-syncs to the account preference once
> the session is loaded. URLs never carry a locale prefix.

The language switcher (`LanguageSwitcher`, account settings, sign-in page)
renders only when more than one locale is enabled, which is how zh-CN stays
invisible until the coverage gap is closed.

## Tooling (`web/`)

| Command             | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm i18n:extract` | Sync `locales/en.json` (inventory) and `locales/zh-CN.json` from code   |
| `pnpm i18n:check`   | CI: fails if locale files are stale or zh-CN has an empty/missing value |
| `pnpm i18n:lint`    | Lists hardcoded strings still to migrate                                |

`eslint.config.mjs` (`I18N_MIGRATED_FILES`) turns hardcoded JSX strings into
lint failures. It covers every `.tsx` file plus the non-component modules that
carry user-facing text as data: filter configs, the widget data model, survey
content and the zod schemas whose messages a form renders. Add a new file of
that kind to the list in the same commit that introduces it.

Client tests initialise the default i18next instance through
`src/__tests__/i18n-client-setup.ts`, so `t()` interpolates in tests exactly as
it does for an English user and assertions read the English copy.

`locales.clienttest.ts` additionally checks that both locale files hold the
same keys, that no zh-CN value is empty, that keys are the English text, that
interpolation placeholders survive translation, and that no key looks like a
protocol identifier.

## Not translated

`src/features/discover/**` (and its shims) is deprecated and vendored, and may
be re-synced wholesale, so it is excluded from both lint gates and from
extraction. It stays English regardless of the selected language. Nothing else
in `src/` is exempt.

## Gate

`pnpm i18n:gate` is the real check. `pnpm run lint` cannot be one: the repo
eslint config loads `eslint-plugin-only-warn`, which rewrites every severity to
"warning", so `eslint src` exits 0 no matter how many violations exist. The
gate runs the same rules through `eslint.i18n.config.mjs`, which imports
`eslint.i18n.rules.mjs` directly and never touches that plugin. Keep it that
way: the moment the rules module imports the repo config, the gate stops being
able to fail.

Two blind spots have already cost a release's worth of rework, so they are
called out here:

- `jsx-attributes` must stay an **exclude** denylist. With an `include`
  allowlist the plugin skips every other attribute _together with its whole JSX
  subtree_, which exempted every react-hook-form `render={...}` body in the app.
- The JSX rule is `jsx-only`, so it sees nothing outside JSX: toast arguments,
  helper return values, `confirm()` copy and template literals are invisible to
  it. Those still need a human, or a scan.

## Rollout rule

zh-CN stays off (`LITEFUSE_I18N_LOCALES=en`) until `pnpm i18n:gate` is clean
across `src/`. The user rejects mixed-language pages, and an untranslated key
renders its English source, so shipping early means exactly that. Test
environments may set `en,zh-CN` to review progress.

After every upstream merge: `pnpm i18n:extract`, translate the new keys against
the glossary, then `pnpm i18n:check` and `pnpm i18n:gate`.

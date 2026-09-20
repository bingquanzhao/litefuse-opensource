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
> default `en,zh-CN`). The server resolves cookie/header in `_app` / `_document`
> (`getI18nAppProps.ts`); the provider re-syncs to the account preference once
> the session is loaded. URLs never carry a locale prefix.

The language switcher (`LanguageSwitcher`, account settings, sign-in page)
renders only when more than one locale is enabled, so a deployment that sets
`LITEFUSE_I18N_LOCALES=en` stays English with no switcher at all.

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

## Keeping it complete

Both lint gates are clean across `src/` and the zh-CN dictionary is complete,
so zh-CN ships enabled by default. A deployment that wants English only sets
`LITEFUSE_I18N_LOCALES=en`.

Keeping it that way is the maintenance contract: after every upstream merge run
`pnpm i18n:extract`, translate the new keys against the glossary, and confirm
`pnpm i18n:check` and `pnpm exec eslint src` are green. An untranslated key
renders its English source text, so a missed merge degrades gracefully into a
mixed page rather than a crash. Do not let it sit.

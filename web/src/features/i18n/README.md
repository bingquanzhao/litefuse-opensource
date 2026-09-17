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
  enum values, column ids). Only text a person reads is a key.
- Do not build sentences by concatenation; use one key with placeholders.

## Locale resolution

`account preference (users.locale)` > `NEXT_LOCALE cookie` > `Accept-Language`

> `en`, restricted to `LITEFUSE_I18N_LOCALES` (server env, comma separated,
> default `en`). The server resolves cookie/header in `_app` / `_document`
> (`getI18nAppProps.ts`); the provider re-syncs to the account preference once
> the session is loaded. URLs never carry a locale prefix.

The language switcher (`LanguageSwitcher`, account settings, sign-in page)
renders only when more than one locale is enabled, which is how zh-CN stays
invisible until the dictionary is complete.

## Tooling (`web/`)

| Command             | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm i18n:extract` | Sync `locales/en.json` (inventory) and `locales/zh-CN.json` from code   |
| `pnpm i18n:check`   | CI: fails if locale files are stale or zh-CN has an empty/missing value |
| `pnpm i18n:lint`    | Lists hardcoded strings still to migrate                                |

`eslint.config.mjs` (`I18N_MIGRATED_FILES`) turns hardcoded JSX strings into
lint failures for migrated directories. Add a directory to that list in the
same PR that migrates it.

## Rollout rule

zh-CN is switched on for users only when `pnpm i18n:lint` is clean for all of
`src/` and `I18N_MIGRATED_FILES` covers `src/**`. Until then production keeps
`LITEFUSE_I18N_LOCALES=en`; test environments may enable `en,zh-CN` to review
progress. After each upstream merge run `pnpm i18n:extract`, translate the new
keys, and `pnpm i18n:check` is green again.

# Changelog

## [Unreleased]

## [0.4.0] - 2026-03-19

### Added
- `convertible` item type with `Convertible.tsx` field component (dimension sliders + source display)
- `ConvertibleData` interface with `converter-engine` field in schema types

### Changed
- Removed CNAME: publish at `healthdatasafe.github.io/hds-forms-js/`

## [0.3.0] - 2026-03-16

### Fixed
- Added `resolve.dedupe` to prevent duplicate hds-lib singletons

### Added
- Support for `canBeNull` in composite sub-fields
- Settings tab to test app (Plan 11 preview)

### Changed
- Switched to Vite library build, point types to source TS
- Removed `js/` from git (rebuilt by `prepare` on install)
- Bumped Node engine to `>=24`

## [0.2.0] - 2026-03-09

### Added
- Shared FormBuilder component with slot-based architecture
- Item browser: group by key prefix, show description on hover
- ReminderEditor component integrated into FormBuilder
- Companion field schema utilities (`getCompanionSchema`, `extractCompanionDefaults`)
- DatasetSearch edit mode with readonly pre-filled companion fields
- Form Builder PoC tab in test app (Phase 1c)
- Native variation/eventType support in `formDataToActions`
- DatasetSearch field component

### Changed
- Simplified medication intake UI: removed frequency/asNeeded, inline layout
- Improved DatasetSearch: source filter, source tags, clear button
- Renamed package to `hds-forms-js`, added TS exports for bundlers

### Fixed
- TypeScript types and ratio/generic options bug
- `.nojekyll` added to deploy script for GitHub Pages

## [0.1.0] - 2026-02-25

### Added
- Initial release
- HDS form rendering library
- Dynamic form generation from HDS data model definitions
- Deploy script for gh-pages publishing

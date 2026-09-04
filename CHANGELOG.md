# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.13] - 2026-09-04

### Added
- **Warning that button name isn't stored** — a note beside the Button Name and Event Value fields in the event template form clarifies that the button label isn't part of the saved event data or exports (#63, thanks @schmidtocean)

### Fixed
- **Deleted event attachments not removed from other clients' view** — the server now publishes a `deleteEventAuxData` websocket event when an aux_data record is deleted, but `EventHistory` only subscribed to the `new`/`update` variants, so a deleted attachment lingered in the UI for other connected clients until they manually refreshed
- **Event timestamp validation used the obsolete `event_ts` field** — the event-options modal stores a manually adjusted timestamp in `ts`, but its validator still read/wrote `event_ts`, so an invalid manual timestamp reached the server unvalidated and could leave a newly created event without its `event_options` and no useful error shown (#54, thanks @schmidtocean)
- **Failed attachment deletion could still remove its metadata** — `handle_image_file_delete` passed its callback into the file-delete helper's `id` argument, and the caller removed the aux_data record without waiting for the file request to complete, so a failed physical file delete could still leave the attachment removed from Sealog while the file remained on disk (#61, thanks @schmidtocean)
- **Pressing Enter cleared gallery searches** — the gallery search field lived in a form with no submit handler, so Enter reloaded the page and cleared the active search even though results already update live as you type (#69, thanks @schmidtocean)
- **Imported template categories bypassed case normalization** — the event template form lowercases `template_categories` on save, but templates imported from JSON went straight to `create_event_template` and skipped that step, letting mixed-case categories (e.g. imported `ROV` alongside form-edited `rov`) split what should be one category (#59)
- **Gallery attachment keys could collide for events with multiple images** — gallery items were keyed only by data source and event id, so an event with more than one attachment in the same source could get duplicate React keys, letting the wrong thumbnail be reused on re-render; the key now also includes the attachment's filepath (#57, thanks @schmidtocean)
- **Template JSON import dropped visibility/styling fields** — exported templates carry `admin_only`, `disabled`, and `event_button_color`, but re-importing them silently reset `admin_only`/`disabled` to `false` and dropped `event_button_color`, since the import path only forwarded a subset of fields to the server (#60, thanks @schmidtocean)
- **Long custom vocabulary could crash clipboard export** — cruise/lowering clipboard formatting right-pads labels to a fixed column width sized for the default "Cruise"/"Lowering" wording; a longer `CUSTOM_CRUISE_NAME`/`CUSTOM_LOWERING_NAME` made the padding count go negative, and `String.repeat()` throws on a negative count (#58, thanks @schmidtocean)
- **Depth plot domain didn't match lowering start/stop** — the milestones/stats depth chart had no explicit `xAxis` range, so it scaled to the extent of the depth data instead of the lowering's actual start/stop, making the plot's visible range inconsistent with the milestones shown alongside it (#22)

### Security
- Bumped `nanoid` to 3.3.18, resolving an indefinite-loop DoS advisory (GHSA-2v37-7h3g-55p8)

### Internal
- Updated `axios`, `@fontsource/roboto`, `css-loader`, `html-webpack-plugin`, `prettier`, `sass`, `webpack`, and `webpack-cli` to their latest versions within existing semver ranges

## [2.4.12] - 2026-08-18

### Added
- **Toast on failed event submission** — `createEvent`/`updateEvent` previously swallowed REST failures silently, so an event that never reached the server (or was rejected) was indistinguishable from a successful submission; failures now surface as a transient toast
- **Websocket connection status in footer** — the footer now shows "Server: Connected"/"Disconnected", reflecting the status of the websocket connection used for live status updates

## [2.4.10] - 2026-08-06

### Fixed
- **System users table pagination expanded instead of paginating** — the users table's row slicing always used the non-system table's page state for the start index regardless of which table was being paged, so paging the system users table grew the visible range instead of moving to the next page, and paging the non-system table could make the system table appear to show 0 records
- **Non-system user count used the wrong filtered list** — the displayed count for non-system users read from the system users' filtered list instead of its own

## [2.4.9] - 2026-08-06

### Fixed
- **Event template dropdown/checkbox/radio default values falsely flagged invalid** — the comma-separated options list wasn't trimmed before being compared against the default value, so whitespace after commas (e.g. `foo, bar`) caused valid defaults to fail validation
- **Only the first checkbox default value was pre-checked** — the same untrimmed split caused all but the first value in a multi-value checkbox default to fail to match against the option list, leaving them unchecked

## [2.4.8] - 2026-07-30

### Fixed
- **Broken CSS in production builds** — `MiniCssExtractPlugin`'s output filename template had a stray duplicated bracket, producing CSS files with a literal `[` in the name and a URL-encoded href in `index.html`
- **Roboto font unreachable on network-restricted deployments** — the compiled CSS pulled Roboto from `fonts.googleapis.com` at page-load time; it's now self-hosted via the `@fontsource/roboto` package and bundled by webpack

## [2.4.7] - 2026-07-25

### Added
- **Full text search in review gallery** — a debounced search field filters images by event tag, free text, and event option values via the server's fulltext query param

## [2.4.6] - 2026-07-16

### Added
- **Color-select form element** — the event template "Button Color" field now renders each option styled with its own Bootstrap variant (matching how the template button will actually appear), instead of a plain text `<select>`

### Security
- Pinned `uuid` (transitive dependency via `webpack-dev-server` → `sockjs`) to 11.1.1, resolving Dependabot alert #75

## [2.4.5] - 2026-07-14

### Added
- **Duplicate button for event templates** — a copy icon on each row in both the System and non-system event template tables creates a new template identical to the original with "Copy of " prepended to the event name
- **Per-template event button color** — event templates can set an `event_button_color` field to override the button's Bootstrap variant in the event logging UI, falling back to the new `DEFAULT_EVENT_TEMPLATE_BUTTON_COLOR` client setting (defaults to `primary`, preserving prior behavior) when unset

### Internal
- Updated `axios`, `@babel/*`, `concurrently`, `eslint-plugin-prettier`, `prettier`, `sass`, `webpack`, `webpack-cli`, and `webpack-dev-server`

## [2.4.3] - 2026-04-11

### Fixed
- **Event exports scoped to current lowering** — `ExportDropdown` in the review replay view was passing `cruiseID` instead of `loweringID`, causing exports to return all events across the cruise rather than just the current lowering
- **Event comment not saved without file attachments** — submitting a comment in the event comment modal returned early before calling `handleUpdateEvent` when no file attachments were present, silently discarding the comment

### UI
- **Clickable elements styled as interactive** — elements with `onClick` handlers now show a pointer cursor; icons acting as buttons carry `role="button"`; event list rows extend the click target to the full row width including the comment icon; event image cards show reduced opacity on hover

### Security
- Removed underline-on-hover from clickable elements to match design intent

### Internal
- Updated `babel-loader` to v10, `eslint-config-prettier` to v10, `sass-loader` to v16, and `webpack-cli` to v7
- Switched `sass-loader` to modern Sass API (`api: 'modern'`)
- Renamed `--node-env` to `--config-node-env` in npm scripts to match webpack-cli v7

## [2.4.2] - 2026-04-10

### Added
- **Event file attachments** — events can now have files attached via the event template options modal; attached files are stored as `eventFileAttachments` aux data records
- **Attachment previews in comment modal** — file attachments are displayed as thumbnail image previews with filename and delete controls in the event comment modal
- **Login via email** — users can now log in using either their username or email address
- **POWER_LOGGER user role** — new role added for users who need elevated event logging permissions
- **WebSocket live updates in Event Management** — the event list now updates in real time as events are created, modified, or deleted

### Fixed
- **Newest event not displaying** — race condition in event history caused the most recent event to not appear on load
- **Event history card stability** — the newest event card no longer changes when navigating to older pages; it always reflects the most recent event
- **Review replay stale state** — playback controls (play, fast-forward, reverse, start, end) were advancing to the wrong event due to stale state reads after `setState`; all fixed
- **Review replay timer leak** — slider debounce timer was stored in component state, preventing proper cleanup on unmount
- **Gallery tab timer** — pagination debounce timer moved from component state to instance variable, eliminating stale state reads
- **Event management pagination** — page number now adjusts correctly after an event is deleted
- **WebSocket disconnect** — execute modal now properly disconnects its WebSocket client on unmount

### Security
- Resolved all npm audit vulnerabilities
- Upgraded `@hapi/nes` to v14

### Internal
- Extracted shared utilities (`resolveStartTS`, `connectWSClient`, `buildEventQuery`) into `src/utils.js`; adopted across event history, event management, event template list, and footer
- Removed unused `lowering_dropdown.js` component
- Removed pointless `connect(null, null)` Redux wrappers from `CustomPagination` and `ExportDropdown`
- Eliminated state-mirroring-props pattern in `ExportDropdown`; extracted triplicated query building into `buildQuery()`
- Extracted repeated `findCurrentCruise()` helper in `CruiseMenu`
- Removed empty constructor and unused import in `EventLogging`
- Removed unused `replayEventIndex` state and dead code branch in `ReviewGallery`
- Updated `prettier`, `concurrently`, and `sass` to latest

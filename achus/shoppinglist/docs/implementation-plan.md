# Local-First Shopping List PWA — Implementation Plan

## 1. Product summary

Create a very small, installable shopping-list web app inspired by the ruled shopping pad in the reference image. The supplied kitchen-character poster is the primary background, while the editable list sits on a light translucent surface. The app will work entirely in the browser, save its state on the current device, and remain usable without a network connection after the first visit.

The product should feel as immediate as writing on a fridge-mounted notepad: open it, type an item, tick it off, and clear the list when the shop is finished.

## 2. Goals

- Make adding and checking off an item possible with minimal interaction.
- Persist the list locally across page reloads, browser restarts, and installed-app launches.
- Support installation as a Progressive Web App (PWA) on compatible mobile and desktop browsers.
- Work offline after the initial successful load.
- Keep the interface responsive, accessible, and pleasant on both phones and larger screens.
- Avoid accounts, servers, analytics, third-party APIs, and network-dependent features.

## 3. Non-goals for the first version

- Cloud sync or sharing between devices.
- User accounts or authentication.
- Multiple named lists, categories, prices, quantities, recipes, or store aisles.
- Push notifications or background synchronization.
- A framework, database, backend, or build pipeline.
- Reproducing the reference product's logo, store attribution, or other branding.

These can be revisited later, but they would weaken the deliberate simplicity of the initial product.

## 4. Reference-image analysis and visual direction

The physical product communicates its purpose with a few strong cues:

- A warm yellow writing surface that is visually distinct from its surroundings.
- A tall, narrow notepad proportion with generously rounded corners.
- A large, friendly title at the top.
- Repeated horizontal writing lines with small loop-like marks on the left.
- Almost no visual clutter or secondary controls.

The web app should translate those qualities rather than copy the photographed product literally:

- Use the supplied cute kitchen-character illustration as a full-page background, softened by a warm translucent overlay.
- Place a light translucent list surface above the illustration so the poster remains clearly visible.
- Give the card a restrained shadow and rounded corners so it feels like a physical pad.
- Use one editable list row per item, with a large checkbox replacing the decorative loop.
- Keep controls visually quiet and place destructive actions away from the primary input.
- Use original typography and icons; do not reuse the product's branding.

Suggested palette:

- List surface: translucent warm cream.
- Page background: `#F7F3EA`.
- Primary text: `#28231B`.
- Ruled lines: a translucent cream/white.
- Focus and action color: a dark amber or charcoal with sufficient contrast.

Exact colors should be adjusted during implementation to meet WCAG AA contrast requirements.

### Background-image treatment

Use the attached kitchen illustration as atmosphere, not as the surface behind the list text. The recommended composition is:

1. A fixed or viewport-filling image layer using `background-size: cover`.
2. A warm cream overlay above the image at roughly 68–82% opacity.
3. A translucent warm-cream list surface above both layers.

The image itself should remain at full opacity; separate overlays provide the faded appearance. Applying `opacity` to the page container would also fade the list and controls, reducing legibility.

Start with a light cream overlay and tune it during visual testing. A subtle `saturate()` reduction is acceptable, but heavy blur should be avoided because it can make the friendly characters look muddy. The translucent list surface must retain enough contrast for text, controls, and ruled lines in every crop.

Responsive crop guidance:

- On phones, center the two characters and cooking area using a percentage-based `background-position`; accept that some cabinetry and window detail will be cropped.
- On wide screens, keep the characters visible while allowing more of the kitchen environment to appear around the card.
- If a centered list card obscures both character faces, offset the background position rather than shrinking the app into an impractically narrow column.
- Keep a plain warm background color underneath the image as a fallback while it loads or when images are disabled.

Asset handling:

- Copy the user-supplied source into the project rather than referencing the Downloads path or a remote URL.
- Export an optimized WebP version for normal use and retain a compressed JPEG fallback if needed.
- Preserve enough resolution for common mobile screens, but avoid upscaling the source into a large file that adds no detail. The supplied portrait image is best suited to phone and narrow tablet crops; desktop should use `cover` without pretending it is a high-resolution hero photograph.
- Include the chosen local image file in the service-worker application shell so the visual remains available offline.
- Confirm that the image is owned by the user or licensed for publication before deploying it publicly.

## 5. Core user experience

### Empty state

The page opens directly to a translucent ruled list over the poster. The title reads “Shopping List.” Twelve editable lines are visible immediately, even when the list is empty. The first available line carries a short “Type an item…” prompt, but the mobile keyboard is not forced open on page load.

### Add an item

1. The user types directly into any visible ruled line.
2. The line becomes an item as soon as it contains non-whitespace text.
3. The item is saved automatically while typing.
4. Pressing Enter moves focus to the next line.
5. Leading and trailing whitespace is removed when the user leaves the line.
6. Empty lines remain available and are not stored as items.

Duplicate item names are allowed because a person may intentionally need the same item more than once.

### Complete an item

- Selecting a row's checkbox toggles its completed state.
- Completed text becomes visibly struck through and slightly muted, but remains readable.
- Completed items stay in their current positions to avoid surprising movement while shopping.
- The updated state is saved immediately.

### Edit and remove an item

- Item text is always an inline input, so no separate edit mode or edit icon is necessary.
- A delete cross appears only when the line contains an item.
- Delete removes only that line's item and leaves the ruled line available for new text.
- Item deletion may offer a short-lived Undo message so accidental taps are recoverable without a confirmation dialog.

### Clear actions

Provide two clearly named actions in a small footer/menu:

- “Clear checked” removes completed items and is disabled when none are completed.
- “Clear all” removes every item and requires confirmation because it is destructive.

The confirmation should name the consequence, for example: “Clear all 8 items? This cannot be undone.” Focus must return to a sensible location after dismissal or confirmation.

### Refresh and relaunch

The app restores items, completion states, and ordering from local storage before rendering the interactive list. A first-time user receives an empty list.

## 6. Accessibility and interaction requirements

- Use semantic HTML: a form for item entry, a list for items, real buttons, and real checkbox inputs.
- Every icon-only control must have an accessible name.
- Maintain a visible keyboard focus indicator on every interactive element.
- Support Enter to add/save and Escape to cancel editing.
- Use an `aria-live` region for concise feedback such as “Milk added,” “Item deleted,” or “List cleared.”
- Keep touch targets at least 44 by 44 CSS pixels.
- Do not communicate completion or errors using color alone.
- Respect `prefers-reduced-motion`; animation is optional and must not be required to understand state.
- Ensure the layout works at 320 CSS pixels wide, at 200% zoom, and in portrait or landscape.
- Use a system font stack by default so the app remains fast and offline-safe. A decorative title face is optional only if bundled locally.

## 7. Technical approach

Use a buildless static application with plain HTML, CSS, and modern JavaScript. This is the smallest reliable architecture for the requested feature set and can be hosted on GitHub Pages or any static host.

Proposed structure:

```text
shoppinglist/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── assets/
│   ├── images/
│   │   ├── kitchen-background.webp
│   │   └── kitchen-background.jpg
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── maskable-512.png
│   └── favicon.svg
├── src/
│   ├── app.js
│   ├── storage.js
│   └── styles.css
└── docs/
    └── implementation-plan.md
```

Keep modules narrowly scoped:

- `app.js`: state transitions, rendering, DOM events, dialogs, and user feedback.
- `storage.js`: schema validation, load/save behavior, migration, and safe fallback handling.
- `styles.css`: responsive layout, pad-inspired visual treatment, states, and accessibility rules.
- `service-worker.js`: cache only the application shell and bundled background required for offline use.

No runtime dependencies are necessary.

## 8. State and local-storage design

Use a single versioned local-storage record.

Storage key:

```text
shopping-list:v1
```

Suggested shape:

```json
{
  "version": 1,
  "items": [
    {
      "id": "7be0b03b-54ea-45de-88a1-d75f8591a875",
      "text": "Milk",
      "completed": false,
      "createdAt": "2026-11-03T13:45:00.000Z",
      "updatedAt": "2026-11-03T13:45:00.000Z"
    }
  ]
}
```

Implementation notes:

- Generate item IDs with `crypto.randomUUID()` and provide a small fallback if needed.
- Treat the in-memory array as the current source of truth during the session.
- Save synchronously after every successful mutation; the data volume is tiny.
- Parse stored JSON inside `try/catch` and validate its basic shape before using it.
- If data is malformed, preserve the bad value under a timestamped recovery key where possible, reset to a safe empty list, and show a non-blocking recovery message.
- If storage is unavailable or quota-limited, keep the app functional for the current session and tell the user that changes may not persist.
- Never store HTML. Render item text with `textContent` to prevent script injection.

Local storage is appropriate here because the data is small, synchronous, private to one browser profile, and does not need queries or binary storage. IndexedDB would add complexity without a first-version benefit.

Privacy caveat: “local-only” means no application server receives the list. The data can still be read by other scripts running on the same origin, may be included in device/browser backups, and disappears if the user clears site data or uninstalls the PWA with data removal.

## 9. PWA and offline plan

### Web app manifest

`manifest.webmanifest` should include:

- `name`: “Shopping List”
- `short_name`: “List”
- `description`: a short local-first description
- `start_url`: a path safe for the final hosting location
- `scope`: the application's hosting path
- `display`: `standalone`
- `background_color` and `theme_color` matching the design
- 192px and 512px icons
- A 512px maskable icon using safe-zone padding

For a GitHub Pages project subpath, avoid root-relative asset and service-worker paths. Use relative paths or inject the correct repository base path so installation and offline loading work at `/shoppinglist/` rather than only at `/`.

### Service worker

- Register the worker only in supported browsers and only from a secure context (`https` or localhost).
- Precache the small app shell: HTML, CSS, JavaScript, manifest, icons, and the optimized background image.
- Use a versioned cache name such as `shopping-list-shell-v1`.
- Delete old app-owned caches during activation without touching unrelated caches.
- Use a cache-first strategy for immutable local assets.
- Use a network-first strategy with cached fallback for the main HTML document so updates propagate without sacrificing offline launch.
- Do not cache third-party resources because the app should not require any.
- Surface an unobtrusive “Update available” action when a new worker is waiting; do not unexpectedly reload while the user is editing.

The service worker affects application assets only. Shopping-list data remains in local storage and does not need background sync.

### Installation behavior

- Meet browser installability requirements, but do not make installation mandatory.
- If `beforeinstallprompt` is available, an optional “Install app” action can be shown in a small settings/about area.
- On iOS, where install prompting differs, provide a short manual “Add to Home Screen” hint only when useful.
- Hide install guidance after installation or when running in standalone mode.

## 10. Responsive layout

### Phone

- Fill most of the viewport width with the translucent ruled list surface.
- Keep controls within thumb reach and account for safe-area insets.
- Crop the portrait background around the characters without relying on important details at the extreme edges.
- Use a sticky input area only if testing shows it improves long-list use without hiding content or fighting the on-screen keyboard.

### Tablet and desktop

- Constrain the card to a comfortable width, approximately 420–560px.
- Center it with ample surrounding space.
- Allow the background to crop with `cover`; do not stretch it to the viewport's aspect ratio.
- Preserve the tall-notepad impression without forcing a fixed height; the page should scroll naturally for long lists.

## 11. Error handling and resilience

- Invalid/empty input: ignore it and retain focus; do not create blank rows.
- Extremely long input: enforce a practical limit (recommended: 120 characters), show the limit near the field, and avoid silent truncation.
- Storage failure: continue in memory and show a persistent but non-blocking warning.
- Corrupted stored state: recover to an empty valid state, preserve a backup when possible, and inform the user.
- Service-worker failure: the online page must still work normally; offline support is an enhancement, not a dependency for core interaction.
- Unsupported PWA installation: keep the website fully usable in the browser.

## 12. Implementation phases

### Phase 1 — Static foundation

- Create semantic HTML and the responsive pad-inspired layout.
- Bundle and optimize the supplied kitchen illustration, then implement the separate background and overlay layers.
- Implement direct line entry, toggle, in-place editing, delete, clear-checked, and clear-all interactions.
- Add keyboard behaviors, confirmation dialog, Undo for single-item deletion, and live-region feedback.

Exit condition: all list operations work in a normal browser session without persistence.

### Phase 2 — Local persistence

- Add the versioned storage module.
- Restore state at startup and save after every mutation.
- Add validation and graceful handling for unavailable or corrupted storage.

Exit condition: list contents and completion states survive reload and browser restart.

### Phase 3 — PWA support

- Create the manifest, original app icons, theme metadata, and service worker.
- Add safe update handling and optional install guidance.
- Verify hosting-path behavior for the intended GitHub Pages subdirectory.

Exit condition: the app can be installed where supported and launches offline after one successful online visit.

### Phase 4 — Verification and polish

- Test narrow/mobile and desktop layouts, long lists, long item names, and the on-screen keyboard.
- Check background crops at representative portrait and landscape sizes, including whether the characters remain recognizable without competing with the list.
- Test keyboard-only navigation, focus restoration, reduced motion, zoom, and screen-reader labels.
- Test corrupted storage, blocked storage, cache updates, offline reload, and installed standalone launch.
- Run browser accessibility and PWA checks, then fix actionable issues.

Exit condition: all acceptance criteria below pass in the supported browser matrix.

## 13. Acceptance criteria

### List behavior

- A user can create an item by typing directly into any ruled line.
- Pressing Enter moves focus to the next line.
- Blank or whitespace-only items are not created.
- A user can check and uncheck an item.
- A user can edit and delete an individual item.
- A user can remove only checked items.
- “Clear all” states how many items will be removed and requires confirmation.
- All successful mutations are immediately reflected and persisted.

### Persistence and privacy

- Reloading or reopening the app restores item text, completion state, and ordering.
- No list content is sent to an application server or third-party service.
- Storage errors do not make the UI unusable.

### PWA and offline

- The manifest is valid and includes standard and maskable icons.
- The service worker is scoped to the app and does not interfere with sibling GitHub Pages content.
- After the app has loaded once online, the installed app and browser page can open offline.
- A new application version can replace the old cache without deleting the shopping list.

### Accessibility and responsiveness

- All functions are available by keyboard.
- Focus is visible and restored appropriately after dialogs and inline editing.
- Controls have accessible names and touch-friendly target sizes.
- Text and meaningful UI states meet WCAG AA contrast.
- The background image is softly visible but does not reduce list, control, focus, or status-message contrast below WCAG AA targets.
- The app remains visually coherent when the background image fails to load.
- The interface remains usable at 320px width and 200% zoom.

## 14. Test matrix

Minimum manual coverage:

- Chrome/Edge desktop: standard browser and installed standalone mode.
- Android Chrome: add-to-home-screen/installed mode, offline launch, and soft keyboard.
- Safari on iPhone: browser use and Add to Home Screen behavior.
- Firefox desktop: core app and offline behavior, acknowledging that install UI differs.

Automatable checks can use small browser tests for:

- Storage load/save and corrupted-data recovery.
- Add, toggle, edit, delete, clear-checked, and clear-all flows.
- Keyboard submission and cancellation.
- Manifest link, service-worker registration, and required cached assets.

## 15. Recommended first-version decisions

- Use plain HTML, CSS, and JavaScript.
- Use local storage, not IndexedDB.
- Keep a single list and preserve manual ordering.
- Allow duplicates.
- Keep completed items in place.
- Keep item text directly editable and show a delete cross only on populated lines.
- Include both Clear checked and confirmed Clear all.
- Include offline support and installability from the first release.
- Bundle the supplied kitchen illustration locally with a separate warm overlay rather than lowering the opacity of the entire interface.
- Host as static files under the existing GitHub Pages project path.

This scope is small enough to implement and verify in one focused pass while still delivering the main promise: a private, quick shopping pad that lives on the user's device.

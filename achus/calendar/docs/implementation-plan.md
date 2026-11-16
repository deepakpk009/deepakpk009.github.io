# Cozy Calendar — Product and Implementation Plan

## 1. Product summary

Build a private, local-first calendar inspired by the supplied mobile month view. The application keeps the reference's strongest interaction pattern—a compact month grid above the selected day's agenda—but replaces the black backdrop with the supplied sunset illustration and a dark translucent glass surface. It runs as a static Progressive Web App with no account, API, analytics, or server-side data.

## 2. Design analysis

The reference establishes a clear hierarchy:

- A short month title and utility actions occupy the top bar.
- A Monday-first, seven-column grid is the primary navigation surface.
- Muted adjacent-month dates keep the six-week calendar stable.
- Selected and current dates use distinct treatments.
- Small colored lines communicate event density without crowding cells.
- The selected date and its agenda sit directly beneath the grid.
- A wide, thumb-friendly add action anchors the flow.

The implementation preserves this hierarchy without copying platform chrome or branding. The attached illustration is used as a fixed, full-viewport background. A translucent burgundy-brown panel, blur, and gradient overlay keep controls readable while allowing the sunset and characters to remain visible. Peach, sage, sky, and plum accents echo the illustration and replace the original neon green.

## 3. First-version features

### Month calendar

- Monday-first, fixed six-week grid with preceding and following month dates.
- Previous and next month navigation.
- A Today control that returns to the current date.
- Separate styles for today, the selected date, Sundays, and dates outside the visible month.
- Up to three color markers per day plus an overflow count.

### Daily agenda

- Selecting a day immediately displays that day's events.
- Events sort with all-day entries first, followed by start time and title.
- Cards show title, all-day/timed information, optional notes, and a color accent.
- Empty days receive a quiet, useful empty state.

### Event management

- Create an event for the selected date.
- Edit any existing event by opening its agenda card.
- Delete an event after explicit confirmation.
- Fields: title, date, all-day toggle, optional start/end time, color, and optional notes.
- Validate required titles and prevent end times earlier than start times.
- Moving an event to another date selects and opens that date after saving.

### Search

- Search locally across event titles and notes.
- Show matched date and time in chronological order.
- Selecting a result opens the matching date and event.

### Local-first and offline behavior

- Store a versioned `cozy-calendar:v1` record in `localStorage`.
- Validate saved data before using it and preserve malformed data under a recovery key when possible.
- Continue in memory and show a warning if persistent storage is unavailable.
- Cache the application shell, icons, scripts, and supplied background with a service worker.
- Provide PWA metadata and app icons for installation on compatible browsers.

## 4. Deliberate non-goals

- Accounts, cloud sync, sharing, analytics, or a backend.
- Push notifications or alarm scheduling.
- External holiday, weather, or public-calendar feeds.
- Recurrence rules, attendees, attachments, locations, or multiple calendars.
- Import/export and cross-device migration.

These are useful future directions, but recurrence and reminders need additional product decisions, while cloud-connected features conflict with the requested fully local architecture.

## 5. Data model

```json
{
  "version": 1,
  "events": [
    {
      "id": "local-uuid",
      "title": "Dinner with family",
      "date": "2026-11-24",
      "allDay": false,
      "startTime": "19:00",
      "endTime": "21:00",
      "color": "sunset",
      "notes": "Bring dessert",
      "createdAt": "2026-11-16T12:00:00.000Z",
      "updatedAt": "2026-11-16T12:00:00.000Z"
    }
  ]
}
```

Dates are stored as local calendar keys (`YYYY-MM-DD`) rather than UTC timestamps so an event does not silently move to another day when the browser's timezone changes. Time values remain optional local `HH:MM` strings.

## 6. Accessibility and interaction requirements

- Use real buttons, inputs, labels, fieldsets, and a native modal dialog.
- Give every icon-only action an accessible name.
- Keep touch targets near or above 44 CSS pixels.
- Provide strong visible keyboard focus and screen-reader announcements for mutations.
- Do not communicate event categories or selected state through color alone.
- Preserve usability at 320px width, 200% zoom, portrait, and landscape.
- Respect reduced-motion preferences.
- Never inject saved text as HTML.

## 7. Technical structure

```text
calendar/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── assets/
│   ├── favicon.svg
│   ├── icons/
│   └── images/calendar-background.jpeg
├── docs/implementation-plan.md
├── scripts/generate-icons.mjs
└── src/
    ├── app.js
    ├── storage.js
    └── styles.css
```

The app is buildless HTML, CSS, and modern JavaScript. Relative URLs keep it safe for a GitHub Pages subdirectory. It has no runtime dependencies and makes no third-party requests.

## 8. Error handling and resilience

- Invalid persisted data is backed up where possible and reset safely.
- Storage failures do not block the current session.
- Blank titles are rejected with inline feedback.
- Timed events require a start time; a supplied end time must be later.
- Service-worker failure does not affect online calendar use.
- Missing background imagery falls back to the same warm brown palette.

## 9. Verification plan

- Syntax-check both JavaScript modules and the icon generator.
- Serve the directory over HTTP and verify all application-shell resources return successfully.
- Exercise month navigation, adjacent-month selection, Today, add, edit, move, delete, search, and empty states.
- Reload to confirm persistence.
- Test narrow phone and desktop viewports visually.
- Confirm the service worker caches only this app's namespaced shell and relative assets.
- Confirm no external network resources or application data requests exist.

## 10. Acceptance criteria

- A user can select any visible date and add one or more events to it.
- Events can be viewed, edited, moved, searched, and deleted.
- Event markers and the selected-day agenda stay in sync after every mutation.
- Calendar data survives reloads and remains entirely in the current browser profile.
- The app can launch offline after one successful load through HTTP/HTTPS.
- The supplied image is bundled locally and remains visible without reducing essential text contrast.
- The interface is keyboard accessible, responsive, and installable where PWA installation is supported.


# Cozy Calendar

A private, offline-first calendar inspired by a compact mobile month view. Events are stored only in the current browser with `localStorage`; there is no account, server, analytics, or external API.

## Features

- Navigate a Monday-first month calendar and jump back to today.
- Select any date and add all-day or timed events.
- Edit, move, color-label, search, and delete saved events.
- See per-day event markers and a focused daily agenda.
- Install as a Progressive Web App in supported browsers.
- Continue using the app offline after the first successful load.
- Use the bundled sunset illustration as a responsive background.

The full product and technical analysis is in [docs/implementation-plan.md](./docs/implementation-plan.md).

## Run locally

From this directory, serve the files over HTTP:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`. Service workers require localhost or HTTPS; opening `index.html` directly is enough only for a basic layout check.

## Deploy

Publish the `calendar/` directory as static files. Relative URLs allow it to work from a subpath such as `/calendar/` on GitHub Pages.

## Regenerate app icons

The dependency-free icon generator writes the 192px, 512px, and maskable PNG files:

```sh
node scripts/generate-icons.mjs
```

## Privacy

Calendar content never leaves this browser through the application. Clearing site data removes saved events, and data does not automatically sync to another browser or device.

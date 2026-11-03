# Shopping List

A small, local-first shopping-list Progressive Web App. Items are stored only in the current browser with `localStorage`, and the app works offline after its first successful load.

## Features

- Add, check, edit, and delete shopping items.
- Undo an accidental single-item deletion.
- Clear checked items or confirm before clearing the whole list.
- Install as a standalone PWA in supported browsers.
- Continue using the app offline.
- Responsive, keyboard-accessible interface with a bundled background image.

## Run locally

Serve the directory over HTTP so the service worker can register:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

Opening `index.html` directly from the filesystem is enough to inspect the layout, but install and offline behavior require localhost or HTTPS.

## Deploy

The project has no build step or runtime dependencies. Publish the repository directory as static files, including `index.html`, `src/`, `assets/`, `manifest.webmanifest`, and `service-worker.js`.

Relative URLs are used throughout, so the app works from a GitHub Pages project path such as `/shoppinglist/` as well as from a domain root.

## Regenerate app icons

The PNG PWA icons are generated from the same original design as `assets/favicon.svg`:

```sh
node scripts/generate-icons.mjs
```

## Privacy

The app has no account, backend, analytics, or third-party requests. Clearing browser site data removes the saved list.

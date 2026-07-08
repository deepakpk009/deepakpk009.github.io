# Static Website Generator

A reusable static site generator for app landing pages. Each app keeps
its own `content.json` while sharing a common generator, renderer,
template, CSS, and browser interaction script.

## Folder Structure

``` text
website/
├── generator/
│   ├── generate_static.js
│   ├── renderer.js
│   ├── template.html
│   ├── styles.css
│   └── site.js
├── dittoscan/
│   ├── content.json
│   ├── images/
│   ├── index.html (Generated)
│   ├── styles.css (Generated)
│   └── manifest.webmanifest (Generated)
└── browsepad/
```

## Requirements

-   Node.js 18+
-   No external npm packages required.

``` bash
node -v
```

## Generator Components

### generate_static.js

Generates the static website from `content.json`.

### renderer.js

Builds all HTML sections and SEO metadata.

### template.html

Shared HTML template.

### styles.css

Master stylesheet. Automatically themed and copied into each product
folder.

### site.js

Shared browser interactions: - Screenshot slideshow - FAQ
expand/collapse - Smooth scrolling - Scroll animations

## Generate One App

``` bash
node generator/generate_static.js dittoscan
```

## Generate All Apps

``` bash
node generator/generate_static.js --all
```

## Local Preview

``` bash
python3 -m http.server 8000
```

Visit:

``` text
http://localhost:8000/dittoscan/
```

## Theme

Edit the `theme` section in `content.json`. The generator creates a
themed `styles.css`; no JavaScript is used to apply colors.

## Generated Files

-   index.html
-   styles.css
-   manifest.webmanifest

Do not edit these manually.

## Editable Files

``` text
generator/
  generate_static.js
  renderer.js
  template.html
  styles.css
  site.js

<app>/
  content.json
  images/
```

## Workflow

``` text
Edit content.json
      ↓
Run generator
      ↓
Generate:
- index.html
- styles.css
- manifest.webmanifest
      ↓
Deploy app folder
```

## Planned Improvements

-   Root sitemap.xml generator
-   Root robots.txt generator
-   Root llms.txt generator
-   HTML/CSS minification
-   Image optimization
-   JSON validation
-   Broken link checker

## Notes

-   Fully static pages.
-   SEO is generated at build time.
-   JavaScript is only for UI interactions.
-   Each app is independently deployable.

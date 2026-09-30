# Technology stack

Site: static HTML, CSS and JavaScript. No build step, no package manager, no framework.

## Dependencies

| Package | Version (exact) | License | Source | Where it lives |
|---|---|---|---|---|
| three | 0.186.1 | MIT | https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js and https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.min.js (npm package `three`) | `assets/vendor/three.module.min.js`, `assets/vendor/three.core.js` |

Notes on the two files:

- `three.module.min.js` imports `./three.core.js`, so the core build is vendored next to it. The file `three.core.js` is the published `three.core.min.js` of the same release, saved under the name the module imports.
- SHA-256 at vendoring time (2026-09-30): `three.module.min.js` 3bc833fceb6577bd1a380388f832ae61cd6e2f78ad02b0bf0d5adf5a4a9334fe, `three.core.js` f3b346151f65ffdfca3e4c002bd58966b78c423087fb48a873f83200de1bffc48. Both files report `REVISION = "186"`.

### Why it entered

The landing page needs a depth effect in the hero (a slowly rotating network of points with pulsing nodes, parallax with pointer and scroll) that plain CSS cannot produce. three.js renders it in WebGL. The pinned human-in-the-loop scene and the case chapters do not use it: they are CSS `position: sticky` plus scroll progress computed in JavaScript.

### Discarded alternatives

- Plain CSS or Canvas 2D: less depth, no real perspective or cheap per-point transforms.
- GSAP: not needed. Scroll effects use IntersectionObserver, requestAnimationFrame and CSS, so it would only add a dependency.

### Vulnerability check

- Date: 2026-09-30.
- Method: OSV query, `POST https://api.osv.dev/v1/query` with package `three`, ecosystem `npm`, version `0.186.1`.
- Result: empty response (`{}`), no advisory applies to 0.186.1. The only advisory published for the package, GHSA-fq6p-x6j3-cmmq, was fixed in 0.125.0.
- Re-run the same query before changing the version. Because the file is vendored, the version cannot drift: nothing is fetched from a CDN at runtime, so a newer, unreviewed release can never load by itself.

## Other external resources

- Google Fonts (Inter and Source Serif 4), loaded from `fonts.googleapis.com` and `fonts.gstatic.com`. It is the only external resource the pages request at runtime. If it fails to load, the pages fall back to system fonts.

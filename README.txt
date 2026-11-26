# Smooth Tab Transition v4.0.0

## Files
- `theme.json`
- `preferences.json`
- `smooth-tab-transition.uc.mjs`

## Install/update
Replace the corresponding files in the root of your GitHub repository. Keep the filenames exactly as shown. Sine should then detect the new version after the repository update is available.

## Open settings
After enabling/reloading the mod, look for the small circular `◌` toolbar button. Click it to open the integrated settings panel. The panel has Tab Transition, Loading Transition, and General sections.

## Important testing note
This is a first implementation for Zen's chrome context, not a claim of verified compatibility with every Zen release. Test it in a separate Zen profile. If the toolbar button does not appear, the toolbar insertion point may differ in your Zen build. Split View internals also vary by Zen version.

## Current implementation boundaries
- The native Zen loading progress indicator is not selected or styled by this mod; animations are applied to the browser content container.
- Tab and loading settings are stored separately.
- Curve editor supports draggable cubic-bezier control points; Elastic and Bounce are evaluated as sampled curves.
- Loading settings currently govern the wait/fallback behavior and loading animation curve; the main tab-selection transition engine still uses the tab transition settings for its visual entry/exit. Further validation against your exact Zen build is required before treating every advanced loading control as production-ready.

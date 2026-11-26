
# Smooth Tab Transition

Smooth Tab Transition is a Zen Browser mod that adds independent animations for tab switching and page loading.

## Features

### Tab Transition
- Smooth zoom transition
- Blur effect
- Opacity control
- Independent duration
- Multiple easing curves

### Loading Transition
- Independent from Tab Transition
- Separate scale, blur and opacity
- Separate start and completion durations
- Separate easing curve
- Safety timeout for unfinished loads

### Other
- Respects the operating system's reduced-motion preference
- Does not modify Zen's native loading progress indicator
- Settings are available through Zen Mods preferences

## Installation

1. Install the mod through Sine.
2. Restart Zen Browser if necessary.
3. Open Zen Settings and go to Mods.
4. Select Smooth Tab Transition.
5. Configure Tab Transition and Loading Transition independently.

## Preferences

All settings are defined in `preferences.json`.

Tab settings:
- `enabled`
- `duration`
- `scale`
- `blur`
- `opacity`
- `easing`

Loading settings:
- `loading-enabled`
- `loading-duration`
- `completion-duration`
- `loading-scale`
- `loading-blur`
- `loading-opacity`
- `loading-easing`
- `loading-timeout`

General:
- `respect-reduced-motion`

## Technical notes

The mod uses the browser tab progress listener to detect top-level network loading events.

Animations are applied to the page content container, not to the native Zen loading progress indicator.

## Compatibility

Designed for Zen Browser with Sine JavaScript mod support.

The code should be tested against the specific Zen version in use, especially for Split View behavior and browser progress events.

## Version

1.1.0

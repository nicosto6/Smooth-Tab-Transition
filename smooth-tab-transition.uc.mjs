
/*
 * Smooth Tab Transition v2.0.0
 * Zen Browser + Sine
 *
 * Features:
 * - Smooth zoom and blur between normal tabs
 * - Split View treated as one visual unit
 * - No animation between panes of the same Split View
 * - Live settings through Sine preferences
 */

(() => {
    "use strict";

    if (window.__smoothTabTransitionV2) return;
    window.__smoothTabTransitionV2 = true;

    const PREFIX = "smooth-tab-transition.";

    const DEFAULTS = {
        enabled: true,
        duration: 360,
        scale: 0.965,
        blur: 8,
        opacity: 0.55,
        easing: "smooth",
        animateSplit: true,
        respectReducedMotion: true
    };

    const EASINGS = {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
        linear: "linear"
    };

    const activeAnimations = new WeakMap();

    function getBool(name, fallback) {
        try {
            return Services.prefs.getBoolPref(
                PREFIX + name,
                fallback
            );
        } catch {
            return fallback;
        }
    }

    function getNumber(name, fallback, min, max) {
        try {
            const value = Number(
                Services.prefs.getStringPref(
                    PREFIX + name,
                    String(fallback)
                )
            );

            if (!Number.isFinite(value)) return fallback;

            return Math.min(max, Math.max(min, value));
        } catch {
            return fallback;
        }
    }

    function getString(name, fallback) {
        try {
            return Services.prefs.getStringPref(
                PREFIX + name,
                fallback
            );
        } catch {
            return fallback;
        }
    }

    function getSettings() {
        const easingName = getString(
            "easing",
            DEFAULTS.easing
        );

        return {
            enabled: getBool("enabled", DEFAULTS.enabled),

            duration: getNumber(
                "duration",
                DEFAULTS.duration,
                100,
                1200
            ),

            scale: getNumber(
                "scale",
                DEFAULTS.scale,
                0.80,
                0.995
            ),

            blur: getNumber(
                "blur",
                DEFAULTS.blur,
                0,
                24
            ),

            opacity: getNumber(
                "opacity",
                DEFAULTS.opacity,
                0.1,
                1
            ),

            easing: EASINGS[easingName] || EASINGS.smooth,

            animateSplit: getBool(
                "animate-split",
                DEFAULTS.animateSplit
            ),

            respectReducedMotion: getBool(
                "respect-reduced-motion",
                DEFAULTS.respectReducedMotion
            )
        };
    }

    function getContainer(tab) {
        return tab?.linkedBrowser?.closest(
            ".browserSidebarContainer"
        );
    }

    /*
     * Returns the actual Zen Split View group.
     */
    function getSplitGroup(tab) {
        const group = tab?.group;

        if (
            group?.hasAttribute("split-view-group")
        ) {
            return group;
        }

        return null;
    }

    function isSplitTab(tab) {
        return (
            !!getSplitGroup(tab) ||
            tab?.splitView === true ||
            tab?.hasAttribute("split-view") ||
            getContainer(tab)?.hasAttribute("is-zen-split")
        );
    }

    /*
     * Animates one element and cancels only
     * animations created by this mod.
     */
    function runAnimation(element, keyframes, settings) {
        if (!element) return;

        const previous = activeAnimations.get(element);

        if (previous) {
            previous.cancel();
        }

        const animation = element.animate(
            keyframes,
            {
                duration: settings.duration,
                easing: settings.easing,
                fill: "both"
            }
        );

        activeAnimations.set(element, animation);

        animation.finished
            .then(() => {
                if (activeAnimations.get(element) === animation) {
                    activeAnimations.delete(element);
                }

                animation.cancel();
            })
            .catch(() => {});

        return animation;
    }

    /*
     * Normal tab outgoing animation.
     */
    function animateOutgoing(tab, settings) {
        const container = getContainer(tab);

        if (!container) return;

        runAnimation(
            container,
            [
                {
                    transform: "scale(1)",
                    filter: "blur(0px)",
                    opacity: 1
                },
                {
                    transform: `scale(${settings.scale})`,
                    filter: `blur(${settings.blur}px)`,
                    opacity: settings.opacity
                }
            ],
            settings
        );
    }

    /*
     * Normal tab incoming animation.
     */
    function animateIncoming(tab, settings) {
        const container = getContainer(tab);

        if (!container) return;

        runAnimation(
            container,
            [
                {
                    transform: `scale(${settings.scale})`,
                    filter: `blur(${settings.blur}px)`,
                    opacity: settings.opacity
                },
                {
                    transform: "scale(1)",
                    filter: "blur(0px)",
                    opacity: 1
                }
            ],
            settings
        );
    }

    /*
     * Split View transition.
     *
     * The entire tabpanels element is animated.
     * Both split browsers are children of this
     * element, so they move together.
     */
    function animateSplitTransition(settings) {
        const panels =
            gBrowser.tabpanels ||
            document.getElementById("tabbrowser-tabpanels");

        if (!panels) return;

        const reduced = settings.scale;

        runAnimation(
            panels,
            [
                {
                    offset: 0,
                    transform: "scale(1)",
                    filter: "blur(0px)",
                    opacity: 1
                },
                {
                    offset: 0.45,
                    transform: `scale(${reduced})`,
                    filter: `blur(${settings.blur}px)`,
                    opacity: settings.opacity
                },
                {
                    offset: 1,
                    transform: "scale(1)",
                    filter: "blur(0px)",
                    opacity: 1
                }
            ],
            settings
        );
    }

    /*
     * Main tab selection handler.
     */
    function onTabSelect(event) {
        const oldTab = event.detail?.previousTab;
        const newTab = gBrowser.selectedTab;

        if (
            !oldTab ||
            !newTab ||
            oldTab === newTab
        ) {
            return;
        }

        const settings = getSettings();

        if (!settings.enabled) return;

        if (
            settings.respectReducedMotion &&
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            return;
        }

        const oldGroup = getSplitGroup(oldTab);
        const newGroup = getSplitGroup(newTab);

        /*
         * IMPORTANT:
         * Selecting the left or right pane of
         * the SAME Split View must not animate.
         */
        if (
            oldGroup &&
            newGroup &&
            oldGroup === newGroup
        ) {
            return;
        }

        const oldIsSplit = isSplitTab(oldTab);
        const newIsSplit = isSplitTab(newTab);

        /*
         * If either side belongs to a Split View,
         * animate the complete browser viewport.
         */
        if (oldIsSplit || newIsSplit) {
            if (!settings.animateSplit) return;

            animateSplitTransition(settings);
            return;
        }

        /*
         * Normal tab -> normal tab.
         */
        animateOutgoing(oldTab, settings);
        animateIncoming(newTab, settings);
    }

    window.addEventListener(
        "TabSelect",
        onTabSelect,
        true
    );

    console.log(
        "[Smooth Tab Transition] v2.0.0 loaded successfully!"
    );

})();

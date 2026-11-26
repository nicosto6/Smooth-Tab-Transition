
/*
 * Smooth Tab Transition v3.0.0
 * Zen Browser + Sine
 *
 * Features:
 * - Smooth normal tab transitions
 * - Unified Split View transitions
 * - Loading animation: hold first frame until document load
 * - Split View loading modes:
 *      all-at-once
 *      independent
 * - Configurable timeout fallback
 * - Live preferences from Sine
 * - Reduced-motion support
 */

(() => {
    "use strict";

    if (window.__smoothTabTransitionV3) return;
    window.__smoothTabTransitionV3 = true;

    const PREFIX = "smooth-tab-transition.";

    const DEFAULTS = {
        enabled: true,
        duration: 420,
        scale: 0.965,
        blur: 8,
        opacity: 0.55,
        easing: "smooth",

        animateSplit: true,

        loadingEnabled: true,
        waitForLoad: true,
        loadingTimeout: 15000,

        splitLoadingMode: "all",
        completionDuration: 520,

        completionEasing: "smooth",
        loadingBlur: 8,
        loadingOpacity: 0.55,

        overshoot: false,
        respectReducedMotion: true
    };

    const EASINGS = {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
        cinematic: "cubic-bezier(0.19, 1, 0.22, 1)",
        linear: "linear"
    };

    const activeAnimations = new WeakMap();
    const pendingTransitions = new Set();

    let transitionId = 0;

    // --------------------------------------------------
    // PREFERENCES
    // --------------------------------------------------

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
        const easing = getString("easing", "smooth");
        const completionEasing = getString(
            "completion-easing",
            "smooth"
        );

        return {
            enabled: getBool("enabled", true),

            duration: getNumber(
                "duration", 420, 100, 1500
            ),

            scale: getNumber(
                "scale", 0.965, 0.80, 0.995
            ),

            blur: getNumber(
                "blur", 8, 0, 30
            ),

            opacity: getNumber(
                "opacity", 0.55, 0.1, 1
            ),

            easing: EASINGS[easing] || EASINGS.smooth,

            animateSplit: getBool("animate-split", true),

            loadingEnabled: getBool(
                "loading-enabled", true
            ),

            waitForLoad: getBool(
                "wait-for-load", true
            ),

            loadingTimeout: getNumber(
                "loading-timeout", 15000, 1000, 60000
            ),

            splitLoadingMode: getString(
                "split-loading-mode", "all"
            ),

            completionDuration: getNumber(
                "completion-duration", 520, 100, 2000
            ),

            completionEasing:
                EASINGS[completionEasing] || EASINGS.smooth,

            loadingBlur: getNumber(
                "loading-blur", 8, 0, 30
            ),

            loadingOpacity: getNumber(
                "loading-opacity", 0.55, 0.1, 1
            ),

            overshoot: getBool("overshoot", false),

            respectReducedMotion: getBool(
                "respect-reduced-motion", true
            )
        };
    }

    // --------------------------------------------------
    // TAB / SPLIT VIEW HELPERS
    // --------------------------------------------------

    function getContainer(tab) {
        return tab?.linkedBrowser?.closest(
            ".browserSidebarContainer"
        );
    }

    function getSplitGroup(tab) {
        const group = tab?.group;

        return group?.hasAttribute("split-view-group")
            ? group
            : null;
    }

    function getGroupTabs(group, fallbackTab) {
        if (group?.tabs) {
            return Array.from(group.tabs);
        }

        return fallbackTab ? [fallbackTab] : [];
    }

    function isSplitTab(tab) {
        return (
            !!getSplitGroup(tab) ||
            tab?.splitView === true ||
            tab?.hasAttribute("split-view") ||
            getContainer(tab)?.hasAttribute("is-zen-split")
        );
    }

    function getVisualUnit(tab) {
        const group = getSplitGroup(tab);

        if (group) {
            return getGroupTabs(group, tab);
        }

        return [tab];
    }

    // --------------------------------------------------
    // ANIMATION HELPERS
    // --------------------------------------------------

    function cancelAnimation(element) {
        const old = activeAnimations.get(element);

        if (old) {
            old.cancel();
            activeAnimations.delete(element);
        }
    }

    function playAnimation(element, keyframes, options) {
        if (!element) return null;

        cancelAnimation(element);

        const animation = element.animate(
            keyframes,
            {
                fill: "both",
                ...options
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

    function getHiddenFrame(settings) {
        return {
            transform:
                `scale3d(${settings.scale}, ${settings.scale}, 1)`,
            filter: `blur(${settings.blur}px)`,
            opacity: settings.opacity
        };
    }

    function getVisibleFrame() {
        return {
            transform: "scale3d(1, 1, 1)",
            filter: "blur(0px)",
            opacity: 1
        };
    }

    // --------------------------------------------------
    // OUTGOING ANIMATION
    // --------------------------------------------------

    function animateOutgoing(tab, settings) {
        const container = getContainer(tab);

        if (!container) return;

        playAnimation(
            container,
            [
                getVisibleFrame(),
                getHiddenFrame(settings)
            ],
            {
                duration: settings.duration,
                easing: settings.easing
            }
        );
    }

    // --------------------------------------------------
    // LOADING DETECTION
    // --------------------------------------------------

    function isBrowserLoaded(browser) {
        try {
            return (
                browser?.contentDocument?.readyState === "complete" &&
                !browser.webProgress?.isLoadingDocument
            );
        } catch {
            return false;
        }
    }

    /*
     * Wait for the top-level document load event.
     * Subframes are ignored.
     */
    function waitForBrowserLoad(browser, timeout) {
        return new Promise(resolve => {
            if (!browser) {
                resolve("missing");
                return;
            }

            if (isBrowserLoaded(browser)) {
                resolve("loaded");
                return;
            }

            let finished = false;

            const finish = result => {
                if (finished) return;
                finished = true;

                browser.removeEventListener(
                    "load",
                    onLoad,
                    true
                );

                clearTimeout(timer);
                resolve(result);
            };

            const onLoad = event => {
                try {
                    if (
                        event.target === browser.contentDocument &&
                        browser.contentDocument?.readyState === "complete"
                    ) {
                        finish("loaded");
                    }
                } catch {
                    // Ignore inaccessible or replaced documents.
                }
            };

            const timer = setTimeout(
                () => finish("timeout"),
                timeout
            );

            browser.addEventListener("load", onLoad, true);

            // Close the race between the initial check
            // and registering the load listener.
            if (isBrowserLoaded(browser)) {
                finish("loaded");
            }
        });
    }

    // --------------------------------------------------
    // INCOMING ANIMATION
    // --------------------------------------------------

    function createPausedIncoming(tab, settings) {
        const container = getContainer(tab);

        if (!container) return null;

        cancelAnimation(container);

        const animation = container.animate(
            [
                getHiddenFrame(settings),
                getVisibleFrame()
            ],
            {
                duration: settings.completionDuration,
                easing: settings.completionEasing,
                fill: "both"
            }
        );

        animation.pause();
        animation.currentTime = 0;

        activeAnimations.set(container, animation);

        return {
            element: container,
            animation
        };
    }

    function createIncomingUnit(tabs, settings) {
        return tabs
            .map(tab => ({
                tab,
                browser: tab?.linkedBrowser,
                animation: createPausedIncoming(tab, settings)
            }))
            .filter(item => item.animation);
    }

    function finishIncoming(item, settings) {
        const animation = item.animation.animation;
        const element = item.animation.element;

        if (!animation || animation.playState === "finished") {
            return;
        }

        // If the user has switched away, don't leave
        // a hidden animation running on an inactive tab.
        if (!element.isConnected) {
            cancelAnimation(element);
            return;
        }

        if (settings.overshoot) {
            animation.effect.setKeyframes([
                getHiddenFrame(settings),
                {
                    transform: "scale3d(1.012, 1.012, 1)",
                    filter: "blur(0px)",
                    opacity: 1,
                    offset: 0.88
                },
                getVisibleFrame()
            ]);
        }

        animation.play();
    }

    // --------------------------------------------------
    // TRANSITION MANAGEMENT
    // --------------------------------------------------

    function createTransition(tabs, settings, mode) {
        const id = ++transitionId;

        const items = createIncomingUnit(tabs, settings);

        if (!items.length) return;

        const transition = {
            id,
            items,
            settings,
            mode,
            cancelled: false,
            timer: null
        };

        pendingTransitions.add(transition);

        function cancel() {
            if (transition.cancelled) return;

            transition.cancelled = true;
            clearTimeout(transition.timer);

            for (const item of items) {
                const element = item.animation.element;
                cancelAnimation(element);
            }

            pendingTransitions.delete(transition);
        }

        transition.cancel = cancel;

        transition.timer = setTimeout(() => {
            completeAll();
        }, settings.loadingTimeout);

        async function completeAll() {
            if (transition.cancelled) return;

            transition.cancelled = true;
            clearTimeout(transition.timer);

            for (const item of items) {
                finishIncoming(item, settings);
            }

            pendingTransitions.delete(transition);
        }

        async function completeIndependent(item) {
            if (transition.cancelled) return;

            finishIncoming(item, settings);

            const index = items.indexOf(item);
            if (index >= 0) {
                items.splice(index, 1);
            }

            if (!items.length) {
                transition.cancelled = true;
                clearTimeout(transition.timer);
                pendingTransitions.delete(transition);
            }
        }

        async function start() {
            if (!settings.loadingEnabled || !settings.waitForLoad) {
                await completeAll();
                return;
            }

            if (mode === "independent") {
                await Promise.all(
                    items.map(async item => {
                        await waitForBrowserLoad(
                            item.browser,
                            settings.loadingTimeout
                        );

                        if (!transition.cancelled) {
                            await completeIndependent(item);
                        }
                    })
                );
            } else {
                await Promise.all(
                    items.map(item =>
                        waitForBrowserLoad(
                            item.browser,
                            settings.loadingTimeout
                        )
                    )
                );

                await completeAll();
            }
        }

        start();

        return transition;
    }

    function cancelObsoleteTransitions() {
        for (const transition of [...pendingTransitions]) {
            transition.cancel?.();
        }
    }

    // --------------------------------------------------
    // MAIN EVENT
    // --------------------------------------------------

    function onTabSelect(event) {
        const oldTab = event.detail?.previousTab;
        const newTab = gBrowser.selectedTab;

        if (!oldTab || !newTab || oldTab === newTab) {
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
            cancelObsoleteTransitions();
            return;
        }

        const oldGroup = getSplitGroup(oldTab);
        const newGroup = getSplitGroup(newTab);

        // Switching between panes of the same split:
        // no transition.
        if (oldGroup && oldGroup === newGroup) {
            return;
        }

        cancelObsoleteTransitions();

        const oldSplit = isSplitTab(oldTab);
        const newSplit = isSplitTab(newTab);

        if ((oldSplit || newSplit) && !settings.animateSplit) {
            return;
        }

        // Animate the outgoing visual unit.
        const oldUnit = getVisualUnit(oldTab);

        for (const tab of oldUnit) {
            animateOutgoing(tab, settings);
        }

        // Animate the incoming visual unit.
        const newUnit = getVisualUnit(newTab);

        const splitMode = newSplit
            ? settings.splitLoadingMode
            : "all";

        createTransition(
            newUnit,
            settings,
            splitMode
        );
    }

    // --------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------

    window.addEventListener(
        "TabSelect",
        onTabSelect,
        true
    );

    window.addEventListener(
        "unload",
        () => {
            cancelObsoleteTransitions();

            for (const [element, animation] of []) {
                animation.cancel();
            }
        },
        { once: true }
    );

    console.log(
        "[Smooth Tab Transition] v3.0.0 loaded successfully!"
    );

})();

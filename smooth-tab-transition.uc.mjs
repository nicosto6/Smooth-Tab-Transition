
/*
 * Smooth Tab Transition
 * Zen Browser + Sine
 * Version: 1.1.0
 *
 * Tab Transition:
 * - Independent duration, scale, blur, opacity and easing.
 *
 * Loading Transition:
 * - Independent duration, scale, blur, opacity and easing.
 * - Uses the browser progress listener.
 * - Animates only the page content container.
 *
 * The native Zen loading progress indicator is not modified.
 */

(() => {
    "use strict";

    if (window.__smoothTabTransition110) return;
    window.__smoothTabTransition110 = true;

    const PREFIX = "smooth-tab-transition.";

    const DEFAULTS = {
        enabled: true,
        duration: 360,
        scale: 0.965,
        blur: 8,
        opacity: 0.55,
        easing: "smooth",

        loadingEnabled: true,
        loadingDuration: 240,
        completionDuration: 520,
        loadingScale: 0.965,
        loadingBlur: 8,
        loadingOpacity: 0.55,
        loadingEasing: "smooth",
        loadingTimeout: 15000,

        respectReducedMotion: true
    };

    const EASINGS = {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        cinematic: "cubic-bezier(0.19, 1, 0.22, 1)",
        linear: "linear"
    };

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const loadingStates = new WeakMap();

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

    function getString(name, fallback) {
        try {
            return Services.prefs.getStringPref(
                PREFIX + name,
                String(fallback)
            );
        } catch {
            return String(fallback);
        }
    }

    function getNumber(name, fallback, min, max) {
        const value = Number(getString(name, fallback));

        if (!Number.isFinite(value)) return fallback;

        return Math.min(max, Math.max(min, value));
    }

    function getEasing(name, fallback) {
        const value = getString(name, fallback);

        return EASINGS[value] || EASINGS[fallback];
    }

    function getSettings() {
        return {
            enabled: getBool("enabled", DEFAULTS.enabled),

            duration: getNumber(
                "duration", DEFAULTS.duration, 50, 3000
            ),

            scale: getNumber(
                "scale", DEFAULTS.scale, 0.5, 1
            ),

            blur: getNumber(
                "blur", DEFAULTS.blur, 0, 40
            ),

            opacity: getNumber(
                "opacity", DEFAULTS.opacity, 0, 1
            ),

            easing: getEasing(
                "easing", DEFAULTS.easing
            ),

            loadingEnabled: getBool(
                "loading-enabled", DEFAULTS.loadingEnabled
            ),

            loadingDuration: getNumber(
                "loading-duration",
                DEFAULTS.loadingDuration,
                50,
                3000
            ),

            completionDuration: getNumber(
                "completion-duration",
                DEFAULTS.completionDuration,
                50,
                5000
            ),

            loadingScale: getNumber(
                "loading-scale",
                DEFAULTS.loadingScale,
                0.5,
                1
            ),

            loadingBlur: getNumber(
                "loading-blur",
                DEFAULTS.loadingBlur,
                0,
                40
            ),

            loadingOpacity: getNumber(
                "loading-opacity",
                DEFAULTS.loadingOpacity,
                0,
                1
            ),

            loadingEasing: getEasing(
                "loading-easing",
                DEFAULTS.loadingEasing
            ),

            loadingTimeout: getNumber(
                "loading-timeout",
                DEFAULTS.loadingTimeout,
                1000,
                60000
            ),

            respectReducedMotion: getBool(
                "respect-reduced-motion",
                DEFAULTS.respectReducedMotion
            )
        };
    }

    function shouldAnimate(settings) {
        return !(
            settings.respectReducedMotion &&
            reducedMotion.matches
        );
    }

    /*
     * Returns the visible content container.
     * The browser's native loading indicator is outside this target.
     */
    function getContainer(tab) {
        const browser = tab?.linkedBrowser;

        if (!browser) return null;

        return (
            browser.closest(".browserSidebarContainer") ||
            browser.closest(".browserStack") ||
            browser.parentElement
        );
    }

    function cancelAnimation(container) {
        if (!container) return;

        try {
            container.getAnimations().forEach(animation => {
                animation.cancel();
            });
        } catch {
            // Animation cancellation is best-effort.
        }
    }

    function animate(container, from, to, duration, easing) {
        if (!container || duration <= 0) return null;

        cancelAnimation(container);

        try {
            return container.animate(
                [from, to],
                {
                    duration,
                    easing,
                    fill: "none"
                }
            );
        } catch (error) {
            console.warn(
                "[Smooth Tab Transition] Animation error:",
                error
            );

            return null;
        }
    }

    function visibleFrame() {
        return {
            transform: "scale(1)",
            filter: "blur(0px)",
            opacity: 1
        };
    }

    function getTabHiddenFrame(settings) {
        return {
            transform: `scale(${settings.scale})`,
            filter: `blur(${settings.blur}px)`,
            opacity: settings.opacity
        };
    }

    function getLoadingHiddenFrame(settings) {
        return {
            transform: `scale(${settings.loadingScale})`,
            filter: `blur(${settings.loadingBlur}px)`,
            opacity: settings.loadingOpacity
        };
    }

    /*
     * TAB TRANSITION
     */

    function animateTabChange(event) {
        const settings = getSettings();

        if (!settings.enabled || !shouldAnimate(settings)) {
            return;
        }

        const newTab = gBrowser.selectedTab;
        const oldTab = event.detail?.previousTab;

        if (
            !oldTab ||
            !newTab ||
            oldTab === newTab
        ) {
            return;
        }

        const oldContainer = getContainer(oldTab);
        const newContainer = getContainer(newTab);

        if (!oldContainer || !newContainer) return;

        // Do not animate when switching between panels
        // belonging to the same Split View group.
        const oldGroup = oldTab.group;
        const newGroup = newTab.group;

        if (
            oldGroup &&
            newGroup &&
            oldGroup === newGroup
        ) {
            return;
        }

        const hidden = getTabHiddenFrame(settings);
        const visible = visibleFrame();

        animate(
            oldContainer,
            visible,
            hidden,
            settings.duration,
            settings.easing
        );

        animate(
            newContainer,
            hidden,
            visible,
            settings.duration,
            settings.easing
        );
    }

    /*
     * LOADING TRANSITION
     *
     * Loading is independent from Tab Transition.
     * It uses its own scale, blur, opacity and durations.
     */

    function animateLoadingStart(browser, settings) {
        const container = browser?.closest(
            ".browserSidebarContainer"
        );

        if (!container) return;

        const previous = loadingStates.get(browser);

        if (previous?.timer) {
            window.clearTimeout(previous.timer);
        }

        const hidden = getLoadingHiddenFrame(settings);
        const visible = visibleFrame();

        const animation = animate(
            container,
            visible,
            hidden,
            settings.loadingDuration,
            settings.loadingEasing
        );

        const state = {
            container,
            animation,
            timer: null
        };

        state.timer = window.setTimeout(() => {
            finishLoading(browser);
        }, settings.loadingTimeout);

        loadingStates.set(browser, state);
    }

    function finishLoading(browser) {
        const state = loadingStates.get(browser);

        if (!state) return;

        if (state.timer) {
            window.clearTimeout(state.timer);
        }

        const settings = getSettings();

        if (!settings.loadingEnabled || !shouldAnimate(settings)) {
            cancelAnimation(state.container);
            loadingStates.delete(browser);
            return;
        }

        const hidden = getLoadingHiddenFrame(settings);
        const visible = visibleFrame();

        animate(
            state.container,
            hidden,
            visible,
            settings.completionDuration,
            settings.loadingEasing
        );

        loadingStates.delete(browser);
    }

    function onProgressStateChange(
        browser,
        webProgress,
        request,
        flags
    ) {
        const settings = getSettings();

        if (
            !settings.loadingEnabled ||
            !shouldAnimate(settings) ||
            !webProgress?.isTopLevel
        ) {
            return;
        }

        const listener = Ci.nsIWebProgressListener;

        const isNetwork = Boolean(
            flags & listener.STATE_IS_NETWORK
        );

        if (!isNetwork) return;

        const isStart = Boolean(
            flags & listener.STATE_START
        );

        const isStop = Boolean(
            flags & listener.STATE_STOP
        );

        if (isStart) {
            animateLoadingStart(browser, settings);
        }

        if (isStop) {
            finishLoading(browser);
        }
    }

    const progressListener = {
        onStateChange(
            browser,
            webProgress,
            request,
            flags,
            status
        ) {
            try {
                onProgressStateChange(
                    browser,
                    webProgress,
                    request,
                    flags
                );
            } catch (error) {
                console.warn(
                    "[Smooth Tab Transition] Progress listener error:",
                    error
                );
            }
        },

        onProgressChange() {},
        onLocationChange() {},
        onStatusChange() {},
        onSecurityChange() {},
        onContentBlockingEvent() {}
    };

    /*
     * INITIALIZATION
     */

    function init() {
        window.addEventListener(
            "TabSelect",
            animateTabChange,
            true
        );

        try {
            gBrowser.addTabsProgressListener(
                progressListener
            );
        } catch (error) {
            console.error(
                "[Smooth Tab Transition] Could not register loading listener:",
                error
            );
        }

        console.log(
            "[Smooth Tab Transition] v1.1.0 loaded successfully."
        );
    }

    if (gBrowser?.tabContainer) {
        init();
    } else {
        window.addEventListener(
            "load",
            init,
            { once: true }
        );
    }
})();


/*
 * Smooth Tab Transition
 * Zen Browser + Sine
 * Version: 1.1.0-fixed
 *
 * TAB TRANSITION:
 * - Independent duration, scale, blur, opacity and easing.
 * - Normal tabs animate individually.
 * - Split View is treated as ONE visual unit.
 * - Entering or leaving Split View uses one transition.
 * - Switching panels inside the same Split View
 *   does not trigger a tab transition.
 *
 * LOADING TRANSITION:
 * - Independent duration, scale, blur, opacity and easing.
 * - Uses the browser progress listener.
 * - Each linkedBrowser has its own loading state.
 * - Each Split View panel loads independently.
 * - The native Zen loading indicator is not blurred.
 *
 * SPLIT VIEW:
 * - A Split View group is treated as one tab
 *   for Tab Transition.
 * - Each linkedBrowser remains independent
 *   for Loading Transition.
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

    /*
     * Loading state is independent for every browser.
     */
    const loadingStates = new WeakMap();

    /*
     * Tab animations are tracked separately.
     */
    const tabAnimations = new WeakMap();

    /* ================================================
       PREFERENCES
    ================================================ */

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
        const value = Number(
            getString(name, fallback)
        );

        if (!Number.isFinite(value)) {
            return fallback;
        }

        return Math.min(
            max,
            Math.max(min, value)
        );
    }

    function getEasing(name, fallback) {
        const value = getString(name, fallback);

        return (
            EASINGS[value] ||
            EASINGS[fallback] ||
            EASINGS.smooth
        );
    }

    function getSettings() {
        return {
            enabled: getBool(
                "enabled",
                DEFAULTS.enabled
            ),

            duration: getNumber(
                "duration",
                DEFAULTS.duration,
                50,
                3000
            ),

            scale: getNumber(
                "scale",
                DEFAULTS.scale,
                0.5,
                1
            ),

            blur: getNumber(
                "blur",
                DEFAULTS.blur,
                0,
                40
            ),

            opacity: getNumber(
                "opacity",
                DEFAULTS.opacity,
                0,
                1
            ),

            easing: getEasing(
                "easing",
                DEFAULTS.easing
            ),

            loadingEnabled: getBool(
                "loading-enabled",
                DEFAULTS.loadingEnabled
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

    /* ================================================
       ANIMATION FRAMES
    ================================================ */

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

    /* ================================================
       GENERIC ANIMATION
    ================================================ */

    function cancelAnimation(element) {
        if (!element) return;

        try {
            element.getAnimations().forEach(animation => {
                animation.cancel();
            });
        } catch {
            // Best-effort cancellation.
        }
    }

    function animate(
        element,
        from,
        to,
        duration,
        easing,
        fill = "none"
    ) {
        if (!element || duration <= 0) {
            return null;
        }

        try {
            return element.animate(
                [from, to],
                {
                    duration,
                    easing,
                    fill
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

    /* ================================================
       TAB TRANSITION
    ================================================ */

    /*
     * Returns the normal visual container of a tab.
     */
    function getTabContainer(tab) {
        const browser = tab?.linkedBrowser;

        if (!browser) return null;

        return (
            browser.closest(".browserSidebarContainer") ||
            browser.closest(".browserStack") ||
            browser.parentElement
        );
    }

    /*
     * Detects a real Zen Split View group.
     */
    function isSplitViewTab(tab) {
        return Boolean(
            tab?.group?.hasAttribute?.("split-view-group")
        );
    }

    /*
     * Returns the visual target for a tab transition.
     *
     * Normal tab:
     *   Its own browser container.
     *
     * Split View:
     *   The common tabpanels element.
     *
     * This makes the complete Split View behave
     * like one normal tab during transitions.
     */
    function getTabTransitionTarget(tab) {
        if (!tab) return null;

        if (isSplitViewTab(tab)) {
            return gBrowser.tabpanels || null;
        }

        return getTabContainer(tab);
    }

    function cancelTabAnimation(element) {
        if (!element) return;

        const animation = tabAnimations.get(element);

        if (!animation) return;

        try {
            animation.cancel();
        } catch {
            // Best-effort cleanup.
        }

        tabAnimations.delete(element);
    }

    function animateTabPanel(
        element,
        from,
        to,
        settings
    ) {
        if (
            !element ||
            settings.duration <= 0
        ) {
            return;
        }

        cancelTabAnimation(element);

        const animation = animate(
            element,
            from,
            to,
            settings.duration,
            settings.easing,
            "none"
        );

        if (!animation) return;

        tabAnimations.set(
            element,
            animation
        );

        animation.onfinish = () => {
            if (
                tabAnimations.get(element) === animation
            ) {
                tabAnimations.delete(element);
            }
        };
    }

    function animateTabChange(event) {
        const settings = getSettings();

        if (
            !settings.enabled ||
            !shouldAnimate(settings)
        ) {
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

        const oldIsSplit = isSplitViewTab(oldTab);
        const newIsSplit = isSplitViewTab(newTab);

        /*
         * If both tabs belong to the same Split View,
         * changing the active panel must not animate.
         */
        if (
            oldIsSplit &&
            newIsSplit &&
            oldTab.group === newTab.group
        ) {
            return;
        }

        const hidden = getTabHiddenFrame(settings);
        const visible = visibleFrame();

        /*
         * SPECIAL SPLIT VIEW TRANSITION
         *
         * If either the old or the new tab belongs
         * to a Split View, animate the shared tabpanels
         * as ONE visual element.
         *
         * This avoids animating each Split View pane
         * separately.
         */
        if (oldIsSplit || newIsSplit) {
            const splitTarget = gBrowser.tabpanels;

            if (!splitTarget) return;

            /*
             * One animation only.
             *
             * The new visual state enters as a single
             * tab-like unit, regardless of how many
             * panels are inside the Split View.
             */
            animateTabPanel(
                splitTarget,
                hidden,
                visible,
                settings
            );

            return;
        }

        /*
         * NORMAL SINGLE-TAB TRANSITION
         */
        const oldContainer = getTabTransitionTarget(oldTab);
        const newContainer = getTabTransitionTarget(newTab);

        if (
            !oldContainer ||
            !newContainer
        ) {
            return;
        }

        animateTabPanel(
            oldContainer,
            visible,
            hidden,
            settings
        );

        animateTabPanel(
            newContainer,
            hidden,
            visible,
            settings
        );
    }

    /* ================================================
       LOADING TRANSITION
    ================================================ */

    /*
     * Loading is deliberately independent from
     * the visual Split View group.
     *
     * Each linkedBrowser receives its own animation.
     *
     * The browser element is used instead of
     * .browserSidebarContainer so the native Zen
     * loading indicator remains outside the blur.
     */

    function getCurrentFrame(element) {
        const style = window.getComputedStyle(element);

        return {
            transform:
                style.transform === "none"
                    ? "scale(1)"
                    : style.transform,

            filter:
                style.filter === "none"
                    ? "blur(0px)"
                    : style.filter,

            opacity: Number(style.opacity)
        };
    }

    function clearLoadingState(browser, state) {
        if (!state) return;

        if (state.timer) {
            window.clearTimeout(state.timer);
            state.timer = null;
        }

        if (state.animation) {
            try {
                state.animation.cancel();
            } catch {
                // Best-effort cleanup.
            }

            state.animation = null;
        }

        if (
            loadingStates.get(browser) === state
        ) {
            loadingStates.delete(browser);
        }
    }

    /* ================================================
       LOADING START
    ================================================ */

    function animateLoadingStart(browser, settings) {
        if (
            !browser ||
            !browser.isConnected
        ) {
            return;
        }

        const previous = loadingStates.get(browser);

        let startFrame = visibleFrame();

        /*
         * If a new navigation starts in the same pane,
         * continue from its current visual state.
         */
        if (previous) {
            try {
                startFrame = getCurrentFrame(browser);
            } catch {
                startFrame = getLoadingHiddenFrame(settings);
            }

            clearLoadingState(
                browser,
                previous
            );
        }

        const hidden = getLoadingHiddenFrame(settings);

        const state = {
            animation: null,
            timer: null,
            finishing: false
        };

        /*
         * The loading animation keeps its final
         * blur/scale/opacity state until STATE_STOP.
         */
        state.animation = animate(
            browser,
            startFrame,
            hidden,
            settings.loadingDuration,
            settings.loadingEasing,
            "forwards"
        );

        /*
         * Fallback timeout in case STATE_STOP
         * is never received.
         */
        state.timer = window.setTimeout(
            () => {
                finishLoading(browser);
            },
            settings.loadingTimeout
        );

        /*
         * Separate state for every linkedBrowser.
         */
        loadingStates.set(
            browser,
            state
        );
    }

    /* ================================================
       LOADING FINISH
    ================================================ */

    function finishLoading(browser) {
        const state = loadingStates.get(browser);

        if (
            !state ||
            state.finishing
        ) {
            return;
        }

        state.finishing = true;

        if (state.timer) {
            window.clearTimeout(state.timer);
            state.timer = null;
        }

        const settings = getSettings();

        if (
            !settings.loadingEnabled ||
            !shouldAnimate(settings)
        ) {
            clearLoadingState(
                browser,
                state
            );

            return;
        }

        let currentFrame = getLoadingHiddenFrame(settings);

        /*
         * Capture the current appearance before
         * cancelling the entrance animation.
         */
        try {
            currentFrame = getCurrentFrame(browser);
        } catch {
            // Use the configured hidden frame.
        }

        /*
         * Cancel only the animation belonging
         * to this particular browser.
         */
        if (state.animation) {
            try {
                state.animation.cancel();
            } catch {
                // Best-effort cleanup.
            }

            state.animation = null;
        }

        /*
         * Animate this individual pane back
         * to its normal appearance.
         */
        const completion = animate(
            browser,
            currentFrame,
            visibleFrame(),
            settings.completionDuration,
            settings.loadingEasing,
            "forwards"
        );

        state.animation = completion;

        if (!completion) {
            clearLoadingState(
                browser,
                state
            );

            return;
        }

        completion.onfinish = () => {
            clearLoadingState(
                browser,
                state
            );
        };
    }

    /* ================================================
       PROGRESS LISTENER
    ================================================ */

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
            if (
                browser &&
                !settings.loadingEnabled
            ) {
                const state = loadingStates.get(browser);

                if (state) {
                    clearLoadingState(
                        browser,
                        state
                    );
                }
            }

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

        /*
         * Every browser handles its own START and STOP.
         */
        if (isStart) {
            animateLoadingStart(
                browser,
                settings
            );
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

    /* ================================================
       INITIALIZATION
    ================================================ */

    function init() {
        if (
            window.__smoothTabTransition110Initialized
        ) {
            return;
        }

        window.__smoothTabTransition110Initialized = true;

        /*
         * Tab selection listener.
         */
        window.addEventListener(
            "TabSelect",
            animateTabChange,
            true
        );

        /*
         * Independent loading listener.
         */
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
            "[Smooth Tab Transition] v1.1.0-fixed loaded successfully."
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

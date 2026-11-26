
/*
 * Smooth Tab Transition
 * Zen Browser + Sine
 * Version: 1.1.0-fixed
 *
 * TAB TRANSITION:
 * - Independent duration, scale, blur, opacity and easing.
 * - Animates the whole Zen tab panel.
 * - Does not animate when switching between panels
 *   belonging to the same Split View group.
 *
 * LOADING TRANSITION:
 * - Independent duration, scale, blur, opacity and easing.
 * - Uses the browser progress listener.
 * - Each linkedBrowser has its own loading state and animation.
 * - The loading effect is applied to the page's <browser> element only.
 * - The native Zen loading indicator is not filtered.
 *
 * SPLIT VIEW:
 * - Each pane has its own linkedBrowser.
 * - Each pane loads and finishes independently.
 * - One pane cannot cancel another pane's loading animation.
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
     * Every linkedBrowser has its own state.
     * This is essential for independent Split View loading.
     */
    const loadingStates = new WeakMap();

    /*
     * Tab animations are stored separately from loading animations.
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
       TAB TRANSITION
    ================================================ */

    /*
     * Returns the complete visual container of a tab.
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

    function cancelTabAnimation(container) {
        if (!container) return;

        const animation = tabAnimations.get(container);

        if (!animation) return;

        try {
            animation.cancel();
        } catch {
            // Best-effort cleanup.
        }

        tabAnimations.delete(container);
    }

    function animateTabPanel(
        container,
        from,
        to,
        settings
    ) {
        if (!container || settings.duration <= 0) {
            return;
        }

        cancelTabAnimation(container);

        try {
            const animation = container.animate(
                [from, to],
                {
                    duration: settings.duration,
                    easing: settings.easing,
                    fill: "none"
                }
            );

            tabAnimations.set(
                container,
                animation
            );

            animation.onfinish = () => {
                if (
                    tabAnimations.get(container) ===
                    animation
                ) {
                    tabAnimations.delete(container);
                }
            };

        } catch (error) {
            console.warn(
                "[Smooth Tab Transition] Tab animation error:",
                error
            );
        }
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

        /*
         * Do not animate when switching focus between
         * panels belonging to the same Split View group.
         */
        const oldGroup = oldTab.group;
        const newGroup = newTab.group;

        if (
            oldGroup &&
            newGroup &&
            oldGroup === newGroup
        ) {
            return;
        }

        const oldContainer = getTabContainer(oldTab);
        const newContainer = getTabContainer(newTab);

        if (!oldContainer || !newContainer) {
            return;
        }

        const hidden = getTabHiddenFrame(settings);
        const visible = visibleFrame();

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
     * IMPORTANT:
     *
     * The loading animation is applied directly to the
     * linkedBrowser element.
     *
     * It is NOT applied to .browserSidebarContainer.
     *
     * This prevents the native Zen loading indicator
     * and Split View header from being blurred.
     *
     * Each linkedBrowser has its own animation state.
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

    /*
     * Removes only the animation belonging to
     * the specified browser.
     */
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
         * If another request starts in the same pane,
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

        try {
            state.animation = browser.animate(
                [
                    startFrame,
                    hidden
                ],
                {
                    duration: settings.loadingDuration,
                    easing: settings.loadingEasing,

                    /*
                     * CRITICAL FIX:
                     * Keep blur, scale and opacity active
                     * after the entrance animation finishes.
                     */
                    fill: "forwards"
                }
            );

        } catch (error) {
            console.warn(
                "[Smooth Tab Transition] Loading start error:",
                error
            );
        }

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
         * Store state separately for this browser.
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
         * Capture the actual visual state before
         * cancelling the entrance animation.
         *
         * This avoids a flash when a page loads
         * faster than the entrance animation.
         */
        try {
            currentFrame = getCurrentFrame(browser);
        } catch {
            // Use configured hidden frame.
        }

        /*
         * Cancel only this browser's entrance animation.
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
         * Animate this pane back to its normal appearance.
         */
        try {
            const completion = browser.animate(
                [
                    currentFrame,
                    visibleFrame()
                ],
                {
                    duration: settings.completionDuration,
                    easing: settings.loadingEasing,
                    fill: "forwards"
                }
            );

            state.animation = completion;

            if (completion) {
                completion.onfinish = () => {
                    /*
                     * Remove the finished animation.
                     * The browser returns to its normal
                     * unfiltered appearance.
                     */
                    clearLoadingState(
                        browser,
                        state
                    );
                };

            } else {
                clearLoadingState(
                    browser,
                    state
                );
            }

        } catch (error) {
            console.warn(
                "[Smooth Tab Transition] Loading completion error:",
                error
            );

            clearLoadingState(
                browser,
                state
            );
        }
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
            /*
             * Disabling loading animations cleans up
             * only the affected browser.
             */
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
         * START and STOP are handled independently
         * for every linkedBrowser.
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
         * Tab switching listener.
         */
        window.addEventListener(
            "TabSelect",
            animateTabChange,
            true
        );

        /*
         * Loading listener.
         * Zen reports progress separately for each browser.
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


/*
 * Smooth Tab Transition
 * Zen Browser + Sine
 */

(() => {
    "use strict";

    if (window.__smoothTabTransition) return;
    window.__smoothTabTransition = true;

    const SETTINGS = {
        duration: 360,
        scale: 0.965,
        blur: 8,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
    };

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function getContainer(tab) {
        return tab?.linkedBrowser?.closest(
            ".browserSidebarContainer"
        );
    }


  function isSplitView(oldTab, newTab) {
        return [oldTab, newTab].some(tab =>
            tab?.group?.hasAttribute("split-view-group") ||
            tab?.hasAttribute("split-view") ||
            tab?.splitView === true
    );
}


    function animate(container, entering) {
        if (!container) return;

        const from = entering
            ? {
                transform: `scale(${SETTINGS.scale})`,
                filter: `blur(${SETTINGS.blur}px)`,
                opacity: 0.55
            }
            : {
                transform: "scale(1)",
                filter: "blur(0px)",
                opacity: 1
            };

        const to = entering
            ? {
                transform: "scale(1)",
                filter: "blur(0px)",
                opacity: 1
            }
            : {
                transform: `scale(${SETTINGS.scale})`,
                filter: `blur(${SETTINGS.blur}px)`,
                opacity: 0.55
            };

        container.animate([from, to], {
            duration: SETTINGS.duration,
            easing: SETTINGS.easing,
            fill: "none"
        });
    }

    function onTabSelect(event) {
        const newTab = gBrowser.selectedTab;
        const oldTab = event.detail?.previousTab;

        if (
            !oldTab ||
            !newTab ||
            oldTab === newTab ||
            reducedMotion.matches
        ) {
            return;
        }

        // Never animate tabs inside Zen Split View.
        if (isSplitView(oldTab, newTab)) {
            return;
        }

        animate(getContainer(oldTab), false);
        animate(getContainer(newTab), true);
    }

    window.addEventListener("TabSelect", onTabSelect, true);

    console.log(
        "[Smooth Tab Transition] Successfully loaded!"
    );
})();

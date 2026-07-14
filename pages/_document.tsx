import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    const themeBootstrap = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
    const scrollBootstrap = `(function () {
        try {
            var entry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
            var isReload = entry
                ? entry.type === 'reload'
                : performance.navigation && performance.navigation.type === 1;
            if (!isReload) return;

            var cleanUrl = location.pathname + location.search;
            var root = document.documentElement;
            var state = history.state;
            var resetToTop = function () {
                var previousBehavior = root.style.scrollBehavior;
                root.style.scrollBehavior = 'auto';
                scrollTo(0, 0);
                root.style.scrollBehavior = previousBehavior;
            };

            if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
            if (state && state.key) {
                try {
                    sessionStorage.setItem(
                        '__next_scroll_' + state.key,
                        JSON.stringify({ x: 0, y: 0 })
                    );
                } catch (error) {}
            }
            if (location.hash) {
                if (state && state.__N) {
                    state = Object.assign({}, state, { url: cleanUrl, as: cleanUrl });
                }
                history.replaceState(state, '', cleanUrl);
            }

            resetToTop();
            document.addEventListener('DOMContentLoaded', resetToTop, { once: true });
        } catch (error) {}
    })();`;

    return (
        <Html lang="en" data-scroll-behavior="smooth">
            <Head>
                {/* Reloads should start from a stable top position. This runs
                    before page content so the browser cannot visibly restore
                    a stale scroll offset or follow a retained hash first. */}
                <script dangerouslySetInnerHTML={{ __html: scrollBootstrap }} />
            </Head>
            <body>
                {/* This deliberately blocks parsing before any visible UI is
                    created. A saved light choice therefore wins before the
                    dark-default yellow fallback can ever be painted. */}
                <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}

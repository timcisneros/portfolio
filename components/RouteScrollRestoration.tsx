import { useEffect } from 'react';
import Router from 'next/router';

const STORAGE_PREFIX = 'portfolio-scroll:';

type ScrollPosition = {
    x: number;
    y: number;
};

const historyKey = () => {
    const state = window.history.state as { key?: unknown } | null;
    return typeof state?.key === 'string' ? state.key : null;
};

const savePosition = (key: string) => {
    try {
        sessionStorage.setItem(
            `${STORAGE_PREFIX}${key}`,
            JSON.stringify({ x: window.scrollX, y: window.scrollY })
        );
    } catch {
        // Storage can be unavailable in hardened browsing modes. Native
        // restoration remains the fallback in that case.
    }
};

const readPosition = (key: string): ScrollPosition | null => {
    try {
        const value = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!value) return null;
        const position = JSON.parse(value) as Partial<ScrollPosition>;
        return typeof position.x === 'number' && typeof position.y === 'number'
            ? { x: position.x, y: position.y }
            : null;
    } catch {
        return null;
    }
};

const restorePosition = ({ x, y }: ScrollPosition) => {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(x, y);
    root.style.scrollBehavior = previousBehavior;
};

const RouteScrollRestoration = () => {
    useEffect(() => {
        let pendingPopKey: string | null = null;
        let firstFrame = 0;
        let secondFrame = 0;

        const handleBeforePopState: Parameters<
            typeof Router.beforePopState
        >[0] = (state) => {
            const key = (state as typeof state & { key?: unknown }).key;
            pendingPopKey = typeof key === 'string' ? key : null;
            return true;
        };

        const handleRouteStart = () => {
            // A popstate already points history.state at the destination. Do
            // not overwrite that destination's saved position with the page
            // that is currently leaving.
            if (pendingPopKey) return;
            const key = historyKey();
            if (key) savePosition(key);
        };

        const handleRouteComplete = () => {
            const key = pendingPopKey;
            pendingPopKey = null;
            if (!key) return;

            const position = readPosition(key);
            if (!position) return;

            // Next applies its own forced position during route rendering.
            // Restore after two paints so this entry wins without a visible
            // smooth-scroll trip through intervening content.
            firstFrame = window.requestAnimationFrame(() => {
                secondFrame = window.requestAnimationFrame(() => {
                    restorePosition(position);
                });
            });
        };

        const handleRouteError = () => {
            pendingPopKey = null;
        };

        Router.beforePopState(handleBeforePopState);
        Router.events.on('routeChangeStart', handleRouteStart);
        Router.events.on('hashChangeStart', handleRouteStart);
        Router.events.on('routeChangeComplete', handleRouteComplete);
        Router.events.on('hashChangeComplete', handleRouteComplete);
        Router.events.on('routeChangeError', handleRouteError);

        return () => {
            Router.beforePopState(() => true);
            Router.events.off('routeChangeStart', handleRouteStart);
            Router.events.off('hashChangeStart', handleRouteStart);
            Router.events.off('routeChangeComplete', handleRouteComplete);
            Router.events.off('hashChangeComplete', handleRouteComplete);
            Router.events.off('routeChangeError', handleRouteError);
            window.cancelAnimationFrame(firstFrame);
            window.cancelAnimationFrame(secondFrame);
        };
    }, []);

    return null;
};

export default RouteScrollRestoration;

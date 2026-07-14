import React, { useEffect, useState } from 'react';

import { SunIcon, MoonIcon } from './Icons';

type Theme = 'light' | 'dark';

// Resolve the theme actually in effect: an explicit choice on <html> wins,
// otherwise fall back to the OS preference.
const resolveTheme = (): Theme => {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
};

const ThemeToggle = () => {
    // null until mounted so the button never assumes a theme during SSR; the
    // icon span uses suppressHydrationWarning to tolerate the first swap.
    const [theme, setTheme] = useState<Theme | null>(null);

    useEffect(() => {
        setTheme(resolveTheme());
    }, []);

    const toggle = () => {
        const next: Theme = resolveTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try {
            localStorage.setItem('theme', next);
        } catch {
            /* storage may be unavailable (private mode); the choice still
               applies for this session via the attribute above. */
        }
        setTheme(next);
    };

    const next = theme === 'dark' ? 'light' : 'dark';

    return (
        <button
            type="button"
            className="icon-link theme-toggle"
            onClick={toggle}
            aria-label={
                theme ? `Switch to ${next} mode` : 'Toggle color theme'
            }
            title="Toggle theme"
        >
            <span className="theme-toggle-icon" suppressHydrationWarning>
                <span className="theme-icon theme-icon-moon"><MoonIcon /></span>
                <span className="theme-icon theme-icon-sun"><SunIcon /></span>
            </span>
        </button>
    );
};

export default ThemeToggle;

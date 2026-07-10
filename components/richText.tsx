import React from 'react';
import Link from 'next/link';

const LINK_PATTERN = /(\[[^\]]+\]\([^)]+\))/g;

// Renders inline [label](href) markdown links inside otherwise plain copy.
// Internal paths (starting with "/") use next/link; everything else opens
// in a new tab.
export const renderInline = (text: string): React.ReactNode[] =>
    text.split(LINK_PATTERN).map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!match) return part;
        const [, label, href] = match;
        return href.startsWith('/') ? (
            <Link key={`${href}-${index}`} href={href}>
                {label}
            </Link>
        ) : (
            <a
                key={`${href}-${index}`}
                href={href}
                target="_blank"
                rel="noreferrer"
            >
                {label}
            </a>
        );
    });

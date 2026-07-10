import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const base: IconProps = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
};

export const GitHubIcon = (props: IconProps) => (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.66.41.35.77 1.05.77 2.12v3.15c0 .3.21.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
);

export const LinkedInIcon = (props: IconProps) => (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
);

export const MailIcon = (props: IconProps) => (
    <svg {...base} {...props}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
    </svg>
);

export const ExternalIcon = (props: IconProps) => (
    <svg {...base} width={15} height={15} {...props}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
    </svg>
);

export const CodeIcon = (props: IconProps) => (
    <svg {...base} width={15} height={15} {...props}>
        <path d="m16 18 6-6-6-6" />
        <path d="m8 6-6 6 6 6" />
    </svg>
);

export const DownloadIcon = (props: IconProps) => (
    <svg {...base} width={16} height={16} {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
    </svg>
);

export const ArrowRightIcon = (props: IconProps) => (
    <svg {...base} width={15} height={15} {...props}>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

export const ArrowLeftIcon = (props: IconProps) => (
    <svg {...base} width={15} height={15} {...props}>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
    </svg>
);

export const SunIcon = (props: IconProps) => (
    <svg {...base} {...props}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
    </svg>
);

export const MoonIcon = (props: IconProps) => (
    <svg {...base} {...props}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

export const MenuIcon = ({ open, ...props }: IconProps & { open?: boolean }) => (
    <svg {...base} width={20} height={20} {...props}>
        {open ? (
            <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
            </>
        ) : (
            <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
            </>
        )}
    </svg>
);

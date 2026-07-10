import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';

import Navbar from '../Navbar';
import Footer from '../Footer';

const SITE_URL = 'https://timcis.com';
const DEFAULT_TITLE = 'Tim Cisneros | Developer & Automation Engineer';
const DEFAULT_DESCRIPTION =
    'Full-stack developer specializing in React, Next.js, AWS, and business process automation. Digital Media Producer at TimCis Media; formerly a Solutions Engineer at Bitwise Industries.';

const PERSON_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Tim Cisneros',
    jobTitle: 'Developer & Automation Engineer',
    url: SITE_URL,
    email: 'mailto:tcisneros.cis@gmail.com',
    address: {
        '@type': 'PostalAddress',
        addressRegion: 'CA',
        addressCountry: 'US',
    },
    sameAs: [
        'https://github.com/timcisneros',
        'https://www.linkedin.com/in/timcisneros/',
    ],
};

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    ogTitle?: string;
    ogSubtitle?: string;
}

const MainLayout = ({
    children,
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    ogTitle = 'Tim Cisneros',
    ogSubtitle = 'Developer & Automation Engineer',
}: MainLayoutProps) => {
    const router = useRouter();
    const path = router.asPath.split('#')[0].split('?')[0];
    const canonical = `${SITE_URL}${path === '/' ? '' : path}`;
    const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(
        ogTitle
    )}&subtitle=${encodeURIComponent(ogSubtitle)}`;

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <link rel="canonical" href={canonical} />
                <meta
                    name="theme-color"
                    media="(prefers-color-scheme: dark)"
                    content="#0a0e13"
                />
                <meta
                    name="theme-color"
                    media="(prefers-color-scheme: light)"
                    content="#f7f9fb"
                />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={canonical} />
                <meta property="og:image" content={ogImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(PERSON_SCHEMA),
                    }}
                />
            </Head>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    );
};

export default MainLayout;

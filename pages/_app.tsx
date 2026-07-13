import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';
import KeycapCameraControl from '../components/KeycapCameraControl';
import KeycapCompositor from '../components/KeycapCompositor';

import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
            <KeycapCompositor />
            <Component {...pageProps} />
            <KeycapCameraControl />
            <Analytics />
        </>
    );
}

export default MyApp;

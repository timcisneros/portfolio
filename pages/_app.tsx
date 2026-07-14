import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import DeferredAnalytics from '../components/DeferredAnalytics';
import DeferredCameraControl from '../components/DeferredCameraControl';
import DeferredDiagnostics from '../components/DeferredDiagnostics';
import RouteScrollRestoration from '../components/RouteScrollRestoration';
import { KEYCAP_RENDER_ENGINE_ENABLED } from '../lib/keycap/config';

const KeycapCompositor = dynamic(
    () => import('../components/KeycapCompositor'),
    { ssr: false }
);

import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
            <RouteScrollRestoration />
            {KEYCAP_RENDER_ENGINE_ENABLED && <KeycapCompositor />}
            <Component {...pageProps} />
            <DeferredCameraControl />
            <DeferredAnalytics />
            <DeferredDiagnostics />
        </>
    );
}

export default MyApp;

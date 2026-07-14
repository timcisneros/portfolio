import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    const themeBootstrap = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

    return (
        <Html lang="en" data-scroll-behavior="smooth">
            <Head />
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

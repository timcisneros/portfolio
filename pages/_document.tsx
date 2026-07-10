import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="en" data-scroll-behavior="smooth">
            <Head>
                {/* Apply the saved theme before first paint to avoid a flash of
                    the wrong palette. Only sets an explicit choice; absent one,
                    CSS falls back to prefers-color-scheme. */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
                    }}
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}

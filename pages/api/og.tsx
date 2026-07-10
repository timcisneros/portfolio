import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(req: Request) {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get('title') || 'Tim Cisneros').slice(0, 80);
    const subtitle = (
        searchParams.get('subtitle') || 'Full-Stack JavaScript Developer'
    ).slice(0, 120);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '72px 80px',
                    background:
                        'linear-gradient(135deg, #0a0e13 0%, #10161e 60%, #0e2b26 100%)',
                    color: '#e8eef4',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 28,
                        color: '#35d0ba',
                    }}
                >
                    timcis.com
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            fontSize: 72,
                            fontWeight: 700,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1,
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            fontSize: 32,
                            color: '#93a3b3',
                            marginTop: 20,
                        }}
                    >
                        {subtitle}
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        fontSize: 24,
                        color: '#66788a',
                    }}
                >
                    <div
                        style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background: '#35d0ba',
                        }}
                    />
                    React &amp; Next.js · AWS · Business Process Automation
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}

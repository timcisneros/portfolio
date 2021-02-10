import React from 'react';
import Link from 'next/link';

import MainLayout from '../components/layouts/MainLayout';

function Home() {
    return (
        <MainLayout>
            <section className="section">
                <div className="container">
                    <h3 className="title has-text-centered is-3">
                        Tim Cisneros
                    </h3>
                    <h4 className="subtitle has-text-centered is-5">
                        {'React & Next.js Developer'}
                    </h4>
                    <div className="has-text-centered">
                        <Link href="/projects">
                            <a className="button is-text">
                                See Projects &rarr;
                            </a>
                        </Link>
                    </div>
                    <a
                        href="https://next-js-news.vercel.app/"
                        target="_blank"
                        className="device device-iphone-x"
                    >
                        <div className="device-frame">
                            <video
                                autoPlay
                                muted
                                loop
                                className="device-content"
                            >
                                <source
                                    src="/videos/iphone.mp4"
                                    type="video/mp4"
                                />
                                <source
                                    src="/videos/iphone.webm"
                                    type="video/webm"
                                />
                                Your browser is not supported!
                            </video>
                        </div>
                        <div className="device-stripe"></div>
                        <div className="device-header"></div>
                        <div className="device-sensors"></div>
                        <div className="device-btns"></div>
                        <div className="device-power"></div>
                    </a>
                </div>
            </section>
        </MainLayout>
    );
}

export default Home;

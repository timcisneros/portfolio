import React from 'react';
import { QueryClient, useQuery } from 'react-query';
import { dehydrate } from 'react-query/hydration';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLightbulb,
    faCheckCircle,
    faClock,
} from '@fortawesome/free-regular-svg-icons';

import MainLayout from '../components/layouts/MainLayout';
import { fetchProfile } from './api/project-api';

export async function getStaticProps() {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery('profile', fetchProfile);

    return {
        props: {
            dehydratedState: dehydrate(queryClient),
        },
    };
}

const AboutMe = () => {
    const { data } = useQuery('profile', fetchProfile);

    return (
        <MainLayout>
            <section className="section">
                <div className="container">
                    <h3 className="title has-text-centered is-3">
                        I'm always looking to solve problems.
                    </h3>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="columns">
                        <div className="column">
                            <div className="box p-5">
                                <div className="title has-text-centered">
                                    <FontAwesomeIcon
                                        className="fa-3x"
                                        icon={faLightbulb}
                                    />
                                </div>
                                <h3 className="title has-text-centered is-4">
                                    Cutting-Edge
                                </h3>
                                <p className="subtitle has-text-centered is-6">
                                    I'm passionate about building innovative
                                    applications that change the way we see
                                    digital services today. I love coming up
                                    with unique and better solutions to complex
                                    problems. With technology moving quickly
                                    it's important to be a self-starter and seek
                                    out creative solutions quickly and
                                    efficiently. I embrace the pioneering
                                    spirit.
                                </p>
                            </div>
                        </div>
                        <div className="column">
                            <div className="box p-5">
                                <div className="title has-text-centered">
                                    <FontAwesomeIcon
                                        className="fa-3x"
                                        icon={faCheckCircle}
                                    />
                                </div>
                                <h3 className="title has-text-centered is-4">
                                    Clean Architecture
                                </h3>
                                <p className="subtitle has-text-centered is-6">
                                    When it comes to the structure of my
                                    projects I'm careful to adhere to industry
                                    conventions that allow me to work seamlessly
                                    with other developers. I write clean
                                    functions that can be used modularly
                                    throughout my applications. It's important
                                    to me that my code is well organized and
                                    able to be read by a collaborator.
                                </p>
                            </div>
                        </div>
                        <div className="column">
                            <div className="box p-5">
                                <div className="title has-text-centered">
                                    <FontAwesomeIcon
                                        className="fa-3x"
                                        icon={faClock}
                                    />
                                </div>
                                <h3 className="title has-text-centered is-4">
                                    Performant
                                </h3>
                                <p className="subtitle has-text-centered is-6">
                                    I am actively searching for and learning new
                                    technologies that allow me to increase the
                                    performance of my applications as well as
                                    add more complex features that benefit the
                                    user-experience. I am currently using
                                    server-side rendering to fetch data quickly
                                    so that data can remain current without
                                    disrupting performance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container is-max-desktop">
                    <div className="box p-5">
                        <article className="media">
                            <figure className="media-left">
                                <p className="image is-128x128">
                                    <img
                                        src={data.avatar_url}
                                        className="is-rounded"
                                    />
                                </p>
                            </figure>
                            <div className="media-content">
                                <div className="content">
                                    <p>
                                        <strong>{data.name}</strong>{' '}
                                        <small>@{data.login}</small>
                                        <br />
                                        {data.bio}
                                    </p>
                                </div>
                                <div className="content">
                                    <a
                                        href="mailto:tcisneros.cis@gmail.com"
                                        target="_blank"
                                        className="button"
                                    >
                                        Contact Me
                                    </a>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
};

export default AboutMe;

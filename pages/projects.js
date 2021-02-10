import React from 'react';
import { QueryClient, useQuery } from 'react-query';
import { dehydrate } from 'react-query/hydration';
import dateFormat from 'dateformat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import { fetchProjects } from './api/project-api';
import MainLayout from '../components/layouts/MainLayout';

export async function getStaticProps() {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery('projects', fetchProjects);

    return {
        props: {
            dehydratedState: dehydrate(queryClient),
        },
    };
}

const Projects = () => {
    const { data, status } = useQuery('projects', fetchProjects);

    return (
        <MainLayout>
            <section className="section">
                <div className="container">
                    {status === 'loading' && (
                        <>
                            <h3 className="title has-text-centered is-4">
                                Fetching GitHub Repositories...
                            </h3>
                            <progress
                                className="progress is-small is-dark"
                                max="100"
                            />
                        </>
                    )}
                    {status === 'error' && (
                        <p className="has-text-centered">
                            There was an error fetching repositories...
                        </p>
                    )}
                    {status === 'success' && (
                        <>
                            <h3 className="title has-text-centered is-3">
                                Projects
                            </h3>
                            <div className="columns mt-5 is-8 is-multiline">
                                {data.map((project) => (
                                    <div
                                        key={project.id}
                                        className="column is-4-tablet is-3-desktop"
                                    >
                                        <div className="card">
                                            <div className="card-image has-text-centered">
                                                <img
                                                    src={`/project-imgs/github.png`}
                                                    alt=""
                                                />
                                            </div>
                                            <div className="card-content">
                                                <h3 className="title is-5">
                                                    {project.name}
                                                </h3>

                                                <p className="subtitle is-6">
                                                    {project.description}
                                                </p>
                                            </div>
                                            {project.language && (
                                                <div className="card-content">
                                                    <span className="tag is-rounded is-dark">
                                                        {project.language}
                                                    </span>
                                                </div>
                                            )}
                                            <footer className="card-footer">
                                                {/* <p className="card-footer-item">
                                                    <a
                                                        href={project.html_url}
                                                        target="_blank"
                                                        className="has-text-grey"
                                                    >
                                                        Demo
                                                    </a>
                                                </p> */}
                                                <p className="card-footer-item">
                                                    <a
                                                        href={project.html_url}
                                                        target="_blank"
                                                        className="has-text-grey"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faGithub}
                                                        />{' '}
                                                        Code
                                                    </a>
                                                </p>
                                            </footer>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="container has-text-centered mt-6">
                                <a
                                    href="https://github.com/timcisneros"
                                    target="_blank"
                                    className="button"
                                >
                                    See More
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </MainLayout>
    );
};

export default Projects;

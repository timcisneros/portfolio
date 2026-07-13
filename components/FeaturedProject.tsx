import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { GitHubIcon, ExternalIcon, ArrowRightIcon } from './Icons';
import { renderInline } from './richText';
import type { ShowcaseProject } from '../data/projects';

const FeaturedProject = ({ project }: { project: ShowcaseProject }) => {
    const media = (
        <Image
            src={project.image}
            alt={project.imageAlt}
            width={project.imageWidth}
            height={project.imageHeight}
            sizes="(max-width: 820px) 100vw, 50vw"
        />
    );

    return (
        <article className="featured" id={`project-${project.id}`}>
            {project.caseStudy ? (
                <Link
                    href={project.caseStudy}
                    className="featured-media"
                    aria-label={`Read about ${project.name}`}
                >
                    {media}
                </Link>
            ) : (
                <a
                    href={project.demo}
                    target="_blank"
                    rel="noreferrer"
                    className="featured-media"
                    aria-label={`${project.name} live demo`}
                >
                    {media}
                </a>
            )}
            <div className="featured-body">
                <h3>{project.name}</h3>
                <p className="featured-tagline">{project.tagline}</p>
                {project.description.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>
                        {renderInline(paragraph)}
                    </p>
                ))}
                <div className="tag-row">
                    {project.tags.map((tag) => (
                        <span key={tag} className="tag">
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="project-links">
                    {project.caseStudy && (
                        <Link
                            href={project.caseStudy}
                            className="project-link project-link-primary"
                        >
                            Read the walkthrough <ArrowRightIcon />
                        </Link>
                    )}
                    {project.demo && (
                        <a
                            href={project.demo}
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            <ExternalIcon /> Live demo
                        </a>
                    )}
                    <a
                        href={project.code}
                        target="_blank"
                        rel="noreferrer"
                        className="project-link"
                    >
                        <GitHubIcon width={15} height={15} /> Source
                    </a>
                </div>
            </div>
        </article>
    );
};

export default FeaturedProject;

import React from 'react';
import Link from 'next/link';

import { GitHubIcon, ExternalIcon, CodeIcon } from './Icons';
import type { GridProject } from '../data/projects';

const ProjectCard = ({ project }: { project: GridProject }) => {
    return (
        <article className="project-card">
            <div className="project-card-head">
                <CodeIcon width={20} height={20} />
                <div className="project-card-links">
                    <a
                        href={project.code}
                        target="_blank"
                        rel="noreferrer"
                        className="icon-link"
                        aria-label={`${project.name} source`}
                    >
                        <GitHubIcon width={16} height={16} />
                    </a>
                    {project.demo && (
                        <a
                            href={project.demo}
                            target="_blank"
                            rel="noreferrer"
                            className="icon-link"
                            aria-label={`${project.name} demo`}
                        >
                            <ExternalIcon width={16} height={16} />
                        </a>
                    )}
                </div>
            </div>
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            {project.caseStudy && (
                <Link href={project.caseStudy} className="project-link project-link-primary">
                    Read the case study
                </Link>
            )}
            <div className="tag-row">
                {project.tags.map((tag) => (
                    <span key={tag} className="tag">
                        {tag}
                    </span>
                ))}
            </div>
        </article>
    );
};

export default ProjectCard;

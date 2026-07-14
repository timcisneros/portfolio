import React from "react";
import Link from "next/link";
import Image from "next/image";

import type { GetStaticPaths, GetStaticProps } from "next";
import MainLayout from "../../components/layouts/MainLayout";
import KeycapSurface from "../../components/KeycapSurface";
import KeycapLabel from "../../components/KeycapLabel";
import {
  GitHubIcon,
  ExternalIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "../../components/Icons";
import { caseStudies, getCaseStudy } from "../../data/caseStudies";
import type { CaseStudy as CaseStudyData } from "../../data/caseStudies";
import { renderInline } from "../../components/richText";

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: caseStudies.map((study) => ({
      params: { slug: study.slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<{ study: CaseStudyData }> = async ({
  params,
}) => {
  const study = getCaseStudy(String(params?.slug));
  if (!study) return { notFound: true };
  return { props: { study } };
};

const CaseStudy = ({ study }: { study: CaseStudyData }) => {
  const currentIndex = caseStudies.findIndex((s) => s.slug === study.slug);
  const prev = currentIndex > 0 ? caseStudies[currentIndex - 1] : null;
  const next =
    currentIndex < caseStudies.length - 1
      ? caseStudies[currentIndex + 1]
      : null;

  return (
    <MainLayout
      title={`${study.name} | Tim Cisneros`}
      description={study.tagline}
      ogTitle={study.name}
      ogSubtitle={study.tagline}
    >
      <header className="cs-hero">
        <div className="container">
          <nav className="cs-breadcrumb" aria-label="Breadcrumb">
            <Link href="/#projects">
              <ArrowLeftIcon /> All projects
            </Link>
          </nav>
          <p className="section-label">Case Study</p>
          <h1>{study.name}</h1>
          <p className="cs-tagline">{study.tagline}</p>
          <div className="tag-row">
            {study.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
          <div className="project-links">
            {study.demo && (
              <a
                href={study.demo}
                target="_blank"
                rel="noreferrer"
                className="project-link"
              >
                <ExternalIcon /> Try it live
              </a>
            )}
            <a
              href={study.code}
              target="_blank"
              rel="noreferrer"
              className="project-link"
            >
              <GitHubIcon width={15} height={15} /> Source
            </a>
            {study.extraLinks?.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="project-link"
              >
                {link.href.includes("github.com") ? (
                  <GitHubIcon width={15} height={15} />
                ) : (
                  <ExternalIcon />
                )}{" "}
                {link.label}
              </a>
            ))}
          </div>
          <dl className="cs-overview" aria-label={`${study.name} project summary`}>
            {study.overview.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <aside className="cs-employer-value" aria-label="What this demonstrates">
            <strong>What this demonstrates</strong>
            <p>{study.employerValue}</p>
          </aside>
          <div className="cs-intro">
            {study.intro.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{renderInline(paragraph)}</p>
            ))}
          </div>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <p className="section-label">Walkthrough</p>
          {study.steps.map((step, index) => (
            <article key={step.title} className="cs-step">
              <div className="cs-step-text">
                <span className="cs-step-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2>{step.title}</h2>
                <p>{renderInline(step.body)}</p>
              </div>
              <figure className="cs-step-media">
                <Image
                  src={step.image}
                  alt={step.imageAlt}
                  width={step.imageWidth}
                  height={step.imageHeight}
                  sizes="(max-width: 1080px) 100vw, 1032px"
                  priority={index === 0}
                />
              </figure>
            </article>
          ))}
        </div>
      </section>

      {study.deepDive && (
        <section className="section cs-deepdive">
          <div className="container">
            <p className="section-label">{study.deepDive.label}</p>
            <h2 className="cs-deepdive-title">{study.deepDive.title}</h2>
            <div className="cs-deepdive-body">
              {study.deepDive.body.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{renderInline(paragraph)}</p>
              ))}
            </div>
            <p className="section-label cs-artifacts-label">In the repo</p>
            <ul className="cs-artifacts">
              {study.deepDive.artifacts.slice(0, 3).map((artifact) => (
                <li key={artifact.href}>
                  <a
                    href={artifact.href}
                    target="_blank"
                    rel="noreferrer"
                    className="cs-artifact-link"
                  >
                    <GitHubIcon width={15} height={15} />
                    <code>{artifact.label}</code>
                    <ArrowRightIcon />
                  </a>
                  <span className="cs-artifact-note">{artifact.note}</span>
                </li>
              ))}
            </ul>
            {study.deepDive.artifacts.length > 3 && (
              <details className="cs-artifacts-more">
                <summary>
                  View {study.deepDive.artifacts.length - 3} more implementation artifacts
                </summary>
                <ul className="cs-artifacts">
                  {study.deepDive.artifacts.slice(3).map((artifact) => (
                    <li key={artifact.href}>
                      <a
                        href={artifact.href}
                        target="_blank"
                        rel="noreferrer"
                        className="cs-artifact-link"
                      >
                        <GitHubIcon width={15} height={15} />
                        <code>{artifact.label}</code>
                        <ArrowRightIcon />
                      </a>
                      <span className="cs-artifact-note">{artifact.note}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <p className="section-label">How it&apos;s built</p>
          <ul className="cs-build">
            {study.build.map((item) => (
              <li key={item.slice(0, 24)}>{renderInline(item)}</li>
            ))}
          </ul>
          <div className="cs-cta">
            {study.demo ? (
              <>
                <a
                  href={study.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                >
                  <KeycapSurface />
                  <KeycapLabel icon={<ExternalIcon />}>{`Try ${study.name} live`}</KeycapLabel>
                </a>
                <a
                  href={study.code}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                >
                  <KeycapSurface />
                  <KeycapLabel icon={<GitHubIcon />}>View the source</KeycapLabel>
                </a>
              </>
            ) : (
              <a
                href={study.code}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                <KeycapSurface />
                <KeycapLabel icon={<GitHubIcon />}>View source on GitHub</KeycapLabel>
              </a>
            )}
          </div>

          {(prev || next) && (
            <nav className="cs-pager" aria-label="More case studies">
              {prev ? (
                <Link href={`/projects/${prev.slug}`} className="cs-pager-prev">
                  <ArrowLeftIcon /> {prev.name}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={`/projects/${next.slug}`} className="cs-pager-next">
                  {next.name} <ArrowRightIcon />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}

          <div className="cs-contact-cta">
            <p>
              Like what you see? I&apos;m available for full-stack and
              automation work.
            </p>
            <a
              href="mailto:tcisneros.cis@gmail.com"
              className="btn btn-primary"
            >
              <KeycapSurface />
              <KeycapLabel>Get in touch</KeycapLabel>
            </a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default CaseStudy;

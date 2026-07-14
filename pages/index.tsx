import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import MainLayout from "../components/layouts/MainLayout";
import DeferredHeroDiagram from "../components/DeferredHeroDiagram";
import KeycapSurface from "../components/KeycapSurface";
import KeycapLabel from "../components/KeycapLabel";
import DeferredHeadline from "../components/DeferredHeadline";
import { renderInline } from "../components/richText";
import FeaturedProject from "../components/FeaturedProject";
import ProjectCard from "../components/ProjectCard";
import DeferredContactForm from "../components/DeferredContactForm";
import {
  GitHubIcon,
  MailIcon,
  LinkedInIcon,
  DownloadIcon,
  ArrowRightIcon,
} from "../components/Icons";
import {
  leadProjects,
  supportingProjects,
  moreProjects,
  skills,
  experience,
  credentials,
} from "../data/projects";

function Home() {
  const [headlinePaused, setHeadlinePaused] = useState(false);
  const toggleHeadline = () => {
    const paused = !headlinePaused;
    setHeadlinePaused(paused);
    window.dispatchEvent(
      new CustomEvent("headline-motion", { detail: { paused } }),
    );
  };

  return (
    <MainLayout>
      <header className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="hero-headline">
              <h1 aria-label="Software that works for you.">
                <DeferredHeadline />
              </h1>
              <button
                type="button"
                className="headline-motion-toggle"
                onClick={toggleHeadline}
                aria-label={`${headlinePaused ? "Resume" : "Pause"} headline animation`}
                title={`${headlinePaused ? "Resume" : "Pause"} headline animation`}
              >
                <span aria-hidden="true">{headlinePaused ? "▶" : "⏸"}</span>
              </button>
            </div>
            <p className="hero-sub">
              I&apos;m Tim, a full-stack software developer building applications
              that automate operational work, using TypeScript, React, Vue.js,
              Node.js, and AWS. I currently build and maintain client software
              through TimCis Media.
            </p>
            <div className="hero-actions">
              <a href="#projects" className="btn btn-primary btn-projects">
                <KeycapSurface />
                <KeycapLabel>My projects</KeycapLabel>
              </a>

              <Link href="/resume" className="btn btn-ghost">
                <KeycapSurface />
                <KeycapLabel icon={<DownloadIcon />}>Resume</KeycapLabel>
              </Link>

              <a href="#contact" className="btn btn-gray">
                <KeycapSurface />
                <KeycapLabel icon={<MailIcon />}>Email me</KeycapLabel>
              </a>
            </div>
          </div>
          <DeferredHeroDiagram />
        </div>
      </header>

      <section className="proof-strip" aria-label="Professional highlights">
        <div className="container proof-grid">
          <div>
            <strong>Two promotions</strong>
            <span>Support to workforce analytics and quality assurance</span>
          </div>
          <div>
            <strong>Enterprise delivery</strong>
            <span>AWS applications and document-process automation</span>
          </div>
          <div>
            <strong>End-to-end ownership</strong>
            <span>Interfaces, APIs, data, deployment, and maintenance</span>
          </div>
        </div>
      </section>

      <section id="projects" className="section">
        <div className="container">
          <p className="section-label">Projects</p>
          <h2 className="section-title">Built for real use</h2>
          <p className="section-intro">
            Every one started with a problem I actually had or someone asked me
            to solve. Read the walkthroughs or jump straight into the live
            demos.
          </p>
          {leadProjects.map((project) => (
            <FeaturedProject key={project.id} project={project} />
          ))}
        </div>
      </section>

      <section id="experience" className="section">
        <div className="container">
          <p className="section-label">Experience</p>
          <h2 className="section-title">Where I&apos;ve worked</h2>
          <p className="section-intro">
            I&apos;ve worked across enterprise solutions engineering, client
            software delivery, and workforce analytics. Automation has been
            the through line.
          </p>
          <div className="xp-list">
            {experience.map((job) => (
              <article key={job.id} className="xp">
                <div className="xp-meta">
                  <h3>{job.role}</h3>
                  <p className="xp-company">{job.company}</p>
                  {job.context && <p className="xp-context">{job.context}</p>}
                  <p className="xp-period">
                    {job.period}
                    <br />
                    {job.location}
                  </p>
                </div>
                <ul className="xp-bullets">
                  {job.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 24)}>{renderInline(bullet)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="xp-cta">
            <Link href="/resume" className="btn btn-ghost">
              <KeycapSurface />
              <KeycapLabel icon={<DownloadIcon />}>Download resume</KeycapLabel>
            </Link>
            <p className="resume-variants" aria-label="Role-targeted resume versions">
              Targeted versions:{" "}
              <Link href="/resume#downloads">Full-stack</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/resume#downloads">Applied AI</Link>
            </p>
          </div>
        </div>
      </section>

      <section id="supporting-work" className="section supporting-work">
        <div className="container">
          <p className="section-label">More project evidence</p>
          <h2 className="section-title">Product and specialist depth</h2>
          <p className="section-intro">
            Additional case studies show governed agent implementation,
            constrained product work, and evidence-driven debugging beyond the
            primary professional application stack.
          </p>
          {supportingProjects.map((project) => (
            <FeaturedProject key={project.id} project={project} />
          ))}
          <div className="more-projects">
            <p className="section-label">Smaller builds</p>
            <p className="section-intro">
              Focused applications with live demos and public source.
            </p>
            <div className="project-grid">
              {moreProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="skills" className="section">
        <div className="container">
          <p className="section-label">Skills</p>
          <h2 className="section-title">What I work with</h2>
          <p className="section-intro">
            Depth matters more than a flat keyword list. These groups distinguish
            my everyday application stack from professional delivery experience,
            public project work, and supporting tools.
          </p>
          <div className="skills-grid">
            {skills.map((group) => (
              <div key={group.group} className="skill-group">
                <span className="skill-level">{group.level}</span>
                <h3>{group.group}</h3>
                <p>{group.description}</p>
                <div className="tag-row">
                  {group.items.map((item) => (
                    <span key={item} className="tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="credentials">
            <p className="section-label">Credentials &amp; professional learning</p>
            <p className="section-intro">
              My software-development education is self-directed: structured
              coursework, technical tutorials, independent builds, and
              professional delivery.
            </p>
            <div className="credentials-grid">
              {credentials.map((credential) => (
                <div key={credential.name} className="credential-card">
                  <h3>{credential.name}</h3>
                  <p>{credential.detail}</p>
                </div>
              ))}
            </div>
            <p className="credential-verification">
              Public credential dates, status, and issuer records are listed on my{" "}
              <a
                href="https://www.linkedin.com/in/timcisneros/details/certifications/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn certifications profile
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <section id="ai" className="section">
        <div className="container">
          <p className="section-label">Engineering practice</p>
          <h2 className="section-title">How I validate AI-assisted work</h2>
          <p className="section-intro">
            I use agents as implementation tools, then validate their output
            against explicit constraints, inspectable evidence, and automated
            checks. Each example below links to the implementation in source.
          </p>
          <div className="ai-grid">
            <a
              className="ai-card"
              href="https://github.com/timcisneros/ticket-system/blob/master/OPERATOR_CONTRACT.md"
              target="_blank"
              rel="noreferrer"
            >
              <h3>Operator contracts</h3>
              <p>
                My Ticket System runs agent work under an explicit operator
                contract: durable tickets, scoped authority, and an evidence
                ledger for every external effect. Nothing executes off-ledger.
              </p>
              <span className="ai-card-file">
                ticket-system/OPERATOR_CONTRACT.md <ArrowRightIcon />
              </span>
            </a>
            <a
              className="ai-card"
              href="https://github.com/timcisneros/ticket-system/tree/master/scripts"
              target="_blank"
              rel="noreferrer"
            >
              <h3>Benchmark harnesses</h3>
              <p>
                Agent behavior gets scored, not eyeballed: a benchmark harness
                rates workflow-draft quality, repair ability, and operational
                endurance, with regression suites for recovery and truncation
                edge cases.
              </p>
              <span className="ai-card-file">
                ticket-system/scripts/*-benchmark.js <ArrowRightIcon />
              </span>
            </a>
            <a
              className="ai-card"
              href="https://github.com/timcisneros/ticket-system/blob/master/scripts/codex-verify.js"
              target="_blank"
              rel="noreferrer"
            >
              <h3>Verification gates</h3>
              <p>
                Agent-produced changes must pass build, workflow, postcondition,
                endurance, and regression checks before they are accepted.
              </p>
              <span className="ai-card-file">
                ticket-system/scripts/codex-verify.js <ArrowRightIcon />
              </span>
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container">
          <p className="section-label">About</p>
          <h2 className="section-title">Hi, I&apos;m Tim</h2>
          <div className="about">
            <div className="about-avatar">
              <Image
                src="/avatar.jpg"
                alt="Tim Cisneros"
                width={160}
                height={160}
              />
            </div>
            <div className="about-body">
              <p>
                At Conduent I used VBA and JavaScript to automate workforce
                reports I was compiling by hand and got promoted twice for it.
              </p>
              <p>
                At Bitwise Industries I was a Solutions Engineer shipping
                AWS-backed web apps, automating HR onboarding end-to-end, and
                built{" "}
                <Link href="/projects/dsdebug" className="dsdebug-link">
                  <strong>DSDebug</strong>
                </Link>
                , an internal tool that turned unreadable DocuSign CLM workflow
                exports into interactive graphs my team could actually debug.
              </p>
              <p>
                These days I build business applications for clients through
                TimCis Media, my independent freelance and part-time business,
                where I work as a digital producer and independent software
                developer delivering React, Express, and AWS serverless systems.
              </p>
              <p>
                I&apos;m a self-taught developer whose education combines
                structured Udemy coursework, technical tutorials, sustained
                hands-on practice, and professional experience. I&apos;m based in
                California and looking for full-stack engineering,
                internal-tools, or business-process automation roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="section contact">
        <div className="container">
          <h2 className="section-title">Get in touch</h2>
          <p>
            I&apos;m looking for full-stack engineering, internal-tools, or
            automation roles.
            If that sounds like your team, my inbox is open.
          </p>
          <DeferredContactForm />
          <div className="contact-links">
            <a
              href="https://github.com/timcisneros"
              target="_blank"
              rel="noreferrer"
              className="contact-link"
            >
              <GitHubIcon width={16} height={16} /> GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/timcisneros/"
              target="_blank"
              rel="noreferrer"
              className="contact-link"
            >
              <LinkedInIcon width={16} height={16} /> LinkedIn
            </a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

export default Home;

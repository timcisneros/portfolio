import React from "react";
import Image from "next/image";
import Link from "next/link";

import MainLayout from "../components/layouts/MainLayout";
import HeroDiagram from "../components/HeroDiagram";
import TypewriterHeadline from "../components/TypewriterHeadline";
import { renderInline } from "../components/richText";
import FeaturedProject from "../components/FeaturedProject";
import ProjectCard from "../components/ProjectCard";
import ContactForm from "../components/ContactForm";
import {
  GitHubIcon,
  MailIcon,
  LinkedInIcon,
  DownloadIcon,
  ArrowRightIcon,
} from "../components/Icons";
import {
  featuredProjects,
  systemsProjects,
  moreProjects,
  skills,
  experience,
  certifications,
} from "../data/projects";

function Home() {
  return (
    <MainLayout>
      <header className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1 aria-label="Software that works for you.">
              <TypewriterHeadline />
            </h1>
            <p className="hero-sub">
              I&apos;m Tim, a JavaScript developer who&apos;s spent the last 7
              years building full-stack apps on React, Next.js, and AWS,
              automating business processes, and building tools that save people
              time. Currently a Digital Media Producer at TimCis Media, and
              formerly a Solutions Engineer at Bitwise Industries.
            </p>
            <div className="hero-actions">
              <a href="#projects" className="btn btn-primary">
                <span className="btn-cap">My projects</span>
              </a>

              <a href="/Timothy-Cisneros-Resume.pdf" className="btn btn-ghost">
                <span className="btn-cap">
                  <DownloadIcon />
                  Resume
                </span>
              </a>

              <a href="#contact" className="btn btn-ghost">
                <span className="btn-cap">
                  <MailIcon />
                  Email me
                </span>
              </a>
            </div>
          </div>
          <HeroDiagram />
        </div>
      </header>

      <section id="projects" className="section section-grid">
        <div className="container">
          <p className="section-label">Projects</p>
          <h2 className="section-title">Built for real use</h2>
          <p className="section-intro">
            Every one started with a problem I actually had or someone asked me
            to solve. Read the walkthroughs or jump straight into the live
            demos.
          </p>
          {featuredProjects.map((project) => (
            <FeaturedProject key={project.id} project={project} />
          ))}
          {systemsProjects.map((project) => (
            <FeaturedProject key={project.id} project={project} />
          ))}
          <div className="more-projects">
            <p className="section-label">More projects</p>
            <p className="section-intro">
              Smaller builds, all with live demos and source.
            </p>
            <div className="project-grid">
              {moreProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="experience" className="section">
        <div className="container">
          <p className="section-label">Experience</p>
          <h2 className="section-title">Where I&apos;ve worked</h2>
          <p className="section-intro">
            I&apos;ve worked across enterprise solutions engineering, freelance
            development, and workforce analytics. Automation has been the
            through line.
          </p>
          <div className="xp-list">
            {experience.map((job) => (
              <article key={job.id} className="xp">
                <div className="xp-meta">
                  <h3>{job.role}</h3>
                  <p className="xp-company">{job.company}</p>
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
            <a href="/Timothy-Cisneros-Resume.pdf" className="btn btn-ghost">
              <span className="btn-cap">
                <DownloadIcon /> Download resume
              </span>
            </a>
          </div>
        </div>
      </section>

      <section id="skills" className="section section-grid">
        <div className="container">
          <p className="section-label">Skills</p>
          <h2 className="section-title">What I work with</h2>
          <p className="section-intro">
            I work mostly in React and Next.js on AWS. When the mockups are mine
            too, I reach for Figma or Sketch.
          </p>
          <div className="skills-grid">
            {skills.map((group) => (
              <div key={group.group} className="skill-group">
                <h3>{group.group}</h3>
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

          <div className="certs">
            <p className="section-label">Certifications</p>
            <div className="certs-grid">
              {certifications.map((cert) => (
                <div key={cert.name} className="cert-card">
                  <h3>{cert.name}</h3>
                  <p>{cert.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="ai" className="section">
        <div className="container">
          <p className="section-label">AI</p>
          <h2 className="section-title">How I work with AI</h2>
          <p className="section-intro">
            I work with AI agents daily. The cards below link to real files in
            my repos.
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
              href="https://github.com/timcisneros/my-youtube/blob/master/CLAUDE.md"
              target="_blank"
              rel="noreferrer"
            >
              <h3>Machine-readable briefs</h3>
              <p>
                Every project carries a machine-readable brief (CLAUDE.md,
                AGENTS.md) documenting stack, architecture, and constraints. An
                agent joins the project the way a new teammate would: informed.
              </p>
              <span className="ai-card-file">
                my-youtube/CLAUDE.md <ArrowRightIcon />
              </span>
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="section section-grid">
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
                reports I was compiling by hand and got promoted three times for
                it.
              </p>
              <p>
                At Bitwise Industries I was a Solutions Engineer shipping
                AWS-backed web apps, automating HR onboarding end-to-end, and
                built{" "}
                <Link href="/projects/dsdebug">
                  <strong>DSDebug</strong>
                </Link>
                , an internal tool that turned unreadable DocuSign CLM workflow
                exports into interactive graphs my team could actually debug.
              </p>
              <p>
                These days I build business applications for clients through
                TimCis Media, my own React, Express, and AWS serverless
                practice.
              </p>
              <p>
                I&apos;m based in California, AWS and DocuSign CLM certified.
                I&apos;m looking for full-stack web development or business
                process automation roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="section contact">
        <div className="container">
          <h2 className="section-title">Get in touch</h2>
          <p>
            I&apos;m looking for full-stack web development or automation roles.
            If that sounds like your team, my inbox is open.
          </p>
          <ContactForm />
          <div className="contact-actions">
            <a href="/Timothy-Cisneros-Resume.pdf" className="btn btn-ghost">
              <span className="btn-cap">
                <DownloadIcon /> Resume
              </span>
            </a>
            <a
              href="https://github.com/timcisneros"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              <span className="btn-cap">
                <GitHubIcon width={16} height={16} /> GitHub
              </span>
            </a>
            <a
              href="https://www.linkedin.com/in/timcisneros/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              <span className="btn-cap">
                <LinkedInIcon width={16} height={16} /> LinkedIn
              </span>
            </a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

export default Home;

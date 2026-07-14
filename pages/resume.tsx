import Link from "next/link";
import type { GetStaticProps } from "next";
import MainLayout from "../components/layouts/MainLayout";
import { renderInline } from "../components/richText";
import { credentials, experience, skills, type Credential, type Job, type SkillGroup } from "../data/projects";
import styles from "./Resume.module.css";

const downloads = [
  { label: "General resume", href: "/Timothy-Cisneros-Resume.pdf" },
  { label: "Full-stack resume", href: "/Timothy-Cisneros-Resume-Full-Stack.pdf" },
  { label: "Applied AI resume", href: "/Timothy-Cisneros-Resume-Applied-AI.pdf" },
];

type ResumePageProps = {
  credentials: Credential[];
  experience: Job[];
  skills: SkillGroup[];
};

export const getStaticProps: GetStaticProps<ResumePageProps> = async () => ({
  props: { credentials, experience, skills },
});

export default function ResumePage({ credentials, experience, skills }: ResumePageProps) {
  return (
    <MainLayout
      title="Resume | Tim Cisneros"
      description="Resume for Tim Cisneros, a full-stack software developer specializing in TypeScript, React, Vue.js, Node.js, AWS, and business-process automation."
      ogTitle="Tim Cisneros — Resume"
      ogSubtitle="Full-Stack Software Developer"
    >
      <article className={styles.page}>
        <header className={`${styles.header} container`}>
          <p className="section-label">Resume</p>
          <h1>Timothy Cisneros</h1>
          <p className={styles.role}>Full-Stack Software Developer</p>
          <p className={styles.summary}>
            Full-stack software developer with professional experience delivering
            AWS-backed applications, enterprise document workflows, internal
            developer tools, and maintained client business applications.
          </p>
          <div className={styles.contact} aria-label="Contact details">
            <span>California</span>
            <a href="mailto:tcisneros.cis@gmail.com">tcisneros.cis@gmail.com</a>
            <a href="https://github.com/timcisneros">GitHub</a>
            <a href="https://www.linkedin.com/in/timcisneros/">LinkedIn</a>
          </div>
        </header>

        <div className={`${styles.body} container`}>
          <section className={styles.section} aria-labelledby="resume-experience">
            <h2 id="resume-experience">Professional experience</h2>
            <div>
              {experience.map((job) => (
                <article className={styles.job} key={job.id}>
                  <header>
                    <div>
                      <h3>{job.role}</h3>
                      <p>{job.company}</p>
                    </div>
                    <p>{job.period}<br />{job.location}</p>
                  </header>
                  {job.context && <p className={styles.context}>{job.context}</p>}
                  <ul>
                    {job.bullets.map((bullet) => <li key={bullet.slice(0, 32)}>{renderInline(bullet)}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="resume-skills">
            <h2 id="resume-skills">Technical skills</h2>
            <div className={styles.skillGrid}>
              {skills.map((group) => (
                <div key={group.group}>
                  <h3>{group.group}</h3>
                  <p>{group.items.join(" · ")}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="resume-credentials">
            <h2 id="resume-credentials">Credentials and professional learning</h2>
            <ul className={styles.credentials}>
              {credentials.map((credential) => (
                <li key={credential.name}><strong>{credential.name}</strong><span>{credential.detail}</span></li>
              ))}
            </ul>
          </section>

          <section id="downloads" className={`${styles.section} ${styles.downloads}`} aria-labelledby="resume-downloads">
            <h2 id="resume-downloads">PDF downloads</h2>
            <p>Download a role-targeted, ATS-friendly version when you need a printable copy.</p>
            <div className={styles.downloadGrid}>
              {downloads.map((download) => (
                <a key={download.href} href={download.href} download>{download.label}<span>PDF</span></a>
              ))}
            </div>
          </section>

          <p className={styles.back}><Link href="/#projects">View project evidence</Link></p>
        </div>
      </article>
    </MainLayout>
  );
}

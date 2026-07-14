import React from "react";
import Image from "next/image";
import Link from "next/link";

import MainLayout from "../components/layouts/MainLayout";
import {
  ArrowRightIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
} from "../components/Icons";
import KeycapLabel from "../components/KeycapLabel";
import KeycapSurface from "../components/KeycapSurface";
import styles from "./Now.module.css";

const OPEN_SAUCE_EMAIL =
  "mailto:tcisneros.cis@gmail.com?subject=Open%20Sauce";

function Now() {
  return (
    <MainLayout
      title="Now | Tim Cisneros"
      description="What Tim Cisneros is building, investigating, and thinking about in July 2026."
      ogTitle="What I’m working on"
      ogSubtitle="Current builds, questions, and Open Sauce 2026"
    >
      <article className={styles.page}>
        <header className={`container ${styles.header}`}>
          <p className="section-label">Now</p>
          <h1>What I&apos;m working on</h1>
          <p className={styles.eventNote}>
            I&apos;ll be at Open Sauce July 18–19 to see what people are building
            and talk shop.
          </p>
          <p className={styles.updated}>
            Updated <time dateTime="2026-07-14">July 14, 2026</time>
          </p>
        </header>

        <section
          className={`container ${styles.current}`}
          aria-labelledby="current-work"
        >
          <h2 id="current-work" className="section-label">
            Current work
          </h2>

          <ul className={styles.statusList}>
            <li>
              <Link href="/projects/ticket-system" className={styles.statusLink}>
                <span>
                  <small>Ticket System</small>
                  Making agent runs traceable and verifiable
                </span>
                <ArrowRightIcon />
              </Link>
            </li>
            <li>
              <Link href="/projects/my-youtube" className={styles.statusLink}>
                <span>
                  <small>My YouTube</small>
                  Building a private, self-hosted video frontend
                </span>
                <ArrowRightIcon />
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/timcisneros/portfolio"
                target="_blank"
                rel="noreferrer"
                className={styles.statusLink}
              >
                <span>
                  <small>Interface performance</small>
                  Keeping expressive web interfaces fast and stable
                </span>
                <ArrowRightIcon />
              </a>
            </li>
          </ul>
        </section>

        <section
          className={`container ${styles.exchange}`}
          aria-labelledby="if-we-met"
        >
          <p className="section-label">If we met</p>
          <div className={styles.exchangeInner}>
            <Image
              className={styles.exchangeAvatar}
              src="/avatar.jpg"
              alt="Tim Cisneros"
              width={112}
              height={112}
            />
            <div className={styles.exchangeCopy}>
              <h2 id="if-we-met">Keep in touch.</h2>
              <p>I&apos;d be happy to hear about what you&apos;re working on.</p>
              <div className={styles.exchangeActions}>
                <a href={OPEN_SAUCE_EMAIL} className="btn btn-gray">
                  <KeycapSurface />
                  <KeycapLabel icon={<MailIcon />}>Email me</KeycapLabel>
                </a>
                <div className={styles.exchangeLinks}>
                  <a
                    href="https://github.com/timcisneros"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <GitHubIcon width={15} height={15} /> GitHub
                  </a>
                  <a
                    href="https://www.linkedin.com/in/timcisneros/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <LinkedInIcon width={15} height={15} /> LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </article>
    </MainLayout>
  );
}

export default Now;

import React, { useState } from 'react';
import Link from 'next/link';

import { GitHubIcon, LinkedInIcon, MailIcon, MenuIcon } from './Icons';
import ThemeToggle from './ThemeToggle';

const links = [
    { href: '/#projects', label: 'Projects' },
    { href: '/#experience', label: 'Experience' },
    { href: '/#skills', label: 'Skills' },
    { href: '/#ai', label: 'AI' },
    { href: '/#about', label: 'About' },
    { href: '/#contact', label: 'Contact' },
];

const Navbar = () => {
    const [open, setOpen] = useState(false);

    return (
        <nav className="nav" style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
            <div className="container nav-inner">
                <Link href="/" className="nav-logo">
                    tim<span>cisneros</span>
                </Link>

                <button
                    className="nav-burger"
                    aria-label="Toggle menu"
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                >
                    <MenuIcon open={open} />
                </button>

                <div className={`nav-links${open ? ' open' : ''}`}>
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="nav-link"
                            onClick={() => setOpen(false)}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="nav-icons">
                        <a
                            href="https://github.com/timcisneros"
                            target="_blank"
                            rel="noreferrer"
                            className="icon-link"
                            aria-label="GitHub"
                        >
                            <GitHubIcon />
                        </a>
                        <a
                            href="https://www.linkedin.com/in/timcisneros/"
                            target="_blank"
                            rel="noreferrer"
                            className="icon-link"
                            aria-label="LinkedIn"
                        >
                            <LinkedInIcon />
                        </a>
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

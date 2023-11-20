import React, { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-regular-svg-icons';
import { faGithub, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';

const Navbar = () => {
    const [open, setOpen] = useState(false);

    return (
        <nav className="navbar has-shadow is-white is-fixed-top">
            <div className="navbar-brand">
                <Link href="/" className="navbar-item">
                    {/* <img
                        src="timcisneros-logo.png"
                        alt="logo"
                        style={{ maxHeight: '50px' }}
                        className="px-2 py-2"
                    /> */}
                    <strong>{'<Tim Cisneros>'}</strong>
                </Link>
                <a
                    className={`navbar-burger${open ? ' is-active' : ''}`}
                    onClick={() => setOpen(!open)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </a>
            </div>

            <div className={`navbar-menu${open ? ' is-active' : ''}`}>
                <div className="navbar-start">
                    <Link href="/projects" className="navbar-item">
                        Projects
                    </Link>
                    <Link href="/about-me" className="navbar-item">
                        About Me
                    </Link>
                </div>
                <div className="navbar-end">
                    <div className="navbar-item">
                        <div className="buttons">
                            <a
                                href="https://github.com/timcisneros"
                                target="_blank"
                                className="button is-white"
                            >
                                <span className="icon is-small">
                                    <FontAwesomeIcon icon={faGithub} />
                                </span>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/timcisneros/"
                                target="_blank"
                                className="button is-white"
                            >
                                <span className="icon is-small">
                                    <FontAwesomeIcon icon={faLinkedinIn} />
                                </span>
                            </a>
                            <a
                                href="mailto:tcisneros.cis@gmail.com"
                                target="_blank"
                                className="button is-white"
                            >
                                <span className="icon is-small">
                                    <FontAwesomeIcon icon={faPaperPlane} />
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

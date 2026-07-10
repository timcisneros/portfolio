import React from 'react';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-inner">
                <p>
                    © {new Date().getFullYear()} Tim Cisneros
                </p>
                <p>
                    <a
                        href="https://github.com/timcisneros/portfolio"
                        target="_blank"
                        rel="noreferrer"
                    >
                        View source on GitHub
                    </a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;

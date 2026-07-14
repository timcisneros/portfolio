/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        scrollRestoration: true,
    },
    async redirects() {
        return [
            {
                source: '/projects',
                destination: '/#projects',
                permanent: true,
            },
            {
                source: '/about-me',
                destination: '/#about',
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;

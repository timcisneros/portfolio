/** @type {import('next').NextConfig} */
const nextConfig = {
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

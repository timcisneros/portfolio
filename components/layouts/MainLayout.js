import React from 'react';

import Navbar from '../Navbar';
import Footer from '../Footer';

const MainLayout = ({ children }) => {
    return (
        <>
            <Navbar />
            <div style={{ height: '60px' }} />

            {children}

            <Footer />
        </>
    );
};

export default MainLayout;

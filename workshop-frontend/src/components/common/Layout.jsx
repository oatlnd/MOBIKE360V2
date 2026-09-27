import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Container, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    const theme = useTheme();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const isLiveBoard = location.pathname.includes('live-board') || location.pathname.includes('live-tv');

    return (
        <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', bgcolor: 'background.default' }}>
            {/* Sidebar Navigation */}
            <Sidebar open={sidebarOpen} toggleOpen={toggleSidebar} />

            {/* Main Content Area */}
            <Box 
                sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100vh',
                    overflow: 'hidden',
                    minWidth: 0, // Prevent flex item overflow
                    transition: theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                {/* Header controls */}
                <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

                {/* Page Content Panel */}
                <Container 
                    maxWidth={isLiveBoard ? false : "xl"} 
                    disableGutters={isLiveBoard}
                    sx={{ 
                        py: isLiveBoard ? 1 : { xs: 2, md: 4 },
                        px: isLiveBoard ? { xs: 0.5, sm: 1 } : { xs: 1.5, sm: 3 },
                        flexGrow: 1,
                        overflowY: 'auto',
                        minHeight: 0, // Allows child to shrink and enable scrolling
                        display: 'flex', 
                        flexDirection: 'column',
                        width: '100%',
                        maxWidth: isLiveBoard ? '100% !important' : undefined,
                        animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}
                >
                    <Outlet />
                    {/* Application Version Footer */}
                      <Box component="footer" sx={{ mt: 'auto', pt: 2, textAlign: 'right' }}>
                     <Typography variant="caption" color="text.secondary" className="version-label">
                        v{process.env.REACT_APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
                     </Typography>
          </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default Layout;
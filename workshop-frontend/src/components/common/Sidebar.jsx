import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Box,
    Typography,
    Divider,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Assignment as JobCardIcon,
    Inventory as InventoryIcon,
    Receipt as InvoiceIcon,
    BarChart as ReportsIcon,
    Settings as SettingsIcon,
    ChevronLeft as ChevronLeftIcon,
    Build as BuildIcon,
    LiveTv as LiveTvIcon,
    AccountBalanceWallet as PayrollIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 80;

const Sidebar = ({ open, toggleOpen }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { hasAnyPermission } = useAuth();

    /**
     * anyPermissions: show the nav item if the user has AT LEAST ONE of these permissions.
     * null means always visible (e.g. Dashboard).
     */
    const allMenuItems = [
        {
            text: t('menu.dashboard') || 'Dashboard',
            icon: <DashboardIcon />,
            path: '/dashboard',
            anyPermissions: null,   // always visible
        },
        {
            text: 'Live TV Board',
            icon: <LiveTvIcon />,
            path: '/live-board',
            anyPermissions: ['view_live_board', 'view job cards'],
        },
        {
            text: t('menu.jobCards') || 'Job Cards',
            icon: <JobCardIcon />,
            path: '/job-cards',
            anyPermissions: ['view job cards', 'create job cards', 'edit job cards', 'delete job cards', 'complete job cards', 'convert to invoice'],
        },
        {
            text: t('menu.inventory') || 'Inventory',
            icon: <InventoryIcon />,
            path: '/inventory',
            anyPermissions: ['view inventory', 'create inventory', 'edit inventory', 'delete inventory', 'adjust inventory', 'manage purchases'],
        },
        {
            text: t('menu.invoices') || 'Invoices',
            icon: <InvoiceIcon />,
            path: '/invoices',
            anyPermissions: ['view invoices', 'create invoices', 'edit invoices', 'delete invoices'],
        },
        {
            text: t('menu.reports') || 'Reports',
            icon: <ReportsIcon />,
            path: '/reports',
            anyPermissions: ['view reports', 'export reports'],
        },
        {
            text: 'Payroll & Wages',
            icon: <PayrollIcon />,
            path: '/payroll',
            anyPermissions: ['view_payroll', 'manage_payroll', 'manage_attendance', 'manage_advances'],
        },
        {
            text: t('menu.settings') || 'Settings',
            icon: <SettingsIcon />,
            path: '/settings',
            anyPermissions: null, // always visible so users can access profile
        },
    ];

    // Show the item if no permission required, or user has at least one relevant permission
    const menuItems = allMenuItems.filter(
        (item) => item.anyPermissions === null || hasAnyPermission(item.anyPermissions)
    );

    return (
        <Drawer
            variant="temporary"
            open={open}
            onClose={toggleOpen}
            ModalProps={{ keepMounted: true }}
            sx={{
                width: open ? DRAWER_WIDTH : 0,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                '& .MuiDrawer-paper': {
                    width: open ? DRAWER_WIDTH : 0,
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    overflowX: 'hidden',
                    borderRight: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: isDark ? '4px 0 25px rgba(0,0,0,0.15)' : '4px 0 25px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                },
            }}
        >
            <Box>
                {/* Logo Section */}
                <Box
                    sx={{
                        height: 70,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: open ? 'space-between' : 'center',
                        px: 2.5
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <BuildIcon color="primary" sx={{ fontSize: 28 }} />
                        {open && (
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Ratnam Service Station
                            </Typography>
                        )}
                    </Box>
                    {open && (
                        <IconButton onClick={toggleOpen} size="small">
                            <ChevronLeftIcon />
                        </IconButton>
                    )}
                </Box>

                <Divider sx={{ opacity: 0.6 }} />

                {/* Menu List — only permitted items rendered */}
                <List sx={{ px: 1.5, py: 2 }}>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0.8 }}>
                            <ListItemButton
                                component={NavLink}
                                to={item.path}
                                onClick={toggleOpen}
                                sx={{
                                    minHeight: 48,
                                    justifyContent: open ? 'initial' : 'center',
                                    px: 2,
                                    borderRadius: '10px',
                                    transition: 'all 0.2s',
                                    color: theme.palette.text.secondary,
                                    '&.active': {
                                        backgroundColor: theme.palette.primary.main,
                                        color: '#ffffff',
                                        '& .MuiListItemIcon-root': { color: '#ffffff' },
                                        boxShadow: isDark
                                            ? '0 4px 15px rgba(99, 102, 241, 0.35)'
                                            : '0 4px 15px rgba(79, 70, 229, 0.25)',
                                    },
                                    '&:hover:not(.active)': {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                        color: theme.palette.text.primary,
                                        '& .MuiListItemIcon-root': { color: theme.palette.text.primary },
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: open ? 2 : 'auto',
                                        justifyContent: 'center',
                                        color: theme.palette.text.secondary,
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    sx={{
                                        opacity: open ? 1 : 0,
                                        '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.9rem' },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* Bottom Section — collapse toggle when sidebar is closed */}
            <Box sx={{ p: 2 }}>
                {!open && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton onClick={toggleOpen} size="small">
                            <ChevronLeftIcon sx={{ transform: 'rotate(180deg)' }} />
                        </IconButton>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
};

export default Sidebar;

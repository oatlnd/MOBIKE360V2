import React, { useState } from 'react';
import { 
    AppBar, 
    Toolbar, 
    IconButton, 
    Typography, 
    Box, 
    Menu, 
    MenuItem, 
    Avatar, 
    Tooltip, 
    useTheme,
    Button,
    Badge,
    Divider,
    Popover,
    Paper,
    List,
    ListItem,
    ListItemText,
    Chip,
    CircularProgress,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkIcon,
    Brightness7 as LightIcon,
    Language as LanguageIcon,
    AccountCircle,
    ExitToApp,
    NotificationsNone,
    Close as CloseIcon,
    DoneAll as DoneAllIcon,
    DeleteSweep as DeleteSweepIcon,
    Circle as CircleIcon,
    Notifications as NotificationsFilledIcon,
} from '@mui/icons-material';
import { useColorMode } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const Header = ({ sidebarOpen, toggleSidebar }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { mode, toggleColorMode } = useColorMode();
    const { language, toggleLanguage } = useLanguage();
    const { user, logout } = useAuth();
    const { t } = useTranslation();

    const [anchorEl, setAnchorEl] = useState(null);
    const [notifAnchorEl, setNotifAnchorEl] = useState(null);

    // ---- Notifications Query ----
    const { data: notifications = [], isLoading: notifLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data;
        },
        refetchInterval: 15000,
    });

    // Mark single as read
    const markReadMutation = useMutation({
        mutationFn: (id) => api.post(`/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    // Mark ALL as read
    const markAllReadMutation = useMutation({
        mutationFn: () => api.post('/notifications/read-all'),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            toast.success('All marked as read');
        },
    });

    // Clear (delete) single notification
    const clearOneMutation = useMutation({
        mutationFn: (id) => api.delete(`/notifications/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    // Clear ALL notifications
    const clearAllMutation = useMutation({
        mutationFn: () => api.delete('/notifications/clear-all'),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            toast.success('All notifications cleared');
        },
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // ---- Handlers ----
    const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleNotifOpen = (e) => setNotifAnchorEl(e.currentTarget);
    const handleNotifClose = () => setNotifAnchorEl(null);

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    const handleProfileRedirect = () => {
        handleMenuClose();
        navigate('/settings');
    };

    const handleNotifClick = (notif) => {
        if (!notif.is_read) markReadMutation.mutate(notif.id);
    };

    const handleClearOne = (e, id) => {
        e.stopPropagation();
        clearOneMutation.mutate(id);
    };

    // Relative time formatter
    const relativeTime = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <AppBar 
            position="sticky" 
            elevation={0}
            sx={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                borderBottom: `1px solid ${theme.palette.divider}`,
                zIndex: theme.zIndex.drawer + 1,
                backdropFilter: 'blur(12px)',
                background: theme.palette.mode === 'dark' 
                    ? 'rgba(17, 24, 39, 0.85)' 
                    : 'rgba(255, 255, 255, 0.85)',
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: 70 }}>
                {/* Left: Hamburger + Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                        color="inherit"
                        onClick={toggleSidebar}
                        edge="start"
                        sx={{ mr: 1 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 800, 
                            display: { xs: 'none', sm: 'block' }, 
                            letterSpacing: '-0.02em',
                            background: theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, #60a5fa, #a78bfa)'
                                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Ratnam Service Station
                    </Typography>
                </Box>

                {/* Right controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* Theme Toggle */}
                    <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                        <IconButton onClick={toggleColorMode} color="inherit" size="small">
                            {mode === 'dark' ? <LightIcon sx={{ color: '#fbbf24' }} /> : <DarkIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* Language */}
                    <Tooltip title="Switch Language">
                        <Button 
                            onClick={toggleLanguage} 
                            color="inherit" 
                            startIcon={<LanguageIcon />}
                            size="small"
                            sx={{ fontWeight: 700, px: 1, borderRadius: '8px', fontSize: '0.8rem' }}
                        >
                            {language === 'en' ? 'EN' : 'TA'}
                        </Button>
                    </Tooltip>

                    {/* Notification Bell */}
                    <Tooltip title="Notifications">
                        <IconButton color="inherit" onClick={handleNotifOpen} size="small">
                            <Badge badgeContent={unreadCount || null} color="error" max={99}>
                                {unreadCount > 0 
                                    ? <NotificationsFilledIcon sx={{ color: 'primary.main' }} />
                                    : <NotificationsNone />
                                }
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    {/* ---- Notification Popover (rich panel) ---- */}
                    <Popover
                        open={Boolean(notifAnchorEl)}
                        anchorEl={notifAnchorEl}
                        onClose={handleNotifClose}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        PaperProps={{
                            elevation: 12,
                            sx: {
                                mt: 1.5,
                                width: 360,
                                borderRadius: '16px',
                                overflow: 'hidden',
                                border: `1px solid ${theme.palette.divider}`,
                            }
                        }}
                    >
                        {/* Header row */}
                        <Box sx={{ 
                            px: 2, py: 1.5, 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            background: theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(0,0,0,0.02)',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight={800}>
                                    Notifications
                                </Typography>
                                {unreadCount > 0 && (
                                    <Chip 
                                        label={unreadCount} 
                                        size="small" 
                                        color="primary"
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                    />
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {unreadCount > 0 && (
                                    <Tooltip title="Mark all as read">
                                        <IconButton 
                                            size="small" 
                                            onClick={() => markAllReadMutation.mutate()}
                                            disabled={markAllReadMutation.isPending}
                                            sx={{ color: 'primary.main' }}
                                        >
                                            <DoneAllIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {notifications.length > 0 && (
                                    <Tooltip title="Clear all">
                                        <IconButton 
                                            size="small" 
                                            onClick={() => clearAllMutation.mutate()}
                                            disabled={clearAllMutation.isPending}
                                            sx={{ color: 'error.main' }}
                                        >
                                            <DeleteSweepIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>

                        {/* Notifications list */}
                        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                            {notifLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : notifications.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <NotificationsNone sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body2" color="textSecondary">
                                        You're all caught up!
                                    </Typography>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {notifications.map((notif, idx) => (
                                        <React.Fragment key={notif.id}>
                                            <ListItem
                                                onClick={() => handleNotifClick(notif)}
                                                sx={{
                                                    px: 2, py: 1.5,
                                                    cursor: 'pointer',
                                                    alignItems: 'flex-start',
                                                    gap: 1,
                                                    backgroundColor: notif.is_read 
                                                        ? 'transparent' 
                                                        : theme.palette.mode === 'dark'
                                                            ? 'rgba(96,165,250,0.06)'
                                                            : 'rgba(37,99,235,0.04)',
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.action.hover,
                                                    },
                                                    transition: 'background-color 0.15s',
                                                    position: 'relative',
                                                }}
                                                secondaryAction={
                                                    <Tooltip title="Dismiss">
                                                        <IconButton
                                                            edge="end"
                                                            size="small"
                                                            onClick={(e) => handleClearOne(e, notif.id)}
                                                            disabled={clearOneMutation.isPending}
                                                            sx={{ 
                                                                opacity: 0.5, 
                                                                '&:hover': { opacity: 1, color: 'error.main' },
                                                                transition: 'opacity 0.15s, color 0.15s',
                                                            }}
                                                        >
                                                            <CloseIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                            >
                                                {/* Unread indicator dot */}
                                                {!notif.is_read && (
                                                    <CircleIcon 
                                                        sx={{ 
                                                            fontSize: 8, 
                                                            color: 'primary.main', 
                                                            mt: 0.9,
                                                            flexShrink: 0,
                                                        }} 
                                                    />
                                                )}
                                                <ListItemText
                                                    sx={{ 
                                                        ml: notif.is_read ? 2 : 0,
                                                        mr: 2,
                                                        my: 0,
                                                    }}
                                                    primary={
                                                        <Typography 
                                                            variant="body2" 
                                                            fontWeight={notif.is_read ? 500 : 700}
                                                            sx={{ lineHeight: 1.4, mb: 0.3 }}
                                                        >
                                                            {notif.title}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box>
                                                            <Typography 
                                                                variant="caption" 
                                                                color="textSecondary"
                                                                sx={{ display: 'block', lineHeight: 1.5, mb: 0.4 }}
                                                            >
                                                                {notif.message}
                                                            </Typography>
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    color: notif.is_read ? 'text.disabled' : 'primary.main',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.7rem',
                                                                }}
                                                            >
                                                                {relativeTime(notif.created_at)}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {idx < notifications.length - 1 && (
                                                <Divider sx={{ opacity: 0.4 }} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </Box>

                        {/* Footer actions */}
                        {notifications.length > 0 && (
                            <Box sx={{ 
                                px: 2, py: 1.5, 
                                borderTop: `1px solid ${theme.palette.divider}`,
                                display: 'flex',
                                justifyContent: 'center',
                                background: theme.palette.mode === 'dark'
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'rgba(0,0,0,0.01)',
                            }}>
                                <Button
                                    size="small"
                                    color="error"
                                    startIcon={<DeleteSweepIcon />}
                                    onClick={() => clearAllMutation.mutate()}
                                    disabled={clearAllMutation.isPending}
                                    sx={{ fontWeight: 700, borderRadius: '8px' }}
                                >
                                    Clear All Notifications
                                </Button>
                            </Box>
                        )}
                    </Popover>

                    {/* Profile Avatar + Dropdown */}
                    <Tooltip title="Account settings">
                        <Box 
                            onClick={handleMenuOpen}
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1, 
                                cursor: 'pointer',
                                ml: 0.5,
                                pl: 1.5,
                                pr: 1.5,
                                py: 0.75,
                                borderRadius: '24px',
                                border: `1px solid ${theme.palette.divider}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    borderColor: theme.palette.primary.main,
                                }
                            }}
                        >
                            <Avatar 
                                sx={{ 
                                    width: 28, 
                                    height: 28, 
                                    bgcolor: 'primary.main',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                }}
                            >
                                {user?.name ? user.name[0].toUpperCase() : 'U'}
                            </Avatar>
                            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    {user?.name || 'User'}
                                </Typography>
                                <Typography 
                                    variant="caption" 
                                    color="textSecondary" 
                                    sx={{ 
                                        display: 'block', 
                                        fontSize: '0.7rem', 
                                        textTransform: 'capitalize',
                                        lineHeight: 1,
                                    }}
                                >
                                    {user?.roles?.[0]?.name || 'Staff'}
                                </Typography>
                            </Box>
                        </Box>
                    </Tooltip>

                    {/* Profile Dropdown Menu */}
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                        onClick={handleMenuClose}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        PaperProps={{
                            elevation: 12,
                            sx: {
                                mt: 1.5,
                                minWidth: 200,
                                borderRadius: '14px',
                                border: `1px solid ${theme.palette.divider}`,
                                overflow: 'hidden',
                            }
                        }}
                    >
                        {/* Profile header in dropdown */}
                        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {user?.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                {user?.email}
                            </Typography>
                        </Box>
                        <MenuItem 
                            onClick={handleProfileRedirect}
                            sx={{ py: 1.2, gap: 1.5 }}
                        >
                            <AccountCircle sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={600}>My Profile</Typography>
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem 
                            onClick={handleLogout} 
                            sx={{ py: 1.2, gap: 1.5, color: 'error.main' }}
                        >
                            <ExitToApp sx={{ fontSize: 18 }} />
                            <Typography variant="body2" fontWeight={600}>Sign Out</Typography>
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;

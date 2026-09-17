import React, { useState } from 'react';
import { 
    Typography, 
    Paper, 
    Grid, 
    Card, 
    CardContent, 
    Box, 
    useTheme, 
    Avatar, 
    Button, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    Chip,
    CircularProgress,
    Stack,
    LinearProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid 
} from 'recharts';
import {
    AssignmentOutlined,
    CheckCircleOutline,
    ReceiptOutlined,
    WarningAmberOutlined,
    Add,
    BuildOutlined,
    PersonOutlined,
    ArrowForward,
    LockOutlined,
    StorefrontOutlined
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
    const { t } = useTranslation();
    const { currencySymbol, revenueVisibility } = useSettings();
    const { user, hasRole } = useAuth();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();

    // Client timezone for accurate day-boundary alignment
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Colombo';

    // Branch filter state
    const [selectedBranch, setSelectedBranch] = useState('');

    // Fetch branches for filter
    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const res = await api.get(ENDPOINTS.BRANCHES, { skipAuthToast: true });
            return res.data?.data ?? res.data ?? [];
        }
    });

    const uniqueBranches = React.useMemo(() => {
        const list = Array.isArray(branches) ? branches : (Array.isArray(branches?.data) ? branches.data : []);
        const seen = new Set();
        return list.filter(b => {
            if (!b || typeof b !== 'object') return false;
            const norm = (b.name || '').toLowerCase().replace(/\s+branch$/i, '').trim();
            if (!norm || seen.has(norm)) return false;
            seen.add(norm);
            return true;
        });
    }, [branches]);

    // ─── Revenue visibility gate ───────────────────────────────────────────────
    const canSeeRevenue = (() => {
        if (!user) return false;
        if (revenueVisibility === 'everyone') return true;
        if (revenueVisibility === 'admin_only') return hasRole('admin');
        if (revenueVisibility === 'managers_admin') return hasRole('admin') || hasRole('manager');
        return true;
    })();

    // Fetch Dashboard Stats from Backend with timezone and branch
    const { data: dbData, isLoading } = useQuery({
        queryKey: ['reports-dashboard', clientTimezone, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('timezone', clientTimezone);
            if (selectedBranch) {
                params.append('branch_id', selectedBranch);
            }
            const res = await api.get(`/reports/dashboard?${params.toString()}`, { skipAuthToast: true });
            return res.data;
        }
    });

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    // Backend data with safe fallbacks
    const receivedToday = dbData?.received_today ?? 0;
    const inProgressAll = dbData?.in_progress_all ?? 0;
    const partsAwaitedAll = dbData?.parts_awaited_all ?? 0;
    const notReadyAll = dbData?.not_ready_all ?? 0;
    const readyForPickupAll = dbData?.ready_for_pickup_all ?? 0;
    const deliveredToday = dbData?.delivered_today ?? 0;

    const branchActivity = dbData?.branch_activity ?? [];
    const recentJobCards = dbData?.recent_job_cards ?? [];
    const topMechanics = dbData?.top_mechanics ?? [];
    const weeklyTrends = dbData?.weekly_job_trends ?? [];

    // Format currencies cleanly
    const formatCurrency = (val) => {
        return `${currencySymbol} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val || 0)}`;
    };

    // Compact Primary KPI stats
    const primaryStats = [
        {
            title: t('dashboard.receivedToday') || 'Received Today',
            value: receivedToday,
            subtitle: 'New entries today',
            icon: <AssignmentOutlined sx={{ fontSize: 20 }} />,
            color: theme.palette.primary.main,
            bgGlow: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(79, 70, 229, 0.08)'
        },
        {
            title: t('dashboard.inProgressAll') || 'In Progress',
            value: inProgressAll,
            subtitle: 'Active workshop jobs',
            icon: <BuildOutlined sx={{ fontSize: 20 }} />,
            color: theme.palette.info.main,
            bgGlow: isDark ? 'rgba(14, 165, 233, 0.18)' : 'rgba(14, 165, 233, 0.08)'
        },
        {
            title: t('dashboard.partsAwaitedAll') || 'Parts Awaited',
            value: partsAwaitedAll,
            subtitle: 'Waiting inventory',
            icon: <WarningAmberOutlined sx={{ fontSize: 20 }} />,
            color: theme.palette.warning.main,
            bgGlow: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.08)'
        },
        {
            title: t('dashboard.notReadyAll') || 'Not Ready',
            value: notReadyAll,
            subtitle: 'Pending completion',
            icon: <LockOutlined sx={{ fontSize: 20 }} />,
            color: theme.palette.error.main,
            bgGlow: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)'
        },
        {
            title: t('dashboard.readyForPickupAll') || 'Ready for Pickup',
            value: readyForPickupAll,
            subtitle: 'Ready for customer',
            icon: <CheckCircleOutline sx={{ fontSize: 20 }} />,
            color: theme.palette.success.main,
            bgGlow: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.08)'
        },
        {
            title: t('dashboard.deliveredToday') || 'Delivered Today',
            value: deliveredToday,
            subtitle: 'Returned to customers',
            icon: <ReceiptOutlined sx={{ fontSize: 20 }} />,
            color: theme.palette.secondary.main,
            bgGlow: isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(168, 85, 247, 0.08)'
        }
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header Welcome Panel & Controls */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2
                }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.025em' }}>
                        {t('dashboard.title') || 'Dashboard Overview'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" fontWeight={500}>
                        {t('dashboard.subtitle') || 'Live status of workshop operations, jobs, and branch metrics.'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Branch Filter Selector */}
                    {uniqueBranches.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel id="dash-branch-label">Branch</InputLabel>
                            <Select
                                labelId="dash-branch-label"
                                value={selectedBranch}
                                label="Branch"
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                sx={{ borderRadius: '10px' }}
                            >
                                <MenuItem value=""><em>All Branches</em></MenuItem>
                                {uniqueBranches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<Add />}
                        onClick={() => navigate('/job-cards/new')}
                        sx={{ 
                            borderRadius: '10px',
                            fontWeight: 700,
                            px: 2.5,
                            py: 1,
                            boxShadow: isDark ? '0 4px 20px rgba(99, 102, 241, 0.3)' : '0 4px 20px rgba(79, 70, 229, 0.18)'
                        }}
                    >
                        New Job Card
                    </Button>
                </Box>
            </Box>

            {/* Primary KPI Cards Grid - Compact Sleek Design */}
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                    Workshop Key Metrics
                </Typography>
                <Grid container spacing={2}>
                    {primaryStats.map((stat) => (
                        <Grid item xs={6} sm={4} md={2} key={stat.title}>
                            <Card 
                                sx={{ 
                                    height: '100%', 
                                    position: 'relative',
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '12px',
                                    boxShadow: 'none',
                                    transition: 'all 0.25s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        borderColor: stat.color,
                                        boxShadow: isDark 
                                            ? '0 6px 20px rgba(0, 0, 0, 0.35)' 
                                            : '0 6px 20px rgba(79, 70, 229, 0.06)',
                                    }
                                }}
                            >
                                <Box 
                                    sx={{
                                        position: 'absolute',
                                        top: -15,
                                        right: -15,
                                        width: 60,
                                        height: 60,
                                        borderRadius: '50%',
                                        background: stat.bgGlow,
                                        filter: 'blur(12px)',
                                        zIndex: 0
                                    }}
                                />
                                <CardContent sx={{ p: '14px !important', position: 'relative', zIndex: 1 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                fontWeight: 700, 
                                                color: 'text.secondary',
                                                lineHeight: 1.2,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                        >
                                            {stat.title}
                                        </Typography>
                                        <Avatar 
                                            sx={{ 
                                                bgcolor: stat.bgGlow, 
                                                color: stat.color,
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px'
                                            }}
                                        >
                                            {stat.icon}
                                        </Avatar>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.2, letterSpacing: '-0.02em', color: 'text.primary' }}>
                                        {stat.value}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem', display: 'block' }}>
                                        {stat.subtitle}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Dynamic Branch Activity Today - Compact Cards */}
            {branchActivity.length > 0 && (
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                        Branch Activity Today
                    </Typography>
                    <Grid container spacing={2}>
                        {branchActivity.map((b) => (
                            <Grid item xs={12} sm={6} md={Math.max(3, 12 / Math.min(branchActivity.length, 4))} key={b.id}>
                                <Card 
                                    sx={{ 
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: 'none',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: theme.palette.primary.main,
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: '14px 16px !important' }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Avatar 
                                                    sx={{ 
                                                        bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)', 
                                                        color: theme.palette.primary.main,
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    <StorefrontOutlined sx={{ fontSize: 20 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700}>
                                                        {b.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Today's Job Cards
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Chip 
                                                label={`${b.count} jobs`} 
                                                size="small" 
                                                color={b.count > 0 ? 'primary' : 'default'} 
                                                sx={{ fontWeight: 800, borderRadius: '6px' }}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Charts & Lists Section */}
            <Grid container spacing={3}>
                {/* Weekly Job Trends Area Graph */}
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                    {t('dashboard.weeklyJobTrends') || 'Weekly Job Card Trends'}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Number of jobs created per day (Last 7 Days)
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ width: '100%', height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.02}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                    <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        formatter={(v) => [v, 'Jobs Created']}
                                        labelFormatter={(label, items) => {
                                            const item = items?.[0]?.payload;
                                            return item?.date ? `${label} (${item.date})` : label;
                                        }}
                                        contentStyle={{ 
                                            backgroundColor: theme.palette.background.paper, 
                                            borderColor: theme.palette.divider, 
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="jobs" 
                                        stroke={theme.palette.primary.main} 
                                        strokeWidth={2.5}
                                        fillOpacity={1} 
                                        fill="url(#colorJobs)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Team Leaders Panel */}
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                            {t('jobCard.mechanic') || 'Top Performance Mechanics'}
                        </Typography>
                        <Stack spacing={2}>
                            {topMechanics.length === 0 ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="textSecondary">{t('common.noData') || 'No mechanics active today.'}</Typography>
                                </Box>
                            ) : (
                                topMechanics.map((item, idx) => (
                                    <Box key={item.mechanic_id ?? idx}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                            <Box display="flex" alignItems="center" gap={1.2}>
                                                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32, fontSize: '0.85rem', fontWeight: 700 }}>
                                                    {item.mechanic?.name?.charAt(0).toUpperCase() || 'M'}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                                        {item.mechanic?.name ?? 'Unknown Staff'}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Mechanic
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Chip label={`${item.jobs_count} jobs`} size="small" color="primary" sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }} />
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={Math.min((item.jobs_count / 10) * 100, 100)} 
                                            sx={{ height: 5, borderRadius: '3px' }} 
                                        />
                                    </Box>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Grid>

                {/* Recent Jobs Table */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                {t('jobCard.title') || 'Recent Work Orders'}
                            </Typography>
                            <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/job-cards')} sx={{ fontWeight: 700 }}>
                                {t('common.view') || 'View All Orders'}
                            </Button>
                        </Box>
                        <TableContainer>
                            <Table size="small" sx={{ minWidth: 650 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('jobCard.number') || 'Job Number'}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('jobCard.bikeNumber') || 'Vehicle Number'}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('jobCard.customerName') || 'Customer Name'}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('jobCard.mechanic') || 'Mechanic'}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('common.status') || 'Status'}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('jobCard.finalAmount') || 'Amount'}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentJobCards.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                                No recent job cards found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recentJobCards.map((row) => {
                                            const statusColors = {
                                                received: 'default',
                                                diagnosis: 'warning',
                                                in_progress: 'info',
                                                parts_awaited: 'secondary',
                                                qc: 'warning',
                                                completed: 'success',
                                                invoiced: 'primary',
                                                cancelled: 'error'
                                            };
                                            return (
                                                <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/job-cards/${row.id}`)}>
                                                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                        {row.job_number}
                                                    </TableCell>
                                                    <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                                                        {row.bike_number}
                                                    </TableCell>
                                                    <TableCell>{row.customer_name}</TableCell>
                                                    <TableCell>{row.branch?.name ?? '-'}</TableCell>
                                                    <TableCell>{row.mechanic?.name ?? 'Unassigned'}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={t(`jobCard.status.${row.status}`, row.status?.replace('_', ' ')?.toUpperCase() || 'RECEIVED')} 
                                                            color={statusColors[row.status] || 'default'}
                                                            size="small" 
                                                            sx={{ fontWeight: 700, borderRadius: '6px', height: 22, fontSize: '0.72rem' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>
                                                        {formatCurrency(row.final_amount)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
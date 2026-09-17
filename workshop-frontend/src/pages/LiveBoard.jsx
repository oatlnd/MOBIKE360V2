import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    Tooltip,
    TextField,
    InputAdornment,
    FormControl,
    Select,
    MenuItem,
    Button,
    Avatar,
    useTheme,
} from '@mui/material';
import {
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    TwoWheeler as BikeIcon,
    AccessTime as TimeIcon,
    CheckCircle as CompletedIcon,
    Build as InProgressIcon,
    HourglassEmpty as QueueIcon,
} from '@mui/icons-material';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const REFRESH_INTERVAL_SECONDS = 30;

const LiveBoard = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { hasPermission } = useAuth();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SECONDS);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Live clock ticker
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setSecondsLeft((prev) => (prev <= 1 ? REFRESH_INTERVAL_SECONDS : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fullscreen event listener
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => console.error(err));
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch((err) => console.error(err));
            }
        }
    };

    // Fetch branches
    const { data: branches = [] } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const res = await api.get('/branches');
            const list = res.data?.data || res.data || [];
            return Array.isArray(list) ? list : [];
        },
    });
    const uniqueBranches = useMemo(() => {
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

    // Automatically default to "Service" branch if available
    useEffect(() => {
        if (uniqueBranches.length > 0 && !selectedBranch) {
            const serviceBranch = uniqueBranches.find(
                (b) => b.name && b.name.toLowerCase().includes('service')
            );
            if (serviceBranch) {
                setSelectedBranch(serviceBranch.id);
            }
        }
    }, [uniqueBranches, selectedBranch]);

    // Fetch Live Board Data (auto-refresh every 30 seconds)
    const { data: liveData, refetch, isFetching } = useQuery({
        queryKey: ['live-board-data', selectedBranch],
        queryFn: async () => {
            const params = selectedBranch ? { branch_id: selectedBranch } : {};
            const res = await api.get('/job-cards/live-board', { params });
            setSecondsLeft(REFRESH_INTERVAL_SECONDS);
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL_SECONDS * 1000,
        refetchOnWindowFocus: true,
    });

    const jobs = liveData?.jobs || [];
    const counts = liveData?.counts || {
        total_active: 0,
        queue: 0,
        in_progress: 0,
        ready_for_pickup: 0,
        completed: 0,
    };

    // Filter jobs by search query
    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                (job.bike_number && job.bike_number.toLowerCase().includes(q)) ||
                (job.job_number && job.job_number.toLowerCase().includes(q)) ||
                (job.customer_name && job.customer_name.toLowerCase().includes(q))
            );
        });
    }, [jobs, searchQuery]);

    // 3 Status Kanban Lanes - Ready for pickup strictly shows delivery_status === 'ready_for_pickup'
    const readyJobs = filteredJobs.filter((j) => j.delivery_status === 'ready_for_pickup');
    const queueJobs = filteredJobs.filter((j) => ['received', 'diagnosis', 'pending'].includes(j.status) && j.delivery_status !== 'ready_for_pickup' && j.delivery_status !== 'delivered');
    const inProgressJobs = filteredJobs.filter((j) => ['in_progress', 'parts_awaited', 'qc'].includes(j.status) && j.delivery_status !== 'ready_for_pickup' && j.delivery_status !== 'delivered');

    const handleCardClick = (job) => {
        if (hasPermission('view job cards')) {
            navigate(`/job-cards/${job.id}`);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                maxWidth: '100%',
                minHeight: '100vh',
                bgcolor: isDark ? '#0b1120' : '#f8fafc',
                p: isFullscreen ? 1.5 : { xs: 1, sm: 2, md: 2.5 },
                boxSizing: 'border-box',
                overflowX: 'hidden',
            }}
        >
            {/* TOP BAR / TV HEADER */}
            <Paper
                elevation={3}
                sx={{
                    p: { xs: 1.25, sm: 1.75 },
                    borderRadius: '16px',
                    bgcolor: isDark ? '#111827' : '#ffffff',
                    border: '1px solid',
                    borderColor: isDark ? '#1f2937' : '#e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                {/* Brand & Digital Clock */}
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                        sx={{
                            bgcolor: '#2563eb',
                            width: 44,
                            height: 44,
                            boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                        }}
                    >
                        <BikeIcon fontSize="medium" />
                    </Avatar>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                Workshop Live Status
                            </Typography>
                            <Chip
                                label="LIVE"
                                size="small"
                                color="error"
                                sx={{
                                    height: 18,
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    animation: 'pulse 2s infinite',
                                    '@keyframes pulse': {
                                        '0%': { opacity: 1 },
                                        '50%': { opacity: 0.3 },
                                        '100%': { opacity: 1 },
                                    },
                                }}
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            {' • '}
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#3b82f6', fontSize: '0.85rem' }}>
                                {currentTime.toLocaleTimeString()}
                            </span>
                        </Typography>
                    </Box>
                </Box>

                {/* Filter & Controls */}
                <Box display="flex" alignItems="center" flexWrap="wrap" gap={1.25}>
                    {/* Branch Filter */}
                    {uniqueBranches.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                displayEmpty
                                sx={{ borderRadius: '10px', height: 36, fontSize: '0.85rem' }}
                            >
                                <MenuItem value="">All Branches</MenuItem>
                                {uniqueBranches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Search Field */}
                    <TextField
                        size="small"
                        placeholder="Search Bike # / Job #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: { xs: '100%', sm: 180, md: 220 },
                            '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 36 },
                        }}
                    />

                    {/* Auto Refresh Progress Badge */}
                    <Tooltip title="Auto-refresh interval (30s)">
                        <Chip
                            icon={<TimeIcon fontSize="small" />}
                            label={`Sync: ${secondsLeft}s`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontFamily: 'monospace', height: 36, px: 1 }}
                        />
                    </Tooltip>

                    {/* Manual Refresh Button */}
                    <Tooltip title="Refresh Now">
                        <span>
                            <IconButton
                                onClick={() => refetch()}
                                disabled={isFetching}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '10px',
                                    width: 36,
                                    height: 36,
                                }}
                            >
                                <RefreshIcon
                                    fontSize="small"
                                    sx={{
                                        animation: isFetching ? 'spin 1s linear infinite' : 'none',
                                        '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                                    }}
                                />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* TV Fullscreen Button */}
                    <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fit to TV Screen'}>
                        <Button
                            variant={isFullscreen ? 'contained' : 'outlined'}
                            color="primary"
                            startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                            onClick={toggleFullscreen}
                            sx={{ borderRadius: '10px', height: 36, fontWeight: 700, textTransform: 'none' }}
                        >
                            {isFullscreen ? 'Exit TV Mode' : 'TV Display'}
                        </Button>
                    </Tooltip>
                </Box>
            </Paper>

            {/* SUMMARY STATS BAR (3 Columns) */}
            <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
                <Grid item xs={12} sm={4} sx={{ pl: '0 !important' }}>
                    <Paper
                        sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            borderLeft: '5px solid #f59e0b',
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                        }}
                    >
                        <Avatar sx={{ bgcolor: '#fef3c7', color: '#b45309', width: 42, height: 42 }}>
                            <QueueIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={800} letterSpacing="0.5px">
                                QUEUE & DIAGNOSIS
                            </Typography>
                            <Typography variant="h4" fontWeight={900}>
                                {counts.queue}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Paper
                        sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            borderLeft: '5px solid #3b82f6',
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                        }}
                    >
                        <Avatar sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', width: 42, height: 42 }}>
                            <InProgressIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={800} letterSpacing="0.5px">
                                UNDER SERVICE
                            </Typography>
                            <Typography variant="h4" fontWeight={900}>
                                {counts.in_progress}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={4} sx={{ pr: '0 !important' }}>
                    <Paper
                        sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            borderLeft: '5px solid #10b981',
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                        }}
                    >
                        <Avatar sx={{ bgcolor: '#d1fae5', color: '#047857', width: 42, height: 42 }}>
                            <CompletedIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={800} letterSpacing="0.5px">
                                READY FOR PICKUP
                            </Typography>
                            <Typography variant="h4" fontWeight={900} sx={{ color: '#10b981' }}>
                                {readyJobs.length}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* LIVE KANBAN STATUS LANES (3 Equal Full-Width Columns) */}
            <Grid container spacing={2} sx={{ width: '100%', m: 0, flexGrow: 1, alignItems: 'stretch' }}>
                {/* LANE 1: QUEUE & DIAGNOSIS */}
                <Grid item xs={12} md={4} sx={{ pl: '0 !important', display: 'flex', flexDirection: 'column' }}>
                    <StatusLane
                        title="QUEUE & DIAGNOSIS"
                        count={queueJobs.length}
                        color="#f59e0b"
                        icon={<QueueIcon fontSize="small" />}
                        jobs={queueJobs}
                        onCardClick={handleCardClick}
                        emptyMessage="No vehicles waiting in queue."
                        isDark={isDark}
                    />
                </Grid>

                {/* LANE 2: UNDER SERVICE */}
                <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <StatusLane
                        title="UNDER SERVICE"
                        count={inProgressJobs.length}
                        color="#3b82f6"
                        icon={<InProgressIcon fontSize="small" />}
                        jobs={inProgressJobs}
                        onCardClick={handleCardClick}
                        emptyMessage="No vehicles currently under service."
                        isDark={isDark}
                    />
                </Grid>

                {/* LANE 3: READY FOR PICKUP */}
                <Grid item xs={12} md={4} sx={{ pr: '0 !important', display: 'flex', flexDirection: 'column' }}>
                    <StatusLane
                        title="READY FOR PICKUP"
                        count={readyJobs.length}
                        color="#10b981"
                        icon={<CompletedIcon fontSize="small" />}
                        jobs={readyJobs}
                        onCardClick={handleCardClick}
                        emptyMessage="No vehicles awaiting customer pickup."
                        isDark={isDark}
                        highlight
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

/* ==========================================================================
   MINIMAL STATUS LANE COMPONENT (BIKE NO & JOB CARD NO ONLY)
   ========================================================================== */
const StatusLane = ({ title, count, color, icon, jobs, onCardClick, emptyMessage, isDark, highlight }) => {
    return (
        <Paper
            elevation={2}
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                bgcolor: isDark ? '#111827' : '#ffffff',
                border: '1px solid',
                borderColor: isDark ? '#1f2937' : '#e2e8f0',
                overflow: 'hidden',
            }}
        >
            {/* Lane Header */}
            <Box
                sx={{
                    p: 1.5,
                    px: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '3px solid',
                    borderColor: color,
                    bgcolor: isDark ? '#182234' : '#f8fafc',
                }}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ color }}>{icon}</Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: '0.5px' }}>
                        {title}
                    </Typography>
                </Box>
                <Chip
                    label={count}
                    size="small"
                    sx={{
                        bgcolor: color,
                        color: '#ffffff',
                        fontWeight: 900,
                        height: 24,
                        minWidth: 30,
                        fontSize: '0.8rem',
                    }}
                />
            </Box>

            {/* Vehicle Cards List */}
            <Box
                sx={{
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 240px)',
                    flexGrow: 1,
                }}
            >
                {jobs.length === 0 ? (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            border: '1px dashed',
                            borderColor: isDark ? '#374151' : '#cbd5e1',
                            borderRadius: '12px',
                            my: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            {emptyMessage}
                        </Typography>
                    </Box>
                ) : (
                    jobs.map((job) => (
                        <Card
                            key={job.id}
                            onClick={() => onCardClick(job)}
                            sx={{
                                borderRadius: '12px',
                                border: '2px solid',
                                borderColor: highlight ? color : isDark ? '#1f2937' : '#e2e8f0',
                                bgcolor: isDark ? '#1e293b' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'scale(1.015)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                    borderColor: color,
                                },
                            }}
                        >
                            <CardContent sx={{ p: '14px 16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {/* Bike Reg Number (Large License Plate Styling) */}
                                <Box
                                    sx={{
                                        bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                                        border: '2px solid',
                                        borderColor: isDark ? '#334156' : '#cbd5e1',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: '8px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: 900,
                                            fontSize: { xs: '1.05rem', sm: '1.25rem', md: '1.35rem' },
                                            letterSpacing: '1.5px',
                                            fontFamily: 'monospace',
                                            color: isDark ? '#38bdf8' : '#0f172a',
                                        }}
                                    >
                                        {job.bike_number || 'NO REG NO'}
                                    </Typography>
                                </Box>

                                {/* Job Card Number Badge */}
                                <Box sx={{ textAlign: 'right' }}>
                                    <Chip
                                        label={`#${job.job_number || job.id}`}
                                        sx={{
                                            fontWeight: 900,
                                            fontSize: '0.85rem',
                                            bgcolor: isDark ? '#334155' : '#e2e8f0',
                                            color: isDark ? '#f8fafc' : '#1e293b',
                                            height: 28,
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    ))
                )}
            </Box>
        </Paper>
    );
};

export default LiveBoard;

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Tabs,
    Tab,
    Button,
    IconButton,
    TextField,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    Avatar,
    Tooltip,
    InputAdornment,
    Switch,
    FormControlLabel,
    useTheme,
    CircularProgress,
} from '@mui/material';
import {
    AccountBalanceWallet as PayrollIcon,
    CalendarMonth as AttendanceIcon,
    AttachMoney as AdvanceIcon,
    Download as DownloadIcon,
    Print as PrintIcon,
    CheckCircle as CheckIcon,
    Add as AddIcon,
    ChevronLeft as PrevIcon,
    ChevronRight as NextIcon,
    Search as SearchIcon,
    CheckCircleOutline as CompletedIcon,
    HourglassEmpty as PendingIcon,
    Delete as DeleteIcon,
    Description as FileIcon,
    WbSunny as SundayIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const Payroll = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const queryClient = useQueryClient();
    const { hasAnyPermission } = useAuth();
    const { currencySymbol } = useSettings();

    const formatCurrency = (val) =>
        `${currencySymbol || 'Rs.'} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)}`;

    const [activeTab, setActiveTab] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState('2026-08');
    const [selectedBranch, setSelectedBranch] = useState('');

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({});

    // Advance Modal state
    const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({
        user_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        type: 'advance',
        notes: '',
    });
    const [advanceSearch, setAdvanceSearch] = useState('');

    // Split Run state
    const [periodType, setPeriodType] = useState('first_half'); // first_half, second_half, full_month
    const [viewRunModal, setViewRunModal] = useState(null);
    const [payslipModal, setPayslipModal] = useState(null);

    // Month navigation helpers
    const changeMonth = (delta) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const d = new Date(year, month - 1 + delta, 1);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${yStr}-${mStr}`);
    };

    const formatCleanDate = (dateVal) => {
        if (!dateVal) return '-';
        return String(dateVal).split('T')[0];
    };

    const isSundaySelected = useMemo(() => {
        if (!attendanceDate) return false;
        const d = new Date(attendanceDate + 'T00:00:00');
        return d.getDay() === 0;
    }, [attendanceDate]);

    // 1. Fetch Branches & Staff
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => (await api.get('/branches')).data?.data || [],
    });
    const branches = Array.isArray(branchesData) ? branchesData : [];

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

    const { data: staffData } = useQuery({
        queryKey: ['staff-list', selectedBranch],
        queryFn: async () => (await api.get('/users/field-staff', { params: { branch_id: selectedBranch } })).data || [],
    });
    const staff = Array.isArray(staffData) ? staffData : [];

    // 2. Fetch Payroll Dashboard Summary
    const { data: dashboardData, isLoading: dashLoading } = useQuery({
        queryKey: ['payroll-dashboard', selectedMonth, selectedBranch],
        queryFn: async () =>
            (await api.get('/payroll/dashboard', { params: { month: selectedMonth, branch_id: selectedBranch } })).data,
    });
    const summary = dashboardData?.summary || {
        total_staff: 0,
        total_base_pool: 0,
        total_advances_issued: 0,
        total_bonuses_issued: 0,
        total_paid: 0,
        outstanding_balance: 0,
    };
    const recentRuns = dashboardData?.recent_runs || [];

    // 3. Fetch Advances List
    const { data: advancesData, refetch: refetchAdvances } = useQuery({
        queryKey: ['advances-list', selectedBranch, advanceSearch],
        queryFn: async () =>
            (await api.get('/advances', { params: { branch_id: selectedBranch, search: advanceSearch } })).data,
    });
    const advances = advancesData?.data || [];

    // 4. Fetch Live Preview for Calculator
    const { data: previewData, isLoading: previewLoading } = useQuery({
        queryKey: ['payroll-preview', selectedMonth, periodType, selectedBranch],
        queryFn: async () =>
            (await api.get('/payroll/preview', {
                params: { month: selectedMonth, period_type: periodType, branch_id: selectedBranch },
            })).data,
    });

    // 5. Fetch Attendance for Selected Date
    const { data: dailyAttendance, refetch: refetchAttendance } = useQuery({
        queryKey: ['daily-attendance', attendanceDate, selectedBranch],
        queryFn: async () => {
            const res = await api.get('/attendance', { params: { date: attendanceDate, branch_id: selectedBranch } });
            const map = {};
            (res.data || []).forEach((rec) => {
                map[rec.user_id] = {
                    status: rec.status,
                    is_sunday: rec.is_sunday,
                    sunday_bonus_rate: rec.sunday_bonus_rate,
                    notes: rec.notes || '',
                };
            });
            setAttendanceData(map);
            return res.data;
        },
    });

    // Attendance Monthly Stats
    const { data: monthlyAttendanceStats } = useQuery({
        queryKey: ['attendance-monthly-stats', selectedMonth, selectedBranch],
        queryFn: async () =>
            (await api.get('/attendance/monthly-stats', {
                params: { month: selectedMonth, branch_id: selectedBranch },
            })).data,
    });

    // ==========================================
    // MUTATIONS
    // ==========================================
    const saveAttendanceMutation = useMutation({
        mutationFn: (records) => api.post('/attendance', { date: attendanceDate, records }),
        onSuccess: (_, variables) => {
            toast.success('Attendance saved successfully!');
            // Update local attendance state immediately so no F5 refresh is needed
            const map = {};
            (variables || []).forEach((rec) => {
                map[rec.user_id] = {
                    status: rec.status,
                    is_sunday: rec.is_sunday,
                    sunday_bonus_rate: rec.sunday_bonus_rate,
                    notes: rec.notes || '',
                };
            });
            setAttendanceData(map);
            queryClient.invalidateQueries(['daily-attendance']);
            queryClient.invalidateQueries(['attendance-monthly-stats']);
            queryClient.invalidateQueries(['payroll-preview']);
            queryClient.invalidateQueries(['payroll-dashboard']);
        },
        onError: () => toast.error('Failed to save attendance'),
    });

    const createAdvanceMutation = useMutation({
        mutationFn: (data) => api.post('/advances', data),
        onSuccess: () => {
            toast.success('Advance / Allowance logged successfully!');
            setAdvanceModalOpen(false);
            setAdvanceForm({
                user_id: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                type: 'advance',
                notes: '',
            });
            queryClient.invalidateQueries(['advances-list']);
            queryClient.invalidateQueries(['payroll-dashboard']);
            queryClient.invalidateQueries(['payroll-preview']);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to record advance'),
    });

    const deleteAdvanceMutation = useMutation({
        mutationFn: (id) => api.delete(`/advances/${id}`),
        onSuccess: () => {
            toast.success('Advance removed!');
            queryClient.invalidateQueries(['advances-list']);
            queryClient.invalidateQueries(['payroll-dashboard']);
            queryClient.invalidateQueries(['payroll-preview']);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete advance'),
    });

    const commitPayrollMutation = useMutation({
        mutationFn: (payload) => api.post('/payroll/runs', payload),
        onSuccess: () => {
            toast.success('Payroll run generated and committed successfully!');
            queryClient.invalidateQueries(['payroll-dashboard']);
            queryClient.invalidateQueries(['payroll-preview']);
            queryClient.invalidateQueries(['advances-list']);
            setActiveTab(0);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to commit payroll run'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => api.patch(`/payroll/runs/${id}/status`, { status }),
        onSuccess: () => {
            toast.success('Payroll status updated successfully!');
            queryClient.invalidateQueries(['payroll-dashboard']);
            queryClient.invalidateQueries(['advances-list']);
            if (viewRunModal) setViewRunModal(null);
        },
        onError: () => toast.error('Failed to update status'),
    });

    // Attendance Handlers
    const handleStatusChange = (userId, status) => {
        setAttendanceData((prev) => ({
            ...prev,
            [userId]: {
                ...(prev[userId] || { is_sunday: isSundaySelected, sunday_bonus_rate: 0, notes: '' }),
                status,
            },
        }));
    };

    const handleSundayToggle = (userId, isSunday) => {
        setAttendanceData((prev) => ({
            ...prev,
            [userId]: {
                ...(prev[userId] || { status: 'present', sunday_bonus_rate: 1000, notes: '' }),
                is_sunday: isSunday,
            },
        }));
    };

    const handleBonusRateChange = (userId, rate) => {
        setAttendanceData((prev) => ({
            ...prev,
            [userId]: {
                ...(prev[userId] || { status: 'present', is_sunday: true, notes: '' }),
                sunday_bonus_rate: parseFloat(rate) || 0,
            },
        }));
    };

    const handleSaveAttendance = () => {
        const defaultStatus = isSundaySelected ? 'absent' : 'present';
        const records = staff.map((u) => {
            const userEntry = attendanceData[u.id] || {
                status: defaultStatus,
                is_sunday: isSundaySelected,
                sunday_bonus_rate: 0,
                notes: '',
            };
            return {
                user_id: u.id,
                status: userEntry.status || defaultStatus,
                is_sunday: !!userEntry.is_sunday,
                sunday_bonus_rate: userEntry.sunday_bonus_rate || 0,
                notes: userEntry.notes || '',
            };
        });
        saveAttendanceMutation.mutate(records);
    };

    const handleSaveAdvance = (e) => {
        e.preventDefault();
        if (!advanceForm.user_id || !advanceForm.amount) {
            toast.error('Please select an employee and specify amount');
            return;
        }
        createAdvanceMutation.mutate(advanceForm);
    };

    const handleCommitRun = (statusToSave) => {
        if (!previewData?.items?.length) return;
        commitPayrollMutation.mutate({
            month: selectedMonth,
            period_type: periodType,
            branch_id: selectedBranch || null,
            status: statusToSave,
            items: previewData.items,
        });
    };

    const handleDownloadEFT = (runId) => {
        window.open(`${api.defaults.baseURL}/payroll/runs/${runId}/export-eft`, '_blank');
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* TOP HEADER & MONTH NAVIGATOR */}
            <Paper
                elevation={2}
                sx={{
                    p: 2,
                    borderRadius: '16px',
                    bgcolor: isDark ? '#111827' : '#ffffff',
                    border: '1px solid',
                    borderColor: isDark ? '#1f2937' : '#e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ bgcolor: '#2563eb', width: 44, height: 44 }}>
                        <PayrollIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            Payroll & Attendance
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Manage wages, Sunday shifts, advances, split payroll runs & bank EFTs
                        </Typography>
                    </Box>
                </Box>

                {/* Controls & Month Switcher */}
                <Box display="flex" alignItems="center" flexWrap="wrap" gap={1.5}>
                    {/* Month Picker / Switcher */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: isDark ? '#1e293b' : '#f1f5f9',
                            borderRadius: '10px',
                            p: 0.5,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <IconButton size="small" onClick={() => changeMonth(-1)}>
                            <PrevIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ px: 1.5, fontWeight: 800, fontFamily: 'monospace', fontSize: '0.95rem' }}>
                            {new Date(`${selectedMonth}-01`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </Typography>
                        <IconButton size="small" onClick={() => changeMonth(1)}>
                            <NextIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Branch Filter */}
                    {uniqueBranches.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                displayEmpty
                                sx={{ borderRadius: '10px', height: 38, fontSize: '0.85rem' }}
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

                    {/* Action Buttons */}
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => setAdvanceModalOpen(true)}
                        sx={{ borderRadius: '10px', height: 38, fontWeight: 700, textTransform: 'none' }}
                    >
                        Log Advance / Bonus
                    </Button>
                </Box>
            </Paper>

            {/* MONTHLY SUMMARY STATS CARDS */}
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: '14px',
                            borderLeft: '5px solid #3b82f6',
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={800}>
                            TOTAL BASE SALARY POOL
                        </Typography>
                        <Typography variant="h5" fontWeight={900} sx={{ color: '#3b82f6', mt: 0.5 }}>
                            {formatCurrency(summary.total_base_pool)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Active staff: {summary.total_staff}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: '14px',
                            borderLeft: '5px solid #f59e0b',
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={800}>
                            ADVANCES & BONUSES ISSUED
                        </Typography>
                        <Typography variant="h5" fontWeight={900} sx={{ color: '#f59e0b', mt: 0.5 }}>
                            {formatCurrency(summary.total_advances_issued + summary.total_bonuses_issued)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Advances: {formatCurrency(summary.total_advances_issued)} | Bonus: {formatCurrency(summary.total_bonuses_issued)}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: '14px',
                            borderLeft: '5px solid #10b981',
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={800}>
                            TOTAL PAID (SETTLED)
                        </Typography>
                        <Typography variant="h5" fontWeight={900} sx={{ color: '#10b981', mt: 0.5 }}>
                            {formatCurrency(summary.total_paid)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Settled pay runs: {recentRuns.filter((r) => r.status === 'completed').length}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: '14px',
                            borderLeft: '5px solid #8b5cf6',
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={800}>
                            OUTSTANDING BALANCE
                        </Typography>
                        <Typography variant="h5" fontWeight={900} sx={{ color: '#8b5cf6', mt: 0.5 }}>
                            {formatCurrency(summary.outstanding_balance)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Pending settlement
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* TAB NAVIGATION */}
            <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        px: 2,
                        bgcolor: isDark ? '#111827' : '#f8fafc',
                    }}
                >
                    <Tab label="Monthly Pay Runs" icon={<PayrollIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Split Payroll Calculator" icon={<AdvanceIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Attendance & Sunday Shifts" icon={<AttendanceIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Advances & Allowances" icon={<AdvanceIcon fontSize="small" />} iconPosition="start" />
                </Tabs>

                {/* TAB 0: MONTHLY PAY RUNS */}
                {activeTab === 0 && (
                    <Box sx={{ p: 2.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle1" fontWeight={800}>
                                Payroll Runs for {selectedMonth}
                            </Typography>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<PayrollIcon />}
                                onClick={() => setActiveTab(1)}
                                sx={{ borderRadius: '8px', fontWeight: 700 }}
                            >
                                Calculate New Run
                            </Button>
                        </Box>

                        {recentRuns.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed divider', borderRadius: '12px' }}>
                                <Typography color="text.secondary" fontWeight={600}>
                                    No payroll runs found for {selectedMonth}. Switch to "Split Payroll Calculator" to generate a 1st Half or Month-End run.
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: isDark ? '#1e293b' : '#f1f5f9' }}>
                                            <TableCell sx={{ fontWeight: 800 }}>Period Type</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Staff Count</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Total Base Pay</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Advances Deducted</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Total Net Pay</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Payment Date</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recentRuns.map((run) => (
                                            <TableRow key={run.id} hover>
                                                <TableCell>
                                                    <Chip
                                                        label={run.period_type.replace(/_/g, ' ').toUpperCase()}
                                                        size="small"
                                                        color={run.period_type === 'first_half' ? 'info' : 'primary'}
                                                        sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell fontWeight={700}>{run.items_count || 0}</TableCell>
                                                <TableCell>{formatCurrency(run.total_base_pay)}</TableCell>
                                                <TableCell>{formatCurrency(run.total_advances)}</TableCell>
                                                <TableCell sx={{ fontWeight: 900, color: '#10b981' }}>
                                                    {formatCurrency(run.total_net_pay)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={run.status.toUpperCase()}
                                                        size="small"
                                                        color={run.status === 'completed' ? 'success' : run.status === 'confirmed' ? 'warning' : 'default'}
                                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell>{formatCleanDate(run.payment_date)}</TableCell>
                                                <TableCell align="right">
                                                    <Box display="flex" justifyContent="flex-end" gap={1}>
                                                        <Tooltip title="Download Bank EFT Batch File">
                                                            <IconButton size="small" color="primary" onClick={() => handleDownloadEFT(run.id)}>
                                                                <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {run.status !== 'completed' && (
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color="success"
                                                                onClick={() => updateStatusMutation.mutate({ id: run.id, status: 'completed' })}
                                                                sx={{ height: 28, fontSize: '0.75rem', fontWeight: 800 }}
                                                            >
                                                                Mark Settled
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* TAB 1: SPLIT PAYROLL CALCULATOR */}
                {activeTab === 1 && (
                    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Selector Bar */}
                        <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={2}>
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Select Run Period:
                                </Typography>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                    <Select value={periodType} onChange={(e) => setPeriodType(e.target.value)} sx={{ borderRadius: '8px' }}>
                                        <MenuItem value="first_half">1st Half Run (~15th, 50% Accrued)</MenuItem>
                                        <MenuItem value="second_half">2nd Half Run (Month-End Settlement)</MenuItem>
                                        <MenuItem value="full_month">Full Month (Single Pay Run)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            <Box display="flex" gap={1.5}>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    onClick={() => handleCommitRun('draft')}
                                    disabled={previewLoading || !previewData?.items?.length}
                                    sx={{ borderRadius: '8px', fontWeight: 700 }}
                                >
                                    Save as Draft
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<CheckIcon />}
                                    onClick={() => handleCommitRun('completed')}
                                    disabled={previewLoading || !previewData?.items?.length}
                                    sx={{ borderRadius: '8px', fontWeight: 700 }}
                                >
                                    Confirm & Settle Payroll
                                </Button>
                            </Box>
                        </Box>

                        {/* Live Calculation Table */}
                        <TableContainer sx={{ border: '1px solid divider', borderRadius: '12px' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: isDark ? '#1e293b' : '#f1f5f9' }}>
                                        <TableCell sx={{ fontWeight: 800 }}>Staff Name</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Base Wage</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Working Days</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Sunday Bonus</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Allowances</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Advances Deducted</TableCell>
                                        {periodType === 'second_half' && <TableCell sx={{ fontWeight: 800 }}>1st Half Paid</TableCell>}
                                        <TableCell sx={{ fontWeight: 800 }}>EPF (8%)</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Net Pay</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Payment Method</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                                                <CircularProgress size={24} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        previewData?.items?.map((item) => (
                                            <TableRow key={item.user_id} hover>
                                                <TableCell sx={{ fontWeight: 700 }}>
                                                    {item.name}
                                                    {item.employee_id && (
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            ID: {item.employee_id}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatCurrency(item.base_salary)}</TableCell>
                                                <TableCell>{item.working_days}</TableCell>
                                                <TableCell sx={{ color: item.sunday_bonus > 0 ? '#10b981' : 'inherit' }}>
                                                    {formatCurrency(item.sunday_bonus)}
                                                </TableCell>
                                                <TableCell sx={{ color: item.allowances > 0 ? '#3b82f6' : 'inherit' }}>
                                                    {formatCurrency(item.allowances)}
                                                </TableCell>
                                                <TableCell sx={{ color: item.advances_deducted > 0 ? '#ef4444' : 'inherit' }}>
                                                    {formatCurrency(item.advances_deducted)}
                                                </TableCell>
                                                {periodType === 'second_half' && (
                                                    <TableCell sx={{ color: '#6366f1' }}>{formatCurrency(item.first_half_paid)}</TableCell>
                                                )}
                                                <TableCell>{formatCurrency(item.epf_employee)}</TableCell>
                                                <TableCell sx={{ fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                                                    {formatCurrency(item.net_pay)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={item.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.65rem' }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 2: DAILY ATTENDANCE & SUNDAY SHIFTS */}
                {activeTab === 2 && (
                    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={2}>
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Select Date:
                                </Typography>
                                <TextField
                                    type="date"
                                    size="small"
                                    value={attendanceDate}
                                    onChange={(e) => setAttendanceDate(e.target.value)}
                                    sx={{ width: 170, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                />
                                {isSundaySelected && (
                                    <Chip icon={<SundayIcon />} label="SUNDAY (DEFAULT ABSENT)" color="warning" size="small" sx={{ fontWeight: 800 }} />
                                )}
                            </Box>

                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<CheckIcon />}
                                onClick={handleSaveAttendance}
                                disabled={saveAttendanceMutation.isPending}
                                sx={{ borderRadius: '8px', fontWeight: 700 }}
                            >
                                Save Daily Attendance
                            </Button>
                        </Box>

                        {/* Staff Attendance Grid */}
                        <TableContainer sx={{ border: '1px solid divider', borderRadius: '12px' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: isDark ? '#1e293b' : '#f1f5f9' }}>
                                        <TableCell sx={{ fontWeight: 800 }}>Staff Name</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Attendance Status</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Sunday Bonus Rate ({currencySymbol || 'Rs.'})</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Notes / Remarks</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {staff.map((u) => {
                                        const defaultStatus = isSundaySelected ? 'absent' : 'present';
                                        const entry = attendanceData[u.id] || {
                                            status: defaultStatus,
                                            is_sunday: isSundaySelected,
                                            sunday_bonus_rate: 0,
                                            notes: '',
                                        };
                                        const staffBaseSalary = u.base_salary || u.salary || 0;
                                        return (
                                            <TableRow key={u.id} hover>
                                                <TableCell sx={{ fontWeight: 700 }}>
                                                    {u.name}
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        ID: {u.employee_id || u.id} • Base: {formatCurrency(staffBaseSalary)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" gap={1}>
                                                        {[
                                                            { key: 'present', label: 'Present', color: 'success' },
                                                            { key: 'half_day', label: 'Half-Day', color: 'warning' },
                                                            { key: 'absent', label: 'Absent', color: 'error' },
                                                            { key: 'leave', label: 'Leave', color: 'info' },
                                                        ].map((st) => (
                                                            <Chip
                                                                key={st.key}
                                                                label={st.label}
                                                                size="small"
                                                                onClick={() => handleStatusChange(u.id, st.key)}
                                                                color={entry.status === st.key ? st.color : 'default'}
                                                                variant={entry.status === st.key ? 'filled' : 'outlined'}
                                                                sx={{ fontWeight: 800, cursor: 'pointer' }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        placeholder="e.g. 1000"
                                                        value={entry.sunday_bonus_rate || ''}
                                                        onChange={(e) => handleBonusRateChange(u.id, e.target.value)}
                                                        InputProps={{ startAdornment: <InputAdornment position="start">{currencySymbol || 'Rs.'}</InputAdornment> }}
                                                        sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 34 } }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        placeholder="Optional note..."
                                                        value={entry.notes || ''}
                                                        onChange={(e) =>
                                                            setAttendanceData((prev) => ({
                                                                ...prev,
                                                                [u.id]: { ...(prev[u.id] || {}), notes: e.target.value },
                                                            }))
                                                        }
                                                        sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 34 } }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 3: ADVANCES & SPECIAL ALLOWANCES */}
                {activeTab === 3 && (
                    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={2}>
                            <TextField
                                size="small"
                                placeholder="Search advances / notes / staff..."
                                value={advanceSearch}
                                onChange={(e) => setAdvanceSearch(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                            />
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={() => setAdvanceModalOpen(true)}
                                sx={{ borderRadius: '8px', fontWeight: 700 }}
                            >
                                Log Advance / Allowance
                            </Button>
                        </Box>

                        <TableContainer sx={{ border: '1px solid divider', borderRadius: '12px' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: isDark ? '#1e293b' : '#f1f5f9' }}>
                                        <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Staff Name</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Payment Method</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Notes</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {advances.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                                <Typography color="text.secondary">No advances or allowances found.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        advances.map((adv) => (
                                            <TableRow key={adv.id} hover>
                                                <TableCell>{formatCleanDate(adv.date)}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{adv.user?.name}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={adv.type.replace(/_/g, ' ').toUpperCase()}
                                                        size="small"
                                                        color={adv.type === 'advance' ? 'warning' : 'success'}
                                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 900, color: adv.type === 'advance' ? '#ef4444' : '#10b981' }}>
                                                    {formatCurrency(adv.amount)}
                                                </TableCell>
                                                <TableCell>{adv.payment_method === 'cash' ? 'Cash' : 'Bank Transfer'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={adv.status === 'deducted' ? 'DEDUCTED IN PAYROLL' : 'ACTIVE (PENDING)'}
                                                        size="small"
                                                        color={adv.status === 'deducted' ? 'default' : 'primary'}
                                                        sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell>{adv.notes || '-'}</TableCell>
                                                <TableCell align="right">
                                                    {adv.status !== 'deducted' && (
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => deleteAdvanceMutation.mutate(adv.id)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Paper>

            {/* MODAL: RECORD ADVANCE / BONUS */}
            <Dialog open={advanceModalOpen} onClose={() => setAdvanceModalOpen(false)} maxWidth="sm" fullWidth>
                <form onSubmit={handleSaveAdvance}>
                    <DialogTitle sx={{ fontWeight: 800 }}>Log Employee Advance / Allowance</DialogTitle>
                    <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Select Employee</InputLabel>
                            <Select
                                value={advanceForm.user_id}
                                label="Select Employee"
                                onChange={(e) => setAdvanceForm({ ...advanceForm, user_id: e.target.value })}
                            >
                                {staff.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {u.name} {u.employee_id ? `(${u.employee_id})` : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Classification</InputLabel>
                            <Select
                                value={advanceForm.type}
                                label="Classification"
                                onChange={(e) => setAdvanceForm({ ...advanceForm, type: e.target.value })}
                            >
                                <MenuItem value="advance">Mid-Month Cash / Bank Advance (Deduction)</MenuItem>
                                <MenuItem value="festival_bonus">Festival Bonus (Addition)</MenuItem>
                                <MenuItem value="allowance">Ice Cream / Special Allowance (Addition)</MenuItem>
                                <MenuItem value="other">Other Adjustment</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Amount"
                            value={advanceForm.amount}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                            InputProps={{ startAdornment: <InputAdornment position="start">{currencySymbol || 'Rs.'}</InputAdornment> }}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Date"
                            value={advanceForm.date}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Payment Method</InputLabel>
                            <Select
                                value={advanceForm.payment_method}
                                label="Payment Method"
                                onChange={(e) => setAdvanceForm({ ...advanceForm, payment_method: e.target.value })}
                            >
                                <MenuItem value="cash">Cash Payout</MenuItem>
                                <MenuItem value="bank_transfer">Direct Bank Transfer</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            label="Notes / Reason"
                            placeholder="e.g. Festival advance requested for New Year"
                            value={advanceForm.notes}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setAdvanceModalOpen(false)} color="inherit">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={createAdvanceMutation.isPending}
                            sx={{ borderRadius: '8px', fontWeight: 700 }}
                        >
                            Record Payout
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Payroll;

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    ButtonGroup,
    Card,
    CardContent,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Chip,
    Avatar,
    InputAdornment
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ChartTooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    Assessment as AssessmentIcon,
    Inventory as InventoryIcon,
    MonetizationOn as MonetizationOnIcon,
    SwapHoriz as SwapHorizIcon,
    Search as SearchIcon,
    FileDownload as FileDownloadIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    AccountBalanceWallet as AccountBalanceWalletIcon
} from '@mui/icons-material';
import api from '../api/axios';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { ENDPOINTS } from '../api/endpoints';

// Helper: format YYYY-MM-DD from a Date without UTC shift
const toLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Date range preset calculator
const getDatePreset = (preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (preset) {
        case 'today':
            return { from: toLocalDateStr(today), to: toLocalDateStr(today) };
        case 'yesterday': {
            const y = new Date(today); y.setDate(y.getDate() - 1);
            return { from: toLocalDateStr(y), to: toLocalDateStr(y) };
        }
        case 'last7': {
            const d = new Date(today); d.setDate(d.getDate() - 6);
            return { from: toLocalDateStr(d), to: toLocalDateStr(today) };
        }
        case 'last30': {
            const d = new Date(today); d.setDate(d.getDate() - 29);
            return { from: toLocalDateStr(d), to: toLocalDateStr(today) };
        }
        case 'thisMonth':
            return { from: toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), to: toLocalDateStr(today) };
        case 'lastMonth': {
            const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const last = new Date(today.getFullYear(), today.getMonth(), 0);
            return { from: toLocalDateStr(first), to: toLocalDateStr(last) };
        }
        default:
            return null;
    }
};

const DATE_PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: '7 Days' },
    { key: 'last30', label: '30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
];

// Reusable Quick Date Preset Buttons
const DatePresetButtons = ({ activePreset, onPresetChange }) => (
    <ButtonGroup size="small" variant="outlined" sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiButton-root': { borderRadius: '8px !important', textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', px: 1.5, py: 0.5, border: '1px solid', borderColor: 'divider' } }}>
        {DATE_PRESETS.map(p => (
            <Button
                key={p.key}
                variant={activePreset === p.key ? 'contained' : 'outlined'}
                onClick={() => onPresetChange(p.key)}
                sx={activePreset === p.key ? { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } } : {}}
            >
                {p.label}
            </Button>
        ))}
    </ButtonGroup>
);

// Helper component
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 2.5 }}>{children}</Box>}
        </div>
    );
}

const Reports = () => {
    const { currencySymbol } = useSettings();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    // Common data
    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const res = await api.get(ENDPOINTS.BRANCHES, { skipAuthToast: true });
            return res.data?.data ?? res.data ?? [];
        },
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

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get('/inventory/categories', { skipAuthToast: true });
            return res.data;
        },
    });

    const { data: inventoryItemsData } = useQuery({
        queryKey: ['inventory-items-for-reports'],
        queryFn: async () => {
            const res = await api.get('/inventory?per_page=500', { skipAuthToast: true });
            return res.data?.data || res.data || [];
        },
    });
    const inventoryItems = Array.isArray(inventoryItemsData) ? inventoryItemsData : (inventoryItemsData?.data || []);

    // ==========================================
    // TAB 0: FINANCIAL REPORT STATE & QUERY
    // ==========================================
    const defaultLast30 = useMemo(() => getDatePreset('last30'), []);
    const [finDateFrom, setFinDateFrom] = useState(defaultLast30.from);
    const [finDateTo, setFinDateTo] = useState(defaultLast30.to);
    const [finPreset, setFinPreset] = useState('last30');
    const [finBranch, setFinBranch] = useState('');

    const handleFinPreset = (key) => {
        const range = getDatePreset(key);
        if (range) { setFinDateFrom(range.from); setFinDateTo(range.to); setFinPreset(key); }
    };

    const { data: finReportData, isLoading: finLoading, refetch: refetchFin } = useQuery({
        queryKey: ['reports-financial', finDateFrom, finDateTo, finBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('date_from', finDateFrom);
            params.append('date_to', finDateTo);
            if (finBranch) params.append('branch_id', finBranch);
            const res = await api.get(`/reports/financial?${params.toString()}`);
            return res.data;
        },
    });

    // ==========================================
    // TAB 1: JOB CARD REPORT STATE & QUERY
    // ==========================================
    const [jcDateFrom, setJcDateFrom] = useState(defaultLast30.from);
    const [jcDateTo, setJcDateTo] = useState(defaultLast30.to);
    const [jcPreset, setJcPreset] = useState('last30');
    const [jcStatus, setJcStatus] = useState('');
    const [jcBranch, setJcBranch] = useState('');

    const handleJcPreset = (key) => {
        const range = getDatePreset(key);
        if (range) { setJcDateFrom(range.from); setJcDateTo(range.to); setJcPreset(key); }
    };

    const { data: jcReportData, isLoading: jcLoading, refetch: refetchJc } = useQuery({
        queryKey: ['reports-job-cards', jcDateFrom, jcDateTo, jcStatus, jcBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('date_from', jcDateFrom);
            params.append('date_to', jcDateTo);
            if (jcStatus) params.append('status', jcStatus);
            if (jcBranch) params.append('branch_id', jcBranch);
            const res = await api.get(`/reports/job-cards?${params.toString()}`, { skipAuthToast: true });
            return res.data;
        },
    });

    // ==========================================
    // TAB 2: INVENTORY VALUATION STATE & QUERY
    // ==========================================
    const [invBranch, setInvBranch] = useState('');
    const [invCategory, setInvCategory] = useState('');
    const [invIncludeZero, setInvIncludeZero] = useState(false);

    const { data: invReportData, isLoading: invLoading, refetch: refetchInv } = useQuery({
        queryKey: ['reports-inventory', invBranch, invCategory, invIncludeZero],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (invBranch) params.append('branch_id', invBranch);
            if (invCategory) params.append('category_id', invCategory);
            params.append('include_zero_stock', invIncludeZero ? '1' : '0');
            const res = await api.get(`/reports/inventory?${params.toString()}`);
            return res.data;
        },
    });

    // ==========================================
    // TAB 3: STOCK MOVEMENT HISTORY STATE & QUERY
    // ==========================================
    const [smDateFrom, setSmDateFrom] = useState(defaultLast30.from);
    const [smDateTo, setSmDateTo] = useState(defaultLast30.to);
    const [smPreset, setSmPreset] = useState('last30');
    const [smBranch, setSmBranch] = useState('');
    const [smCategory, setSmCategory] = useState('');
    const [smType, setSmType] = useState('');
    const [smItemCode, setSmItemCode] = useState('');
    const [smSearch, setSmSearch] = useState('');

    const handleSmPreset = (key) => {
        const range = getDatePreset(key);
        if (range) { setSmDateFrom(range.from); setSmDateTo(range.to); setSmPreset(key); }
    };

    const { data: smReportData, isLoading: smLoading, refetch: refetchSm } = useQuery({
        queryKey: ['reports-stock-movements', smDateFrom, smDateTo, smBranch, smCategory, smType, smItemCode, smSearch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (smDateFrom) params.append('date_from', smDateFrom);
            if (smDateTo) params.append('date_to', smDateTo);
            if (smBranch) params.append('branch_id', smBranch);
            if (smCategory) params.append('category_id', smCategory);
            if (smType) params.append('transaction_type', smType);
            if (smItemCode) params.append('item_code', smItemCode);
            if (smSearch) params.append('search', smSearch);
            const res = await api.get(`/reports/stock-movements?${params.toString()}`);
            return res.data;
        },
    });

    const handleSearchClick = () => {
        if (activeTab === 0) refetchFin();
        if (activeTab === 1) refetchJc();
        if (activeTab === 2) refetchInv();
        if (activeTab === 3) refetchSm();
    };

    // Export CSV logic for currently active tab
    const handleExport = () => {
        let headers = [];
        let rows = [];
        let filename = 'report.csv';

        if (activeTab === 0) {
            filename = `financial_report_${finDateFrom}_to_${finDateTo}.csv`;
            headers = ['Date', 'Invoice Number', 'Status', 'Invoice Total', 'Paid Amount'];
            rows = (finReportData?.invoices_data || []).map(inv => [
                inv.date,
                inv.invoice_number,
                inv.status,
                inv.amount,
                inv.paid
            ]);
        } else if (activeTab === 1) {
            filename = `job_cards_report_${jcDateFrom}_to_${jcDateTo}.csv`;
            headers = ['Job Number', 'Vehicle', 'Make/Model', 'Customer Name', 'Status', 'Mechanic', 'Total Amount'];
            rows = (jcReportData?.data || []).map(jc => [
                jc.job_number,
                jc.bike_number,
                `${jc.make || ''} ${jc.model || ''}`,
                jc.customer_name,
                jc.status,
                jc.mechanic?.name || 'Unassigned',
                jc.final_amount
            ]);
        } else if (activeTab === 2) {
            filename = 'inventory_valuation_report.csv';
            headers = ['Item Name', 'Code/SKU', 'Category', 'Stock Qty', 'Unit Purchase Price', 'Unit Selling Price', 'Total Stock Value'];
            rows = (invReportData?.data || []).map(item => [
                item.name,
                item.item_code,
                item.category?.name || 'N/A',
                item.current_stock,
                item.purchase_price,
                item.selling_price,
                (item.current_stock * item.purchase_price).toFixed(2)
            ]);
        } else if (activeTab === 3) {
            filename = `stock_movement_history_${smDateFrom}_to_${smDateTo}.csv`;
            headers = ['Date', 'Item Name', 'Item Code', 'Category', 'Branch', 'Type', 'Quantity Change', 'Unit Price', 'Total Value', 'Performed By', 'Notes'];
            rows = (smReportData?.data || []).map(tx => [
                new Date(tx.created_at).toLocaleDateString(),
                tx.inventory_item?.name || 'N/A',
                tx.inventory_item?.item_code || 'N/A',
                tx.inventory_item?.category?.name || 'N/A',
                tx.branch?.name || 'N/A',
                tx.transaction_type,
                tx.quantity,
                tx.unit_price,
                tx.total_price,
                tx.creator?.name || 'System',
                `"${(tx.notes || '').replace(/"/g, '""')}"`
            ]);
        }

        if (rows.length === 0) {
            alert('No records available to export for the current filters.');
            return;
        }

        const csvContent = 'data:text/csv;charset=utf-8,' + [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            {/* Header Welcome Panel */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.025em' }}>
                        {t('reports.title') || 'Reports & Analytics'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {t('reports.subtitle') || 'Audit financial breakdowns, job cards performance, stock valuation, and movement history.'}
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<FileDownloadIcon />} 
                    onClick={handleExport} 
                    sx={{ borderRadius: '10px', fontWeight: 700, px: 2.5 }}
                >
                    {t('reports.export') || 'Export CSV / Excel'}
                </Button>
            </Box>

            {/* Navigation Tabs */}
            <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(e, val) => setActiveTab(val)} 
                    textColor="primary" 
                    indicatorColor="primary" 
                    variant="fullWidth"
                    sx={{
                        '& .MuiTab-root': {
                            fontWeight: 700,
                            py: 1.75,
                            fontSize: '0.9rem'
                        }
                    }}
                >
                    <Tab icon={<MonetizationOnIcon />} iconPosition="start" label={t('reports.financial') || 'Financial Report'} />
                    <Tab icon={<AssessmentIcon />} iconPosition="start" label={t('reports.jobCards') || 'Job Cards'} />
                    <Tab icon={<InventoryIcon />} iconPosition="start" label={t('reports.inventory') || 'Inventory Valuation'} />
                    <Tab icon={<SwapHorizIcon />} iconPosition="start" label="Stock Movement History" />
                </Tabs>
            </Paper>

            {/* TAB 0: FINANCIALS */}
            <TabPanel value={activeTab} index={0}>
                <Box display="flex" flexDirection="column" gap={3}>
                    {/* Filters */}
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ mb: 2 }}>
                            <DatePresetButtons activePreset={finPreset} onPresetChange={handleFinPreset} />
                        </Box>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date From"
                                    InputLabelProps={{ shrink: true }}
                                    value={finDateFrom}
                                    onChange={(e) => { setFinDateFrom(e.target.value); setFinPreset(''); }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date To"
                                    InputLabelProps={{ shrink: true }}
                                    value={finDateTo}
                                    onChange={(e) => { setFinDateTo(e.target.value); setFinPreset(''); }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Branch</InputLabel>
                                    <Select value={finBranch} label="Branch" onChange={(e) => setFinBranch(e.target.value)}>
                                        <MenuItem value="">All Branches</MenuItem>
                                        {uniqueBranches.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button fullWidth variant="contained" onClick={handleSearchClick} sx={{ height: 40, borderRadius: '8px', fontWeight: 700 }}>
                                    Search
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Stats Summaries */}
                    {finLoading ? (
                        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                    ) : (
                        <>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>TOTAL SALES REVENUE</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                                                {currencySymbol} {finReportData?.total_revenue || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>TOTAL PURCHASES EXPENSES</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
                                                {currencySymbol} {finReportData?.total_expense || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>NET OPERATION PROFIT</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: (finReportData?.profit || 0) >= 0 ? 'success.main' : 'error.main' }}>
                                                {currencySymbol} {finReportData?.profit || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Chart Comparison */}
                            <Paper sx={{ p: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Revenue vs Expense Comparison</Typography>
                                <Box sx={{ width: '100%', height: 260 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                {
                                                    name: 'Financials Overview',
                                                    Revenue: finReportData?.total_revenue || 0,
                                                    Expenses: finReportData?.total_expense || 0,
                                                    Profit: finReportData?.profit || 0,
                                                },
                                            ]}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <ChartTooltip />
                                            <Legend />
                                            <Bar dataKey="Revenue" fill="#4caf50" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="Expenses" fill="#f44336" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="Profit" fill="#2196f3" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Paper>

                            {/* Invoices List */}
                            <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Invoices Transaction Records</Typography>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Invoice Number</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Invoice Total</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Paid Amount</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {finReportData?.invoices_data?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No transactions registered in this period.</TableCell>
                                                </TableRow>
                                            ) : (
                                                finReportData?.invoices_data?.map((inv, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>{inv.date}</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{inv.invoice_number}</TableCell>
                                                        <TableCell>
                                                            <Chip label={inv.status?.toUpperCase()} size="small" color={inv.status === 'paid' ? 'success' : 'warning'} sx={{ fontWeight: 700, borderRadius: '6px', height: 22 }} />
                                                        </TableCell>
                                                        <TableCell align="right">{currencySymbol} {inv.amount}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{currencySymbol} {inv.paid}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </>
                    )}
                </Box>
            </TabPanel>

            {/* TAB 1: JOB CARDS */}
            <TabPanel value={activeTab} index={1}>
                <Box display="flex" flexDirection="column" gap={3}>
                    {/* Filters */}
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ mb: 2 }}>
                            <DatePresetButtons activePreset={jcPreset} onPresetChange={handleJcPreset} />
                        </Box>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date From"
                                    InputLabelProps={{ shrink: true }}
                                    value={jcDateFrom}
                                    onChange={(e) => { setJcDateFrom(e.target.value); setJcPreset(''); }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date To"
                                    InputLabelProps={{ shrink: true }}
                                    value={jcDateTo}
                                    onChange={(e) => { setJcDateTo(e.target.value); setJcPreset(''); }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={2.5}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Status</InputLabel>
                                    <Select value={jcStatus} label="Status" onChange={(e) => setJcStatus(e.target.value)}>
                                        <MenuItem value="">All Statuses</MenuItem>
                                        <MenuItem value="received">Received</MenuItem>
                                        <MenuItem value="diagnosis">Diagnosis</MenuItem>
                                        <MenuItem value="in_progress">In Progress</MenuItem>
                                        <MenuItem value="parts_awaited">Parts Awaited</MenuItem>
                                        <MenuItem value="qc">QC / Inspection</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                        <MenuItem value="invoiced">Invoiced</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                        <MenuItem value="ready_for_pickup">Ready for Pickup (Delivery)</MenuItem>
                                        <MenuItem value="delivered">Delivered</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={2.5}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Branch</InputLabel>
                                    <Select value={jcBranch} label="Branch" onChange={(e) => setJcBranch(e.target.value)}>
                                        <MenuItem value="">All Branches</MenuItem>
                                        {uniqueBranches.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={1}>
                                <Button fullWidth variant="contained" onClick={handleSearchClick} sx={{ height: 40, borderRadius: '8px' }}>
                                    <SearchIcon />
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Stats Summaries */}
                    {jcLoading ? (
                        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                    ) : (
                        <>
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>TOTAL JOBS CREATED</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{jcReportData?.summary?.total_jobs || 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>TOTAL SALES REVENUE</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                                                {currencySymbol} {Number(jcReportData?.summary?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>PENDING BILLING</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>{jcReportData?.summary?.pending_invoices || 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>AVG COMPLETION TIME</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                                                {jcReportData?.summary?.average_completion_time ? `${Math.round(jcReportData.summary.average_completion_time * 10) / 10} hrs` : 'N/A'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Job Cards List Table */}
                            <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Job Number</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Bike / Vehicle</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Status / Delivery</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Mechanic</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {jcReportData?.data?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>No jobs found in this date range.</TableCell>
                                                </TableRow>
                                            ) : (
                                                jcReportData?.data?.map((jc) => (
                                                    <TableRow key={jc.id} hover>
                                                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{jc.job_number}</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{jc.bike_number} <Typography component="span" variant="caption" color="textSecondary">({jc.make} {jc.model})</Typography></TableCell>
                                                        <TableCell>{jc.customer_name}</TableCell>
                                                        <TableCell>{jc.branch?.name || '-'}</TableCell>
                                                        <TableCell>
                                                            <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                                                                <Chip 
                                                                    label={jc.status?.replace('_', ' ')?.toUpperCase()} 
                                                                    size="small" 
                                                                    color={jc.status === 'invoiced' ? 'primary' : jc.status === 'completed' ? 'success' : jc.status === 'cancelled' ? 'error' : 'warning'} 
                                                                    sx={{ fontWeight: 700, borderRadius: '6px', height: 22, fontSize: '0.72rem' }}
                                                                />
                                                                {jc.delivery_status && jc.delivery_status !== 'not_ready' && (
                                                                    <Chip 
                                                                        label={jc.delivery_status === 'ready_for_pickup' ? 'READY' : jc.delivery_status?.toUpperCase()} 
                                                                        size="small" 
                                                                        color={jc.delivery_status === 'delivered' ? 'secondary' : 'info'} 
                                                                        sx={{ fontWeight: 700, borderRadius: '6px', height: 22, fontSize: '0.68rem' }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>{jc.mechanic?.name || 'Unassigned'}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{currencySymbol} {Number(jc.final_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </>
                    )}
                </Box>
            </TabPanel>

            {/* TAB 2: INVENTORY VALUATION */}
            <TabPanel value={activeTab} index={2}>
                <Box display="flex" flexDirection="column" gap={3}>
                    {/* Filters */}
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Branch</InputLabel>
                                    <Select value={invBranch} label="Branch" onChange={(e) => setInvBranch(e.target.value)}>
                                        <MenuItem value="">All Branches</MenuItem>
                                        {uniqueBranches.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Category</InputLabel>
                                    <Select value={invCategory} label="Category" onChange={(e) => setInvCategory(e.target.value)}>
                                        <MenuItem value="">All Categories</MenuItem>
                                        {categories.map((c) => (
                                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <FormControlLabel
                                    control={<Switch checked={invIncludeZero} onChange={(e) => setInvIncludeZero(e.target.checked)} />}
                                    label={<Typography variant="body2" fontWeight={600}>Include Out-of-Stock</Typography>}
                                />
                            </Grid>
                            <Grid item xs={12} sm={1}>
                                <Button fullWidth variant="contained" onClick={handleSearchClick} sx={{ height: 40, borderRadius: '8px' }}>
                                    <SearchIcon />
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Stats Summaries */}
                    {invLoading ? (
                        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                    ) : (
                        <>
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>TOTAL PARTS TRACKED</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{invReportData?.summary?.total_items || 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>STOCK VALUE (AT COST)</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>{currencySymbol} {invReportData?.summary?.total_stock_value || 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>POTENTIAL SELLING VALUE</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>{currencySymbol} {invReportData?.summary?.total_selling_value || 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>CRITICAL REORDER ALERTS</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>{invReportData?.summary?.low_stock_items || 0}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Inventory table */}
                            <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Code / SKU</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Stock Qty</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Purchase</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Selling</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {invReportData?.data?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>No inventory items found.</TableCell>
                                                </TableRow>
                                            ) : (
                                                invReportData?.data?.map((item) => (
                                                    <TableRow key={item.id} hover>
                                                        <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                                                        <TableCell>{item.item_code}</TableCell>
                                                        <TableCell>{item.category?.name || 'N/A'}</TableCell>
                                                        <TableCell>{item.branch?.name || '-'}</TableCell>
                                                        <TableCell align="right" sx={{ color: item.current_stock <= item.reorder_level ? 'error.main' : 'text.primary', fontWeight: 700 }}>
                                                            {item.current_stock} {item.unit || 'pcs'}
                                                        </TableCell>
                                                        <TableCell align="right">{currencySymbol} {item.purchase_price}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600 }}>{currencySymbol} {item.selling_price}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </>
                    )}
                </Box>
            </TabPanel>

            {/* TAB 3: STOCK MOVEMENT HISTORY */}
            <TabPanel value={activeTab} index={3}>
                <Box display="flex" flexDirection="column" gap={3}>
                    {/* Filters */}
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ mb: 2 }}>
                            <DatePresetButtons activePreset={smPreset} onPresetChange={handleSmPreset} />
                        </Box>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date From"
                                    InputLabelProps={{ shrink: true }}
                                    value={smDateFrom}
                                    onChange={(e) => { setSmDateFrom(e.target.value); setSmPreset(''); }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date To"
                                    InputLabelProps={{ shrink: true }}
                                    value={smDateTo}
                                    onChange={(e) => { setSmDateTo(e.target.value); setSmPreset(''); }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Branch</InputLabel>
                                    <Select value={smBranch} label="Branch" onChange={(e) => setSmBranch(e.target.value)}>
                                        <MenuItem value="">All Branches</MenuItem>
                                        {uniqueBranches.map((b) => (
                                            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Category</InputLabel>
                                    <Select value={smCategory} label="Category" onChange={(e) => setSmCategory(e.target.value)}>
                                        <MenuItem value="">All Categories</MenuItem>
                                        {categories.map((c) => (
                                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Item Code / SKU</InputLabel>
                                    <Select 
                                        value={smItemCode} 
                                        label="Item Code / SKU" 
                                        onChange={(e) => setSmItemCode(e.target.value)}
                                    >
                                        <MenuItem value="">All Item Codes</MenuItem>
                                        {inventoryItems.map((item) => (
                                            <MenuItem key={item.id} value={item.item_code}>
                                                {item.item_code} - {item.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Movement Type</InputLabel>
                                    <Select value={smType} label="Movement Type" onChange={(e) => setSmType(e.target.value)}>
                                        <MenuItem value="">All Types</MenuItem>
                                        <MenuItem value="grn">GRN (Goods Receipt)</MenuItem>
                                        <MenuItem value="purchase">Purchase Order</MenuItem>
                                        <MenuItem value="job_card">Job Card (Usage)</MenuItem>
                                        <MenuItem value="sale">Direct Sale</MenuItem>
                                        <MenuItem value="adjustment">Adjustment</MenuItem>
                                        <MenuItem value="initial">Initial Balance</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search item / note"
                                    value={smSearch}
                                    onChange={(e) => setSmSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Stats Summaries */}
                    {smLoading ? (
                        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                    ) : (
                        <>
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>TOTAL MOVEMENTS</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                                                {smReportData?.summary?.total_transactions || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>INWARD ADDITIONS (QTY)</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                                                +{smReportData?.summary?.inward_quantity || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>OUTWARD USAGE (QTY)</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
                                                -{smReportData?.summary?.outward_quantity || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>NET MOVEMENT VALUE</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: (smReportData?.summary?.net_value || 0) >= 0 ? 'primary.main' : 'warning.main' }}>
                                                {currencySymbol} {smReportData?.summary?.net_value || 0}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Stock Movements Table */}
                            <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Item Name / Code</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Movement Type</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Qty Change</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Value</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Performed By</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Notes / Reference</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {smReportData?.data?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                                        No stock movements recorded for the selected filters.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                smReportData?.data?.map((tx) => {
                                                    const dateStr = new Date(tx.created_at).toLocaleString();
                                                    const displayType = tx.display_type || tx.transaction_type;
                                                    const isJobCard = displayType?.toLowerCase() === 'job_card' || ['job_card', 'jobcard'].includes((tx.reference_type || '').toLowerCase());
                                                    const isOutward = isJobCard || ['sale', 'subtract'].includes(tx.transaction_type?.toLowerCase()) || (tx.notes && tx.notes.toLowerCase().includes('deduct'));
                                                    const typeColor = ['grn', 'purchase', 'initial', 'add'].includes(tx.transaction_type?.toLowerCase()) 
                                                        ? 'success' 
                                                        : isJobCard
                                                        ? 'info' 
                                                        : isOutward 
                                                        ? 'error' 
                                                        : 'warning';
                                                    const typeLabel = isJobCard ? 'JOB CARD' : (tx.transaction_type?.toUpperCase() || 'ADJUSTMENT');

                                                    return (
                                                        <TableRow key={tx.id} hover>
                                                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                                {dateStr}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                                    {tx.inventory_item?.name || 'N/A'}
                                                                </Typography>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    SKU: {tx.inventory_item?.item_code || '-'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>{tx.branch?.name || '-'}</TableCell>
                                                            <TableCell>
                                                                <Chip 
                                                                    label={typeLabel} 
                                                                    color={typeColor} 
                                                                    size="small" 
                                                                    sx={{ fontWeight: 700, borderRadius: '6px', height: 22, fontSize: '0.72rem' }} 
                                                                />
                                                                {isJobCard && tx.job_card && (
                                                                    <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.3, fontSize: '0.7rem' }}>
                                                                        #{tx.job_card.job_card_number} • {tx.job_card.customer_name}
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 800, color: isOutward ? 'error.main' : 'success.main' }}>
                                                                {isOutward ? `-${tx.quantity}` : `+${tx.quantity}`}
                                                            </TableCell>
                                                            <TableCell align="right">{currencySymbol} {tx.unit_price}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                                {currencySymbol} {tx.total_price}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: '0.85rem' }}>
                                                                {tx.creator?.name || 'System'}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: '0.82rem', maxWidth: 220 }}>
                                                                {tx.notes || tx.reference_type ? `${tx.reference_type || ''} ${tx.notes || ''}` : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </>
                    )}
                </Box>
            </TabPanel>
        </Box>
    );
};

export default Reports;

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import {
    Button,
    Box,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    TextField,
    MenuItem,
    Grid,
    Paper,
    useTheme,
    InputAdornment,
    Select,
    FormControl,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputLabel
} from '@mui/material';
import {
    Add,
    Print,
    Visibility,
    Edit,
    Delete,
    Search,
    FilterList,
    ChangeCircle,
    AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const JobCards = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { hasPermission } = useAuth();
    const { currencySymbol } = useSettings();
    // Helper: get date in local timezone as YYYY-MM-DD
    const toLocalDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [filters, setFilters] = useState({
        status: 'exclude_invoiced',
        delivery_status: '',
        search: '',
        date_from: toLocalDate(sevenDaysAgo),
        date_to: toLocalDate(new Date()),
        sort_by: 'created_at',
        sort_order: 'desc',
        page: 0,
        per_page: 20,
        branch_id: '',
    });
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [newDeliveryStatus, setNewDeliveryStatus] = useState('');

    // Fetch branches for filter list
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const res = await api.get('/branches');
            return res.data;
        }
    });
    const branches = branchesData?.data || branchesData || [];

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

    const { data, isLoading } = useQuery({
        queryKey: ['jobCards', filters],
        queryFn: async () => {
            const { page, ...rest } = filters;
            const cleanParams = {};
            Object.keys(rest).forEach(k => {
                if (rest[k] !== '' && rest[k] !== null && rest[k] !== undefined) {
                    cleanParams[k] = rest[k];
                }
            });
            const params = new URLSearchParams({
                ...cleanParams,
                date_from: rest.date_from ? `${rest.date_from} 00:00:00` : '',
                date_to: rest.date_to ? `${rest.date_to} 23:59:59` : '',
                page: page + 1,
            });
            const res = await api.get(`/job-cards?${params}`);
            return res.data;
        },
        keepPreviousData: true,
    });

    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, job: null });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/job-cards/${id}`),
        onSuccess: () => {
            toast.success('Job card deleted successfully');
            setDeleteConfirmDialog({ open: false, job: null });
            queryClient.invalidateQueries(['jobCards']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || error.message || 'Failed to delete job card');
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, delivery_status }) => {
            const body = { status };
            if (delivery_status) {
                body.delivery_status = delivery_status;
            }
            return api.put(`/job-cards/${id}`, body);
        },
        onSuccess: () => {
            toast.success('Status updated successfully');
            setStatusDialogOpen(false);
            setSelectedJob(null);
            setNewStatus('');
            setNewDeliveryStatus('');
            queryClient.invalidateQueries(['jobCards']);
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed to update status'),
    });

    const handleStatusChange = (job) => {
        setSelectedJob(job);
        setNewStatus(job.status);
        setNewDeliveryStatus(job.delivery_status || 'not_ready');
        setStatusDialogOpen(true);
    };

    const handleStatusUpdate = () => {
        if (selectedJob && newStatus) {
            updateStatusMutation.mutate({
                id: selectedJob.id,
                status: newStatus,
                delivery_status: ['completed', 'invoiced'].includes(newStatus) ? newDeliveryStatus : undefined
            });
        }
    };

    // Compute estimated completion time from created_at + estimated_duration (hours)
    const getEstimatedCompletion = (row) => {
        if (!row.estimated_duration || !row.created_at) return null;
        const createdAt = new Date(row.created_at);
        const completionTime = new Date(createdAt.getTime() + parseFloat(row.estimated_duration) * 60 * 60 * 1000);
        return completionTime;
    };

    const statusMap = {
        received: { label: 'Received', color: 'default' },
        diagnosis: { label: 'Diagnosis', color: 'warning' },
        in_progress: { label: 'In Progress', color: 'info' },
        parts_awaited: { label: 'Parts Awaited', color: 'secondary' },
        qc: { label: 'QC', color: 'warning' },
        completed: { label: 'Completed', color: 'success' },
        invoiced: { label: 'Invoiced', color: 'primary' },
        cancelled: { label: 'Cancelled', color: 'error' },
    };

    const deliveryStatusMap = {
        not_ready: { label: 'Not Ready', color: 'error' },
        ready_for_pickup: { label: 'Ready for Pickup', color: 'info' },
        delivered: { label: 'Delivered', color: 'success' },
    };

    const columns = [
        {
            field: 'actions',
            headerName: t('common.actions') || 'Actions',
            width: 160,
            sortable: false,
            renderCell: (params) => (
                <Box display="flex" gap={0.5}>
                    <Tooltip title={t('common.view') || 'View'}>
                        <IconButton size="small" onClick={() => navigate(`/job-cards/${params.row.id}?mode=view`)}>
                            <Visibility fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.edit') || 'Edit'}>
                        <IconButton size="small" onClick={() => navigate(`/job-cards/${params.row.id}`)}>
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('jobCard.print') || 'Print'}>
                        <IconButton size="small" onClick={() => window.open(`/job-cards/${params.row.id}/print`, '_blank')}>
                            <Print fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete') || 'Delete'}>
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirmDialog({ open: true, job: params.row })}>
                            <Delete fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        },
        {
            field: 'job_number', headerName: t('jobCard.number') || 'Job #', width: 180,
            renderCell: (params) => (
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {params.value}
                </Typography>
            )
        },
        { field: 'bike_number', headerName: t('jobCard.bikeNumber') || 'Bike No.', width: 120 },
        { field: 'customer_name', headerName: t('jobCard.customerName') || 'Customer', width: 150 },
        { field: 'customer_phone', headerName: t('jobCard.customerPhone') || 'Phone', width: 130 },
        {
            field: 'status',
            headerName: t('common.status') || 'Status',
            width: 180,
            renderCell: (params) => {
                const s = statusMap[params.value] || { label: params.value, color: 'default' };
                return (
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ overflow: 'visible' }}>
                        <Chip
                            label={t('jobCard.status.' + params.value, s.label)}
                            color={s.color}
                            size="small"
                            sx={{ fontWeight: 600, borderRadius: '6px' }}
                        />
                        <Tooltip title="Change Status">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(params.row);
                                }}
                            >
                                <ChangeCircle fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                );
            }
        },
        {
            field: 'delivery_status',
            headerName: 'Delivery Status',
            width: 180,
            renderCell: (params) => {
                const isCompletedOrInvoiced = ['completed', 'invoiced'].includes(params.row.status);
                if (!isCompletedOrInvoiced) return <Typography variant="caption" color="textSecondary">—</Typography>;

                const val = params.value || 'not_ready';
                const s = deliveryStatusMap[val] || { label: val, color: 'default' };
                return (
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ overflow: 'visible' }}>
                        <Chip
                            label={t('jobCard.status.' + val, s.label)}
                            color={s.color}
                            size="small"
                            sx={{ fontWeight: 600, borderRadius: '6px' }}
                        />
                        <Tooltip title="Change Delivery Status">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(params.row);
                                }}
                            >
                                <ChangeCircle fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                );
            }
        },
        {
            field: 'estimated_duration',
            headerName: t('jobCard.estCompletion') || 'Est. Completion',
            width: 160,
            renderCell: (params) => {
                const completionTime = getEstimatedCompletion(params.row);
                if (!completionTime) return <Typography variant="caption" color="textSecondary">—</Typography>;
                const isPast = completionTime < new Date();
                return (
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <AccessTime fontSize="small" sx={{ color: isPast ? 'error.main' : 'success.main', fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: isPast ? 'error.main' : 'text.primary' }}>
                            {completionTime.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </Typography>
                    </Box>
                );
            }
        },
        {
            field: 'total_amount',
            headerName: t('jobCard.totalAmount') || 'Amount',
            width: 130,
            type: 'number',
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => (
                <Typography sx={{ fontWeight: 600, textAlign: 'right', width: '100%' }}>
                    {currencySymbol} {Number(params.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
            )
        },
        {
            field: 'created_at',
            headerName: t('common.date') || 'Date',
            width: 110,
            type: 'date',
            valueGetter: (params) => {
                if (!params.value) return null;
                const date = new Date(params.value);
                return isNaN(date.getTime()) ? null : date;
            },
            renderCell: (params) => params.value ? params.value.toLocaleDateString() : ''
        }
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header section */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.03em' }}>
                        {t('jobCard.title') || 'Job Cards'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Manage and track vehicle service requests.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => navigate('/job-cards/new')}
                    sx={{
                        borderRadius: '10px',
                        boxShadow: `0 4px 14px rgba(79, 70, 229, 0.25)`
                    }}
                >
                    {t('jobCard.new') || 'New Job Card'}
                </Button>
            </Box>

            {/* Filter and Search Panel */}
            <Paper
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={t('common.search') || 'Search by bike, customer, phone...'}
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 0 })}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            select
                            label={t('common.status') || 'Status'}
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 0 })}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FilterList sx={{ color: 'text.secondary', mr: 0.5 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        >
                            <MenuItem value="exclude_invoiced">All Except Invoiced</MenuItem>
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="received">Received</MenuItem>
                            <MenuItem value="diagnosis">Diagnosis</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="parts_awaited">Parts Awaited</MenuItem>
                            <MenuItem value="qc">QC</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="invoiced">Invoiced</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={1.75}>
                        <TextField
                            fullWidth
                            size="small"
                            select
                            label="Delivery Status"
                            value={filters.delivery_status}
                            onChange={(e) => setFilters({ ...filters, delivery_status: e.target.value, page: 0 })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        >
                            <MenuItem value="">All Delivery Statuses</MenuItem>
                            <MenuItem value="not_ready">Not Ready</MenuItem>
                            <MenuItem value="ready_for_pickup">Ready for Pickup</MenuItem>
                            <MenuItem value="delivered">Delivered</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={1.75}>
                        <TextField
                            fullWidth
                            size="small"
                            select
                            label="Branch"
                            value={filters.branch_id}
                            onChange={(e) => setFilters({ ...filters, branch_id: e.target.value, page: 0 })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        >
                            <MenuItem value="">All Branches</MenuItem>
                            {uniqueBranches.map(b => (
                                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={6} md={1.75}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label={t('common.dateFrom') || 'Date From'}
                            value={filters.date_from}
                            onChange={(e) => setFilters({ ...filters, date_from: e.target.value, page: 0 })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                    </Grid>
                    <Grid item xs={6} md={1.75}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label={t('common.dateTo') || 'Date To'}
                            value={filters.date_to}
                            onChange={(e) => setFilters({ ...filters, date_to: e.target.value, page: 0 })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Data Grid container */}
            <Paper
                sx={{
                    p: 1.5,
                    borderRadius: '16px',
                    height: filters.per_page >= 100 ? 950 : 650,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    '& .MuiDataGrid-row': {
                        overflow: 'visible',
                    },
                    '& .MuiDataGrid-cell': {
                        overflow: 'visible',
                    },
                }}
            >
                <DataGrid
                    rows={data?.data || []}
                    columns={columns}
                    rowHeight={52}
                    loading={isLoading}
                    pagination
                    paginationMode="server"
                    sortingMode="server"
                    rowCount={data?.total || 0}
                    paginationModel={{
                        page: filters.page,
                        pageSize: filters.per_page,
                    }}
                    onPaginationModelChange={(model) => {
                        setFilters(f => ({
                            ...f,
                            page: model.page,
                            per_page: model.pageSize,
                        }));
                    }}
                    pageSizeOptions={[10, 20, 50, 100]}
                    sortModel={[{ field: filters.sort_by, sort: filters.sort_order }]}
                    onSortModelChange={(model) => {
                        if (model.length > 0) {
                            setFilters(f => ({ ...f, sort_by: model[0].field, sort_order: model[0].sort, page: 0 }));
                        } else {
                            setFilters(f => ({ ...f, sort_by: 'created_at', sort_order: 'desc', page: 0 }));
                        }
                    }}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            borderRadius: '12px 12px 0 0',
                        },
                        '& .MuiDataGrid-cell': {
                            display: 'flex',
                            alignItems: 'center',
                        }
                    }}
                />
            </Paper>

            {/* Status Change Dialog */}
            <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Change Status
                    {selectedJob && (
                        <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 400, mt: 0.5 }}>
                            Job: {selectedJob.job_number} — {selectedJob.customer_name}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth sx={{ mb: ['completed', 'invoiced'].includes(newStatus) ? 2 : 0 }}>
                        <Select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            sx={{
                                fontWeight: 600,
                                borderRadius: '8px',
                            }}
                        >
                            <MenuItem value="received">RECEIVED</MenuItem>
                            <MenuItem value="diagnosis">DIAGNOSIS</MenuItem>
                            <MenuItem value="in_progress">IN PROGRESS</MenuItem>
                            <MenuItem value="parts_awaited">PARTS AWAITED</MenuItem>
                            <MenuItem value="qc">QC</MenuItem>
                            <MenuItem value="completed">COMPLETED</MenuItem>
                            <MenuItem value="invoiced">INVOICED</MenuItem>
                            <MenuItem value="cancelled">CANCELLED</MenuItem>
                        </Select>
                    </FormControl>
                    {['completed', 'invoiced'].includes(newStatus) && (
                        <FormControl fullWidth>
                            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block', fontWeight: 700 }}>
                                DELIVERY STATUS
                            </Typography>
                            <Select
                                value={newDeliveryStatus}
                                onChange={(e) => setNewDeliveryStatus(e.target.value)}
                                sx={{
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                }}
                            >
                                <MenuItem value="not_ready">NOT READY</MenuItem>
                                <MenuItem value="ready_for_pickup">READY FOR PICKUP</MenuItem>
                                <MenuItem value="delivered">DELIVERED</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setStatusDialogOpen(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStatusUpdate}
                        variant="contained"
                        color="primary"
                        disabled={updateStatusMutation.isLoading}
                    >
                        {updateStatusMutation.isLoading ? 'Updating...' : 'Update Status'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmDialog.open}
                onClose={() => setDeleteConfirmDialog({ open: false, job: null })}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Delete fontSize="medium" color="error" />
                    Confirm Job Card Deletion
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Are you sure you want to delete this job card? This action cannot be undone.
                    </Typography>
                    {deleteConfirmDialog.job && (
                        <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Job Number:</strong> #{deleteConfirmDialog.job.job_number || deleteConfirmDialog.job.id}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Vehicle / Bike No:</strong> {deleteConfirmDialog.job.bike_number || 'N/A'}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Customer:</strong> {deleteConfirmDialog.job.customer_name || 'N/A'}
                            </Typography>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setDeleteConfirmDialog({ open: false, job: null })}
                        sx={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        No, Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                            if (deleteConfirmDialog.job?.id) {
                                deleteMutation.mutate(deleteConfirmDialog.job.id);
                            }
                        }}
                        disabled={deleteMutation.isLoading}
                        sx={{ borderRadius: '8px', fontWeight: 700 }}
                    >
                        {deleteMutation.isLoading ? 'Deleting...' : 'Yes, Delete Job Card'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default JobCards;
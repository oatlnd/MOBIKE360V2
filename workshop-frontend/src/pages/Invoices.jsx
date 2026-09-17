import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    Card,
    CardContent,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Tooltip,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    Payment as PaymentIcon,
    Delete as DeleteIcon,
    FilterList as FilterListIcon,
    Print as PrintIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

const Invoices = () => {
    const queryClient = useQueryClient();
    const { currencySymbol } = useSettings();
    const { t } = useTranslation();

    const fmt = (amount) => {
        if (amount === undefined || amount === null || isNaN(Number(amount))) return '0.00';
        return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };


    // Dialog state variables
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const toLocalDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Form inputs for recording payment
    const [paymentPaidAmount, setPaymentPaidAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [paymentType, setPaymentType] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [dateFrom, setDateFrom] = useState(toLocalDate(sevenDaysAgo));
    const [dateTo, setDateTo] = useState(toLocalDate(new Date()));
    const [filterBranch, setFilterBranch] = useState('');
    const [page, setPage] = useState(1);

    // ==========================================
    // DATA FETCHING (React Query)
    // ==========================================

    // Fetch branches
    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const res = await api.get(ENDPOINTS.BRANCHES, { skipAuthToast: true });
            return res.data?.data ?? res.data ?? [];
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

    // Fetch invoices list
    const { data: invoicesData, isLoading } = useQuery({
        queryKey: ['invoices', page, search, paymentType, paymentStatus, dateFrom, dateTo, filterBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page);
            if (search) params.append('search', search);
            if (paymentType) params.append('payment_type', paymentType);
            if (paymentStatus) params.append('payment_status', paymentStatus);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (filterBranch) params.append('branch_id', filterBranch);
            const res = await api.get(`${ENDPOINTS.INVOICES}?${params.toString()}`);
            return res.data;
        },
    });

    // ==========================================
    // MUTATIONS
    // ==========================================

    const recordPaymentMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`${ENDPOINTS.INVOICES}/${id}`, data),
        onSuccess: () => {
            toast.success('Payment recorded successfully!');
            setPaymentDialogOpen(false);
            setPaymentPaidAmount('');
            setPaymentNotes('');
            queryClient.invalidateQueries(['invoices']);
            if (selectedInvoice) {
                // Refresh the modal detail view too
                setSelectedInvoice(null);
                setDetailsDialogOpen(false);
            }
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to record payment'),
    });

    const deleteInvoiceMutation = useMutation({
        mutationFn: (id) => api.delete(`${ENDPOINTS.INVOICES}/${id}`),
        onSuccess: () => {
            toast.success('Invoice deleted successfully!');
            queryClient.invalidateQueries(['invoices']);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete invoice'),
    });

    // ==========================================
    // ACTION HANDLERS
    // ==========================================

    const handleOpenDetails = (invoice) => {
        setSelectedInvoice(invoice);
        setDetailsDialogOpen(true);
    };

    const handleOpenPayment = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentPaidAmount(invoice.paid_amount || '');
        setPaymentDialogOpen(true);
    };

    const handleRecordPaymentSubmit = () => {
        if (paymentPaidAmount === '') {
            toast.error('Payment amount is required');
            return;
        }
        recordPaymentMutation.mutate({
            id: selectedInvoice.id,
            data: {
                paid_amount: parseFloat(paymentPaidAmount),
                notes: paymentNotes || 'Updated paid amount',
            },
        });
    };

    const handleDeleteInvoice = (id) => {
        if (window.confirm('Are you sure you want to delete this invoice? This reverts the Job Card status to Completed.')) {
            deleteInvoiceMutation.mutate(id);
        }
    };

    const handlePrintInvoice = (invoice, format = 'a4') => {
        if (!invoice?.job_card_id) return;
        window.open(`/job-cards/${invoice.job_card_id}/print?format=${format}`, '_blank');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            {/* Header */}
            <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.03em' }}>
                    {t('invoice.title') || 'Invoices'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {t('invoice.subtitle') || 'Process billing statements, customer receipts, and partial payments history.'}
                </Typography>
            </Box>

            {/* Filters panel */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={t('invoice.number') || 'Search Invoice...'}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.5}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('invoice.paymentType') || 'Payment Method'}</InputLabel>
                            <Select
                                value={paymentType}
                                label={t('invoice.paymentType') || 'Payment Method'}
                                onChange={(e) => {
                                    setPaymentType(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <MenuItem value="">All Types</MenuItem>
                                <MenuItem value="cash">Cash</MenuItem>
                                <MenuItem value="credit_card">Credit Card</MenuItem>
                                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                <MenuItem value="cheque">Cheque</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('invoice.paymentStatus') || 'Payment Status'}</InputLabel>
                            <Select
                                value={paymentStatus}
                                label={t('invoice.paymentStatus') || 'Payment Status'}
                                onChange={(e) => {
                                    setPaymentStatus(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <MenuItem value="">All Statuses</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                                <MenuItem value="partial">Partial</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('settings.branches') || 'Branch'}</InputLabel>
                            <Select
                                value={filterBranch}
                                label={t('settings.branches') || 'Branch'}
                                onChange={(e) => {
                                    setFilterBranch(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <MenuItem value="">All Branches</MenuItem>
                                {uniqueBranches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4} md={1.5}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label={t('invoice.fromDate') || 'From Date'}
                            InputLabelProps={{ shrink: true }}
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={1.5}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label={t('invoice.toDate') || 'To Date'}
                            InputLabelProps={{ shrink: true }}
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Invoices List */}
            {isLoading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {invoicesData?.data?.length === 0 ? (
                        <Grid item xs={12}>
                            <Alert severity="info">{t('common.noData') || 'No invoices found matching criteria.'}</Alert>
                        </Grid>
                    ) : (
                        invoicesData?.data?.map((invoice) => {
                            const isPaid = invoice.payment_status === 'paid';
                            const isPartial = invoice.payment_status === 'partial';
                            return (
                                <Grid item xs={12} sm={6} md={4} key={invoice.id}>
                                    <Card sx={{ borderRadius: '16px', boxShadow: 1, '&:hover': { boxShadow: 4, transition: 'all 0.3s' } }}>
                                        <CardContent sx={{ pt: 3, pb: 2 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                    {invoice.invoice_number}
                                                </Typography>
                                                <Chip
                                                    label={invoice.payment_status?.toUpperCase()}
                                                    color={isPaid ? 'success' : isPartial ? 'warning' : 'error'}
                                                    size="small"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </Box>
                                            <Divider sx={{ mb: 2 }} />

                                            <Box display="flex" flexDirection="column" gap={1} sx={{ mb: 2 }}>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="body2" color="textSecondary">Customer Name</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{invoice.job_card?.customer_name || 'N/A'}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="body2" color="textSecondary">Bike / Vehicle No.</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{invoice.job_card?.bike_number || 'N/A'}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="body2" color="textSecondary">Total Cost</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{currencySymbol} {fmt(invoice.amount)}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="body2" color="textSecondary">Remaining Balance</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: invoice.balance > 0 ? 'error.main' : 'success.main' }}>
                                                        {currencySymbol} {fmt(invoice.balance)}
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="body2" color="textSecondary">Method</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{invoice.payment_type?.toUpperCase()}</Typography>
                                                </Box>
                                            </Box>

                                            <Divider sx={{ my: 1.5 }} />

                                            <Box display="flex" justifyContent="center" gap={1}>
                                                <Tooltip title="View Details">
                                                    <IconButton color="info" size="small" onClick={() => handleOpenDetails(invoice)}>
                                                        <VisibilityIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Update Payment">
                                                    <span>
                                                        <IconButton color="success" size="small" onClick={() => handleOpenPayment(invoice)} disabled={isPaid}>
                                                            <PaymentIcon />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Delete Invoice">
                                                    <span>
                                                        <IconButton color="error" size="small" onClick={() => handleDeleteInvoice(invoice.id)} disabled={isPaid}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Print Sheet">
                                                    <IconButton color="secondary" size="small" onClick={() => handlePrintInvoice(invoice)}>
                                                        <PrintIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })
                    )}
                </Grid>
            )}

            {/* Pagination Controls */}
            {invoicesData?.total > invoicesData?.per_page && (
                <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                    <Button
                        disabled={page === 1}
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    >
                        Previous
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                        Page {invoicesData.current_page} of {invoicesData.last_page}
                    </Box>
                    <Button
                        disabled={page === invoicesData.last_page}
                        onClick={() => setPage((prev) => Math.min(prev + 1, invoicesData.last_page))}
                    >
                        Next
                    </Button>
                </Box>
            )}

            {/* ==========================================
                DIALOG: INVOICE DETAILS
            ========================================== */}
            <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 800 }}>{t('invoice.invoiceDetails') || 'Invoice Details'}: {selectedInvoice?.invoice_number}</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary">{t('jobCard.customerName') || 'Customer Info'}</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            {selectedInvoice?.job_card?.customer_name} ({selectedInvoice?.job_card?.customer_phone})
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {t('jobCard.model') || 'Vehicle'}: {selectedInvoice?.job_card?.make} {selectedInvoice?.job_card?.model} | {t('jobCard.bikeNumber') || 'Bike No'}: {selectedInvoice?.job_card?.bike_number}
                        </Typography>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary">{t('jobCard.serviceType') || 'Job Operations'}</Typography>
                        <TableContainer sx={{ mt: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('jobCard.serviceType') || 'Service'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{t('jobCard.price') || 'Price'}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedInvoice?.job_card?.service_type?.map((svc, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{svc.name}</TableCell>
                        <TableCell align="right">{currencySymbol} {fmt(svc.price)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary">{t('invoice.financials') || 'Financials'}</Typography>
                        <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                            <Typography variant="body2">{t('invoice.subtotal') || 'Subtotal Amount'}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{currencySymbol} {fmt(selectedInvoice?.amount)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2">{t('invoice.paidAmount') || 'Total Paid'}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>{currencySymbol} {fmt(selectedInvoice?.paid_amount)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('invoice.outstanding') || 'Outstanding Balance'}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: selectedInvoice?.balance > 0 ? 'error.main' : 'success.main' }}>
                                {currencySymbol} {fmt(selectedInvoice?.balance)}
                            </Typography>
                        </Box>
                    </Box>
                    {selectedInvoice?.notes && (
                        <Box>
                            <Typography variant="subtitle2" color="textSecondary">Invoice Notes</Typography>
                            <Typography variant="body2" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: '8px', mt: 0.5 }}>
                                {selectedInvoice.notes}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setDetailsDialogOpen(false)} color="inherit">Close</Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<PrintIcon />}
                        onClick={() => handlePrintInvoice(selectedInvoice)}
                    >
                        Print Invoice
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ==========================================
                DIALOG: RECORD PAYMENT / UPDATE
            ========================================== */}
            <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 800 }}>Record Payment</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box>
                        <Typography variant="caption" color="textSecondary">Invoice Total: </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>{currencySymbol} {fmt(selectedInvoice?.amount)}</Typography>
                        <Typography variant="caption" color="textSecondary">Balance Due: </Typography>
                        <Typography variant="h6" color="error" sx={{ fontWeight: 800 }}>{currencySymbol} {fmt(selectedInvoice?.balance)}</Typography>
                    </Box>
                    <TextField
                        fullWidth
                        type="number"
                        label={t('invoice.updatedPaidAmount') || 'Updated Paid Amount'}
                        value={paymentPaidAmount}
                        onChange={(e) => setPaymentPaidAmount(e.target.value)}
                        helperText={`Enter the new accumulated paid amount (must be <= ${currencySymbol} ${selectedInvoice?.amount})`}
                        inputProps={{ style: { textAlign: 'right' } }}
                    />
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label={t('invoice.paymentUpdateNotes') || 'Payment Update Notes'}
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g., Paid remaining balance via Cash"
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setPaymentDialogOpen(false)} color="inherit">{t('common.cancel') || 'Cancel'}</Button>
                    <Button onClick={handleRecordPaymentSubmit} variant="contained" color="success">
                        {t('invoice.updatePayment') || 'Update Payment'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Invoices;

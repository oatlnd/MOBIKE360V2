import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    Card,
    CardContent,
    Avatar,
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
    DialogContentText,
    Radio,
    RadioGroup,
    FormControlLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Tune as TuneIcon,
    Warning as WarningIcon,
    SwapVert as SwapVertIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api, { storageUrl } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Inventory = () => {
    const queryClient = useQueryClient();
    const { currencySymbol, settings, updateSettings } = useSettings();
    const { t } = useTranslation();
    const { hasPermission, hasAnyPermission } = useAuth();

    // Dialog state variables
    const [itemDialogOpen, setItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
    const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Stock Adjust form state
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustType, setAdjustType] = useState('add');
    const [adjustNotes, setAdjustNotes] = useState('');

    // GRN & Extended Stock Adjust fields
    const [adjustPurpose, setAdjustPurpose] = useState('adjustment'); // 'grn' or 'adjustment'
    const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split('T')[0]);
    const [grnSupplier, setGrnSupplier] = useState('');
    const [grnInvoiceAmount, setGrnInvoiceAmount] = useState('');
    const [grnInvoiceDate, setGrnInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [grnInvoiceNumber, setGrnInvoiceNumber] = useState('');
    const [grnPurchasePrice, setGrnPurchasePrice] = useState('');
    const [grnSellingPrice, setGrnSellingPrice] = useState('');
    const [newSupplierName, setNewSupplierName] = useState('');

    const suppliers = React.useMemo(() => {
        if (settings?.inventory_suppliers) {
            try {
                return JSON.parse(settings.inventory_suppliers);
            } catch (e) {
                console.error(e);
            }
        }
        return ['Main Parts Distributor', 'Honda Lanka Ltd', 'Supreme Spares Jaffna'];
    }, [settings?.inventory_suppliers]);

    const handleAddSupplier = async () => {
        if (!newSupplierName.trim()) return;
        const updatedSuppliers = [...suppliers];
        if (!updatedSuppliers.includes(newSupplierName.trim())) {
            updatedSuppliers.push(newSupplierName.trim());
            try {
                await updateSettings({
                    inventory_suppliers: JSON.stringify(updatedSuppliers)
                });
                toast.success('Supplier added successfully!');
                setNewSupplierName('');
            } catch (e) {
                toast.error('Failed to save supplier list');
            }
        } else {
            toast.error('Supplier already exists');
        }
    };

    // History dialog states
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [historyItemDetails, setHistoryItemDetails] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const handleOpenHistory = async (item) => {
        setHistoryDialogOpen(true);
        setHistoryLoading(true);
        try {
            const res = await api.get(`/inventory/${item.id}`);
            const data = res.data?.data || res.data;
            setHistoryItemDetails(data);
        } catch (e) {
            toast.error('Failed to load item transaction history');
            setHistoryDialogOpen(false);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Filters
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);
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
        const seen = new Set();
        return (branches || []).filter(b => {
            const norm = (b.name || '').toLowerCase().replace(/\s+branch$/i, '').trim();
            if (seen.has(norm)) return false;
            seen.add(norm);
            return true;
        });
    }, [branches]);

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get('/inventory/categories', { skipAuthToast: true });
            return res.data;
        },
    });

    // Fetch low stock items alert panel
    const { data: lowStockItems = [] } = useQuery({
        queryKey: ['low-stock-panel'],
        queryFn: async () => {
            const res = await api.get('/inventory/low-stock', { skipAuthToast: true });
            return res.data;
        },
    });

    // Fetch main items list
    const { data: inventoryData, isLoading } = useQuery({
        queryKey: ['inventory', page, search, filterCategory, filterBranch, filterLowStock],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page);
            if (search) params.append('search', search);
            if (filterCategory) params.append('category_id', filterCategory);
            if (filterBranch) params.append('branch_id', filterBranch);
            if (filterLowStock) params.append('low_stock', '1');
            const res = await api.get(`${ENDPOINTS.INVENTORY}?${params.toString()}`);
            return res.data;
        },
    });

    // ==========================================
    // MUTATIONS
    // ==========================================

    const createItemMutation = useMutation({
        mutationFn: (formData) => api.post(ENDPOINTS.INVENTORY, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        onSuccess: () => {
            toast.success('Inventory item created successfully!');
            setItemDialogOpen(false);
            queryClient.invalidateQueries(['inventory']);
            queryClient.invalidateQueries(['low-stock-panel']);
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to create item';
            toast.error(msg);
        },
    });

    const updateItemMutation = useMutation({
        mutationFn: ({ id, formData }) => api.post(`${ENDPOINTS.INVENTORY}/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data', 'X-HTTP-Method-Override': 'PUT' } // Laravel spoofing for multipart PUT
        }),
        onSuccess: () => {
            toast.success('Inventory item updated successfully!');
            setItemDialogOpen(false);
            setEditingItem(null);
            queryClient.invalidateQueries(['inventory']);
            queryClient.invalidateQueries(['low-stock-panel']);
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to update item';
            toast.error(msg);
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: (id) => api.delete(`${ENDPOINTS.INVENTORY}/${id}`),
        onSuccess: () => {
            toast.success('Item deleted successfully!');
            queryClient.invalidateQueries(['inventory']);
            queryClient.invalidateQueries(['low-stock-panel']);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete item'),
    });

    const adjustStockMutation = useMutation({
        mutationFn: ({ id, data }) => api.post(`/inventory/${id}/adjust`, data),
        onSuccess: () => {
            toast.success('Stock adjusted successfully!');
            setAdjustDialogOpen(false);
            setSelectedItemForAdjust(null);
            setAdjustQty('');
            setAdjustNotes('');
            queryClient.invalidateQueries(['inventory']);
            queryClient.invalidateQueries(['low-stock-panel']);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to adjust stock'),
    });

    // ==========================================
    // FORMS SETUP (React Hook Form)
    // ==========================================

    const {
        register: registerItem,
        handleSubmit: handleItemSubmit,
        reset: resetItem,
        control: itemControl,
        formState: { errors: itemErrors },
    } = useForm();

    // ==========================================
    // ACTION HANDLERS
    // ==========================================

    const handleOpenCreateItem = () => {
        setEditingItem(null);
        resetItem({
            name: '',
            item_code: '',
            barcode: '',
            branch_id: '',
            category_id: '',
            sub_category_id: '',
            purchase_price: '',
            selling_price: '',
            min_selling_price: '',
            reorder_level: '',
            current_stock: '',
            unit: '',
            description: '',
        });
        setItemDialogOpen(true);
    };

    const handleOpenEditItem = (item) => {
        setEditingItem(item);
        resetItem({
            name: item.name || '',
            item_code: item.item_code || '',
            barcode: item.barcode || '',
            branch_id: item.branch_id || '',
            category_id: item.category_id || '',
            sub_category_id: item.sub_category_id || '',
            purchase_price: item.purchase_price || '',
            selling_price: item.selling_price || '',
            min_selling_price: item.min_selling_price || '',
            reorder_level: item.reorder_level || '',
            unit: item.unit || '',
            description: item.description || '',
        });
        setItemDialogOpen(true);
    };

    const handleSaveItem = (data) => {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
            if (key === 'image') {
                if (data.image?.[0] && data.image[0] instanceof File) {
                    formData.append('image', data.image[0]);
                }
            } else if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });

        if (editingItem) {
            formData.append('_method', 'PUT');
            updateItemMutation.mutate({ id: editingItem.id, formData });
        } else {
            createItemMutation.mutate(formData);
        }
    };

    const handleDeleteItem = (item) => {
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteItem = () => {
        if (itemToDelete) {
            deleteItemMutation.mutate(itemToDelete.id);
        }
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    const handleOpenAdjust = (item) => {
        setSelectedItemForAdjust(item);
        setAdjustPurpose('adjustment');
        setAdjustDate(new Date().toISOString().split('T')[0]);
        setAdjustQty('');
        setAdjustType('add');
        setAdjustNotes('');
        setGrnSupplier('');
        setGrnInvoiceAmount('');
        setGrnInvoiceDate(new Date().toISOString().split('T')[0]);
        setGrnInvoiceNumber('');
        setGrnPurchasePrice(item.purchase_price || '');
        setGrnSellingPrice(item.selling_price || '');
        setAdjustDialogOpen(true);
    };

    const handleAdjustSubmit = () => {
        if (!adjustQty) {
            toast.error('Quantity is required');
            return;
        }
        if (adjustPurpose === 'grn') {
            if (!grnSupplier) {
                toast.error('Supplier selection is required for GRN');
                return;
            }
            if (!grnInvoiceNumber) {
                toast.error('Invoice number is required for GRN');
                return;
            }
        }

        const payload = {
            quantity: parseInt(adjustQty),
            type: adjustPurpose === 'grn' ? 'add' : adjustType, // GRN is always an increase (add)
            transaction_type: adjustPurpose === 'grn' ? 'grn' : 'adjustment',
            notes: adjustPurpose === 'grn' 
                ? `[GRN] Supplier: ${grnSupplier}, Inv No: ${grnInvoiceNumber}, Inv Date: ${grnInvoiceDate}, Inv Amt: ${grnInvoiceAmount}, Qty: ${adjustQty}, Pur Price: ${grnPurchasePrice}, Sel Price: ${grnSellingPrice}, Date: ${adjustDate}. Notes: ${adjustNotes}`
                : `[Adjustment] Date: ${adjustDate}. Notes: ${adjustNotes}`
        };

        if (adjustPurpose === 'grn') {
            if (grnPurchasePrice) payload.purchase_price = parseFloat(grnPurchasePrice);
            if (grnSellingPrice) payload.selling_price = parseFloat(grnSellingPrice);
        }

        adjustStockMutation.mutate({
            id: selectedItemForAdjust.id,
            data: payload,
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.03em' }}>
                        {t('inventory.title') || 'Inventory Management'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {t('inventory.subtitle') || 'Track stock levels, record manual adjustments, and manage parts specifications.'}
                    </Typography>
                </Box>
                {hasPermission('create inventory') && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenCreateItem}
                        sx={{ borderRadius: '10px' }}
                    >
                        {t('inventory.addPartBtn') || 'Add Part / Item'}
                    </Button>
                )}
            </Box>

            {/* Low Stock Panel Alert */}
            {lowStockItems.length > 0 && (
                <Alert
                    severity="warning"
                    icon={<WarningIcon />}
                    sx={{ borderRadius: '16px', py: 1.5 }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {lowStockItems.length} {t('inventory.lowStock') || 'items are running below reorder level'}:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        {lowStockItems.map((item) => (
                            <Chip
                                key={item.id}
                                label={`${item.name} (${item.current_stock} left)`}
                                color="warning"
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                            />
                        ))}
                    </Box>
                </Alert>
            )}

            {/* Filters panel */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={t('inventory.searchPlaceholder') || 'Search by code, barcode, or name...'}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('inventory.category') || 'Category'}</InputLabel>
                            <Select
                                value={filterCategory}
                                label={t('inventory.category') || 'Category'}
                                onChange={(e) => {
                                    setFilterCategory(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <MenuItem value="">{t('inventory.allCategories') || 'All Categories'}</MenuItem>
                                {categories.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
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
                                <MenuItem value="">{t('inventory.allBranches') || 'All Branches'}</MenuItem>
                                {uniqueBranches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2} sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant={filterLowStock ? 'contained' : 'outlined'}
                            color="warning"
                            size="small"
                            fullWidth
                            onClick={() => {
                                setFilterLowStock(!filterLowStock);
                                setPage(1);
                            }}
                            sx={{ borderRadius: '8px', height: 40 }}
                        >
                            {t('inventory.lowStockBtn') || 'Low Stock'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Main Listing Grid */}
            {isLoading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {inventoryData?.data?.length === 0 ? (
                        <Grid item xs={12}>
                            <Alert severity="info">{t('inventory.noItems') || 'No inventory items found.'}</Alert>
                        </Grid>
                    ) : (
                        inventoryData?.data?.map((item) => {
                            const isLow = item.current_stock <= item.reorder_level;
                            return (
                                <Grid item xs={12} sm={6} md={4} key={item.id}>
                                    <Card sx={{ borderRadius: '16px', position: 'relative', boxShadow: 1, '&:hover': { boxShadow: 4, transition: 'all 0.3s' } }}>
                                        {isLow && (
                                            <Chip
                                                icon={<WarningIcon />}
                                                label={t('inventory.lowStock').toUpperCase() || 'LOW STOCK'}
                                                color="error"
                                                size="small"
                                                sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 800 }}
                                            />
                                        )}
                                        <CardContent sx={{ pt: 4, pb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <Avatar
                                                src={storageUrl(item.image)}
                                                sx={{ width: 72, height: 72, mb: 2, borderRadius: '12px', bgcolor: 'primary.light' }}
                                            >
                                                {item.name?.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, textAlign: 'center' }}>
                                                {item.name}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary" sx={{ mb: 2 }}>
                                                Code: {item.item_code} | Barcode: {item.barcode || 'N/A'}
                                            </Typography>

                                            <Grid container spacing={1} sx={{ width: '100%', mb: 2 }}>
                                                <Grid item xs={6}>
                                                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '10px' }}>
                                                        <Typography variant="caption" color="textSecondary">{t('inventory.currentStock') || 'Stock Qty'}</Typography>
                                                        <Typography variant="h6" color={isLow ? 'error.main' : 'text.primary'} sx={{ fontWeight: 800 }}>
                                                            {item.current_stock} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.unit || 'pcs'}</span>
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: '10px' }}>
                                                        <Typography variant="caption" color="textSecondary">{t('inventory.sellingPrice') || 'Sale Price'}</Typography>
                                                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                            {currencySymbol} {item.selling_price}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            </Grid>

                                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.8, px: 1 }}>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="textSecondary">{t('inventory.purchasePrice') || 'Purchase Price'}</Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{currencySymbol} {item.purchase_price}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="textSecondary">{t('inventory.minSellingPrice') || 'Min. Sale Price'}</Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{currencySymbol} {item.min_selling_price || 'N/A'}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="textSecondary">{t('inventory.reorderLevel') || 'Reorder Point'}</Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.reorder_level} {item.unit || 'pcs'}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" color="textSecondary">Branch</Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.branch?.name || 'N/A'}</Typography>
                                                </Box>
                                            </Box>

                                            {hasAnyPermission(['adjust inventory', 'edit inventory', 'delete inventory']) && (
                                                <>
                                                    <Divider sx={{ width: '100%', my: 2 }} />
                                                    <Box display="flex" justifyContent="center" gap={1} sx={{ width: '100%' }}>
                                                        {hasPermission('adjust inventory') && (
                                                            <Tooltip title="Adjust Stock">
                                                                <IconButton color="warning" size="small" onClick={() => handleOpenAdjust(item)}>
                                                                    <SwapVertIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {hasPermission('edit inventory') && (
                                                            <Tooltip title="Edit Details">
                                                                <IconButton color="primary" size="small" onClick={() => handleOpenEditItem(item)}>
                                                                    <EditIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip title="View Transaction History (Report)">
                                                            <IconButton color="info" size="small" onClick={() => handleOpenHistory(item)}>
                                                                <HistoryIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {hasPermission('delete inventory') && (
                                                            <Tooltip title="Delete Item">
                                                                <IconButton color="error" size="small" onClick={() => handleDeleteItem(item)}>
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })
                    )}
                </Grid>
            )}

            {/* Pagination Controls */}
            {inventoryData?.total > inventoryData?.per_page && (
                <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                    <Button
                        disabled={page === 1}
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    >
                        Previous
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                        Page {inventoryData.current_page} of {inventoryData.last_page}
                    </Box>
                    <Button
                        disabled={page === inventoryData.last_page}
                        onClick={() => setPage((prev) => Math.min(prev + 1, inventoryData.last_page))}
                    >
                        Next
                    </Button>
                </Box>
            )}

            {/* ==========================================
                DIALOG: ADD / EDIT INVENTORY ITEM
            ========================================== */}
            <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editingItem ? 'Edit Part Details' : 'Add New Part'}
                </DialogTitle>
                <form onSubmit={handleItemSubmit(handleSaveItem)} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit', overflow: 'hidden' }}>
                    <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Item Name"
                                    {...registerItem('name', { required: 'Name is required' })}
                                    error={!!itemErrors.name}
                                    helperText={itemErrors.name?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Item Code / SKU"
                                    {...registerItem('item_code', { required: 'Item code is required' })}
                                    error={!!itemErrors.item_code}
                                    helperText={itemErrors.item_code?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Barcode"
                                    {...registerItem('barcode')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Unit (e.g. pcs, kg, box)"
                                    {...registerItem('unit')}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="branch_id"
                                    control={itemControl}
                                    rules={{ required: 'Branch is required' }}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!itemErrors.branch_id}>
                                            <InputLabel>Branch</InputLabel>
                                            <Select {...field} label="Branch">
                                                {uniqueBranches.map((b) => (
                                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="category_id"
                                    control={itemControl}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Category</InputLabel>
                                            <Select {...field} label="Category">
                                                <MenuItem value="">None</MenuItem>
                                                {categories.map((c) => (
                                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Purchase Price"
                                    {...registerItem('purchase_price', { required: 'Purchase price is required' })}
                                    error={!!itemErrors.purchase_price}
                                    helperText={itemErrors.purchase_price?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Selling Price"
                                    {...registerItem('selling_price', { required: 'Selling price is required' })}
                                    error={!!itemErrors.selling_price}
                                    helperText={itemErrors.selling_price?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Min Selling Price"
                                    {...registerItem('min_selling_price')}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Reorder Alert Level"
                                    {...registerItem('reorder_level')}
                                />
                            </Grid>
                            {!editingItem && (
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Initial Stock Qty"
                                        {...registerItem('current_stock')}
                                    />
                                </Grid>
                            )}

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Item Description"
                                    {...registerItem('description')}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                                    Upload Part Photo
                                </Typography>
                                <input type="file" accept="image/*" {...registerItem('image')} />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setItemDialogOpen(false)} color="inherit">Cancel</Button>
                        <Button type="submit" variant="contained" color="primary">Save Item</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* ==========================================
                DIALOG: ADJUST STOCK LEVEL (MANUAL)
            ========================================== */}
            <Dialog open={adjustDialogOpen} onClose={() => setAdjustDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Manage Stock: {selectedItemForAdjust?.name}
                </DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Typography variant="body2" color="textSecondary">
                        Current stock level: <strong>{selectedItemForAdjust?.current_stock} {selectedItemForAdjust?.unit || 'pcs'}</strong>
                    </Typography>

                    {/* Purpose Selection */}
                    <FormControl component="fieldset">
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Transaction Purpose</Typography>
                        <RadioGroup
                            row
                            value={adjustPurpose}
                            onChange={(e) => setAdjustPurpose(e.target.value)}
                        >
                            <FormControlLabel value="adjustment" control={<Radio />} label="Stock Adjustment" />
                            <FormControlLabel value="grn" control={<Radio />} label="GRN (Goods Received Note)" />
                        </RadioGroup>
                    </FormControl>

                    <Grid container spacing={2.5}>
                        {/* Transaction Date */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Transaction Date"
                                value={adjustDate}
                                onChange={(e) => setAdjustDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Adjust Qty */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label={adjustPurpose === 'grn' ? 'GRN Quantity' : 'Adjustment Quantity'}
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                            />
                        </Grid>

                        {/* Dynamic fields based on purpose */}
                        {adjustPurpose === 'adjustment' ? (
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Adjustment Action</InputLabel>
                                    <Select value={adjustType} label="Adjustment Action" onChange={(e) => setAdjustType(e.target.value)}>
                                        <MenuItem value="add">Add Stock (Increase)</MenuItem>
                                        <MenuItem value="subtract">Subtract Stock (Decrease)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        ) : (
                            <>
                                {/* Supplier Dropdown */}
                                <Grid item xs={12} sm={7}>
                                    <FormControl fullWidth>
                                        <InputLabel>Supplier</InputLabel>
                                        <Select
                                            value={grnSupplier}
                                            label="Supplier"
                                            onChange={(e) => setGrnSupplier(e.target.value)}
                                        >
                                            {suppliers.map((s, idx) => (
                                                <MenuItem key={idx} value={s}>{s}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                {/* Inline Add Supplier on the fly */}
                                <Grid item xs={12} sm={5} sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="New Supplier"
                                        value={newSupplierName}
                                        onChange={(e) => setNewSupplierName(e.target.value)}
                                        size="small"
                                        placeholder="Add new name"
                                    />
                                    <Button variant="contained" onClick={handleAddSupplier} sx={{ px: 1, minWidth: 44 }}>
                                        +
                                    </Button>
                                </Grid>

                                {/* Invoice Number */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Invoice Number"
                                        placeholder="e.g. INV-10028"
                                        value={grnInvoiceNumber}
                                        onChange={(e) => setGrnInvoiceNumber(e.target.value)}
                                    />
                                </Grid>

                                {/* Invoice Date */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="Invoice Date"
                                        value={grnInvoiceDate}
                                        onChange={(e) => setGrnInvoiceDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                {/* Invoice Amount */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Invoice Amount"
                                        value={grnInvoiceAmount}
                                        onChange={(e) => setGrnInvoiceAmount(e.target.value)}
                                    />
                                </Grid>

                                {/* Purchase Price */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Purchase Price"
                                        value={grnPurchasePrice}
                                        onChange={(e) => setGrnPurchasePrice(e.target.value)}
                                    />
                                </Grid>

                                {/* Selling Price */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Selling Price"
                                        value={grnSellingPrice}
                                        onChange={(e) => setGrnSellingPrice(e.target.value)}
                                    />
                                </Grid>
                            </>
                        )}

                        {/* General Notes */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Reason / Notes"
                                value={adjustNotes}
                                onChange={(e) => setAdjustNotes(e.target.value)}
                                placeholder="Audit trail note or extra details"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setAdjustDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleAdjustSubmit} variant="contained" color="warning">
                        {adjustPurpose === 'grn' ? 'Receive Goods (GRN)' : 'Apply Adjustment'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ==========================================
                DIALOG: TRANSACTION HISTORY (REPORT)
            ========================================== */}
            <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Stock Movement History: {historyItemDetails?.name}
                </DialogTitle>
                <DialogContent dividers>
                    {historyLoading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : (!historyItemDetails?.transactions || historyItemDetails.transactions.length === 0) && (!historyItemDetails?.data?.transactions || historyItemDetails.data.transactions.length === 0) ? (
                        <Alert severity="info">No transactions recorded for this item yet.</Alert>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Qty Change</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total Value</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Performed By</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Transaction Log / Reason</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(historyItemDetails?.transactions || historyItemDetails?.data?.transactions || []).map((tx) => {
                                        const dateStr = new Date(tx.created_at).toLocaleString();
                                        const isOutward = ['sale', 'job_card', 'subtract'].includes(tx.transaction_type?.toLowerCase()) || (tx.notes && tx.notes.toLowerCase().includes('deduct'));
                                        const typeColor = ['grn', 'purchase', 'initial', 'add'].includes(tx.transaction_type?.toLowerCase()) ? 'success' : tx.transaction_type === 'job_card' ? 'info' : 'warning';
                                        return (
                                            <TableRow key={tx.id} hover>
                                                <TableCell sx={{ fontSize: '0.8rem' }}>{dateStr}</TableCell>
                                                <TableCell>
                                                    <Chip label={tx.transaction_type?.toUpperCase() || 'ADJUSTMENT'} color={typeColor} size="small" sx={{ fontWeight: 700, borderRadius: '4px', height: 22 }} />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: isOutward ? 'error.main' : 'success.main' }}>
                                                    {isOutward ? `-${tx.quantity}` : `+${tx.quantity}`}
                                                </TableCell>
                                                <TableCell align="right">{currencySymbol} {tx.unit_price}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{currencySymbol} {tx.total_price}</TableCell>
                                                <TableCell>{tx.creator?.name || 'System'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem' }}>{tx.notes || tx.reference_type || '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setHistoryDialogOpen(false)} color="inherit">Close Report</Button>
                </DialogActions>
            </Dialog>

            {/* ==========================================
                DIALOG: DELETE CONFIRMATION
            ========================================== */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setItemToDelete(null); }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <WarningIcon color="error" />
                    {t('inventory.confirmDeleteTitle') || 'Confirm Delete'}
                </DialogTitle>
                <DialogContent dividers>
                    <DialogContentText sx={{ mb: 2 }}>
                        {t('inventory.confirmDeleteText') || 'Are you sure you want to permanently delete'} <strong>{itemToDelete?.name}</strong>?
                    </DialogContentText>
                    {itemToDelete?.current_stock > 0 && (
                        <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                ⚠️ {t('inventory.hasStockWarning') || 'This item has active stock!'}
                            </Typography>
                            <Typography variant="body2">
                                {t('inventory.currentStock') || 'Currently'} <strong>{itemToDelete.current_stock} {itemToDelete.unit || 'pcs'}</strong> {t('inventory.unit') || 'in stock'}.
                                {t('inventory.hasStockWarningDetail') || 'Deleting will permanently remove all stock records and transaction history. This action cannot be undone.'}
                            </Typography>
                        </Alert>
                    )}
                    {(!itemToDelete?.current_stock || itemToDelete?.current_stock === 0) && (
                        <Alert severity="info" sx={{ borderRadius: '10px' }}>
                            {t('inventory.noStockMessage') || 'This item has no stock. All related records will be permanently removed.'}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => { setDeleteConfirmOpen(false); setItemToDelete(null); }} color="inherit">
                        {t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                        onClick={confirmDeleteItem}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        {t('inventory.deletePermanently') || 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Inventory;

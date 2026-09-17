import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    IconButton,
    Divider,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Stack,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Radio,
    RadioGroup,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    InputAdornment,
    FormHelperText,
    List,
    ListItem,
    ListItemText,
    Menu,
    ListItemIcon,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    CheckCircle as CheckCircleIcon,
    Receipt as InvoiceIcon,
    Print as PrintIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Visibility,
    PhotoCamera as PhotoCameraIcon,
    ExpandMore as ExpandMoreIcon,
    Close as CloseIcon,
    Cancel as CancelIcon,
    Sms as SmsIcon,
    Description as A4Icon,
    ReceiptLong as ThermalIcon,
    Apps as DotMatrixIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api, { storageUrl } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { getModelsForMake } from '../utils/vehicleMakes';
import { decodeHondaChassis, decodeHondaEngine } from '../utils/hondaDecoder';
import { formatSriLankanPhone } from '../utils/phoneFormatter';
import LazyImage from '../components/common/LazyImage';

const PRELOADED_SERVICES = [
    { name: "Full Service", price: 2500 },
    { name: "Oil Change & Filter", price: 1200 },
    { name: "Engine Tuning", price: 1500 },
    { name: "Brake Adjustment & Pad Replacement", price: 800 },
    { name: "Water Wash & Polish", price: 600 },
    { name: "Chain Adjustment & Lubrication", price: 400 },
    { name: "Electrical System Diagnostics", price: 1000 },
    { name: "Battery Replacement", price: 3500 },
    { name: "Clutch Cable Replacement", price: 700 },
    { name: "Tire Replacement", price: 4500 },
    { name: "Carburetor Clean & Tune", price: 1200 },
    { name: "Spark Plug Replacement", price: 500 }
];

const NewJobCard = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { settings, currencySymbol, vehicleMakes, servicePurposeMap, customServices } = useSettings();
    const { t } = useTranslation();
    const isEditMode = !!id;
    const isViewMode = new URLSearchParams(location.search).get('mode') === 'view';

    const formatAmount = (amount) => {
        if (amount === undefined || amount === null || isNaN(Number(amount))) return '0.00';
        return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const toTitleCase = (str) => {
        if (!str) return '';
        return str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    };

    // Dialog controls
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [customSvcDialogOpen, setCustomSvcDialogOpen] = useState(false);
    const [authCode, setAuthCode] = useState('');

    // SMS dialog states
    const [smsDialogOpen, setSmsDialogOpen] = useState(false);
    const [smsSelectedTemplate, setSmsSelectedTemplate] = useState('created');
    const [smsMessageText, setSmsMessageText] = useState('');
    const [smsSending, setSmsSending] = useState(false);

    const smsTemplates = React.useMemo(() => {
        if (settings?.sms_templates) {
            try {
                return JSON.parse(settings.sms_templates);
            } catch (e) {
                console.error(e);
            }
        }
        return [
            { id: 'created', name: 'Job Card Created', template: 'Hi {CustomerName}, your vehicle job card #{JobNumber} has been created at Ratnam Service Station. Est amount: {EstAmount}.' },
            { id: 'completed', name: 'Service Completed', template: 'Hi {CustomerName}, your vehicle for job card #{JobNumber} is completed and ready for pickup. Total amount: {EstAmount}. Thank you - Ratnam Service Station.' },
            { id: 'invoiced', name: 'Invoice Generated', template: 'Dear {CustomerName}, thank you for choosing Ratnam Service Station. Invoice for job #{JobNumber} has been generated. Total paid: {PaidAmount}.' }
        ];
    }, [settings?.sms_templates]);

    const formatSMSMessage = (templateText, jc) => {
        if (!templateText || !jc) return '';
        return templateText
            .replace(/{CustomerName}/g, jc.customer_name || '')
            .replace(/{JobNumber}/g, jc.job_number || jc.id || '')
            .replace(/{EstAmount}/g, jc.final_amount || jc.total_amount || '0.00')
            .replace(/{PaidAmount}/g, jc.paid_amount || jc.invoice?.paid_amount || '0.00');
    };

    const handleSendSMS = async () => {
        if (!smsMessageText.trim()) {
            toast.error('Message content cannot be empty');
            return;
        }
        setSmsSending(true);
        try {
            const res = await api.post('/sms/send', {
                job_card_id: id,
                message: smsMessageText,
                phone_number: jobCard?.customer_phone
            });
            toast.success(res.data?.message || 'SMS sent successfully!');
            setSmsDialogOpen(false);
            queryClient.invalidateQueries(['jobCard', id]);
        } catch (e) {
            console.error(e);
            const errDetails = e.response?.data?.error || e.response?.data?.message || 'Failed to send SMS';
            toast.error(errDetails);
            queryClient.invalidateQueries(['jobCard', id]);
        } finally {
            setSmsSending(false);
        }
    };

    // Photo lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Bike lookup loading state
    const [bikeLookupLoading, setBikeLookupLoading] = useState(false);

    // Complete Job state
    const [signature, setSignature] = useState('');
    const [partsUsed, setPartsUsed] = useState([]);
    const [nextServiceKm, setNextServiceKm] = useState('');
    const [nextServiceDate, setNextServiceDate] = useState('');

    // Bike history side panel
    const [bikeHistory, setBikeHistory] = useState([]);
    const [bikeHistoryLoading, setBikeHistoryLoading] = useState(false);

    // Invoicing state
    const [paymentType, setPaymentType] = useState('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [cashTendered, setCashTendered] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [bankName, setBankName] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [discount, setDiscount] = useState(0);
    const [invoiceNotes, setInvoiceNotes] = useState('');

    // Fetch branches
    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const res = await api.get(ENDPOINTS.BRANCHES, { skipAuthToast: true });
            return res.data?.data ?? res.data ?? [];
        },
    });

    // Form setup
    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        trigger,
        getValues,
        formState: { errors },
    } = useForm({
        defaultValues: {
            branch_id: '',
            bike_number: '',
            make: '',
            model: '',
            engine_no: '',
            chassis_no: '',
            mileage: '',
            customer_name: '',
            customer_phone: '',
            customer_email: '',
            customer_town: '',
            description: '',
            mechanic_id: '',
            estimated_duration: '',
            purpose: [],
            service_type: [{ id: Date.now().toString(), name: '', price: '' }],
        },
    });

    const watchedBranchId = watch('branch_id');
    const watchedMake = watch('make');
    const watchedModel = watch('model');
    const watchedEngineNo = watch('engine_no');
    const watchedChassisNo = watch('chassis_no');

    // Custom makes input support
    const [customMake, setCustomMake] = useState('');
    const [customModel, setCustomModel] = useState('');

    // Fetch mechanics/staff for dropdown
    const { data: mechanics = [] } = useQuery({
        queryKey: ['field-staff', watchedBranchId],
        queryFn: async () => {
            const url = watchedBranchId ? `/users/field-staff?branch_id=${watchedBranchId}` : '/users/field-staff';
            const res = await api.get(url, { skipAuthToast: true });
            return res.data ?? [];
        },
    });


    // Fetch inventory items for parts auto-complete
    const { data: inventoryItems = [] } = useQuery({
        queryKey: ['inventory-items-autocomplete'],
        queryFn: async () => {
            const res = await api.get(`${ENDPOINTS.INVENTORY}?per_page=100`, { skipAuthToast: true });
            return res.data?.data || [];
        },
    });

    // Fetch single job card if edit mode
    const { data: jobCard, isLoading: jobCardLoading } = useQuery({
        queryKey: ['jobCard', id],
        queryFn: async () => {
            const res = await api.get(`${ENDPOINTS.JOB_CARDS}/${id}`);
            return res.data;
        },
        enabled: isEditMode,
    });

    const { fields: serviceFields, append: appendService, remove: removeService, replace: replaceServices } = useFieldArray({
        control,
        name: 'service_type',
    });

    const watchedServices = watch('service_type');
    const servicesTotal = watchedServices?.reduce((sum, item) => sum + (parseFloat(item?.price) || 0), 0) || 0;

    // Reset form when editing data is loaded
    useEffect(() => {
        if (jobCard) {
            const matchedMakeObj = vehicleMakes.find(m => m.name.toLowerCase() === (jobCard.make || '').toLowerCase());
            const matchedMakeName = matchedMakeObj ? matchedMakeObj.name : 'Other';
            const matchedModelName = matchedMakeObj && matchedMakeObj.models.includes(jobCard.model) ? jobCard.model : 'Other';

            if (matchedMakeName === 'Other') {
                setCustomMake(jobCard.make || '');
            }
            if (matchedModelName === 'Other') {
                setCustomModel(jobCard.model || '');
            }

            let initialPurpose = [];
            if (jobCard.purpose) {
                initialPurpose = Array.isArray(jobCard.purpose)
                    ? jobCard.purpose
                    : jobCard.purpose.split(',').map(s => s.trim());
            }

            const mappedServices = (jobCard.service_type || []).map(svc => {
                const isCustom = customServices?.some(cs => cs.name.toUpperCase() === svc.name.toUpperCase());
                return {
                    id: svc.id || (Date.now().toString() + Math.random()),
                    name: svc.name,
                    price: svc.price,
                    isPreset: !isCustom,
                    isCustom: isCustom
                };
            });

            reset({
                branch_id: jobCard.branch_id || '',
                bike_number: (jobCard.bike_number || '').toUpperCase(),
                make: matchedMakeName,
                model: matchedModelName,
                engine_no: (jobCard.engine_no || '').toUpperCase(),
                chassis_no: (jobCard.chassis_no || '').toUpperCase(),
                mileage: jobCard.mileage || '',
                customer_name: (jobCard.customer_name || '').toUpperCase(),
                customer_phone: jobCard.customer_phone || '',
                customer_email: jobCard.customer_email || '',
                customer_town: (jobCard.customer_town || '').toUpperCase(),
                description: jobCard.description || '',
                mechanic_id: jobCard.mechanic_id || '',
                estimated_duration: jobCard.estimated_duration ? Number(jobCard.estimated_duration) : '',
                purpose: initialPurpose,
                service_type: mappedServices.length > 0 ? mappedServices : [{ id: Date.now().toString(), name: '', price: '' }],
            });

            // Load parts used from job card if they exist
            if (jobCard.parts_used && jobCard.parts_used.length > 0) {
                setPartsUsed(jobCard.parts_used.map(part => ({
                    item_id: part.item_id || part.id,
                    name: part.name,
                    quantity: part.quantity || 1,
                    price: part.price || 0
                })));
            } else {
                setPartsUsed([]);
            }

            setPaidAmount(jobCard.final_amount || '');

            // Fetch bike history for this bike in edit mode
            if (jobCard.bike_number) {
                fetchBikeHistory(jobCard.bike_number);
            }
        } else if (user) {
            reset({
                branch_id: user.branch_id || '',
                bike_number: '',
                make: '',
                model: '',
                engine_no: '',
                chassis_no: '',
                mileage: '',
                customer_name: '',
                customer_phone: '',
                customer_email: '',
                customer_town: '',
                description: '',
                mechanic_id: '',
                estimated_duration: '',
                purpose: [],
                service_type: [{ id: Date.now().toString(), name: '', price: '' }],
            });
            setPartsUsed([]);
        }
    }, [jobCard, user, reset, vehicleMakes]);

    useEffect(() => {
        if (invoiceDialogOpen && jobCard) {
            const total = jobCard.total_amount || 0;
            const disc = parseFloat(discount) || 0;
            setPaidAmount(Math.max(0, total - disc).toString());
        }
    }, [discount, invoiceDialogOpen, jobCard]);

    const isReadOnly = jobCard?.status === 'invoiced' || isViewMode;
    const isInvoiced = jobCard?.status === 'invoiced';

    // Mutations
    const createJobCardMutation = useMutation({
        mutationFn: (data) => api.post(ENDPOINTS.JOB_CARDS, data),
        onSuccess: (res) => {
            toast.success('Job Card created successfully!');
            queryClient.invalidateQueries(['jobCards']);
            // Redirect back to job cards list
            navigate('/job-cards');
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create Job Card';
            toast.error(errorMsg);
        },
    });

    const updateJobCardMutation = useMutation({
        mutationFn: (data) => api.put(`${ENDPOINTS.JOB_CARDS}/${id}`, data),
        onSuccess: () => {
            toast.success('Job Card updated successfully!');
            queryClient.invalidateQueries(['jobCards']);
            navigate('/job-cards');
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to update Job Card';
            toast.error(errorMsg);
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ newStatus, deliveryStatus, payload }) => {
            const body = { ...payload, status: newStatus };
            if (deliveryStatus !== undefined) {
                body.delivery_status = deliveryStatus;
            }
            return api.put(`${ENDPOINTS.JOB_CARDS}/${id}`, body);
        },
        onSuccess: () => {
            toast.success('Status updated!');
            queryClient.invalidateQueries(['jobCard', id]);
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to update status';
            toast.error(errorMsg);
        },
    });

    const cancelInvoiceMutation = useMutation({
        mutationFn: (data) => api.post(`/invoices/${jobCard?.invoice?.id}/cancel`, data),
        onSuccess: () => {
            toast.success('Invoice cancelled successfully!');
            setCancelDialogOpen(false);
            setAuthCode('');
            queryClient.invalidateQueries(['jobCard', id]);
            queryClient.invalidateQueries(['jobCards']);
        },
        onError: (err) => {
            const msg = err.response?.data?.error || 'Invalid authorization code';
            toast.error(msg);
        }
    });

    const completeJobMutation = useMutation({
        mutationFn: (data) => api.post(`/job-cards/${id}/complete`, data),
        onSuccess: () => {
            toast.success('Job completed successfully!');
            setCompleteDialogOpen(false);
            queryClient.invalidateQueries(['jobCard', id]);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to complete job'),
    });

    const convertToInvoiceMutation = useMutation({
        mutationFn: (data) => api.post(`/job-cards/${id}/convert-to-invoice`, data),
        onSuccess: () => {
            toast.success('Invoiced successfully!');
            setInvoiceDialogOpen(false);
            queryClient.invalidateQueries(['jobCard', id]);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to invoice'),
    });

    const removeImageMutation = useMutation({
        mutationFn: (imagePath) => api.delete(`/job-cards/${id}/remove-image`, { data: { image_path: imagePath } }),
        onSuccess: () => {
            toast.success('Image removed successfully');
            queryClient.invalidateQueries(['jobCard', id]);
        },
        onError: () => toast.error('Failed to remove image'),
    });

    const handleUploadImages = async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('images[]', files[i]);
        }
        try {
            await api.post(`/job-cards/${id}/upload-images`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Images uploaded successfully');
            queryClient.invalidateQueries(['jobCard', id]);
        } catch (err) {
            toast.error('Failed to upload images');
        }
    };

    const getPayload = (data) => {
        return {
            ...data,
            bike_number: (data.bike_number || '').toUpperCase().trim(),
            make: data.make === 'Other' ? customMake.toUpperCase().trim() : data.make,
            model: data.model === 'Other' ? customModel.toUpperCase().trim() : data.model,
            engine_no: (data.engine_no || '').toUpperCase().trim(),
            chassis_no: (data.chassis_no || '').toUpperCase().trim(),
            customer_name: (data.customer_name || '').toUpperCase().trim(),
            service_type: (data.service_type || []).map(item => ({
                id: item.id || Date.now().toString(),
                name: item.name,
                price: parseFloat(item.price) || 0,
            })),
            parts_used: partsUsed.length > 0 ? partsUsed : null,
        };
    };

    const onSubmit = (data) => {
        if (isInvoiced) {
            toast.error('Cannot modify an invoiced Job Card.');
            return;
        }
        const payload = getPayload(data);
        if (!isEditMode) {
            delete payload.id;
            delete payload.job_number;
            delete payload.created_at;
            delete payload.updated_at;
            delete payload.prepared_by;
        }
        if (isEditMode) {
            updateJobCardMutation.mutate(payload);
        } else {
            createJobCardMutation.mutate(payload);
        }
    };

    // Parts handling
    const addPartRow = () => {
        setPartsUsed([...partsUsed, { item_id: '', name: '', quantity: 1, price: 0 }]);
    };

    const removePartRow = (index) => {
        setPartsUsed(partsUsed.filter((_, idx) => idx !== index));
    };

    const updatePartRow = (index, field, value) => {
        const updated = [...partsUsed];
        updated[index][field] = value;
        setPartsUsed(updated);
    };

    const handleCompleteJobSubmit = () => {
        if (!signature) {
            toast.error('Quality check signature is required');
            return;
        }
        completeJobMutation.mutate({
            quality_check_signature: signature,
            next_service_km: nextServiceKm ? parseInt(nextServiceKm) : undefined,
            next_service_date: nextServiceDate || undefined,
            parts_used: partsUsed.map(p => ({
                item_id: p.item_id,
                quantity: parseInt(p.quantity) || 1,
            })),
        });
    };

    const handleInvoiceSubmit = () => {
        const totalAmount = jobCard?.total_amount || 0;
        const discountAmt = parseFloat(discount) || 0;
        const finalAmount = Math.max(0, totalAmount - discountAmt);
        const payload = {
            payment_type: paymentType,
            paid_amount: parseFloat(paidAmount) || 0,
            discount: discountAmt,
            tax: 0,
            notes: invoiceNotes,
        };

        if (paymentType === 'cash') {
            payload.cash_given = parseFloat(cashTendered) || 0;
        } else if (paymentType === 'credit_card') {
            payload.card_number = cardNumber;
            payload.card_holder_name = cardHolder;
        } else if (paymentType === 'bank_transfer') {
            payload.bank_name = bankName;
        } else if (paymentType === 'cheque') {
            payload.cheque_number = chequeNumber;
            payload.cheque_date = chequeDate;
        }

        convertToInvoiceMutation.mutate(payload);
    };

    // Bike history fetch helper
    const fetchBikeHistory = async (bikeNumber) => {
        if (!bikeNumber || bikeNumber.trim().length < 3) return;
        setBikeHistoryLoading(true);
        try {
            const res = await api.get(`/job-cards/bike-history/${encodeURIComponent(bikeNumber.trim())}`, { skipAuthToast: true });
            setBikeHistory(res.data || []);
        } catch {
            setBikeHistory([]);
        } finally {
            setBikeHistoryLoading(false);
        }
    };

    // Fix 7: Bike number lookup — auto-populate bike & customer from last job card
    const handleBikeNumberBlur = async (bikeNumber) => {
        if (!bikeNumber || bikeNumber.trim().length < 3 || isEditMode) return;
        setBikeLookupLoading(true);
        // Also fetch bike history for the side panel
        fetchBikeHistory(bikeNumber);
        try {
            const res = await api.get(`/job-cards?bike_number=${encodeURIComponent(bikeNumber.trim())}&per_page=1`, { skipAuthToast: true });
            const existing = res.data?.data?.[0];
            if (existing) {
                // Auto-populate bike details
                const matchedMakeObj = vehicleMakes.find(m => m.name.toLowerCase() === (existing.make || '').toLowerCase());
                const matchedMakeName = matchedMakeObj ? matchedMakeObj.name : 'Other';
                const matchedModelName = matchedMakeObj && matchedMakeObj.models.includes(existing.model) ? existing.model : 'Other';

                setValue('make', matchedMakeName);
                setValue('model', matchedModelName);
                if (matchedMakeName === 'Other') setCustomMake(existing.make || '');
                if (matchedModelName === 'Other') setCustomModel(existing.model || '');
                if (existing.engine_no) setValue('engine_no', existing.engine_no.toUpperCase());
                if (existing.chassis_no) setValue('chassis_no', existing.chassis_no.toUpperCase());

                // Auto-populate customer info
                if (existing.customer_name) setValue('customer_name', existing.customer_name.toUpperCase());
                if (existing.customer_phone) setValue('customer_phone', existing.customer_phone);
                if (existing.customer_email) setValue('customer_email', existing.customer_email);
                if (existing.customer_town) setValue('customer_town', existing.customer_town.toUpperCase());

                toast.success(`Bike found! Details auto-filled from Job #${existing.job_number}`, { duration: 4000 });
            }
        } catch (err) {
            // Silently ignore — no existing record is fine
        } finally {
            setBikeLookupLoading(false);
        }
    };

    const [printAnchorEl, setPrintAnchorEl] = useState(null);
    const handlePrintOption = (selectedFormat) => {
        setPrintAnchorEl(null);
        window.open(`/job-cards/${id}/print?format=${selectedFormat}`, '_blank');
    };

    const handleOpenCompleteDialog = () => {
        const currentMileage = watch('mileage') || jobCard?.mileage || 0;
        const currentMileageNum = parseInt(currentMileage);
        if (!isNaN(currentMileageNum) && currentMileageNum > 0) {
            setNextServiceKm((currentMileageNum + 3000).toString());
        } else {
            setNextServiceKm('');
        }

        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setNextServiceDate(`${yyyy}-${mm}-${dd}`);

        if (jobCard?.quality_check_signature) {
            setSignature(jobCard.quality_check_signature.toUpperCase());
        } else {
            setSignature('');
        }

        setCompleteDialogOpen(true);
    };

    if (isEditMode && jobCardLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            {/* Header controls */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/job-cards')} variant="outlined" sx={{ borderRadius: '8px' }}>
                    {t('common.back') || 'Back'}
                </Button>
                <Box display="flex" gap={1.5}>
                    {isEditMode && (
                        <>
                            <Button
                                startIcon={<PrintIcon />}
                                endIcon={<ExpandMoreIcon />}
                                variant="outlined"
                                onClick={(e) => setPrintAnchorEl(e.currentTarget)}
                                sx={{ borderRadius: '8px', fontWeight: 600 }}
                            >
                                {t('jobCard.print') || 'Print'}
                            </Button>
                            <Menu
                                anchorEl={printAnchorEl}
                                open={Boolean(printAnchorEl)}
                                onClose={() => setPrintAnchorEl(null)}
                                PaperProps={{ sx: { borderRadius: '12px', minWidth: 220, boxShadow: 4 } }}
                            >
                                <MenuItem onClick={() => handlePrintOption('a4')}>
                                    <ListItemIcon><A4Icon fontSize="small" color="primary" /></ListItemIcon>
                                    <ListItemText primary="A4 Standard Sheet" secondary="Laser / Inkjet full page" />
                                </MenuItem>
                                <MenuItem onClick={() => handlePrintOption('thermal')}>
                                    <ListItemIcon><ThermalIcon fontSize="small" color="warning" /></ListItemIcon>
                                    <ListItemText primary="Thermal POS Receipt" secondary="80mm / 58mm roll" />
                                </MenuItem>
                                <MenuItem onClick={() => handlePrintOption('dotmatrix')}>
                                    <ListItemIcon><DotMatrixIcon fontSize="small" color="secondary" /></ListItemIcon>
                                    <ListItemText primary="Dot Matrix Printing" secondary="Continuous impact stationery" />
                                </MenuItem>
                            </Menu>
                            <Button
                                startIcon={<SmsIcon />}
                                variant="outlined"
                                onClick={() => {
                                    setSmsMessageText(formatSMSMessage(
                                        smsTemplates[0]?.template || '',
                                        jobCard
                                    ));
                                    setSmsDialogOpen(true);
                                }}
                                sx={{ borderRadius: '8px' }}
                            >
                                SMS
                            </Button>
                            {!['completed', 'invoiced', 'cancelled'].includes(jobCard?.status) ? (
                                <Button
                                    startIcon={<CheckCircleIcon />}
                                    variant="contained"
                                    color="success"
                                    onClick={handleOpenCompleteDialog}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    {t('jobCard.complete') || 'Complete Job'}
                                </Button>
                            ) : null}
                            {jobCard?.status === 'completed' && (
                                <Button
                                    startIcon={<InvoiceIcon />}
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setInvoiceDialogOpen(true)}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    {t('jobCard.convertToInvoice') || 'Convert to Invoice'}
                                </Button>
                            )}
                            {jobCard?.status === 'invoiced' && (
                                <Button
                                    startIcon={<CancelIcon />}
                                    variant="contained"
                                    color="error"
                                    onClick={() => setCancelDialogOpen(true)}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    Cancel Invoice
                                </Button>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Main Form Fields */}
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 4, borderRadius: '16px' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
                            {isViewMode ? `${t('jobCard.view') || 'View Job Card'}: ${jobCard?.job_number}` : isEditMode ? `${t('jobCard.edit') || 'Edit Job Card'}: ${jobCard?.job_number}` : `${t('jobCard.new') || 'New Job Card'}`}
                        </Typography>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={3}>
                                {/* Branch */}
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="branch_id"
                                        control={control}
                                        rules={{ required: 'Branch is required' }}
                                        render={({ field }) => (
                                            <FormControl required fullWidth error={!!errors.branch_id}>
                                                <InputLabel>{t('settings.branches') || 'Branch'}</InputLabel>
                                                <Select 
                                                    {...field} 
                                                    label={t('settings.branches') || 'Branch'} 
                                                    disabled={isEditMode || isReadOnly}
                                                    value={field.value || ''}
                                                >
                                                    {branches.map((b) => (
                                                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                </Grid>

                                {/* Mechanic */}
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="mechanic_id"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel>{t('jobCard.selectMechanic') || 'Assign Mechanic'}</InputLabel>
                                                <Select 
                                                    {...field} 
                                                    label={t('jobCard.mechanic') || 'Assigned Mechanic'} 
                                                    disabled={isInvoiced || isViewMode}
                                                    value={field.value || ''}
                                                >
                                                    <MenuItem value="">{t('common.noData') || 'Unassigned'}</MenuItem>
                                                    {field.value && !mechanics.some(m => m.id === field.value) && (
                                                        <MenuItem value={field.value}>{t('jobCard.unknownMechanic') || 'Unknown'} ({field.value})</MenuItem>
                                                    )}
                                                    {mechanics.map((m) => (
                                                        <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                </Grid>

                                {/* Vehicle Information - Bike Details */}
                                <Grid item xs={12}><Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>Bike Details</Typography></Grid>
                                
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="bike_number"
                                        control={control}
                                        rules={{ required: 'Bike number is required' }}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                required
                                                fullWidth
                                                label={t('jobCard.bikeVehicleNumber') || 'Bike / Vehicle Number'}
                                                disabled={isInvoiced || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    handleBikeNumberBlur(e.target.value);
                                                }}
                                                error={!!errors.bike_number}
                                                helperText={bikeLookupLoading ? '🔍 Looking up bike...' : errors.bike_number ? 'Bike number is required' : !isEditMode ? 'Leave field to auto-fill if bike is known' : ''}
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                                inputProps={{
                                                    maxLength: 10,
                                                    style: { textTransform: 'uppercase' }
                                                }}
                                                InputProps={{
                                                    endAdornment: bikeLookupLoading ? (
                                                        <InputAdornment position="end">
                                                            <CircularProgress size={16} />
                                                        </InputAdornment>
                                                    ) : undefined,
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                {/* Make - Using Autocomplete for keyboard support */}
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="make"
                                        control={control}
                                        rules={{ required: 'Make is required' }}
                                        render={({ field }) => (
                                            <Autocomplete
                                                {...field}
                                                options={vehicleMakes.map(m => m.name)}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => {
                                                    field.onChange(newValue);
                                                    setValue('model', '');
                                                }}
                                                disabled={isInvoiced || isViewMode}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        required
                                                        label={t('jobCard.makeBrand') || 'Make / Brand'}
                                                        error={!!errors.make}
                                                        helperText={errors.make?.message}
                                                        InputLabelProps={{
                                                            shrink: true,
                                                        }}
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            style: { textTransform: 'uppercase' }
                                                        }}
                                                    />
                                                )}
                                                freeSolo={false}
                                                autoHighlight
                                                blurOnSelect
                                                isOptionEqualToValue={(option, value) => option === value}
                                            />
                                        )}
                                    />
                                </Grid>

                                {/* Model - Using Autocomplete for keyboard support */}
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="model"
                                        control={control}
                                        rules={{ required: 'Model is required' }}
                                        render={({ field }) => {
                                            const makeObj = vehicleMakes.find(m => m.name === watchedMake);
                                            const models = makeObj ? makeObj.models : ['Other'];
                                            return (
                                                <Autocomplete
                                                    {...field}
                                                    options={models}
                                                    value={field.value || ''}
                                                    onChange={(_, newValue) => {
                                                        field.onChange(newValue);
                                                    }}
                                                    disabled={!watchedMake || isInvoiced || isViewMode}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            required
                                                            label={t('jobCard.model') || 'Model'}
                                                            error={!!errors.model}
                                                            helperText={errors.model?.message}
                                                            InputLabelProps={{
                                                                shrink: true,
                                                            }}
                                                            inputProps={{
                                                                ...params.inputProps,
                                                                style: { textTransform: 'uppercase' }
                                                            }}
                                                        />
                                                    )}
                                                    freeSolo={false}
                                                    autoHighlight
                                                    blurOnSelect
                                                    isOptionEqualToValue={(option, value) => option === value}
                                                />
                                            );
                                        }}
                                    />
                                </Grid>

                                {watchedMake === 'Other' && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label={t('jobCard.customMake') || 'Custom Make'}
                                            value={customMake}
                                            disabled={isInvoiced || isViewMode}
                                            onChange={(e) => setCustomMake(e.target.value.toUpperCase())}
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                            inputProps={{ style: { textTransform: 'uppercase' } }}
                                            required
                                        />
                                    </Grid>
                                )}

                                {(watchedModel === 'Other' || watchedMake === 'Other') && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label={t('jobCard.customModel') || 'Custom Model Name'}
                                            value={customModel}
                                            disabled={isInvoiced || isViewMode}
                                            onChange={(e) => setCustomModel(e.target.value.toUpperCase())}
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                            inputProps={{ style: { textTransform: 'uppercase' } }}
                                            required
                                        />
                                    </Grid>
                                )}

                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="engine_no"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label={t('jobCard.engineNo') || 'Engine No.'}
                                                disabled={isInvoiced || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                                inputProps={{
                                                    style: { textTransform: 'uppercase' }
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="chassis_no"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label={t('jobCard.chassisNo') || 'Chassis No.'}
                                                disabled={isInvoiced || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                                inputProps={{
                                                    style: { textTransform: 'uppercase' }
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="mileage"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label={t('jobCard.currentMileage') || 'Current Mileage'}
                                                type="number"
                                                disabled={isInvoiced || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                {/* Vehicle Decoder Display */}
                                {(watchedEngineNo || watchedChassisNo) && (
                                    <Grid item xs={12}>
                                        <Accordion variant="outlined" sx={{ borderRadius: '12px', '&:before': { display: 'none' }, borderStyle: 'dashed', bgcolor: 'action.hover' }}>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    🏍️ Vehicle Decoder Results
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ pt: 0, pb: 2, px: 2.5 }}>
                                                <Grid container spacing={2}>
                                                    {watchedChassisNo && (
                                                        <Grid item xs={12} md={6}>
                                                            <Card variant="outlined" sx={{ borderRadius: '8px', height: '100%' }}>
                                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
                                                                        CHASSIS / VIN DECODE
                                                                    </Typography>
                                                                    {(() => {
                                                                        const res = decodeHondaChassis(watchedChassisNo);
                                                                        if (!res.valid) {
                                                                            return <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>{res.error}</Typography>;
                                                                        }
                                                                        return (
                                                                            <>
                                                                                <Table size="small" sx={{ mt: 1, '& td': { border: 0, py: 0.25 } }}>
                                                                                    <TableBody>
                                                                                        {res.fields.filter(f => f.value).map((f, i) => (
                                                                                            <TableRow key={i}>
                                                                                                <TableCell sx={{ pl: 0, fontWeight: 700, width: '40%' }}>{f.label}</TableCell>
                                                                                                <TableCell sx={{ pr: 0 }}>
                                                                                                    {f.value !== undefined && f.value !== '' ? (
                                                                                                        <span>
                                                                                                            <strong>{f.value}</strong> {f.description && f.description !== f.value ? `(${f.description})` : ''}
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        f.description
                                                                                                    )}
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        ))}
                                                                                    </TableBody>
                                                                                </Table>
                                                                                {res.service_notes && res.service_notes.length > 0 && (
                                                                                    <Box sx={{ mt: 1.5, p: 1, borderRadius: '6px', bgcolor: 'info.light', color: 'info.dark', opacity: 0.9 }}>
                                                                                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Recommended Service Notes:</Typography>
                                                                                        {res.service_notes.map((note, index) => (
                                                                                            <Typography key={index} variant="caption" sx={{ display: 'block' }}>• {note}</Typography>
                                                                                        ))}
                                                                                    </Box>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </CardContent>
                                                            </Card>
                                                        </Grid>
                                                    )}

                                                    {watchedEngineNo && (
                                                        <Grid item xs={12} md={6}>
                                                            <Card variant="outlined" sx={{ borderRadius: '8px', height: '100%' }}>
                                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
                                                                        ENGINE NUMBER DECODE
                                                                    </Typography>
                                                                    {(() => {
                                                                        const res = decodeHondaEngine(watchedEngineNo);
                                                                        if (!res.valid) {
                                                                            return <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>{res.error}</Typography>;
                                                                        }
                                                                        return (
                                                                            <Table size="small" sx={{ mt: 1, '& td': { border: 0, py: 0.25 } }}>
                                                                                <TableBody>
                                                                                    {res.fields.map((f, i) => (
                                                                                        <TableRow key={i}>
                                                                                            <TableCell sx={{ pl: 0, fontWeight: 700, width: '40%' }}>{f.label}</TableCell>
                                                                                            <TableCell sx={{ pr: 0 }}>
                                                                                                {f.value !== undefined && f.value !== '' ? (
                                                                                                    <span>
                                                                                                        <strong>{f.value}</strong> {f.description && f.description !== f.value ? `(${f.description})` : ''}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    f.description
                                                                                                )}
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    ))}
                                                                                </TableBody>
                                                                            </Table>
                                                                        );
                                                                    })()}
                                                                </CardContent>
                                                            </Card>
                                                        </Grid>
                                                    )}
                                                </Grid>
                                            </AccordionDetails>
                                        </Accordion>
                                    </Grid>
                                )}

                                {/* Customer Details */}
                                <Grid item xs={12}><Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>{t('jobCard.customerInfo') || 'Customer Information'}</Typography></Grid>
                                
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="customer_name"
                                        control={control}
                                        rules={{ required: 'Customer name is required' }}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                required
                                                fullWidth
                                                label={t('jobCard.customerName') || 'Customer Name'}
                                                disabled={isReadOnly || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                error={!!errors.customer_name}
                                                helperText={errors.customer_name ? 'Customer name is required' : ''}
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ style: { textTransform: 'uppercase' } }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="customer_phone"
                                        control={control}
                                        rules={{ required: 'Phone is required' }}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                required
                                                fullWidth
                                                label={t('jobCard.customerPhone') || 'Customer Phone'}
                                                disabled={isReadOnly || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    field.onChange(formatSriLankanPhone(e.target.value));
                                                }}
                                                error={!!errors.customer_phone}
                                                helperText={errors.customer_phone ? 'Phone is required' : ''}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="customer_town"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label={t('jobCard.customerTown') || 'Town / Area'}
                                                disabled={isReadOnly || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={12}>
                                    <Controller
                                        name="customer_email"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label={t('jobCard.customerEmail') || 'Customer Email'}
                                                type="email"
                                                disabled={isReadOnly || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Divider sx={{ my: 2 }} />
                                    <Grid container spacing={3}>
                                        {/* Left Side: Purpose of Service */}
                                        <Grid item xs={12} md={5}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                                {t('jobCard.purposeOfService') || 'Purpose of Service'} <span style={{ color: '#ef4444' }}>*</span>
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                                {t('jobCard.purposeDesc') || 'Select the main reasons for this visit. Suggested services will be added automatically.'}
                                            </Typography>
                                            <Controller
                                                name="purpose"
                                                control={control}
                                                rules={{ validate: (value) => (value && value.length > 0) || t('jobCard.purposeRequired') || 'Purpose of service is required' }}
                                                render={({ field }) => {
                                                    const options = Object.keys(servicePurposeMap || {});
                                                    if (options.length === 0) options.push("Free Service", "Full Service", "Accident", "Repair", "Other");
                                                    const currentSelections = field.value || [];
                                                    currentSelections.forEach(p => {
                                                        if (p && !options.includes(p)) {
                                                            options.push(p);
                                                        }
                                                    });
                                                    const selectedPurpose = currentSelections[0] || '';
                                                    const handleRadioChange = (e) => {
                                                        const opt = e.target.value;
                                                        field.onChange([opt]);
                                                        replaceServices([]);
                                                    };
                                                    return (
                                                        <Box>
                                                            <RadioGroup row value={selectedPurpose} onChange={handleRadioChange}>
                                                                {options.map((opt) => (
                                                                    <FormControlLabel
                                                                        key={opt}
                                                                        value={opt}
                                                                        control={<Radio disabled={isInvoiced || isViewMode} />}
                                                                        label={(() => {
                                                                            const key = `jobCard.purposeOptions.${opt.replace(/\s+/g, '')}`;
                                                                            return t(key) === key ? opt : t(key);
                                                                        })()}
                                                                    />
                                                                ))}
                                                            </RadioGroup>
                                                            {errors.purpose && (
                                                                <FormHelperText error sx={{ mt: 1, fontWeight: 600 }}>
                                                                    {errors.purpose.message}
                                                                </FormHelperText>
                                                            )}
                                                            {selectedPurpose && servicePurposeMap[selectedPurpose] && servicePurposeMap[selectedPurpose].length > 0 && (
                                                                <Box sx={{ mt: 2 }}>
                                                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                                                                        {t('jobCard.selectServices') || 'Select Services:'}
                                                                    </Typography>
                                                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                                                                        {servicePurposeMap[selectedPurpose].map((svc) => {
                                                                            const isSelected = serviceFields.some(f => f.name === svc.name);
                                                                            const handleToggle = () => {
                                                                                if (isSelected) {
                                                                                    const index = serviceFields.findIndex(f => f.name === svc.name);
                                                                                    if (index !== -1) removeService(index);
                                                                                } else {
                                                                                    appendService({ id: Date.now().toString() + Math.random(), name: svc.name, price: svc.price, isPreset: true });
                                                                                }
                                                                            };
                                                                            return (
                                                                                <Chip
                                                                                    key={svc.name}
                                                                                    label={`${svc.name} (${currencySymbol}${formatAmount(svc.price)})`}
                                                                                    clickable
                                                                                    color={isSelected ? "primary" : "default"}
                                                                                    variant={isSelected ? "filled" : "outlined"}
                                                                                    onClick={handleToggle}
                                                                                    disabled={isInvoiced || isViewMode}
                                                                                    sx={{ borderRadius: '8px' }}
                                                                                />
                                                                            );
                                                                        })}
                                                                    </Stack>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    );
                                                }}
                                            />
                                        </Grid>

                                        {/* Right Side: Requested Services */}
                                        <Grid item xs={12} md={7}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('jobCard.requestedServices') || 'Requested Services'}</Typography>
                                                {!isInvoiced && !isViewMode && (
                                                    <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setCustomSvcDialogOpen(true)}>
                                                        {t('jobCard.addCustomService') || 'Add Custom Service'}
                                                    </Button>
                                                )}
                                            </Box>
                                            {serviceFields.map((field, index) => {
                                                const isPreset = field.isPreset;
                                                return (
                                                    <Grid container spacing={2} key={field.id} sx={{ mb: 1.5 }} alignItems="center">
                                                        <Grid item xs={7}>
                                                            <Controller
                                                                name={`service_type.${index}.name`}
                                                                control={control}
                                                                rules={{ required: true }}
                                                                render={({ field: autocompleteField }) => (
                                                                    <TextField
                                                                        {...autocompleteField}
                                                                        fullWidth
                                                                        size="small"
                                                                        label={t('jobCard.serviceDescription') || 'Service Description'}
                                                                        disabled={true}
                                                                        value={autocompleteField.value || ''}
                                                                        onChange={(e) => autocompleteField.onChange(e.target.value)}
                                                                        InputLabelProps={{
                                                                            shrink: true,
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={4}>
                                                            <Controller
                                                                name={`service_type.${index}.price`}
                                                                control={control}
                                                                rules={{ required: true }}
                                                                render={({ field: priceField }) => (
                                                                    <TextField
                                                                        {...priceField}
                                                                        fullWidth
                                                                        size="small"
                                                                        label={t('jobCard.price') || 'Price'}
                                                                        type="number"
                                                                        disabled={isViewMode || isInvoiced || (field.isPreset && !field.isCustom)}
                                                                        value={priceField.value || ''}
                                                                        onChange={(e) => priceField.onChange(e.target.value)}
                                                                        InputProps={{
                                                                            startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                                                                            inputProps: { style: { textAlign: 'right' } }
                                                                        }}
                                                                        InputLabelProps={{
                                                                            shrink: true,
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                        </Grid>
                                                        {!isViewMode && (
                                                            <Grid item xs={1}>
                                                                <IconButton color="error" onClick={() => removeService(index)} disabled={serviceFields.length === 1 || isReadOnly}>
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </Grid>
                                                        )}
                                                    </Grid>
                                                );
                                            })}
                                            <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                                    {t('jobCard.servicesSubtotal') || 'Services Subtotal:'} {currencySymbol} {formatAmount(servicesTotal)}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Grid>

                                {/* Parts Used Section */}
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 2 }} />
                                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('jobCard.partsUsedHeader') || 'Parts Used'}</Typography>
                                        {!isInvoiced && !isViewMode && (
                                            <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={addPartRow}>
                                                {t('jobCard.addPart') || 'Add Part'}
                                            </Button>
                                        )}
                                    </Box>
                                    {partsUsed.map((row, idx) => (
                                        <Grid container spacing={2} key={idx} sx={{ mb: 1.5 }} alignItems="center">
                                            <Grid item xs={12} sm={6}>
                                                <Autocomplete
                                                    options={inventoryItems}
                                                    disabled={isInvoiced || isViewMode}
                                                    getOptionLabel={(option) => `${option.name} (${option.item_code}) - Stock: ${option.current_stock}`}
                                                    value={inventoryItems.find(i => i.id === row.item_id) || null}
                                                    onChange={(e, val) => {
                                                        updatePartRow(idx, 'item_id', val?.id || '');
                                                        updatePartRow(idx, 'name', val?.name || '');
                                                        updatePartRow(idx, 'price', val?.selling_price || 0);
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField 
                                                            {...params} 
                                                            size="small" 
                                                            label={t('jobCard.selectItemInventory') || 'Select Item from Inventory'}
                                                            InputLabelProps={{
                                                                shrink: true,
                                                            }}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={2}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="number"
                                                    label={t('jobCard.qty') || 'Qty'}
                                                    disabled={isInvoiced || isViewMode}
                                                    value={row.quantity}
                                                    onChange={(e) => updatePartRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                    InputLabelProps={{
                                                        shrink: true,
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={3} sx={{ textAlign: 'right' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {currencySymbol} {formatAmount(row.price * row.quantity)}
                                                </Typography>
                                            </Grid>
                                            {!isViewMode && (
                                                <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
                                                    <IconButton color="error" onClick={() => removePartRow(idx)} disabled={isInvoiced}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Grid>
                                            )}
                                        </Grid>
                                    ))}
                                    {partsUsed.length > 0 && (
                                        <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                                {t('jobCard.partsSubtotal') || 'Parts Subtotal:'} {currencySymbol} {formatAmount(partsUsed.reduce((acc, part) => acc + (part.price * part.quantity), 0))}
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid>

                                {/* Estimated Duration & Completion - Fixed to show saved value */}
                                <Grid item xs={12} sm={6}>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('jobCard.estimatedDurationTitle') || 'Estimated Duration'}</Typography>
                                    <Controller
                                        name="estimated_duration"
                                        control={control}
                                        render={({ field }) => {
                                            const calculateCompletionTime = (hours) => {
                                                if (!hours || hours === '') return '';
                                                const numHours = parseFloat(hours);
                                                if (isNaN(numHours)) return '';
                                                const now = new Date();
                                                now.setMinutes(now.getMinutes() + (numHours * 60));
                                                return now.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                                            };
                                            
                                            return (
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Duration (Hours)</InputLabel>
                                                    <Select
                                                        {...field}
                                                        value={field.value !== undefined && field.value !== null && field.value !== '' ? Number(field.value) : ''}
                                                        label={t('jobCard.durationHours') || 'Duration (Hours)'}
                                                        disabled={isInvoiced || isViewMode}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value);
                                                        }}
                                                    >
                                                        <MenuItem value="">Select Duration</MenuItem>
                                                        <MenuItem value={0.5}>0.5 Hours (30 mins)</MenuItem>
                                                        <MenuItem value={1}>1.0 Hour</MenuItem>
                                                        <MenuItem value={1.5}>1.5 Hours</MenuItem>
                                                        <MenuItem value={2}>2.0 Hours</MenuItem>
                                                        <MenuItem value={2.5}>2.5 Hours</MenuItem>
                                                        <MenuItem value={3}>3.0 Hours</MenuItem>
                                                        <MenuItem value={4}>4.0 Hours</MenuItem>
                                                        <MenuItem value={8}>8.0 Hours (Full Day)</MenuItem>
                                                        <MenuItem value={48}>2 Days</MenuItem>
                                                        <MenuItem value={72}>3 Days</MenuItem>
                                                        <MenuItem value={120}>5 Days</MenuItem>
                                                        <MenuItem value={168}>1 Week</MenuItem>
                                                    </Select>
                                                    {field.value && field.value !== '' && (
                                                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, ml: 1, fontWeight: 'bold' }}>
                                                            Estimated Completion Time: {calculateCompletionTime(field.value)}
                                                        </Typography>
                                                    )}
                                                </FormControl>
                                            );
                                        }}
                                    />
                                </Grid>

                                {/* Grand Total Section - Changed to "Estimate Grand Total" */}
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 2 }} />
                                    <Box display="flex" justifyContent="flex-end" alignItems="center" sx={{ bgcolor: 'action.hover', p: 2, borderRadius: '8px' }}>
                                        <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                            {t('jobCard.estimateGrandTotal') || 'Estimate Grand Total:'} {currencySymbol} {formatAmount(servicesTotal + partsUsed.reduce((acc, part) => acc + (part.price * part.quantity), 0))}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <Divider sx={{ my: 2 }} />
                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label={t('jobCard.troubleDescription') || 'Trouble Description / Job Notes'}
                                                multiline
                                                rows={3}
                                                disabled={isInvoiced || isViewMode}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                {/* Action Buttons */}
                                <Grid item xs={12}>
                                    <Box display="flex" gap={2} sx={{ mt: 2 }}>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            startIcon={<SaveIcon />}
                                            size="large"
                                            disabled={isReadOnly}
                                            sx={{ borderRadius: '8px', display: isViewMode ? 'none' : 'flex' }}
                                        >
                                            {t('jobCard.saveJobCard') || 'Save Job Card'}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            size="large"
                                            onClick={() => navigate('/job-cards')}
                                            sx={{ borderRadius: '8px' }}
                                        >
                                            {t('common.close') || 'Close'}
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </form>
                    </Paper>
                </Grid>

                {/* Sidebar Info/Status Details */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={3}>
                        {/* Status Card */}
                        {isEditMode && (
                            <Card sx={{ borderRadius: '16px' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        {t('jobCard.jobCardStatus') || 'JOB CARD STATUS'}
                                    </Typography>
                                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                        <Select
                                            value={jobCard?.status || 'received'}
                                            onChange={async (e) => {
                                                const isValid = await trigger();
                                                if (!isValid) {
                                                    toast.error('Please fix validation errors before changing status.');
                                                    return;
                                                }
                                                const currentFormData = getValues();
                                                const payload = getPayload(currentFormData);
                                                updateStatusMutation.mutate({ newStatus: e.target.value, payload });
                                            }}
                                            disabled={updateStatusMutation.isLoading || isInvoiced}
                                            sx={{
                                                fontWeight: 800,
                                                borderRadius: '8px',
                                                bgcolor: jobCard?.status === 'invoiced' ? 'primary.light'
                                                    : jobCard?.status === 'completed' ? 'success.light'
                                                        : jobCard?.status === 'cancelled' ? 'error.light'
                                                            : jobCard?.status === 'in_progress' ? 'info.light'
                                                                : 'warning.light'
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
                                    {(jobCard?.status === 'completed' || jobCard?.status === 'invoiced') && (
                                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block', fontWeight: 700 }}>
                                                DELIVERY STATUS
                                            </Typography>
                                            <Select
                                                value={jobCard?.delivery_status || 'not_ready'}
                                                onChange={async (e) => {
                                                    updateStatusMutation.mutate({ 
                                                        newStatus: jobCard.status, 
                                                        deliveryStatus: e.target.value, 
                                                        payload: {} 
                                                    });
                                                }}
                                                disabled={updateStatusMutation.isLoading}
                                                sx={{
                                                    fontWeight: 800,
                                                    borderRadius: '8px',
                                                    bgcolor: jobCard?.delivery_status === 'delivered' ? 'success.light'
                                                        : jobCard?.delivery_status === 'ready_for_pickup' ? 'info.light'
                                                            : 'warning.light'
                                                }}
                                            >
                                                <MenuItem value="not_ready">NOT READY</MenuItem>
                                                <MenuItem value="ready_for_pickup">READY FOR PICKUP</MenuItem>
                                                <MenuItem value="delivered">DELIVERED</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                    <Divider sx={{ my: 1.5 }} />
                                    <Typography variant="body2" color="textSecondary">
                                        {t('jobCard.preparedBy') || 'Prepared By'}: <strong>{jobCard?.prepared_by?.name || 'N/A'}</strong>
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {t('jobCard.mechanic') || 'Mechanic'}: <strong>{jobCard?.mechanic?.name || t('common.unassigned') || 'Unassigned'}</strong>
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {t('jobCard.totalAmount') || 'Final Total'}: <strong>{currencySymbol} {formatAmount(jobCard?.final_amount)}</strong>
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}

                        {/* Image Upload/Gallery Card */}
                        {isEditMode && (
                            <Card sx={{ borderRadius: '16px' }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                {t('jobCard.beforeAfterImages') || 'Before/After Images'}
                                            </Typography>
                                            {jobCard?.images && jobCard.images.length > 0 && (
                                                <Typography variant="caption" color="textSecondary">
                                                    {jobCard.images.length} {jobCard.images.length !== 1 ? t('jobCard.photos') || 'photos' : t('jobCard.photo') || 'photo'} — {t('jobCard.clickToView') || 'click to view'}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Button
                                            component="label"
                                            startIcon={<PhotoCameraIcon />}
                                            size="small"
                                            variant="outlined"
                                        >
                                            {t('jobCard.upload') || 'Upload'}
                                            <input type="file" hidden multiple onChange={handleUploadImages} accept="image/*" />
                                        </Button>
                                    </Box>
                                    <Grid container spacing={1}>
                                        {jobCard?.images && jobCard.images.length > 0 ? (
                                            jobCard.images.map((path, idx) => (
                                                <Grid item xs={6} key={idx} sx={{ position: 'relative' }}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 12,
                                                            right: 4,
                                                            bgcolor: 'rgba(255, 255, 255, 0.7)',
                                                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                                                            zIndex: 2
                                                        }}
                                                        onClick={() => removeImageMutation.mutate(path)}
                                                        disabled={removeImageMutation.isLoading}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                    {/* Clickable thumbnail — opens lightbox */}
                                                    <Box
                                                        onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                                                        sx={{ cursor: 'pointer', position: 'relative', '&:hover .overlay': { opacity: 1 } }}
                                                    >
                                                        <LazyImage
                                                            src={storageUrl(path)}
                                                            sx={{
                                                                width: '100%',
                                                                height: 100,
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                border: '1px solid #ddd',
                                                                display: 'block',
                                                            }}
                                                        />
                                                        <Box className="overlay" sx={{
                                                            position: 'absolute', inset: 0, borderRadius: '8px',
                                                            bgcolor: 'rgba(0,0,0,0.35)', display: 'flex',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            opacity: 0, transition: 'opacity 0.2s',
                                                        }}>
                                                            <Visibility sx={{ color: '#fff', fontSize: 28 }} />
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            ))
                                        ) : (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
                                                    {t('jobCard.noPhotos') || 'No photos uploaded.'}
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}

                        {/* Consumed Parts Summary */}
                        {isEditMode && jobCard?.parts_used && jobCard.parts_used.length > 0 && (
                            <Card sx={{ borderRadius: '16px' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                        {t('jobCard.partsUsedHeader') || 'Parts Replaced / Used'}
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>{t('jobCard.item') || 'Item'}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{t('jobCard.qty') || 'Qty'}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{t('jobCard.price') || 'Price'}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {jobCard.parts_used.map((part, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>{part.name}</TableCell>
                                                        <TableCell align="right">{part.quantity}</TableCell>
                                                        <TableCell align="right">{currencySymbol} {formatAmount(part.price)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        )}
                        {/* Audit Log */}
                        {isEditMode && jobCard?.audits && jobCard.audits.length > 0 && (
                            <Card sx={{ borderRadius: '16px' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                        {t('jobCard.auditLog') || 'Audit Log'}
                                    </Typography>
                                    <Stack spacing={1.5} sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                                        {jobCard.audits.map((audit, idx) => {
                                            const changes = audit.changes || {};
                                            const isSmsAction = audit.action === 'sms_sent' || audit.action === 'sms_failed' || audit.action === 'SMS Sent' || audit.action === 'SMS Failed';
                                            const isSmsFailed = audit.action === 'sms_failed' || audit.action === 'SMS Failed' || changes.status === 'failed';

                                            // Build list of meaningful change lines for standard audits
                                            const changeLines = [];

                                            if (changes.status && !isSmsAction) {
                                                if (typeof changes.status === 'string') {
                                                    changeLines.push({ label: 'Status', value: changes.status.replace(/_/g, ' ').toUpperCase(), color: 'primary' });
                                                } else {
                                                    const old = changes.status.old || changes.status[0];
                                                    const nw  = changes.status.new || changes.status[1];
                                                    if (old !== undefined && nw !== undefined) {
                                                        changeLines.push({ label: 'Status', old: String(old).replace(/_/g, ' ').toUpperCase(), new: String(nw).replace(/_/g, ' ').toUpperCase(), color: 'primary' });
                                                    } else if (nw !== undefined) {
                                                        changeLines.push({ label: 'Status', value: String(nw).replace(/_/g, ' ').toUpperCase(), color: 'primary' });
                                                    }
                                                }
                                            }

                                            if (changes.delivery_status) {
                                                if (typeof changes.delivery_status === 'string') {
                                                    changeLines.push({ label: 'Delivery Status', value: changes.delivery_status.replace(/_/g, ' ').toUpperCase(), color: 'success' });
                                                } else {
                                                    const old = changes.delivery_status.old || changes.delivery_status[0];
                                                    const nw  = changes.delivery_status.new || changes.delivery_status[1];
                                                    if (old !== undefined && nw !== undefined) {
                                                        changeLines.push({ label: 'Delivery Status', old: String(old).replace(/_/g, ' ').toUpperCase(), new: String(nw).replace(/_/g, ' ').toUpperCase(), color: 'success' });
                                                    } else if (nw !== undefined) {
                                                        changeLines.push({ label: 'Delivery Status', value: String(nw).replace(/_/g, ' ').toUpperCase(), color: 'success' });
                                                    }
                                                }
                                            }

                                            if (changes.estimated_duration !== undefined) {
                                                if (typeof changes.estimated_duration !== 'object' || changes.estimated_duration === null) {
                                                    changeLines.push({ label: 'Est. Duration', value: `${changes.estimated_duration}h`, color: 'info' });
                                                } else {
                                                    const old = changes.estimated_duration.old ?? changes.estimated_duration[0];
                                                    const nw  = changes.estimated_duration.new ?? changes.estimated_duration[1];
                                                    if (old !== undefined && nw !== undefined) {
                                                        changeLines.push({ label: 'Est. Duration', old: `${old}h`, new: `${nw}h`, color: 'info' });
                                                    } else if (nw !== undefined) {
                                                        changeLines.push({ label: 'Est. Duration', value: `${nw}h`, color: 'info' });
                                                    }
                                                }
                                            }

                                            if (changes.parts_used) {
                                                const nwParts = changes.parts_used.new ?? changes.parts_used[1] ?? changes.parts_used;
                                                const count = Array.isArray(nwParts) ? nwParts.length : '?';
                                                changeLines.push({ label: 'Parts Used', value: `${count} part(s) recorded`, color: 'warning' });
                                            }

                                            if (changes.customer_name) {
                                                if (typeof changes.customer_name === 'string') {
                                                    changeLines.push({ label: 'Customer', value: changes.customer_name, color: 'default' });
                                                } else {
                                                    const nw = changes.customer_name.new ?? changes.customer_name[1];
                                                    changeLines.push({ label: 'Customer', value: String(nw || ''), color: 'default' });
                                                }
                                            }

                                            const actionColorMap = {
                                                created: 'success',
                                                updated: 'info',
                                                completed: 'success',
                                                invoiced: 'primary',
                                                cancelled: 'error',
                                                status_changed: 'warning',
                                                sms_sent: 'success',
                                                sms_failed: 'error',
                                                'SMS Sent': 'success',
                                                'SMS Failed': 'error'
                                            };
                                            const actionColor = actionColorMap[audit.action] || 'default';

                                            return (
                                                <Box key={idx} sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'action.hover', border: '1px solid', borderColor: isSmsAction ? (isSmsFailed ? 'error.light' : 'success.light') : 'divider' }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            {isSmsAction ? (
                                                                <Chip
                                                                    icon={<SmsIcon sx={{ fontSize: '13px !important' }} />}
                                                                    label={isSmsFailed ? 'SMS FAILED' : 'SMS SENT'}
                                                                    color={isSmsFailed ? 'error' : 'success'}
                                                                    size="small"
                                                                    sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                                                                />
                                                            ) : (
                                                                <Chip
                                                                    label={audit.action.replace(/_/g, ' ').toUpperCase()}
                                                                    color={actionColor}
                                                                    size="small"
                                                                    sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                                                                />
                                                            )}
                                                            <Typography variant="caption" color="textSecondary">
                                                                by <strong>{audit.user?.name || 'System'}</strong>
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {new Date(audit.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </Typography>
                                                    </Box>

                                                    {/* SMS Specific Audit Details */}
                                                    {isSmsAction && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" mb={0.5}>
                                                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                                    Recipient:
                                                                </Typography>
                                                                <Chip
                                                                    label={changes.phone || jobCard.customer_phone || 'N/A'}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ fontSize: '0.68rem', height: 18, fontWeight: 600 }}
                                                                />
                                                                {changes.provider && (
                                                                    <Chip
                                                                        label={`Gateway: ${changes.provider.toUpperCase()}`}
                                                                        size="small"
                                                                        variant="outlined"
                                                                        sx={{ fontSize: '0.65rem', height: 18 }}
                                                                    />
                                                                )}
                                                                {changes.provider_message_id && (
                                                                    <Chip
                                                                        label={`ID: ${changes.provider_message_id}`}
                                                                        size="small"
                                                                        color="info"
                                                                        variant="outlined"
                                                                        sx={{ fontSize: '0.65rem', height: 18 }}
                                                                    />
                                                                )}
                                                            </Box>

                                                            {changes.message && (
                                                                <Box sx={{ p: 1, my: 0.75, bgcolor: 'background.paper', borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
                                                                    <Typography variant="caption" sx={{ color: 'text.primary', fontStyle: 'italic', display: 'block' }}>
                                                                        "{changes.message}"
                                                                    </Typography>
                                                                </Box>
                                                            )}

                                                            {changes.error && (
                                                                <Typography variant="caption" color="error" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                                                                    ⚠️ Error: {changes.error}
                                                                </Typography>
                                                            )}

                                                            {/* Collapsible API Response Viewer */}
                                                            {changes.api_response && (
                                                                <Accordion disableGutters elevation={0} sx={{ mt: 0.75, bgcolor: 'transparent', '&:before': { display: 'none' } }}>
                                                                    <AccordionSummary
                                                                        expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                                                                        sx={{ minHeight: 22, p: 0, '& .MuiAccordionSummary-content': { my: 0 } }}
                                                                    >
                                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            🔍 View Gateway API Response
                                                                        </Typography>
                                                                    </AccordionSummary>
                                                                    <AccordionDetails sx={{ p: 1, bgcolor: '#0f172a', color: '#38bdf8', borderRadius: '6px', mt: 0.5 }}>
                                                                        <Box
                                                                            component="pre"
                                                                            sx={{
                                                                                m: 0,
                                                                                fontSize: '0.7rem',
                                                                                maxHeight: 180,
                                                                                overflowY: 'auto',
                                                                                fontFamily: 'monospace',
                                                                                whiteSpace: 'pre-wrap',
                                                                                wordBreak: 'break-all'
                                                                            }}
                                                                        >
                                                                            {typeof changes.api_response === 'object'
                                                                                ? JSON.stringify(changes.api_response, null, 2)
                                                                                : String(changes.api_response)}
                                                                        </Box>
                                                                    </AccordionDetails>
                                                                </Accordion>
                                                            )}
                                                        </Box>
                                                    )}

                                                    {/* Standard change lines */}
                                                    {!isSmsAction && changeLines.length > 0 && (
                                                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                                                            {changeLines.map((line, li) => (
                                                                <Box key={li} display="flex" alignItems="center" gap={1}>
                                                                    <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, color: 'text.secondary' }}>
                                                                        {line.label}:
                                                                    </Typography>
                                                                    {line.old !== undefined ? (
                                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                                            <Chip label={line.old} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18, textDecoration: 'line-through', opacity: 0.6 }} />
                                                                            <Typography variant="caption" color="textSecondary">→</Typography>
                                                                            <Chip label={line.new} size="small" color={line.color} sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
                                                                        </Box>
                                                                    ) : (
                                                                        <Chip label={line.value} size="small" color={line.color} sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
                                                                    )}
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </CardContent>
                            </Card>
                        )}
                        {/* Bike History Panel */}
                        {(bikeHistory.length > 0 || bikeHistoryLoading) && (
                            <Card sx={{ borderRadius: '16px' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                        🏍️ {t('jobCard.bikeHistory') || 'Bike Service History'}
                                    </Typography>
                                    {bikeHistoryLoading ? (
                                        <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
                                    ) : (
                                        <Stack spacing={1.5} sx={{ maxHeight: 360, overflowY: 'auto', pr: 1 }}>
                                            {bikeHistory.filter(h => !isEditMode || h.id !== parseInt(id)).map((h, idx) => (
                                                <Box key={idx} sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{h.job_number}</Typography>
                                                        <Chip
                                                            label={h.status?.replace(/_/g, ' ').toUpperCase()}
                                                            size="small"
                                                            color={h.status === 'invoiced' ? 'primary' : h.status === 'completed' ? 'success' : h.status === 'cancelled' ? 'error' : 'default'}
                                                            sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700 }}
                                                        />
                                                    </Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {new Date(h.created_at).toLocaleDateString()} — {currencySymbol} {formatAmount(h.total_amount)}
                                                    </Typography>
                                                    {h.service_type && h.service_type.length > 0 && (
                                                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.25 }}>
                                                            {h.service_type.map(s => s.name).join(', ')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            ))}
                                        </Stack>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                </Grid>
            </Grid>

            {/* DIALOG: COMPLETE JOB */}
            <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 800 }}>{t('jobCard.completeService') || 'Complete Service & Record Parts'}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('jobCard.qualityCheckSignature') || 'Quality Check Signature / Examiner Name'}
                                value={signature}
                                onChange={(e) => setSignature(e.target.value.toUpperCase())}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Divider><Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('jobCard.nextServiceInfo') || 'NEXT SERVICE REMINDER (Optional)'}</Typography></Divider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label={t('jobCard.nextServiceKm') || 'Next Service KM'}
                                value={nextServiceKm}
                                onChange={(e) => setNextServiceKm(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 0 }}
                                helperText={t('jobCard.nextServiceKmHint') || 'Odometer reading for next service'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label={t('jobCard.nextServiceDate') || 'Next Service Date'}
                                value={nextServiceDate}
                                onChange={(e) => setNextServiceDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                helperText={t('jobCard.nextServiceDateHint') || 'Recommended date for next service'}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setCompleteDialogOpen(false)} color="inherit">{t('common.cancel') || 'Cancel'}</Button>
                    <Button onClick={handleCompleteJobSubmit} variant="contained" color="success">
                        {t('jobCard.signAndComplete') || 'Sign & Mark Complete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG: SELECT CUSTOM SERVICES */}
            <Dialog open={customSvcDialogOpen} onClose={() => setCustomSvcDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Select Custom Services</DialogTitle>
                <DialogContent dividers>
                    {(!customServices || customServices.length === 0) ? (
                        <Typography variant="body2" color="textSecondary">No custom services defined in Settings.</Typography>
                    ) : (
                        <List>
                            {customServices.map((svc) => {
                                const isSelected = serviceFields.some(f => f.name === svc.name);
                                const handleToggle = () => {
                                    if (isSelected) {
                                        const index = serviceFields.findIndex(f => f.name === svc.name);
                                        if (index !== -1) removeService(index);
                                    } else {
                                        appendService({ id: Date.now().toString() + Math.random(), name: svc.name, price: svc.price || '', isPreset: false, isCustom: true });
                                    }
                                };
                                return (
                                    <ListItem key={svc.name} button onClick={handleToggle} sx={{ py: 0.5 }}>
                                        <Checkbox checked={isSelected} edge="start" />
                                        <ListItemText primary={svc.name} secondary={`${currencySymbol}${svc.price}`} />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCustomSvcDialogOpen(false)} variant="contained" color="primary">Done</Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG: CONVERT TO INVOICE */}
            <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 800 }}>{t('jobCard.generateInvoice') || 'Generate Customer Invoice'}</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Summary Row */}
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="textSecondary">{t('jobCard.totalAmount') || 'Total'}</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Rs. {formatAmount(jobCard?.total_amount)}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="textSecondary">{t('jobCard.discount') || 'Discount'}</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>- Rs. {formatAmount(discount)}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="textSecondary">{t('jobCard.amountDue') || 'Amount Due'}</Typography>
                                <Typography variant="h6" color="error" sx={{ fontWeight: 800 }}>
                                    Rs. {formatAmount(Math.max(0, (jobCard?.total_amount || 0) - (parseFloat(discount) || 0)))}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>{t('invoice.paymentType') || 'Payment Type'}</InputLabel>
                                <Select value={paymentType} label={t('invoice.paymentType') || 'Payment Type'} onChange={(e) => setPaymentType(e.target.value)}>
                                    <MenuItem value="cash">{t('invoice.cash') || 'Cash'}</MenuItem>
                                    <MenuItem value="credit_card">{t('invoice.creditCard') || 'Credit Card'}</MenuItem>
                                    <MenuItem value="bank_transfer">{t('invoice.bankTransfer') || 'Bank Transfer'}</MenuItem>
                                    <MenuItem value="cheque">{t('invoice.cheque') || 'Cheque'}</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                            <TextField 
                                fullWidth 
                                type="number" 
                                label={t('jobCard.discount') || `Discount (Rs.)`}
                                value={discount} 
                                onChange={(e) => setDiscount(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <TextField 
                                fullWidth 
                                type="number" 
                                label={t('jobCard.amountDue') || `Amount Due (Rs.)`}
                                value={paidAmount} 
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ readOnly: true }}
                                inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                            />
                        </Grid>

                        {paymentType === 'cash' && (
                            <>
                                <Grid item xs={12}>
                                    <TextField 
                                        fullWidth 
                                        type="number" 
                                        label={t('invoice.cashTendered') || `Cash Tendered (Rs.)`}
                                        value={cashTendered} 
                                        onChange={(e) => setCashTendered(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                                    />
                                </Grid>
                                {cashTendered && (
                                    <Grid item xs={12}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '8px', bgcolor: 'success.light', color: 'success.dark', opacity: 0.95 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Balance to be given:</Typography>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                Rs. {formatAmount((parseFloat(cashTendered) || 0) - (parseFloat(paidAmount) || 0))}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </>
                        )}

                        {paymentType === 'credit_card' && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label={t('invoice.cardNumberLast4') || 'Card Number (Last 4 digits)'} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} InputLabelProps={{ shrink: true }} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label={t('invoice.cardHolderName') || 'Card Holder Name'} value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} InputLabelProps={{ shrink: true }} />
                                </Grid>
                            </>
                        )}

                        {paymentType === 'bank_transfer' && (
                            <Grid item xs={12}>
                                <TextField fullWidth label={t('invoice.bankTransactionId') || 'Bank Transaction Name / ID'} value={bankName} onChange={(e) => setBankName(e.target.value)} InputLabelProps={{ shrink: true }} />
                            </Grid>
                        )}

                        {paymentType === 'cheque' && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label={t('invoice.chequeNumber') || 'Cheque Number'} value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} InputLabelProps={{ shrink: true }} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth type="date" label={t('invoice.chequeDate') || 'Cheque Date'} InputLabelProps={{ shrink: true }} value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12}>
                            <TextField 
                                fullWidth 
                                label={t('invoice.notes') || 'Invoice Notes'} 
                                multiline 
                                rows={2} 
                                value={invoiceNotes} 
                                onChange={(e) => setInvoiceNotes(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setInvoiceDialogOpen(false)} color="inherit">{t('common.cancel') || 'Cancel'}</Button>
                    <Button onClick={handleInvoiceSubmit} variant="contained" color="secondary" startIcon={<InvoiceIcon />}>
                        {t('jobCard.generateInvoice') || 'Generate Invoice'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG: CANCEL INVOICE AUTHORIZATION */}
            <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Authorization Code Required</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        To cancel this invoice, please obtain and enter the supervisor authorization code.
                    </Typography>
                    <TextField
                        fullWidth
                        type="password"
                        label={t('jobCard.authCode') || 'Authorization Code'}
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCancelDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={() => {
                            if (!authCode) {
                                toast.error('Code is required');
                                return;
                            }
                            cancelInvoiceMutation.mutate({ code: authCode });
                        }}
                        variant="contained"
                        color="error"
                    >
                        Confirm Cancellation
                    </Button>
                </DialogActions>
            </Dialog>

            {/* LIGHTBOX: Full-size photo viewer */}
            <Dialog
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0,0,0,0.92)',
                        borderRadius: '16px',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                    }
                }}
            >
                <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                        📷 Photo {lightboxIndex + 1} of {jobCard?.images?.length || 0}
                    </Typography>
                    <IconButton onClick={() => setLightboxOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, bgcolor: 'transparent' }}>
                    {jobCard?.images && jobCard.images.length > 0 && (
                        <Box sx={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                            {/* Prev button */}
                            {jobCard.images.length > 1 && (
                                <IconButton
                                    onClick={() => setLightboxIndex(i => (i - 1 + jobCard.images.length) % jobCard.images.length)}
                                    sx={{ position: 'absolute', left: 8, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }, zIndex: 1 }}
                                >
                                    <ArrowBackIcon />
                                </IconButton>
                            )}
                            <img
                                src={storageUrl(jobCard.images[lightboxIndex])}
                                alt={`Photo ${lightboxIndex + 1}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '70vh',
                                    objectFit: 'contain',
                                    borderRadius: '8px',
                                    display: 'block',
                                    margin: '0 auto',
                                }}
                            />
                            {/* Next button */}
                            {jobCard.images.length > 1 && (
                                <IconButton
                                    onClick={() => setLightboxIndex(i => (i + 1) % jobCard.images.length)}
                                    sx={{ position: 'absolute', right: 8, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }, zIndex: 1 }}
                                >
                                    <ArrowForwardIcon />
                                </IconButton>
                            )}
                        </Box>
                    )}
                </DialogContent>
                {/* Thumbnail strip */}
                {jobCard?.images && jobCard.images.length > 1 && (
                    <DialogActions sx={{ justifyContent: 'center', pb: 2, pt: 1, gap: 1, bgcolor: 'transparent', flexWrap: 'wrap' }}>
                        {jobCard.images.map((path, idx) => (
                            <Box
                                key={idx}
                                onClick={() => setLightboxIndex(idx)}
                                sx={{
                                    width: 48, height: 36, borderRadius: '4px', overflow: 'hidden', cursor: 'pointer',
                                    border: '2px solid', borderColor: idx === lightboxIndex ? 'primary.main' : 'transparent',
                                    opacity: idx === lightboxIndex ? 1 : 0.5, transition: 'all 0.2s',
                                    '&:hover': { opacity: 1 },
                                }}
                            >
                                <img src={storageUrl(path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                        ))}
                    </DialogActions>
                )}
            </Dialog>

            {/* DIALOG: SEND SMS */}
            <Dialog open={smsDialogOpen} onClose={() => setSmsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Send SMS Notification</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                        <TextField
                            label="Customer Name"
                            value={jobCard?.customer_name || ''}
                            disabled
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Customer Phone"
                            value={jobCard?.customer_phone || ''}
                            disabled
                            fullWidth
                            size="small"
                        />
                    </Box>
                    <FormControl fullWidth size="small">
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, fontWeight: 700 }}>
                            Select SMS Template
                        </Typography>
                        <Select
                            value={smsSelectedTemplate}
                            onChange={(e) => {
                                const tId = e.target.value;
                                setSmsSelectedTemplate(tId);
                                const selected = smsTemplates.find(t => t.id === tId || t.name === tId);
                                if (selected) {
                                    setSmsMessageText(formatSMSMessage(selected.template, jobCard));
                                }
                            }}
                        >
                            {smsTemplates.map((t) => (
                                <MenuItem key={t.id || t.name} value={t.id || t.name}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Message Text"
                        multiline
                        rows={4}
                        value={smsMessageText}
                        onChange={(e) => setSmsMessageText(e.target.value)}
                        fullWidth
                        helperText={`${smsMessageText.length}/160 characters (1 SMS unit)`}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setSmsDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleSendSMS}
                        variant="contained"
                        color="primary"
                        disabled={smsSending}
                    >
                        {smsSending ? 'Sending...' : 'Send SMS'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default NewJobCard;
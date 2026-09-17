import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Divider,
    Button,
    ButtonGroup,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Print as PrintIcon,
    ArrowBack as ArrowBackIcon,
    Description as A4Icon,
    ReceiptLong as ThermalIcon,
    Apps as DotMatrixIcon,
} from '@mui/icons-material';
import api from '../../api/axios';
import { useSettings } from '../../contexts/SettingsContext';

const JobCardPrint = () => {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currencySymbol, settings } = useSettings();

    const [jobCard, setJobCard] = useState(null);
    const [loading, setLoading] = useState(true);

    // Print format: 'a4' | 'thermal' | 'dotmatrix'
    const initialFormat = searchParams.get('format') || settings?.default_print_format || 'a4';
    const [format, setFormat] = useState(initialFormat);
    const initialThermalWidth = searchParams.get('width') || localStorage.getItem('default_thermal_width') || '80mm';
    const [thermalWidth, setThermalWidth] = useState(initialThermalWidth);

    const handleThermalWidthChange = (newWidth) => {
        if (!newWidth) return;
        setThermalWidth(newWidth);
        localStorage.setItem('default_thermal_width', newWidth);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('width', newWidth);
        setSearchParams(newParams);
    };

    const fmt = (amount) => {
        if (amount === undefined || amount === null || isNaN(Number(amount))) return '0.00';
        return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    useEffect(() => {
        const fetchJobCard = async () => {
            try {
                const res = await api.get(`/job-cards/${id}`);
                setJobCard(res.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchJobCard();
    }, [id]);

    const handleFormatChange = (event, newFormat) => {
        if (newFormat !== null) {
            setFormat(newFormat);
            setSearchParams({ format: newFormat, width: thermalWidth });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Box p={4} textAlign="center"><Typography variant="h6">Loading Job Card for Print...</Typography></Box>;
    if (!jobCard) return <Box p={4} textAlign="center"><Typography variant="h6" color="error">Job Card not found.</Typography></Box>;

    const services = jobCard.service_type || jobCard.services || [];
    const partsUsed = jobCard.parts_used || [];
    const servicesTotal = services.reduce((a, s) => a + Number(s.price || 0), 0);
    const partsTotal = partsUsed.reduce((acc, p) => acc + (Number(p.price || 0) * Number(p.quantity || 1)), 0);
    const finalAmount = jobCard.final_amount != null ? jobCard.final_amount : (jobCard.total_amount || (servicesTotal + partsTotal));
    const paidAmount = jobCard.paid_amount != null ? jobCard.paid_amount : (jobCard.invoice?.paid_amount != null ? jobCard.invoice.paid_amount : 0);
    const amountDue = jobCard.invoice?.balance != null ? jobCard.invoice.balance : Math.max(0, Number(finalAmount) - Number(paidAmount));
    const cashReturned = jobCard.cash_returned != null ? jobCard.cash_returned : (jobCard.invoice?.cash_returned != null ? jobCard.invoice.cash_returned : 0);

    return (
        <Box
            className="print-outer-container"
            sx={{
                minHeight: '100vh',
                bgcolor: '#f1f5f9',
                pb: 4,
                '@media print': {
                    minHeight: 'auto !important',
                    bgcolor: '#ffffff !important',
                    p: '0 !important',
                    m: '0 !important',
                    pb: '0 !important',
                    width: '100% !important',
                    display: 'flex !important',
                    justifyContent: 'center !important',
                    alignItems: 'flex-start !important',
                }
            }}
        >
            {/* Dynamic CSS for Print: Injected into DOM to guarantee centering and exact paper size */}
            <style type="text/css">
                {`
                @media print {
                    @page {
                        size: ${format === 'thermal' ? `${thermalWidth} auto` : (format === 'dotmatrix' ? '8.5in 5.5in' : 'A4 portrait')};
                        margin: ${format === 'thermal' ? '0mm' : (format === 'dotmatrix' ? '5mm' : '10mm')};
                    }
                    html, body {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #root {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        border: none !important;
                        min-height: auto !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                    }
                    .print-outer-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        min-height: auto !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                    }
                    .print-preview-wrapper {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                        background: #ffffff !important;
                    }
                    .thermal-receipt {
                        width: ${thermalWidth === '58mm' ? '54mm' : '76mm'} !important;
                        max-width: ${thermalWidth === '58mm' ? '54mm' : '76mm'} !important;
                        min-width: ${thermalWidth === '58mm' ? '54mm' : '76mm'} !important;
                        margin-left: auto !important;
                        margin-right: auto !important;
                        padding: ${thermalWidth === '58mm' ? '1.5mm' : '2.5mm'} !important;
                        box-shadow: none !important;
                        border: none !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        background: #ffffff !important;
                    }
                    .a4-print-container {
                        width: 210mm !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        box-shadow: none !important;
                    }
                    .dotmatrix-print-container {
                        width: 100% !important;
                        margin: 0 auto !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
                `}
            </style>

            {/* Top Toolbar (Hidden during Print) */}
            <Paper
                elevation={3}
                sx={{
                    p: 1.5,
                    px: 3,
                    bgcolor: '#1e293b',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                    '@media print': {
                        display: 'none !important'
                    }
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Print Document: #{jobCard.job_number || jobCard.id}
                    </Typography>
                </Box>

                {/* Format Switcher */}
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" sx={{ opacity: 0.8, mr: 0.5, fontWeight: 600 }}>
                        Format:
                    </Typography>
                    <ToggleButtonGroup
                        value={format}
                        exclusive
                        onChange={handleFormatChange}
                        size="small"
                        sx={{
                            bgcolor: '#334155',
                            '& .MuiToggleButton-root': {
                                color: '#94a3b8',
                                borderColor: '#475569',
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 1.5,
                                py: 0.5,
                                '&.Mui-selected': {
                                    bgcolor: '#2563eb',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#1d4ed8' }
                                }
                            }
                        }}
                    >
                        <ToggleButton value="a4">
                            <Box display="flex" alignItems="center" gap={0.75}>
                                <A4Icon fontSize="small" />
                                A4 Standard
                            </Box>
                        </ToggleButton>
                        <ToggleButton value="thermal">
                            <Box display="flex" alignItems="center" gap={0.75}>
                                <ThermalIcon fontSize="small" />
                                Thermal POS ({thermalWidth})
                            </Box>
                        </ToggleButton>
                        <ToggleButton value="dotmatrix">
                            <Box display="flex" alignItems="center" gap={0.75}>
                                <DotMatrixIcon fontSize="small" />
                                Dot Matrix
                            </Box>
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {format === 'thermal' && (
                        <Box display="flex" alignItems="center" gap={0.5} sx={{ ml: 1, p: 0.5, bgcolor: '#334155', borderRadius: '6px' }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', px: 0.75, fontWeight: 700 }}>
                                Paper Roll:
                            </Typography>
                            <ButtonGroup size="small">
                                <Button
                                    variant={thermalWidth === '80mm' ? 'contained' : 'outlined'}
                                    onClick={() => handleThermalWidthChange('80mm')}
                                    sx={{
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        px: 1.25,
                                        fontWeight: 700,
                                        bgcolor: thermalWidth === '80mm' ? '#2563eb' : 'transparent',
                                        '&:hover': { bgcolor: thermalWidth === '80mm' ? '#1d4ed8' : '#475569' }
                                    }}
                                >
                                    80mm (Standard)
                                </Button>
                                <Button
                                    variant={thermalWidth === '58mm' ? 'contained' : 'outlined'}
                                    onClick={() => handleThermalWidthChange('58mm')}
                                    sx={{
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        px: 1.25,
                                        fontWeight: 700,
                                        bgcolor: thermalWidth === '58mm' ? '#2563eb' : 'transparent',
                                        '&:hover': { bgcolor: thermalWidth === '58mm' ? '#1d4ed8' : '#475569' }
                                    }}
                                >
                                    58mm (Narrow)
                                </Button>
                            </ButtonGroup>
                        </Box>
                    )}
                </Box>

                {/* Print Trigger Button */}
                <Box display="flex" alignItems="center" gap={1}>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                        sx={{ fontWeight: 800, px: 2.5, borderRadius: '8px' }}
                    >
                        Print Now
                    </Button>
                </Box>
            </Paper>

            {/* Printable Preview Area */}
            <Box
                className="print-preview-wrapper"
                display="flex"
                justifyContent="center"
                p={3}
                sx={{
                    '@media print': {
                        p: '0 !important',
                        m: '0 auto !important',
                        width: '100% !important',
                        display: 'flex !important',
                        justifyContent: 'center !important',
                    }
                }}
            >
                {format === 'a4' && (
                    <A4Layout
                        jobCard={jobCard}
                        currencySymbol={currencySymbol}
                        services={services}
                        partsUsed={partsUsed}
                        servicesTotal={servicesTotal}
                        partsTotal={partsTotal}
                        finalAmount={finalAmount}
                        paidAmount={paidAmount}
                        amountDue={amountDue}
                        cashReturned={cashReturned}
                        fmt={fmt}
                    />
                )}

                {format === 'thermal' && (
                    <ThermalLayout
                        jobCard={jobCard}
                        currencySymbol={currencySymbol}
                        services={services}
                        partsUsed={partsUsed}
                        servicesTotal={servicesTotal}
                        partsTotal={partsTotal}
                        finalAmount={finalAmount}
                        paidAmount={paidAmount}
                        amountDue={amountDue}
                        cashReturned={cashReturned}
                        thermalWidth={thermalWidth}
                        fmt={fmt}
                    />
                )}

                {format === 'dotmatrix' && (
                    <DotMatrixLayout
                        jobCard={jobCard}
                        currencySymbol={currencySymbol}
                        services={services}
                        partsUsed={partsUsed}
                        servicesTotal={servicesTotal}
                        partsTotal={partsTotal}
                        finalAmount={finalAmount}
                        paidAmount={paidAmount}
                        amountDue={amountDue}
                        cashReturned={cashReturned}
                        fmt={fmt}
                    />
                )}
            </Box>
        </Box>
    );
};

/* ==========================================================================
   FORMAT 1: A4 STANDARD FULL PAGE LAYOUT
   ========================================================================== */
const A4Layout = ({
    jobCard,
    currencySymbol,
    services,
    partsUsed,
    servicesTotal,
    partsTotal,
    finalAmount,
    paidAmount,
    amountDue,
    cashReturned,
    fmt
}) => {
    return (
        <Box
            className="a4-print-container"
            sx={{
                width: '210mm',
                minHeight: '297mm',
                p: '15mm',
                bgcolor: 'white',
                color: 'black',
                boxShadow: 3,
                fontFamily: '"Helvetica Neue", Arial, sans-serif',
                '& p, & span, & div': { lineHeight: 1.25, fontSize: '0.85rem' },
                '& .MuiTypography-subtitle1': { fontSize: '0.92rem', lineHeight: 1.3 },
                '& .MuiTypography-h4': { fontSize: '1.45rem' },
                '& .MuiTypography-h5': { fontSize: '1.18rem' },
                '@media print': {
                    boxShadow: 'none',
                    p: 0,
                    m: 0,
                    width: '100%',
                    minHeight: 'auto',
                    '@page': {
                        size: 'A4 portrait',
                        margin: '10mm'
                    }
                }
            }}
        >
            {/* Header */}
            <Box display="flex" justifyContent="space-between" mb={1.5} borderBottom="2px solid black" pb={1}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Ratnam Service Station</Typography>
                    <Typography fontWeight={700} color="textSecondary">(Honda Authorised Service Center)</Typography>
                    <Typography>32 Sirampirady Lane, Jaffna, Sri Lanka</Typography>
                    <Typography>Phone : +94 212 228 472 | Mobile : 077 003 3308</Typography>
                </Box>
                <Box textAlign="right">
                    <Typography variant="h5" fontWeight={800}>
                        {jobCard.status === 'invoiced' ? 'INVOICE' : 'JOB CARD'}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700}>#{jobCard.job_number || jobCard.id}</Typography>
                    <Typography>Date: {new Date(jobCard.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Typography>
                    <Typography>Status: <strong>{(jobCard.status || '').replace(/_/g, ' ').toUpperCase()}</strong></Typography>
                </Box>
            </Box>

            {/* Customer & Vehicle Info */}
            <Box display="flex" justifyContent="space-between" mb={1.5} gap={2}>
                <Box width="49%" sx={{ p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} borderBottom="1px solid #ddd" pb={0.5} mb={0.75}>
                        Customer Details
                    </Typography>
                    <Typography><strong>Name:</strong> {jobCard.customer_name}</Typography>
                    <Typography><strong>Phone:</strong> {jobCard.customer_phone}</Typography>
                    {jobCard.customer_email && <Typography><strong>Email:</strong> {jobCard.customer_email}</Typography>}
                    {jobCard.customer_town && <Typography><strong>Town / Area:</strong> {jobCard.customer_town.toUpperCase()}</Typography>}
                </Box>
                <Box width="49%" sx={{ p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} borderBottom="1px solid #ddd" pb={0.5} mb={0.75}>
                        Vehicle Details
                    </Typography>
                    <Typography><strong>Reg No:</strong> {jobCard.bike_number || jobCard.registration_no}</Typography>
                    <Typography><strong>Make / Model:</strong> {jobCard.make} {jobCard.model}</Typography>
                    <Typography><strong>Mileage:</strong> {jobCard.mileage ? `${jobCard.mileage} km` : 'N/A'}</Typography>
                    <Typography><strong>Engine No:</strong> {jobCard.engine_no || 'N/A'}</Typography>
                    <Typography><strong>Chassis No:</strong> {jobCard.chassis_no || 'N/A'}</Typography>
                </Box>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1.5} px={1}>
                <Box width="48%">
                    <Typography><strong>Mechanic:</strong> {jobCard.mechanic?.name || 'Unassigned'}</Typography>
                    <Typography><strong>Prepared By:</strong> {jobCard.prepared_by?.name || 'N/A'}</Typography>
                </Box>
                <Box width="48%" textAlign="right">
                    <Typography><strong>Est. Duration:</strong> {jobCard.estimated_duration ? `${jobCard.estimated_duration} Hours` : 'N/A'}</Typography>
                    {jobCard.branch?.name && <Typography><strong>Branch:</strong> {jobCard.branch.name}</Typography>}
                </Box>
            </Box>

            {jobCard.purpose && jobCard.purpose.length > 0 && (
                <Box mb={1} px={1}>
                    <Typography><strong>Purpose of Service:</strong> {jobCard.purpose.map(p => p.toUpperCase()).join(', ')}</Typography>
                </Box>
            )}

            {/* Services Table */}
            <Box mb={1.5}>
                <Typography variant="subtitle1" fontWeight={700} borderBottom="1px solid #000" pb={0.5} mb={0.5}>
                    Requested Services
                </Typography>
                <Table size="small" sx={{ '& td, & th': { padding: '4px 8px !important', borderBottom: '1px solid #eee' } }}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell><strong>Service Description</strong></TableCell>
                            <TableCell align="right"><strong>Price ({currencySymbol})</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {services.length === 0 ? (
                            <TableRow><TableCell colSpan={2}>No service items listed.</TableCell></TableRow>
                        ) : (
                            services.map((svc, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{svc.name}</TableCell>
                                    <TableCell align="right">{fmt(svc.price)}</TableCell>
                                </TableRow>
                            ))
                        )}
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell align="right"><strong>Services Total:</strong></TableCell>
                            <TableCell align="right"><strong>{currencySymbol} {fmt(servicesTotal)}</strong></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Box>

            {/* Parts Replaced Table */}
            {partsUsed.length > 0 && (
                <Box mb={1.5}>
                    <Typography variant="subtitle1" fontWeight={700} borderBottom="1px solid #000" pb={0.5} mb={0.5}>
                        Parts Replaced / Used
                    </Typography>
                    <Table size="small" sx={{ '& td, & th': { padding: '4px 8px !important', borderBottom: '1px solid #eee' } }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell><strong>Item Description</strong></TableCell>
                                <TableCell align="right"><strong>Qty</strong></TableCell>
                                <TableCell align="right"><strong>Unit Price ({currencySymbol})</strong></TableCell>
                                <TableCell align="right"><strong>Total ({currencySymbol})</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {partsUsed.map((part, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{part.name}</TableCell>
                                    <TableCell align="right">{part.quantity}</TableCell>
                                    <TableCell align="right">{fmt(part.price)}</TableCell>
                                    <TableCell align="right">{fmt(Number(part.price) * Number(part.quantity || 1))}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell colSpan={3} align="right"><strong>Parts Total:</strong></TableCell>
                                <TableCell align="right"><strong>{currencySymbol} {fmt(partsTotal)}</strong></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Box>
            )}

            {/* Notes & Next Service */}
            {jobCard.description && (
                <Box mb={1} p={1} sx={{ bgcolor: '#fafafa', border: '1px solid #eee', borderRadius: 1 }}>
                    <Typography><strong>Notes / Trouble Description:</strong> {jobCard.description}</Typography>
                </Box>
            )}

            {(jobCard.next_service_km || jobCard.next_service_date) && (
                <Box mb={1.5} p={1} sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1 }}>
                    <Typography fontWeight={700} color="#15803d">
                        📅 Next Service Reminder: {jobCard.next_service_km ? `${jobCard.next_service_km} KM` : ''} {jobCard.next_service_date ? ` / Due: ${new Date(jobCard.next_service_date).toLocaleDateString()}` : ''}
                    </Typography>
                </Box>
            )}

            {/* Financial Summary */}
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <Box width="50%" sx={{ border: '1px solid #000', borderRadius: 1, p: 1.5, bgcolor: '#fafafa' }}>
                    <Box display="flex" justifyContent="space-between" mb={0.25}>
                        <Typography>Services Subtotal:</Typography>
                        <Typography>{currencySymbol} {fmt(servicesTotal)}</Typography>
                    </Box>
                    {partsTotal > 0 && (
                        <Box display="flex" justifyContent="space-between" mb={0.25}>
                            <Typography>Parts Subtotal:</Typography>
                            <Typography>{currencySymbol} {fmt(partsTotal)}</Typography>
                        </Box>
                    )}
                    {(jobCard.discount > 0 || jobCard.invoice?.discount > 0) && (
                        <Box display="flex" justifyContent="space-between" mb={0.25} color="#b91c1c">
                            <Typography>Discount:</Typography>
                            <Typography>- {currencySymbol} {fmt(jobCard.discount || jobCard.invoice?.discount || 0)}</Typography>
                        </Box>
                    )}
                    <Divider sx={{ my: 0.75, borderColor: '#ccc' }} />
                    <Box display="flex" justifyContent="space-between" mb={0.75}>
                        <Typography fontWeight={800} fontSize="1.05rem">Final Total:</Typography>
                        <Typography fontWeight={800} fontSize="1.05rem">{currencySymbol} {fmt(finalAmount)}</Typography>
                    </Box>

                    {/* Payment details */}
                    <Box display="flex" justifyContent="space-between" fontSize="0.8rem">
                        <Typography>Payment Mode:</Typography>
                        <Typography fontWeight={700}>{(jobCard.payment_type || jobCard.invoice?.payment_type || 'CASH').replace(/_/g, ' ').toUpperCase()}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" fontSize="0.8rem">
                        <Typography>Amount Paid:</Typography>
                        <Typography fontWeight={700}>{currencySymbol} {fmt(paidAmount)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" fontSize="0.8rem">
                        <Typography>Balance Due:</Typography>
                        <Typography fontWeight={700} color={amountDue > 0 ? 'error.main' : 'inherit'}>{currencySymbol} {fmt(amountDue)}</Typography>
                    </Box>
                </Box>
            </Box>

            {/* Signatures */}
            <Box display="flex" justifyContent="space-between" mt={4}>
                <Box width="42%" textAlign="center">
                    <Divider sx={{ mb: 1, borderColor: 'black' }} />
                    <Typography variant="caption" fontWeight={700}>Customer Signature</Typography>
                </Box>
                <Box width="42%" textAlign="center">
                    <Divider sx={{ mb: 1, borderColor: 'black' }} />
                    <Typography variant="caption" fontWeight={700}>Authorized Signature (Ratnam SS)</Typography>
                </Box>
            </Box>
        </Box>
    );
};

/* ==========================================================================
   FORMAT 2: THERMAL POS RECEIPT LAYOUT (80mm / 58mm)
   ========================================================================== */
const ThermalLayout = ({
    jobCard,
    currencySymbol,
    services,
    partsUsed,
    servicesTotal,
    partsTotal,
    finalAmount,
    paidAmount,
    amountDue,
    cashReturned,
    thermalWidth,
    fmt
}) => {
    const is58mm = thermalWidth === '58mm';
    const containerWidth = is58mm ? '58mm' : '80mm';
    const isInvoiced = jobCard.status === 'invoiced';

    return (
        <Box
            className="thermal-receipt"
            sx={{
                width: containerWidth,
                maxWidth: containerWidth,
                minHeight: '160mm',
                p: is58mm ? '1.5mm' : '3mm',
                mx: 'auto',
                bgcolor: 'white',
                color: 'black',
                boxShadow: 3,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: is58mm ? '12.5px' : '14px',
                lineHeight: 1.35,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                '@media print': {
                    boxShadow: 'none !important',
                    border: 'none !important',
                    bgcolor: 'white !important',
                    color: 'black !important',
                    p: is58mm ? '1.5mm !important' : '2.5mm !important',
                    m: '0 auto !important',
                    width: is58mm ? '54mm !important' : '76mm !important',
                    maxWidth: is58mm ? '54mm !important' : '76mm !important',
                    minWidth: is58mm ? '54mm !important' : '76mm !important',
                    minHeight: 'auto !important',
                }
            }}
        >
            <Box>
                {/* Header */}
                <Box textAlign="center" mb={1.2}>
                    <Typography sx={{ fontWeight: 900, fontSize: is58mm ? '15px' : '17px', letterSpacing: '0.2px', fontFamily: 'inherit' }}>
                        RATNAM SERVICE STATION
                    </Typography>
                    <Typography sx={{ fontSize: is58mm ? '11px' : '12.5px', fontWeight: 700, fontFamily: 'inherit' }}>
                        (Honda Authorised Service Center)
                    </Typography>
                    <Typography sx={{ fontSize: is58mm ? '11px' : '12px', fontFamily: 'inherit' }}>
                        32 Sirampirady Lane, Jaffna
                    </Typography>
                    <Typography sx={{ fontSize: is58mm ? '11px' : '12px', fontFamily: 'inherit' }}>
                        Tel: 021 2228472 / 077 0033308
                    </Typography>
                    <Box sx={{ borderBottom: '1.5px dashed black', my: 1 }} />
                    <Typography sx={{ fontWeight: 900, fontSize: is58mm ? '13px' : '15px', fontFamily: 'inherit' }}>
                        {isInvoiced ? '*** CASH INVOICE ***' : '*** SERVICE JOB CARD ***'}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: is58mm ? '13px' : '14.5px', fontFamily: 'inherit' }}>
                        #{jobCard.job_number || jobCard.id}
                    </Typography>
                    <Typography sx={{ fontSize: is58mm ? '11px' : '12.5px', fontFamily: 'inherit' }}>
                        Date: {new Date(jobCard.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </Typography>
                </Box>

                <Box sx={{ borderBottom: '1.5px dashed black', my: 1 }} />

                {/* Customer & Vehicle Info */}
                <Box mb={1} sx={{ fontSize: is58mm ? '12px' : '13.5px', display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    <Box display="flex" justifyContent="space-between">
                        <span>Customer:</span>
                        <strong>{jobCard.customer_name}</strong>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <span>Phone:</span>
                        <span>{jobCard.customer_phone}</span>
                    </Box>
                    {jobCard.customer_town && (
                        <Box display="flex" justifyContent="space-between">
                            <span>Town:</span>
                            <span>{String(jobCard.customer_town).toUpperCase()}</span>
                        </Box>
                    )}
                    <Box display="flex" justifyContent="space-between">
                        <span>Vehicle / Bike:</span>
                        <strong>{jobCard.bike_number || jobCard.registration_no}</strong>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <span>Model:</span>
                        <span>{jobCard.make} {jobCard.model}</span>
                    </Box>
                    {jobCard.mileage && (
                        <Box display="flex" justifyContent="space-between">
                            <span>Mileage:</span>
                            <span>{jobCard.mileage} km</span>
                        </Box>
                    )}
                    {jobCard.engine_no && (
                        <Box display="flex" justifyContent="space-between">
                            <span>Engine No:</span>
                            <span style={{ fontSize: is58mm ? '10px' : '12px' }}>{jobCard.engine_no}</span>
                        </Box>
                    )}
                    {jobCard.chassis_no && (
                        <Box display="flex" justifyContent="space-between">
                            <span>Chassis No:</span>
                            <span style={{ fontSize: is58mm ? '10px' : '12px' }}>{jobCard.chassis_no}</span>
                        </Box>
                    )}
                    {jobCard.mechanic?.name && (
                        <Box display="flex" justifyContent="space-between">
                            <span>Mechanic:</span>
                            <span>{jobCard.mechanic.name}</span>
                        </Box>
                    )}
                    {jobCard.prepared_by?.name && (
                        <Box display="flex" justifyContent="space-between">
                            <span>Prepared By:</span>
                            <span>{jobCard.prepared_by.name}</span>
                        </Box>
                    )}
                </Box>

                {/* Purpose */}
                {jobCard.purpose && jobCard.purpose.length > 0 && (
                    <Box mb={0.5} sx={{ fontSize: is58mm ? '12px' : '13px' }}>
                        <strong>Purpose:</strong> {jobCard.purpose.map(p => p.toUpperCase()).join(', ')}
                    </Box>
                )}

                <Box sx={{ borderBottom: '1.5px dashed black', my: 1 }} />

                {/* Services Items */}
                {services.length > 0 && (
                    <Box mb={1}>
                        <Typography sx={{ fontWeight: 900, fontSize: is58mm ? '12.5px' : '14px', mb: 0.4, fontFamily: 'inherit' }}>
                            SERVICES:
                        </Typography>
                        {services.map((svc, idx) => (
                            <Box key={idx} display="flex" justifyContent="space-between" sx={{ fontSize: is58mm ? '12px' : '13.5px', mb: 0.3 }}>
                                <span style={{ flex: 1, paddingRight: '4px', wordBreak: 'break-word' }}>
                                    • {svc.name}
                                </span>
                                {isInvoiced && (
                                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(svc.price)}</span>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Parts Items */}
                {partsUsed.length > 0 && (
                    <Box mb={1}>
                        <Typography sx={{ fontWeight: 900, fontSize: is58mm ? '12.5px' : '14px', mb: 0.4, fontFamily: 'inherit' }}>
                            PARTS REPLACED:
                        </Typography>
                        {partsUsed.map((part, idx) => (
                            <Box key={idx} display="flex" justifyContent="space-between" sx={{ fontSize: is58mm ? '12px' : '13.5px', mb: 0.3 }}>
                                <span style={{ flex: 1, paddingRight: '4px', wordBreak: 'break-word' }}>
                                    • {part.name} (x{part.quantity})
                                </span>
                                {isInvoiced && (
                                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(Number(part.price) * Number(part.quantity || 1))}</span>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Notes */}
                {jobCard.description && (
                    <>
                        <Box sx={{ borderBottom: '1px dashed #999', my: 0.5 }} />
                        <Box mb={0.5} sx={{ fontSize: is58mm ? '11px' : '12.5px' }}>
                            <strong>Notes:</strong> {jobCard.description}
                        </Box>
                    </>
                )}

                <Box sx={{ borderBottom: '1.5px dashed black', my: 1 }} />

                {/* Financial Summary */}
                <Box mb={1} sx={{ fontSize: is58mm ? '12.5px' : '14px', display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                    {isInvoiced && (
                        <>
                            <Box display="flex" justifyContent="space-between">
                                <span>Services Total:</span>
                                <span>{currencySymbol} {fmt(servicesTotal)}</span>
                            </Box>
                            {partsTotal > 0 && (
                                <Box display="flex" justifyContent="space-between">
                                    <span>Parts Total:</span>
                                    <span>{currencySymbol} {fmt(partsTotal)}</span>
                                </Box>
                            )}
                            {(jobCard.discount > 0 || jobCard.invoice?.discount > 0) && (
                                <Box display="flex" justifyContent="space-between">
                                    <span>Discount:</span>
                                    <span>- {currencySymbol} {fmt(jobCard.discount || jobCard.invoice?.discount || 0)}</span>
                                </Box>
                            )}
                            <Box sx={{ borderBottom: '1.5px solid black', my: 0.5 }} />
                        </>
                    )}

                    <Box display="flex" justifyContent="space-between" sx={{ fontWeight: 900, fontSize: is58mm ? '14px' : '15.5px' }}>
                        <span>TOTAL AMOUNT:</span>
                        <span>{currencySymbol} {fmt(finalAmount)}</span>
                    </Box>

                    {isInvoiced && (
                        <>
                            <Box display="flex" justifyContent="space-between">
                                <span>Payment Mode:</span>
                                <span>{(jobCard.payment_type || jobCard.invoice?.payment_type || 'CASH').toUpperCase()}</span>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <span>Amount Paid:</span>
                                <span>{currencySymbol} {fmt(paidAmount)}</span>
                            </Box>
                        </>
                    )}

                    <Box sx={{ borderBottom: '1.5px solid black', my: 0.5 }} />
                    <Box display="flex" justifyContent="space-between" sx={{ fontWeight: 900, fontSize: is58mm ? '14px' : '16px' }}>
                        <span>AMOUNT DUE:</span>
                        <span>{currencySymbol} {fmt(amountDue)}</span>
                    </Box>

                    {cashReturned > 0 && (
                        <Box display="flex" justifyContent="space-between" sx={{ mt: 0.25 }}>
                            <span>Change Returned:</span>
                            <span>{currencySymbol} {fmt(cashReturned)}</span>
                        </Box>
                    )}
                </Box>

                {/* Next Service Reminder */}
                {(jobCard.next_service_km || jobCard.next_service_date) && (
                    <Box textAlign="center" p={0.8} my={1} sx={{ border: '1.5px solid black', fontSize: is58mm ? '11px' : '12.5px', fontWeight: 700 }}>
                        Next Service: {jobCard.next_service_km ? `${jobCard.next_service_km} KM` : ''} {jobCard.next_service_date ? `(${new Date(jobCard.next_service_date).toLocaleDateString()})` : ''}
                    </Box>
                )}
            </Box>

            {/* Footer */}
            <Box textAlign="center" mt={1.5}>
                <Typography sx={{ fontSize: is58mm ? '11px' : '12.5px', fontWeight: 700, fontFamily: 'inherit' }}>
                    Thank you for your service!
                </Typography>
                <Typography sx={{ fontSize: is58mm ? '10px' : '11.5px', fontFamily: 'inherit' }}>
                    Drive Safely • Ratnam Service Station
                </Typography>
                <Box sx={{ borderBottom: '1.5px dashed black', mt: 0.8 }} />
            </Box>
        </Box>
    );
};

/* ==========================================================================
   FORMAT 3: DOT MATRIX 80-COLUMN IMPACT PRINTER LAYOUT
   ========================================================================== */
const DotMatrixLayout = ({
    jobCard,
    currencySymbol,
    services,
    partsUsed,
    servicesTotal,
    partsTotal,
    finalAmount,
    paidAmount,
    amountDue,
    cashReturned,
    fmt
}) => {
    return (
        <Box
            className="dotmatrix-print-container"
            sx={{
                width: '210mm',
                p: '10mm',
                bgcolor: 'white',
                color: '#000000',
                boxShadow: 3,
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '12px',
                lineHeight: 1.3,
                letterSpacing: '0.2px',
                border: '1.5px solid #000',
                borderRadius: '4px',
                boxSizing: 'border-box',
                '@media print': {
                    boxShadow: 'none',
                    p: '5mm',
                    m: 0,
                    width: '100%',
                    border: 'none',
                    '@page': {
                        size: '8.5in 5.5in',
                        margin: '5mm'
                    }
                }
            }}
        >
            {/* Clean Header Frame */}
            <Box sx={{ borderBottom: '1.5px dashed #000', pb: 1, mb: 1, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 'bold', fontSize: '15px', fontFamily: 'inherit' }}>
                    RATNAM SERVICE STATION
                </Typography>
                <Typography sx={{ fontSize: '11px', fontFamily: 'inherit', fontWeight: 'bold' }}>
                    (HONDA AUTHORISED SERVICE CENTER)
                </Typography>
                <Typography sx={{ fontSize: '11px', fontFamily: 'inherit' }}>
                    32 Sirampirady Lane, Jaffna, Sri Lanka • Tel: +94 212 228 472 / Mob: 077 003 3308
                </Typography>
            </Box>

            {/* Header Details */}
            <Box display="flex" justifyContent="space-between" my={0.75} sx={{ fontWeight: 'bold', borderBottom: '1.5px dashed #000', pb: 0.75 }}>
                <span>DOCUMENT: {jobCard.status === 'invoiced' ? 'INVOICE' : 'JOB CARD'} #{jobCard.job_number || jobCard.id}</span>
                <span>DATE: {new Date(jobCard.created_at).toLocaleDateString()} {new Date(jobCard.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </Box>

            {/* Customer & Vehicle 2-Column */}
            <Box display="flex" justifyContent="space-between" my={0.75} sx={{ borderBottom: '1.5px dashed #000', pb: 0.75 }}>
                <Box width="48%">
                    <div>CUSTOMER : {String(jobCard.customer_name || '').toUpperCase()}</div>
                    <div>PHONE    : {jobCard.customer_phone}</div>
                    {jobCard.customer_town && <div>TOWN     : {String(jobCard.customer_town).toUpperCase()}</div>}
                    {jobCard.customer_email && <div>EMAIL    : {jobCard.customer_email}</div>}
                </Box>
                <Box width="48%">
                    <div>VEHICLE  : {jobCard.bike_number || jobCard.registration_no}</div>
                    <div>MODEL    : {jobCard.make} {jobCard.model}</div>
                    <div>MILEAGE  : {jobCard.mileage ? `${jobCard.mileage} KM` : 'N/A'}</div>
                    {jobCard.engine_no && <div>ENGINE # : {jobCard.engine_no}</div>}
                    {jobCard.chassis_no && <div>CHASSIS #: {jobCard.chassis_no}</div>}
                </Box>
            </Box>

            {/* Staff & Purpose Info */}
            <Box display="flex" justifyContent="space-between" my={0.5} sx={{ borderBottom: '1.5px dashed #000', pb: 0.5 }}>
                <Box width="48%">
                    <div>MECHANIC : {jobCard.mechanic?.name || 'UNASSIGNED'}</div>
                    <div>PREP. BY : {jobCard.prepared_by?.name || 'N/A'}</div>
                </Box>
                <Box width="48%">
                    {jobCard.estimated_duration && <div>EST. TIME: {jobCard.estimated_duration} HOURS</div>}
                    {jobCard.branch?.name && <div>BRANCH   : {jobCard.branch.name}</div>}
                </Box>
            </Box>

            {jobCard.purpose && jobCard.purpose.length > 0 && (
                <Box my={0.5} sx={{ borderBottom: '1px dashed #000', pb: 0.5 }}>
                    <div>PURPOSE  : {jobCard.purpose.map(p => p.toUpperCase()).join(', ')}</div>
                </Box>
            )}

            {/* Items Table Header */}
            <Box display="flex" justifyContent="space-between" sx={{ fontWeight: 'bold', borderBottom: '1.5px dashed #000', py: 0.5 }}>
                <span style={{ width: '55%' }}>ITEM / SERVICE DESCRIPTION</span>
                <span style={{ width: '10%', textAlign: 'center' }}>QTY</span>
                <span style={{ width: '15%', textAlign: 'right' }}>RATE</span>
                <span style={{ width: '20%', textAlign: 'right' }}>AMOUNT</span>
            </Box>

            {/* Services List */}
            {services.map((svc, i) => (
                <Box key={`s-${i}`} display="flex" justifyContent="space-between" py={0.35}>
                    <span style={{ width: '55%' }}>{svc.name}</span>
                    <span style={{ width: '10%', textAlign: 'center' }}>1</span>
                    <span style={{ width: '15%', textAlign: 'right' }}>{fmt(svc.price)}</span>
                    <span style={{ width: '20%', textAlign: 'right' }}>{fmt(svc.price)}</span>
                </Box>
            ))}

            {/* Parts List */}
            {partsUsed.map((part, i) => (
                <Box key={`p-${i}`} display="flex" justifyContent="space-between" py={0.35}>
                    <span style={{ width: '55%' }}>[PART] {part.name}</span>
                    <span style={{ width: '10%', textAlign: 'center' }}>{part.quantity}</span>
                    <span style={{ width: '15%', textAlign: 'right' }}>{fmt(part.price)}</span>
                    <span style={{ width: '20%', textAlign: 'right' }}>{fmt(Number(part.price) * Number(part.quantity || 1))}</span>
                </Box>
            ))}

            <Box sx={{ borderBottom: '1.5px dashed #000', my: 1 }} />

            {/* Notes */}
            {jobCard.description && (
                <Box my={0.5} sx={{ borderBottom: '1px dashed #000', pb: 0.5 }}>
                    <div>NOTES: {jobCard.description}</div>
                </Box>
            )}

            {/* Financial Summary */}
            <Box display="flex" justifyContent="space-between" my={0.75}>
                <Box width="48%">
                    <div>PAY MODE: {(jobCard.payment_type || jobCard.invoice?.payment_type || 'CASH').toUpperCase()}</div>
                    <div>PAID AMT: {currencySymbol} {fmt(paidAmount)}</div>
                    <div style={{ fontWeight: 'bold' }}>BAL DUE : {currencySymbol} {fmt(amountDue)}</div>
                    {cashReturned > 0 && <div>CHANGE  : {currencySymbol} {fmt(cashReturned)}</div>}
                    {(jobCard.next_service_km || jobCard.next_service_date) && (
                        <div>NEXT SVC: {jobCard.next_service_km ? `${jobCard.next_service_km} KM` : ''}{jobCard.next_service_date ? ` (${new Date(jobCard.next_service_date).toLocaleDateString()})` : ''}</div>
                    )}
                </Box>
                <Box width="48%" textAlign="right" sx={{ fontWeight: 'bold' }}>
                    <div>SERVICES TOTAL : {currencySymbol} {fmt(servicesTotal)}</div>
                    {partsTotal > 0 && <div>PARTS TOTAL    : {currencySymbol} {fmt(partsTotal)}</div>}
                    {(jobCard.discount > 0 || jobCard.invoice?.discount > 0) && (
                        <div>DISCOUNT       : -{currencySymbol} {fmt(jobCard.discount || jobCard.invoice?.discount || 0)}</div>
                    )}
                    <div style={{ fontSize: '13.5px', marginTop: '4px', borderTop: '1.5px solid #000', paddingTop: '2px' }}>
                        NET TOTAL      : {currencySymbol} {fmt(finalAmount)}
                    </div>
                </Box>
            </Box>

            {/* Signatures */}
            <Box display="flex" justifyContent="space-between" mt={3} pt={1} sx={{ borderTop: '1.5px dashed #000' }}>
                <span style={{ width: '45%', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '4px' }}>
                    CUSTOMER SIGNATURE
                </span>
                <span style={{ width: '45%', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '4px' }}>
                    AUTHORIZED SIGNATURE
                </span>
            </Box>
        </Box>
    );
};

export default JobCardPrint;

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Button,
    List, ListItem, ListItemText, IconButton, Collapse
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useSettings } from '../../contexts/SettingsContext';
import toast from 'react-hot-toast';

const ServicePurposeSettings = () => {
    const { servicePurposeMap, updateServicePurposeMap } = useSettings();
    const [purposeMap, setPurposeMap] = useState(servicePurposeMap);
    const [expandedPurpose, setExpandedPurpose] = useState(null);
    const [newPurposeName, setNewPurposeName] = useState('');
    const [newServiceName, setNewServiceName] = useState('');
    const [newServicePrice, setNewServicePrice] = useState('');

    useEffect(() => {
        setPurposeMap(servicePurposeMap);
    }, [servicePurposeMap]);

    const handleSave = () => {
        updateServicePurposeMap(purposeMap);
        toast.success('Service Purposes updated!');
    };

    const handleAddPurpose = () => {
        if (!newPurposeName.trim()) return;
        if (purposeMap[newPurposeName]) {
            toast.error('Purpose already exists');
            return;
        }
        setPurposeMap({ ...purposeMap, [newPurposeName]: [] });
        setNewPurposeName('');
    };

    const handleRemovePurpose = (purpose) => {
        const updated = { ...purposeMap };
        delete updated[purpose];
        setPurposeMap(updated);
    };

    const handleAddService = (purpose) => {
        if (!newServiceName.trim()) return;
        const price = parseFloat(newServicePrice) || 0;
        const updated = { ...purposeMap };
        updated[purpose] = [...updated[purpose], { name: newServiceName, price }];
        setPurposeMap(updated);
        setNewServiceName('');
        setNewServicePrice('');
    };

    const handleRemoveService = (purpose, serviceIndex) => {
        const updated = { ...purposeMap };
        updated[purpose] = updated[purpose].filter((_, idx) => idx !== serviceIndex);
        setPurposeMap(updated);
    };

    return (
        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mt: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Service Purpose Map</Typography>
                    <Typography variant="caption" color="textSecondary">Map requested services to the purpose of service.</Typography>
                </Box>
                <Button variant="contained" size="small" onClick={handleSave}>Save Changes</Button>
            </Box>

            <Box display="flex" gap={2} mb={2}>
                <TextField size="small" label="New Purpose" value={newPurposeName} onChange={e => setNewPurposeName(e.target.value)} />
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddPurpose}>Add Purpose</Button>
            </Box>

            <List disablePadding>
                {Object.keys(purposeMap).map((purpose) => (
                    <Box key={purpose} sx={{ mb: 1, border: '1px solid #eee', borderRadius: '8px' }}>
                        <ListItem
                            secondaryAction={
                                <IconButton edge="end" color="error" onClick={() => handleRemovePurpose(purpose)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                            sx={{ bgcolor: 'grey.50', borderRadius: '8px' }}
                        >
                            <IconButton onClick={() => setExpandedPurpose(expandedPurpose === purpose ? null : purpose)} size="small" sx={{ mr: 1 }}>
                                {expandedPurpose === purpose ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                            <ListItemText primary={purpose} secondary={`${purposeMap[purpose].length} suggested services`} />
                        </ListItem>
                        <Collapse in={expandedPurpose === purpose} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                                <Box display="flex" gap={2} mb={2} alignItems="center">
                                    <TextField size="small" label="Service Name" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} />
                                    <TextField size="small" type="number" label="Price" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} />
                                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => handleAddService(purpose)}>Add Service</Button>
                                </Box>
                                <Grid container spacing={1}>
                                    {purposeMap[purpose].map((svc, idx) => (
                                        <Grid item xs={12} sm={6} md={4} key={idx}>
                                            <Paper variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="body2">{svc.name}</Typography>
                                                    <Typography variant="caption" color="textSecondary">Price: {svc.price}</Typography>
                                                </Box>
                                                <IconButton size="small" color="error" onClick={() => handleRemoveService(purpose, idx)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Collapse>
                    </Box>
                ))}
            </List>
        </Paper>
    );
};

export default ServicePurposeSettings;

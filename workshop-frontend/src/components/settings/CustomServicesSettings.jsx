import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Button,
    List, ListItem, ListItemText, IconButton
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useSettings } from '../../contexts/SettingsContext';
import toast from 'react-hot-toast';

const CustomServicesSettings = () => {
    const { customServices, updateCustomServices, currencySymbol } = useSettings();
    const [services, setServices] = useState(customServices || []);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServicePrice, setNewServicePrice] = useState('');

    useEffect(() => {
        setServices(customServices || []);
    }, [customServices]);

    const handleSave = () => {
        updateCustomServices(services);
        toast.success('Custom Services updated!');
    };

    const handleAddService = () => {
        if (!newServiceName.trim()) return;
        const price = parseFloat(newServicePrice) || 0;
        
        if (services.some(s => s.name.toLowerCase() === newServiceName.trim().toLowerCase())) {
            toast.error('Service already exists');
            return;
        }

        setServices([...services, { name: newServiceName.trim(), price }]);
        setNewServiceName('');
        setNewServicePrice('');
    };

    const handleRemoveService = (index) => {
        setServices(services.filter((_, idx) => idx !== index));
    };

    return (
        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mt: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Predefined Custom Services</Typography>
                    <Typography variant="caption" color="textSecondary">Manage the custom services that can be added to job cards.</Typography>
                </Box>
                <Button variant="contained" size="small" onClick={handleSave}>Save Changes</Button>
            </Box>

            <Box display="flex" gap={2} mb={2} alignItems="center">
                <TextField size="small" label="Service Name" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} />
                <TextField size="small" type="number" label="Price" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} />
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddService}>Add Service</Button>
            </Box>

            <List disablePadding>
                <Grid container spacing={1}>
                    {services.map((svc, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={idx}>
                            <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>{svc.name}</Typography>
                                    <Typography variant="caption" color="textSecondary">Price: {currencySymbol}{svc.price}</Typography>
                                </Box>
                                <IconButton size="small" color="error" onClick={() => handleRemoveService(idx)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </List>
        </Paper>
    );
};

export default CustomServicesSettings;

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Button,
    List, ListItem, ListItemText, IconButton, Collapse, Divider
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useSettings } from '../../contexts/SettingsContext';
import toast from 'react-hot-toast';

const MakesAndModelsSettings = () => {
    const { vehicleMakes, updateVehicleMakes } = useSettings();
    const [makes, setMakes] = useState(vehicleMakes);
    const [expandedMake, setExpandedMake] = useState(null);
    const [newMakeName, setNewMakeName] = useState('');
    const [newModelName, setNewModelName] = useState('');

    useEffect(() => {
        setMakes(vehicleMakes);
    }, [vehicleMakes]);

    const handleSave = () => {
        updateVehicleMakes(makes);
        toast.success('Makes and Models updated!');
    };

    const handleAddMake = () => {
        if (!newMakeName.trim()) return;
        const newMake = {
            id: newMakeName.toLowerCase().replace(/\s+/g, '_'),
            name: newMakeName,
            models: ['Other']
        };
        setMakes([...makes, newMake]);
        setNewMakeName('');
    };

    const handleRemoveMake = (id) => {
        setMakes(makes.filter(m => m.id !== id));
    };

    const handleAddModel = (makeId) => {
        if (!newModelName.trim()) return;
        setMakes(makes.map(m => {
            if (m.id === makeId) {
                const models = [...m.models.filter(mod => mod !== 'Other'), newModelName, 'Other'];
                return { ...m, models };
            }
            return m;
        }));
        setNewModelName('');
    };

    const handleRemoveModel = (makeId, modelName) => {
        setMakes(makes.map(m => {
            if (m.id === makeId) {
                return { ...m, models: m.models.filter(mod => mod !== modelName) };
            }
            return m;
        }));
    };

    return (
        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mt: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Makes & Models Configuration</Typography>
                    <Typography variant="caption" color="textSecondary">Manage the vehicle makes and models available in the system.</Typography>
                </Box>
                <Button variant="contained" size="small" onClick={handleSave}>Save Changes</Button>
            </Box>

            <Box display="flex" gap={2} mb={2}>
                <TextField size="small" label="New Make Name" value={newMakeName} onChange={e => setNewMakeName(e.target.value)} />
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddMake}>Add Make</Button>
            </Box>

            <List disablePadding>
                {makes.map((make) => (
                    <Box key={make.id} sx={{ mb: 1, border: '1px solid #eee', borderRadius: '8px' }}>
                        <ListItem
                            secondaryAction={
                                <IconButton edge="end" color="error" onClick={() => handleRemoveMake(make.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                            sx={{ bgcolor: 'grey.50', borderRadius: '8px' }}
                        >
                            <IconButton onClick={() => setExpandedMake(expandedMake === make.id ? null : make.id)} size="small" sx={{ mr: 1 }}>
                                {expandedMake === make.id ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                            <ListItemText primary={make.name} secondary={`${make.models.length} models`} />
                        </ListItem>
                        <Collapse in={expandedMake === make.id} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                                <Box display="flex" gap={2} mb={2}>
                                    <TextField size="small" label="New Model Name" value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => handleAddModel(make.id)}>Add Model</Button>
                                </Box>
                                <Grid container spacing={1}>
                                    {make.models.map((model, idx) => (
                                        <Grid item xs={12} sm={6} md={4} key={idx}>
                                            <Paper variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2">{model}</Typography>
                                                {model !== 'Other' && (
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveModel(make.id, model)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
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

export default MakesAndModelsSettings;

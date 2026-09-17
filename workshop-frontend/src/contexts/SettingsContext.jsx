import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { VEHICLE_MAKES } from '../utils/vehicleMakes';

const SettingsContext = createContext();

const safeParse = (val, fallback) => {
    if (!val) return fallback;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch (e) {
            console.error('Error parsing settings field', e);
            return fallback;
        }
    }
    return val;
};

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        currency_symbol: 'Rs.',
        currency_code: 'LKR',
    });
    const [loading, setLoading] = useState(true);

    const [vehicleMakes, setVehicleMakes] = useState(() => {
        const stored = localStorage.getItem('vehicle_makes_config');
        return stored ? safeParse(stored, VEHICLE_MAKES) : VEHICLE_MAKES;
    });

    const [servicePurposeMap, setServicePurposeMap] = useState(() => {
        const stored = localStorage.getItem('service_purpose_map');
        return stored ? safeParse(stored, null) || {
            "Free Service": [{ name: "General Inspection", price: 0 }, { name: "Wash & Clean", price: 0 }],
            "Full Service": [{ name: "Full Service", price: 2500 }, { name: "Oil Change & Filter", price: 1200 }],
            "Accident": [{ name: "Damage Assessment", price: 1000 }, { name: "Panel Beating", price: 5000 }],
            "Repair": [{ name: "Engine Tuning", price: 1500 }, { name: "Electrical System Diagnostics", price: 1000 }],
            "Other": []
        } : {
            "Free Service": [{ name: "General Inspection", price: 0 }, { name: "Wash & Clean", price: 0 }],
            "Full Service": [{ name: "Full Service", price: 2500 }, { name: "Oil Change & Filter", price: 1200 }],
            "Accident": [{ name: "Damage Assessment", price: 1000 }, { name: "Panel Beating", price: 5000 }],
            "Repair": [{ name: "Engine Tuning", price: 1500 }, { name: "Electrical System Diagnostics", price: 1000 }],
            "Other": []
        };
    });

    const [customServices, setCustomServices] = useState(() => {
        const stored = localStorage.getItem('custom_services_config');
        return stored ? safeParse(stored, []) : [
            { name: "Chain Lubrication", price: 150 },
            { name: "Carburetor Clean", price: 500 },
            { name: "Brake Pad Replacement", price: 350 }
        ];
    });

    const fetchSettings = useCallback(async () => {
        try {
            const res = await api.get('/system-settings', { skipAuthToast: true });
            if (res.data) {
                const fetchedData = res.data.settings || res.data;
                setSettings(prev => ({ ...prev, ...fetchedData }));
                
                if (fetchedData.service_purpose_map) {
                    const parsed = safeParse(fetchedData.service_purpose_map, null);
                    if (parsed) {
                        setServicePurposeMap(parsed);
                        localStorage.setItem('service_purpose_map', JSON.stringify(parsed));
                    }
                }
                if (fetchedData.vehicle_makes_config) {
                    const parsed = safeParse(fetchedData.vehicle_makes_config, null);
                    if (parsed) {
                        setVehicleMakes(parsed);
                        localStorage.setItem('vehicle_makes_config', JSON.stringify(parsed));
                    }
                }
                if (fetchedData.custom_services_config) {
                    const parsed = safeParse(fetchedData.custom_services_config, null);
                    if (parsed) {
                        setCustomServices(parsed);
                        localStorage.setItem('custom_services_config', JSON.stringify(parsed));
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to load system settings, using defaults');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettings = async (newSettings) => {
        const payload = { ...settings, ...newSettings };
        if (servicePurposeMap) payload.service_purpose_map = JSON.stringify(servicePurposeMap);
        if (vehicleMakes) payload.vehicle_makes_config = JSON.stringify(vehicleMakes);
        if (customServices) payload.custom_services_config = JSON.stringify(customServices);

        const res = await api.put('/system-settings', { settings: payload });
        if (res.data) {
            const fetchedData = res.data.settings || res.data;
            setSettings(prev => ({ ...prev, ...fetchedData }));
            if (fetchedData.service_purpose_map) {
                const parsed = safeParse(fetchedData.service_purpose_map, null);
                if (parsed) setServicePurposeMap(parsed);
            }
            if (fetchedData.vehicle_makes_config) {
                const parsed = safeParse(fetchedData.vehicle_makes_config, null);
                if (parsed) setVehicleMakes(parsed);
            }
            if (fetchedData.custom_services_config) {
                const parsed = safeParse(fetchedData.custom_services_config, null);
                if (parsed) setCustomServices(parsed);
            }
        }
        return res.data;
    };

    const updateVehicleMakes = async (makes) => {
        setVehicleMakes(makes);
        localStorage.setItem('vehicle_makes_config', JSON.stringify(makes));
        try {
            const payload = { ...settings };
            payload.vehicle_makes_config = JSON.stringify(makes);
            if (servicePurposeMap) payload.service_purpose_map = JSON.stringify(servicePurposeMap);
            if (customServices) payload.custom_services_config = JSON.stringify(customServices);
            await api.put('/system-settings', { settings: payload });
        } catch (e) {
            console.warn('Could not sync vehicle makes to backend', e);
        }
    };

    const updateServicePurposeMap = async (map) => {
        setServicePurposeMap(map);
        localStorage.setItem('service_purpose_map', JSON.stringify(map));
        try {
            const payload = { ...settings };
            payload.service_purpose_map = JSON.stringify(map);
            if (vehicleMakes) payload.vehicle_makes_config = JSON.stringify(vehicleMakes);
            if (customServices) payload.custom_services_config = JSON.stringify(customServices);
            await api.put('/system-settings', { settings: payload });
        } catch (e) {
            console.warn('Could not sync service purpose map to backend', e);
        }
    };

    const updateCustomServices = async (services) => {
        setCustomServices(services);
        localStorage.setItem('custom_services_config', JSON.stringify(services));
        try {
            const payload = { ...settings };
            payload.custom_services_config = JSON.stringify(services);
            if (servicePurposeMap) payload.service_purpose_map = JSON.stringify(servicePurposeMap);
            if (vehicleMakes) payload.vehicle_makes_config = JSON.stringify(vehicleMakes);
            await api.put('/system-settings', { settings: payload });
        } catch (e) {
            console.warn('Could not sync custom services to backend', e);
        }
    };

    const currencySymbol = settings.currency_symbol || 'Rs.';
    const currencyCode = settings.currency_code || 'LKR';
    const revenueVisibility = settings.revenue_visibility || 'everyone';

    return (
        <SettingsContext.Provider value={{
            settings,
            currencySymbol,
            currencyCode,
            revenueVisibility,
            vehicleMakes,
            updateVehicleMakes,
            servicePurposeMap,
            updateServicePurposeMap,
            customServices,
            updateCustomServices,
            updateSettings,
            refreshSettings: fetchSettings,
            loading,
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

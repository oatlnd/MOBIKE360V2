import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

/**
 * ProtectedRoute
 * - Redirects to /login if not authenticated
 * - If `permission` is given AND `anyPermissions` is given: grants access if user has either
 * - If only `permission`: requires that exact permission
 * - If only `anyPermissions`: requires at least one from the list
 * - All denials redirect silently to /dashboard
 */
const ProtectedRoute = ({ children, permission, anyPermissions }) => {
    const { isAuthenticated, loading, hasPermission, hasAnyPermission } = useAuth();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Determine access
    const granted = (() => {
        if (!permission && !anyPermissions) return true; // no restriction
        if (anyPermissions?.length) return hasAnyPermission(anyPermissions);
        if (permission) return hasPermission(permission);
        return false;
    })();

    if (!granted) return <Navigate to="/dashboard" replace />;

    return children;
};

export default ProtectedRoute;
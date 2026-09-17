import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const queryClient = useQueryClient();
    const [user, setUser]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) fetchUser();
        else setLoading(false);
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await api.get('/user');
            setUser(response.data);
        } catch {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (identifier, password) => {
        try {
            // Clear any stale cached data from a previous session before setting the new user
            queryClient.clear();
            const response = await api.post('/login', { identifier, password });
            const { access_token, user } = response.data;
            localStorage.setItem('token', access_token);
            setToken(access_token);
            setUser(user);
            toast.success('Login successful!');
            return { success: true };
        } catch (error) {
            toast.error('Invalid credentials');
            return { success: false, error: error.response?.data?.message };
        }
    };

    const logout = async () => {
        try { await api.post('/logout'); } catch {}
        finally {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            // Clear ALL react-query cached data so the next user starts with a clean slate
            queryClient.clear();
            toast.success('Logged out');
        }
    };

    /** Check if the logged-in user has a specific permission */
    const hasPermission = (permission) => {
        if (!user) return false;
        if (hasRole('admin')) return true;
        const perms = user.permissions ?? [];
        return Array.isArray(perms) ? perms.includes(permission) : false;
    };

    /** Check if the logged-in user has AT LEAST ONE of the given permissions */
    const hasAnyPermission = (permissions = []) => {
        if (!user) return false;
        if (hasRole('admin')) return true;
        const perms = user.permissions ?? [];
        return Array.isArray(perms) ? permissions.some((p) => perms.includes(p)) : false;
    };

    /** Check if the logged-in user has a specific role (case-insensitive) */
    const hasRole = (role) => {
        if (!user) return false;
        const roles = user.roles ?? [];
        return roles.some(r => r.name?.toLowerCase() === role?.toLowerCase());
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        hasAnyPermission,
        hasRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';

const Login     = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const JobCards  = lazy(() => import('./pages/JobCards'));
const NewJobCard = lazy(() => import('./pages/NewJobCard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Invoices  = lazy(() => import('./pages/Invoices'));
const Reports   = lazy(() => import('./pages/Reports'));
const Settings  = lazy(() => import('./pages/Settings'));
const LiveBoard = lazy(() => import('./pages/LiveBoard'));
const Payroll   = lazy(() => import('./pages/Payroll'));
const JobCardPrint = lazy(() => import('./components/job-cards/JobCardPrint'));

const LoadingSpinner = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
    </Box>
);

function App() {
    return (
        <AuthProvider>
            <LanguageProvider>
                <SettingsProvider>
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        {/* Print Job Card - No Layout */}
                        <Route
                            path="/job-cards/:id/print"
                            element={
                                <ProtectedRoute anyPermissions={['view job cards', 'view_live_board']}>
                                    <JobCardPrint />
                                </ProtectedRoute>
                            }
                        />

                        {/* Standalone Live TV Display - No Sidebar */}
                        <Route
                            path="/live-tv"
                            element={
                                <ProtectedRoute anyPermissions={['view_live_board', 'view job cards']}>
                                    <LiveBoard />
                                </ProtectedRoute>
                            }
                        />

                        {/* All protected pages share the Layout shell */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/dashboard" replace />} />

                            {/* Dashboard — accessible to every authenticated user */}
                            <Route path="dashboard" element={<Dashboard />} />

                            {/* Live Status Board */}
                            <Route
                                path="live-board"
                                element={
                                    <ProtectedRoute anyPermissions={['view_live_board', 'view job cards']}>
                                        <LiveBoard />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Job Cards */}
                            <Route
                                path="job-cards"
                                element={
                                    <ProtectedRoute permission="view job cards">
                                        <JobCards />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="job-cards/new"
                                element={
                                    <ProtectedRoute permission="create job cards">
                                        <NewJobCard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="job-cards/:id"
                                element={
                                    <ProtectedRoute permission="edit job cards">
                                        <NewJobCard />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Inventory — accessible with any inventory permission */}
                            <Route
                                path="inventory"
                                element={
                                    <ProtectedRoute permission="view inventory" anyPermissions={['view inventory','create inventory','edit inventory','delete inventory','adjust inventory','manage purchases']}>
                                        <Inventory />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Invoices */}
                            <Route
                                path="invoices"
                                element={
                                    <ProtectedRoute permission="view invoices">
                                        <Invoices />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Reports */}
                            <Route
                                path="reports"
                                element={
                                    <ProtectedRoute permission="view reports">
                                        <Reports />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Payroll & Attendance */}
                            <Route
                                path="payroll"
                                element={
                                    <ProtectedRoute anyPermissions={['view_payroll', 'manage_payroll', 'manage_attendance', 'manage_advances']}>
                                        <Payroll />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Settings (Always open so users can edit their profile) */}
                            <Route
                                path="settings"
                                element={
                                    <ProtectedRoute>
                                        <Settings />
                                    </ProtectedRoute>
                                }
                            />
                        </Route>

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Suspense>
                </SettingsProvider>
            </LanguageProvider>
        </AuthProvider>
    );
}

export default App;
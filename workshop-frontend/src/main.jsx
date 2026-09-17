import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster, toast } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import App from './App';
import { CustomThemeProvider } from './contexts/ThemeContext';
import './i18n';
import './styles/index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <CustomThemeProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <CssBaseline />
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <App />
                        <Toaster 
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: '#363636',
                                    color: '#fff',
                                    padding: '8px 12px 8px 16px',
                                    borderRadius: '8px',
                                },
                            }}
                        >
                            {(t) => (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#10b981' : '#334155',
                                        color: '#ffffff',
                                        padding: '10px 16px',
                                        borderRadius: '10px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        minWidth: '220px',
                                        justifyContent: 'space-between',
                                        opacity: t.visible ? 1 : 0,
                                        transition: 'opacity 100ms linear'
                                    }}
                                >
                                    <span>{t.message}</span>
                                    <button
                                        onClick={() => toast.remove(t.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: 1,
                                            marginLeft: '8px',
                                            borderRadius: '4px',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                        onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </Toaster>
                    </BrowserRouter>
                </LocalizationProvider>
            </CustomThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
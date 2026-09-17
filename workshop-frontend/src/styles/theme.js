import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => {
    const isDark = mode === 'dark';

    const primary = isDark ? '#6366f1' : '#4f46e5';
    const primaryLight = isDark ? '#818cf8' : '#6366f1';
    const primaryDark = isDark ? '#4f46e5' : '#3730a3';

    return createTheme({
        palette: {
            mode,
            primary: {
                main: primary,
                light: primaryLight,
                dark: primaryDark,
                contrastText: '#ffffff',
            },
            secondary: {
                main: isDark ? '#34d399' : '#10b981',
                light: isDark ? '#6ee7b7' : '#34d399',
                dark: isDark ? '#059669' : '#047857',
                contrastText: '#ffffff',
            },
            error: { main: isDark ? '#f87171' : '#ef4444' },
            warning: { main: isDark ? '#fbbf24' : '#f59e0b' },
            info: { main: isDark ? '#38bdf8' : '#0ea5e9' },
            success: { main: isDark ? '#34d399' : '#10b981' },
            background: {
                default: isDark ? '#0b0f19' : '#f8fafc',
                paper: isDark ? '#111827' : '#ffffff',
            },
            text: {
                primary: isDark ? '#f3f4f6' : '#1f2937',
                secondary: isDark ? '#9ca3af' : '#4b5563',
            },
            divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        },

        typography: {
            fontFamily: '"Outfit", "Inter", "Roboto", sans-serif',
            h1: { fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' },
            h2: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em' },
            h3: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
            h4: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.015em' },
            h5: { fontSize: '1.1rem', fontWeight: 600 },
            h6: { fontSize: '0.95rem', fontWeight: 600 },
            body1: { fontSize: '0.95rem', lineHeight: 1.55 },
            body2: { fontSize: '0.85rem', lineHeight: 1.6 },
            button: { fontWeight: 700, textTransform: 'none', letterSpacing: '0.01em' },
        },

        shape: { borderRadius: 12 },

        components: {
            // ─── Buttons ─────────────────────────────────────────────────────
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: '10px',
                        padding: '8px 18px',
                        fontWeight: 700,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: 'none',
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: isDark
                                ? '0 6px 16px rgba(99,102,241,0.25)'
                                : '0 6px 16px rgba(79,70,229,0.18)',
                        },
                        '&:active': { transform: 'translateY(0)' },
                    },
                    containedPrimary: {
                        background: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryDark} 100%)`,
                        '&:hover': {
                            background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
                        },
                    },
                },
            },

            // ─── Cards ───────────────────────────────────────────────────────
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        border: isDark
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid rgba(0,0,0,0.05)',
                        boxShadow: isDark
                            ? '0 4px 24px rgba(0,0,0,0.35)'
                            : '0 2px 16px rgba(0,0,0,0.04)',
                        borderRadius: 16,
                    },
                },
            },

            // ─── Paper ───────────────────────────────────────────────────────
            MuiPaper: {
                styleOverrides: { root: { backgroundImage: 'none' } },
            },

            // ─── TextField / OutlinedInput ────────────────────────────────────
            MuiTextField: {
                defaultProps: { variant: 'outlined' },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: '10px',
                        transition: 'box-shadow 0.2s, border-color 0.2s',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: primaryLight,
                        },
                        '&.Mui-focused': {
                            boxShadow: isDark
                                ? `0 0 0 3px rgba(99,102,241,0.18)`
                                : `0 0 0 3px rgba(79,70,229,0.12)`,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: primary,
                            borderWidth: '1.5px',
                        },
                        '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? '#f87171' : '#ef4444',
                        },
                    },
                    notchedOutline: {
                        borderColor: isDark
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(0,0,0,0.12)',
                        transition: 'border-color 0.2s',
                    },
                },
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        '&.Mui-focused': { color: primary },
                    },
                },
            },

            // ─── Select ──────────────────────────────────────────────────────
            MuiSelect: {
                styleOverrides: {
                    root: { borderRadius: '10px' },
                },
            },

            // ─── Dialogs ─────────────────────────────────────────────────────
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: '20px',
                        border: isDark
                            ? '1px solid rgba(255,255,255,0.08)'
                            : '1px solid rgba(0,0,0,0.06)',
                        boxShadow: isDark
                            ? '0 25px 60px rgba(0,0,0,0.6)'
                            : '0 25px 60px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                    },
                },
            },
            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        padding: '20px 24px 16px',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        letterSpacing: '-0.01em',
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(17,24,39,0) 60%)'
                            : 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(255,255,255,0) 60%)',
                        borderBottom: isDark
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid rgba(0,0,0,0.05)',
                    },
                },
            },
            MuiDialogContent: {
                styleOverrides: {
                    root: {
                        padding: '24px',
                        '&.MuiDialogContent-dividers': {
                            borderTop: isDark
                                ? '1px solid rgba(255,255,255,0.06)'
                                : '1px solid rgba(0,0,0,0.05)',
                            borderBottom: isDark
                                ? '1px solid rgba(255,255,255,0.06)'
                                : '1px solid rgba(0,0,0,0.05)',
                        },
                    },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        padding: '16px 24px',
                        gap: '8px',
                        borderTop: isDark
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid rgba(0,0,0,0.05)',
                        background: isDark
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.01)',
                    },
                },
            },

            // ─── Chips ───────────────────────────────────────────────────────
            MuiChip: {
                styleOverrides: {
                    root: {
                        fontWeight: 600,
                        borderRadius: '8px',
                    },
                },
            },

            // ─── Switch ──────────────────────────────────────────────────────
            MuiSwitch: {
                styleOverrides: {
                    root: { padding: 6 },
                    thumb: { boxShadow: 'none' },
                    track: { borderRadius: 20 },
                },
            },

            // ─── Tabs ────────────────────────────────────────────────────────
            MuiTab: {
                styleOverrides: {
                    root: {
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        minHeight: 52,
                        transition: 'color 0.2s',
                    },
                },
            },

            // ─── Tables ──────────────────────────────────────────────────────
            MuiTableHead: {
                styleOverrides: {
                    root: {
                        '& .MuiTableCell-root': {
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: isDark ? '#9ca3af' : '#6b7280',
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(0,0,0,0.02)',
                            borderBottom: isDark
                                ? '1px solid rgba(255,255,255,0.08)'
                                : '1px solid rgba(0,0,0,0.06)',
                            paddingTop: 14,
                            paddingBottom: 14,
                        },
                    },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
                        '&:hover': {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(0,0,0,0.015)',
                        },
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        fontSize: '0.875rem',
                        borderBottom: isDark
                            ? '1px solid rgba(255,255,255,0.04)'
                            : '1px solid rgba(0,0,0,0.04)',
                        padding: '14px 16px',
                    },
                },
            },

            // ─── DataGrid ────────────────────────────────────────────────────
            MuiDataGrid: {
                styleOverrides: {
                    root: {
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
                            borderBottom: 'none',
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: isDark
                                ? '1px solid rgba(255,255,255,0.05)'
                                : '1px solid rgba(0,0,0,0.04)',
                        },
                    },
                },
            },
        },
    });
};
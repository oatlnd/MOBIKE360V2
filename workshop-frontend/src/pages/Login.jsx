import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, 
    Card, 
    CardContent, 
    TextField, 
    Button, 
    Typography, 
    Alert,
    InputAdornment,
    IconButton,
    Paper,
    useTheme
} from '@mui/material';
import { 
    PersonOutlined, 
    LockOutlined, 
    Visibility, 
    VisibilityOff,
    BuildOutlined 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(identifier, password);
            if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box 
            sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh', 
                position: 'relative',
                overflow: 'hidden',
                background: isDark
                    ? 'radial-gradient(circle at 10% 20%, rgba(31, 41, 55, 1) 0%, rgba(17, 24, 39, 1) 90%)'
                    : 'radial-gradient(circle at 10% 20%, rgba(243, 244, 246, 1) 0%, rgba(229, 231, 235, 1) 90%)',
            }}
        >
            {/* Ambient Background Glow Circles */}
            <Box 
                sx={{
                    position: 'absolute',
                    width: 350,
                    height: 350,
                    borderRadius: '50%',
                    filter: 'blur(80px)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    top: '15%',
                    left: '20%',
                    animation: 'pulseGlow 6s ease-in-out infinite',
                }}
            />
            <Box 
                sx={{
                    position: 'absolute',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    filter: 'blur(70px)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    bottom: '15%',
                    right: '25%',
                    animation: 'pulseGlow 6s ease-in-out infinite',
                    animationDelay: '2s',
                }}
            />

            {/* Login Card */}
            <Paper
                elevation={isDark ? 24 : 6}
                sx={{ 
                    maxWidth: 440, 
                    width: '100%', 
                    borderRadius: 4,
                    p: 2,
                    zIndex: 10,
                    background: isDark ? 'rgba(17, 24, 39, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: isDark 
                        ? '0 20px 40px -15px rgba(0, 0, 0, 0.5)' 
                        : '0 20px 40px -15px rgba(0, 0, 0, 0.05)',
                }}
                className="animate-fade-in-up"
            >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    {/* Header/Logo */}
                    <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
                        <Box 
                            sx={{ 
                                width: 56, 
                                height: 56, 
                                borderRadius: 3, 
                                bgcolor: theme.palette.primary.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 8px 16px rgba(79, 70, 229, 0.25)`,
                                mb: 2
                            }}
                        >
                            <BuildOutlined sx={{ color: '#ffffff', fontSize: 30 }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.03em' }}>
                            Ratnam Service Station
                        </Typography>
                        <Typography variant="body2" color="textSecondary" textAlign="center">
                            Workshop Management System
                        </Typography>
                    </Box>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Username or Email"
                            type="text"
                            margin="normal"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="e.g. JOHNDOE or admin@workshop.com"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                }
                            }}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                }
                            }}
                            required
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 2.5, borderRadius: '10px' }}>
                                {error}
                            </Alert>
                        )}

                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            sx={{ 
                                mt: 4, 
                                py: 1.5,
                                fontSize: '1rem',
                                borderRadius: '12px',
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                boxShadow: `0 4px 14px rgba(79, 70, 229, 0.4)`,
                                '&:hover': {
                                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                                }
                            }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Paper>
        </Box>
    );
};

export default Login;
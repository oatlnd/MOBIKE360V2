import React, { useState } from 'react';
import { Box } from '@mui/material';

const LazyImage = ({ src, alt, sx, ...props }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    return (
        <Box
            sx={{
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'grey.200',
                ...sx,
            }}
        >
            {!loaded && !error && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'grey.300',
                        filter: 'blur(10px)',
                        animation: 'pulse 1.5s infinite ease-in-out',
                        '@keyframes pulse': {
                            '0%': { opacity: 0.6 },
                            '50%': { opacity: 1 },
                            '100%': { opacity: 0.6 },
                        },
                    }}
                />
            )}
            <Box
                component="img"
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={() => {
                    setLoaded(true);
                    setError(true);
                }}
                sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out',
                    ...(error && { display: 'none' }),
                }}
                {...props}
            />
            {error && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                        typography: 'caption',
                    }}
                >
                    Failed to load
                </Box>
            )}
        </Box>
    );
};

export default LazyImage;

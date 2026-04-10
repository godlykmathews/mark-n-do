'use client';

import { useEffect } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
          Oops! Something went wrong
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          {error.message || 'An unexpected error occurred'}
        </Typography>
        {error.digest && (
          <Typography variant="caption" sx={{ mb: 2, fontFamily: 'monospace' }}>
            Error ID: {error.digest}
          </Typography>
        )}
        <Button
          variant="contained"
          disableElevation
          onClick={() => reset()}
        >
          Try again
        </Button>
      </Box>
    </Container>
  );
}

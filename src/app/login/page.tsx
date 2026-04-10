'use client';

import { useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container,
  Alert
} from '@mui/material';
import Image from 'next/image';
import GoogleIcon from '@mui/icons-material/Google';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // AuthContext will handle redirect
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Authentication failed');
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={0} sx={{ 
        width: '100%', 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ mb: 3, position: 'relative', width: 64, height: 64 }}>
           {/* Fallback to text if image not found during dev */}
          <Image 
            src="/logo.png" 
            alt="Mark'n'Do Logo" 
            fill
            style={{ objectFit: 'contain' }}
            priority
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </Box>
        
        <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold' }} gutterBottom>
          Mark'n'Do
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Sign in to access your nested folders and tasks
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          disableElevation
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          sx={{ 
            py: 1.5, 
            borderRadius: 2, 
            bgcolor: 'background.default', 
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Sign in with Google'}
        </Button>
      </Paper>
    </Container>
  );
}
'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useMemo, useState, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';

export function Providers({ children }: { children: React.ReactNode }) {
  // We'll implement a toggle later, for now we respect system pref
  // per the requirements "with dark/white mode hidden setting"
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mounted && prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: '#000000', // Minimalist Black
            // Dark mode overrides
            ...(mounted && prefersDarkMode && {
              main: '#ffffff',
            }),
          },
          background: {
            default: mounted && prefersDarkMode ? '#121212' : '#ffffff',
            paper: mounted && prefersDarkMode ? '#1e1e1e' : '#f5f5f5',
          },
        },
        typography: {
          fontFamily: 'inherit',
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
              },
            },
          },
        },
      }),
    [mounted, prefersDarkMode],
  );

  // Prevent flash of unstyled/incorrect theme on SSR
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (typeof window === 'undefined') return;
    
    // Ensure persistence is set to local (default, but good to be explicit for the requirement)
    import('@/lib/firebase').then(({ auth }) => {
      if (!auth || !Object.keys(auth).length) {
        console.warn('Firebase auth is not properly initialized');
        setLoading(false);
        return;
      }

      setPersistence(auth, browserLocalPersistence)
        .then(() => {
          unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
            
            if (user && pathname === '/login') {
              router.push('/');
            } else if (!user && pathname !== '/login') {
              router.push('/login');
            }
          });
        })
        .catch((error) => {
          console.error("Auth persistence error:", error);
          setLoading(false);
        });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
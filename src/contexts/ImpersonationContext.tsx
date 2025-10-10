import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  setImpersonatedUser: (userId: string | null, userName: string | null) => void;
  isImpersonating: boolean;
  actualUserId: string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);
  const [actualUserId, setActualUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadActualUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setActualUserId(user?.id || null);
    };
    loadActualUser();
  }, []);

  const setImpersonatedUser = (userId: string | null, userName: string | null) => {
    setImpersonatedUserId(userId);
    setImpersonatedUserName(userName);
    
    if (userId) {
      sessionStorage.setItem('impersonatedUserId', userId);
      sessionStorage.setItem('impersonatedUserName', userName || '');
    } else {
      sessionStorage.removeItem('impersonatedUserId');
      sessionStorage.removeItem('impersonatedUserName');
    }
    
    window.location.reload();
  };

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('impersonatedUserId');
    const storedUserName = sessionStorage.getItem('impersonatedUserName');
    if (storedUserId) {
      setImpersonatedUserId(storedUserId);
      setImpersonatedUserName(storedUserName);
    }
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId,
        impersonatedUserName,
        setImpersonatedUser,
        isImpersonating: !!impersonatedUserId,
        actualUserId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
};

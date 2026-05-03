import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, signOut as supabaseSignOut } from '../services/supabase';
import { authApi } from '../services/api';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || 'Usuario',
          email: session.user.email,
          currency: session.user.user_metadata?.currency || 'USD',
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || 'Usuario',
          email: session.user.email,
          currency: session.user.user_metadata?.currency || 'USD',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const register = async (name, email, password, currency) => {
    const { user: newUser } = await authApi.register(name, email, password, currency);
    setUser(newUser);
    return newUser;
  };

  const login = async (email, password) => {
    const { user: newUser } = await authApi.login(email, password);
    setUser(newUser);
    return newUser;
  };

  const continueAsGuest = async () => {
    const { user: newUser } = await authApi.guest();
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await supabaseSignOut();
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, loading, register, login, continueAsGuest, logout }}>
      {children}
    </AppContext.Provider>
  );
};

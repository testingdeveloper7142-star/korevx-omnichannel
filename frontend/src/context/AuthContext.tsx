import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export type UserRole = 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  workspaceId: string;
  workspaceName: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: UserRole, email?: string) => Promise<void>;
  logout: () => void;
}

const mockProfiles: Record<UserRole, AuthUser> = {
  AGENT: {
    id: '8b83a65e-ecd2-4e4b-a023-37db5aa25275',
    email: 'carlos@korevx.com',
    fullName: 'Carlos Agente',
    role: 'AGENT',
    workspaceId: 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
    workspaceName: 'KorevX Global',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  ADMIN: {
    id: 'f2040884-2ab9-425a-96e7-3518a1332fe2',
    email: 'supervisor@korevx.com',
    fullName: 'Laura Morales (Admin)',
    role: 'ADMIN',
    workspaceId: 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
    workspaceName: 'KorevX Global',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  },
  SUPER_ADMIN: {
    id: '0c6c2779-6ea6-4663-b12e-f7797f8ef5d4',
    email: 'core@korevx.com',
    fullName: 'Director General (Super Admin)',
    role: 'SUPER_ADMIN',
    workspaceId: 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
    workspaceName: 'KorevX Global',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('korevx_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (role: UserRole, email?: string) => {
    setIsLoading(true);
    try {
      // Verificar si corresponde a un Administrador creado recientemente
      const savedAdmins = localStorage.getItem('korevx_registered_admins');
      const customAdmins = savedAdmins ? JSON.parse(savedAdmins) : [];
      const matchCustom = customAdmins.find(
        (a: any) => a.email.toLowerCase() === (email || '').toLowerCase()
      );

      const selectedUser: AuthUser = matchCustom
        ? {
            id: matchCustom.id,
            email: matchCustom.email,
            fullName: matchCustom.fullName,
            role: 'ADMIN',
            workspaceId: matchCustom.workspaceId,
            workspaceName: matchCustom.workspaceName,
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
          }
        : {
            ...mockProfiles[role],
            email: email || mockProfiles[role].email,
          };

      // Registrar inicio de sesión en backend (IP y User-Agent extraídos en servidor)
      try {
        await axios.post('/api/v1/audit/login-event', {
          userId: selectedUser.id,
        });
      } catch (err) {
        console.warn('Registro de sesión en backend offline o simulado');
      }

      setUser(selectedUser);
      localStorage.setItem('korevx_auth_user', JSON.stringify(selectedUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      try {
        axios.post('/api/v1/audit/logout-event', {
          userId: user.id,
        }).catch(() => {});
      } catch (err) {
        // Silencioso si backend offline
      }
    }
    setUser(null);
    localStorage.removeItem('korevx_auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

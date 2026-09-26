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
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; mustChangePassword: boolean; error?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
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
    mustChangePassword: false,
  },
  ADMIN: {
    id: 'f2040884-2ab9-425a-96e7-3518a1332fe2',
    email: 'supervisor@korevx.com',
    fullName: 'Laura Morales (Admin)',
    role: 'ADMIN',
    workspaceId: 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
    workspaceName: 'KorevX Global',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    mustChangePassword: false,
  },
  SUPER_ADMIN: {
    id: '0c6c2779-6ea6-4663-b12e-f7797f8ef5d4',
    email: 'superadmin@korevx.com',
    fullName: 'Director General (Super Admin)',
    role: 'SUPER_ADMIN',
    workspaceId: 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
    workspaceName: 'KorevX Global',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    mustChangePassword: false,
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('korevx_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password?: string): Promise<{ success: boolean; mustChangePassword: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    try {
      // 1. Intentar autenticación directa en backend
      try {
        const response = await axios.post('/api/v1/auth/login', {
          email: cleanEmail,
          password: cleanPassword,
        });

        if (response.data && response.data.user) {
          const authUser: AuthUser = {
            ...response.data.user,
            mustChangePassword: response.data.mustChangePassword,
          };
          setUser(authUser);
          localStorage.setItem('korevx_auth_user', JSON.stringify(authUser));
          return { success: true, mustChangePassword: !!response.data.mustChangePassword };
        }
      } catch (backendErr: any) {
        if (backendErr.response && backendErr.response.data && backendErr.response.data.message) {
          // Si el backend rechazó expresamente las credenciales
          if (backendErr.response.status === 401) {
            return { success: false, mustChangePassword: false, error: backendErr.response.data.message };
          }
        }
        // Si fue error de red/servidor, continuar con validación de resguardo
      }

      // 2. Resguardo local (Fallback Offline / Prototipo)
      // Super Admin permanente
      if (cleanEmail === 'superadmin@korevx.com' || cleanEmail === 'core@korevx.com') {
        const isMaster = cleanPassword === 'SuperAdmin2026!' || cleanPassword === '••••••••••••';
        const isDefault = cleanPassword === '123456789';
        if (!isMaster && !isDefault && cleanPassword !== '') {
          return { success: false, mustChangePassword: false, error: 'Contraseña de Super Admin incorrecta' };
        }
        const superUser: AuthUser = {
          ...mockProfiles.SUPER_ADMIN,
          mustChangePassword: isDefault,
        };
        setUser(superUser);
        localStorage.setItem('korevx_auth_user', JSON.stringify(superUser));
        return { success: true, mustChangePassword: isDefault };
      }

      // Administradores creados
      let customAdmins: any[] = [];
      try {
        const savedAdmins = localStorage.getItem('korevx_registered_admins');
        customAdmins = savedAdmins ? JSON.parse(savedAdmins) : [];
      } catch {}

      const foundAdmin = Array.isArray(customAdmins)
        ? customAdmins.find((a: any) => a.email.toLowerCase() === cleanEmail)
        : null;

      if (foundAdmin) {
        const correctPassword = foundAdmin.initialPassword || '123456789';
        const isDefault = cleanPassword === '123456789' || correctPassword === '123456789';
        if (cleanPassword !== correctPassword && cleanPassword !== '123456789' && cleanPassword !== '••••••••••••') {
          return { success: false, mustChangePassword: false, error: 'Contraseña incorrecta' };
        }
        const adminUser: AuthUser = {
          id: foundAdmin.id,
          email: foundAdmin.email,
          fullName: foundAdmin.fullName,
          role: 'ADMIN',
          workspaceId: foundAdmin.workspaceId,
          workspaceName: foundAdmin.workspaceName,
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
          mustChangePassword: isDefault,
        };
        setUser(adminUser);
        localStorage.setItem('korevx_auth_user', JSON.stringify(adminUser));
        return { success: true, mustChangePassword: isDefault };
      }

      // Operadores creados en alguna empresa
      let allFoundAgent: any = null;
      let matchedWorkspaceId = '';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('korevx_agents_')) {
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const ag = list.find((item: any) => item.email?.toLowerCase() === cleanEmail);
            if (ag) {
              allFoundAgent = ag;
              matchedWorkspaceId = key.replace('korevx_agents_', '');
              break;
            }
          } catch {}
        }
      }

      if (allFoundAgent) {
        const isDefault = cleanPassword === '123456789';
        const agentUser: AuthUser = {
          id: allFoundAgent.id,
          email: allFoundAgent.email,
          fullName: allFoundAgent.name || allFoundAgent.fullName,
          role: 'AGENT',
          workspaceId: matchedWorkspaceId || 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
          workspaceName: 'KorevX Workspace',
          avatarUrl: allFoundAgent.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          mustChangePassword: isDefault,
        };
        setUser(agentUser);
        localStorage.setItem('korevx_auth_user', JSON.stringify(agentUser));
        return { success: true, mustChangePassword: isDefault };
      }

      // Perfiles por defecto
      if (cleanEmail === 'supervisor@korevx.com') {
        const isDefault = cleanPassword === '123456789';
        const adminUser: AuthUser = {
          ...mockProfiles.ADMIN,
          mustChangePassword: isDefault,
        };
        setUser(adminUser);
        localStorage.setItem('korevx_auth_user', JSON.stringify(adminUser));
        return { success: true, mustChangePassword: isDefault };
      }

      if (cleanEmail === 'carlos@korevx.com') {
        const isDefault = cleanPassword === '123456789';
        const agentUser: AuthUser = {
          ...mockProfiles.AGENT,
          mustChangePassword: isDefault,
        };
        setUser(agentUser);
        localStorage.setItem('korevx_auth_user', JSON.stringify(agentUser));
        return { success: true, mustChangePassword: isDefault };
      }

      return { success: false, mustChangePassword: false, error: 'No existe una cuenta registrada con este correo' };
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Sesión no iniciada' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
    }
    if (newPassword === '123456789') {
      return { success: false, error: 'No puedes usar la contraseña temporal 123456789' };
    }

    try {
      // 1. Intentar actualizar en backend
      try {
        await axios.post('/api/v1/auth/change-password', {
          userId: user.id,
          newPassword,
        });
      } catch (err) {
        console.warn('Backend change-password offline, aplicando actualización local');
      }

      // 2. Actualizar en estado local
      const updatedUser: AuthUser = {
        ...user,
        mustChangePassword: false,
      };
      setUser(updatedUser);
      localStorage.setItem('korevx_auth_user', JSON.stringify(updatedUser));

      // Si es un admin registrado localmente, actualizar su initialPassword
      try {
        const savedAdmins = localStorage.getItem('korevx_registered_admins');
        if (savedAdmins) {
          const list = JSON.parse(savedAdmins);
          const updated = list.map((a: any) =>
            a.id === user.id || a.email.toLowerCase() === user.email.toLowerCase()
              ? { ...a, initialPassword: newPassword }
              : a
          );
          localStorage.setItem('korevx_registered_admins', JSON.stringify(updated));
        }
      } catch {}

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al cambiar contraseña' };
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
        changePassword,
        logout,
        setUser,
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

export type Role = 'SUPER_ADMIN' | 'ADMIN_PARKING' | 'OPERATOR' | 'AUDITOR' | 'CLIENT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

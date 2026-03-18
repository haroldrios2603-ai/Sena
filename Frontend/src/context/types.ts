export type Role = 'SUPER_ADMIN' | 'ADMIN_PARKING' | 'OPERATOR' | 'AUDITOR' | 'CLIENT';

export type DocumentType = 'CEDULA' | 'TARJETA_IDENTIDAD' | 'NIT' | 'PASAPORTE' | 'PEP';

export interface User {
  id: string;
  email: string;
  fullName: string;
  contactPhone?: string | null;
  role: Role;
  permissions?: string[];
  isActive: boolean;
  documentType?: DocumentType | null;
  documentNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

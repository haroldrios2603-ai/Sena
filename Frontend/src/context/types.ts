/**
 * Definiciones de tipos de datos usados por el contexto de autenticación.
 */
/**
 * Tipo Role para definir la estructura de datos utilizada en context.
 */
/**
 * Tipo Role para definir la estructura de datos utilizada en context.
 */
/**
 * Tipo Role para definir la estructura de datos utilizada en context.
 */
export type Role = 'SUPER_ADMIN' | 'ADMIN_PARKING' | 'OPERATOR' | 'AUDITOR' | 'CLIENT';

/**
 * Tipo DocumentType para definir la estructura de datos utilizada en context.
 */
/**
 * Tipo DocumentType para definir la estructura de datos utilizada en context.
 */
/**
 * Tipo DocumentType para definir la estructura de datos utilizada en context.
 */
export type DocumentType = 'CEDULA' | 'TARJETA_IDENTIDAD' | 'NIT' | 'PASAPORTE' | 'PEP';

/**
 * Interfaz User que define la forma de datos usada en context.
 */
/**
 * Interfaz User que define la forma de datos usada en context.
 */
/**
 * Interfaz User que define la forma de datos usada en context.
 */
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

/**
 * Interfaz AuthContextType que define la forma de datos usada en context.
 */
/**
 * Interfaz AuthContextType que define la forma de datos usada en context.
 */
/**
 * Interfaz AuthContextType que define la forma de datos usada en context.
 */
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

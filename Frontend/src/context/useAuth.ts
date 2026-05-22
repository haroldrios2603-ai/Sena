/**
 * Archivo fuente que requiere comentarios descriptivos.
 */
import { useContext } from 'react';
import { AuthContext } from './authContextInstance';

/**
 * Constante useAuth utilizada en la configuración o la lógica de context.
 */
/**
 * Constante useAuth utilizada en la configuración o la lógica de context.
 */
/**
 * Constante useAuth utilizada en la configuración o la lógica de context.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};

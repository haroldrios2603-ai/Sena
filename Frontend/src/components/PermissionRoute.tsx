import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { hasScreenPermission } from '../permissions';

interface PermissionRouteProps {
    requiredScreen: string;
}

const PermissionRoute = ({ requiredScreen }: PermissionRouteProps) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="loading-spinner">Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const allowed = hasScreenPermission(user.role, user.permissions, requiredScreen);

    if (!allowed) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default PermissionRoute;

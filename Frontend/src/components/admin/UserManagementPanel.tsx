import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, ShieldCheck, UserPlus, RefreshCw, Power } from 'lucide-react';
import usersService, { type UserFilters, type CreateUserPayload } from '../../services/users.service';
import type { Role, User } from '../../context/types';

interface MessageState {
    text: string;
    type: 'success' | 'error' | '';
}

const assignableRoles: Role[] = [
    'SUPER_ADMIN',
    'ADMIN_PARKING',
    'OPERATOR',
    'AUDITOR',
];

const filterRoles: Role[] = [...assignableRoles, 'CLIENT'];

const roleLabels: Record<Role, string> = {
    SUPER_ADMIN: 'Super admin',
    ADMIN_PARKING: 'Administrador sede',
    OPERATOR: 'Operador',
    AUDITOR: 'Auditor',
    CLIENT: 'Cliente',
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
};

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/;
const PASSWORD_POLICY_MESSAGE =
    'La contraseña debe contener mayúsculas, minúsculas, números y un carácter especial';

const UserManagementPanel = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [rowLoading, setRowLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });
    const [creating, setCreating] = useState(false);
    const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [formData, setFormData] = useState<CreateUserPayload>({
        fullName: '',
        email: '',
        password: '',
        role: 'OPERATOR',
    });
    const isMounted = useRef(true);

    useEffect(() => {
        // ES: React 18 re-monta componentes en desarrollo; aseguramos que el flag esté alineado con el ciclo actual.
        isMounted.current = true;
        return () => {
            // ES: Sincronizamos un flag para evitar setState luego de desmontar y prevenir fugas de memoria.
            isMounted.current = false;
        };
    }, []);

    const filters: UserFilters | undefined = useMemo(() => {
        const params: UserFilters = {};
        if (roleFilter !== 'ALL') {
            params.role = roleFilter;
        }
        if (statusFilter !== 'ALL') {
            params.isActive = statusFilter === 'ACTIVE' ? 'true' : 'false';
        }
        return Object.keys(params).length ? params : undefined;
    }, [roleFilter, statusFilter]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await usersService.listUsers(filters);
            if (!isMounted.current) {
                // ES: Si la vista ya se desmontó ignoramos la respuesta para evitar estados inconsistentes.
                return;
            }
            setUsers(data);
        } catch (error) {
            if (isMounted.current) {
                // ES: Solo notificamos errores cuando el componente sigue activo; de lo contrario no hay quien los vea.
                setMessage({
                    text: getErrorMessage(error, 'No se pudo cargar la lista de usuarios'),
                    type: 'error',
                });
            }
        } finally {
            if (isMounted.current) {
                // ES: El indicador de carga se cierra con cada intento de sincronización.
                setLoading(false);
            }
        }
    }, [filters]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const isPasswordValid = useMemo(() => PASSWORD_POLICY.test(formData.password), [formData.password]);
    const isFormReady = useMemo(() => {
        return (
            formData.fullName.trim().length >= 2 &&
            formData.email.trim().length > 0 &&
            formData.password.length >= 8
        );
    }, [formData.fullName, formData.email, formData.password]);
    const canSubmit = isFormReady && isPasswordValid;

    const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage({ text: '', type: '' });
        if (creating) {
            // ES: Evitamos envíos duplicados que saturen el backend cuando el botón se presiona varias veces.
            return;
        }
        if (!isPasswordValid) {
            // ES: La validación local evita viajes innecesarios al backend y aclara el requisito.
            setMessage({ text: PASSWORD_POLICY_MESSAGE, type: 'error' });
            return;
        }
        setCreating(true);
        try {
            // ES: Se limpia entrada del formulario antes de enviarla para evitar espacios y errores de unicidad.
            const payload: CreateUserPayload = {
                fullName: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: formData.role,
            };
            await usersService.createUser(payload);
            setFormData({ fullName: '', email: '', password: '', role: 'OPERATOR' });

            const shouldResetRoleFilter = roleFilter !== 'ALL' && roleFilter !== payload.role;
            const shouldResetStatusFilter = statusFilter === 'INACTIVE';

            if (shouldResetRoleFilter) {
                // ES: Se restablece el filtro para que el nuevo usuario sea visible inmediatamente.
                setRoleFilter('ALL');
            }
            if (shouldResetStatusFilter) {
                // ES: Todos los usuarios nuevos nacen activos; al mostrar solo inactivos no aparecerían.
                setStatusFilter('ALL');
            }

            if (shouldResetRoleFilter || shouldResetStatusFilter) {
                setMessage({
                    text: 'Usuario creado. Ajusté los filtros para mostrarlo en la tabla.',
                    type: 'success',
                });
                // ES: El useEffect que depende de los filtros recargará la lista automáticamente.
            } else {
                setMessage({ text: 'Usuario creado exitosamente', type: 'success' });
                await loadUsers();
            }
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'Error al crear el usuario'),
                type: 'error',
            });
        } finally {
            setCreating(false);
        }
    };

    const handleRoleUpdate = async (userId: string, role: Role) => {
        if (rowLoading === userId || users.find((item) => item.id === userId)?.role === role) {
            // ES: Se evita invocar el backend cuando el rol no cambia o la fila ya está en proceso.
            return;
        }
        setRowLoading(userId);
        setMessage({ text: '', type: '' });
        try {
            await usersService.updateUserRole(userId, role);
            setMessage({ text: 'Rol actualizado', type: 'success' });
            await loadUsers();
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo actualizar el rol'),
                type: 'error',
            });
        } finally {
            setRowLoading(null);
        }
    };

    const handleStatusToggle = async (user: User) => {
        setRowLoading(user.id);
        setMessage({ text: '', type: '' });
        try {
            await usersService.updateUserStatus(user.id, !user.isActive);
            setMessage({
                text: user.isActive ? 'Usuario suspendido' : 'Usuario reactivado',
                type: 'success',
            });
            await loadUsers();
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo cambiar el estado'),
                type: 'error',
            });
        } finally {
            setRowLoading(null);
        }
    };

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-2">
                <span className="pill bg-indigo-100 text-indigo-700 w-fit">
                    <ShieldCheck size={14} /> Administración avanzada
                </span>
                <h2 className="text-3xl font-semibold text-slate-900">Equipo operativo</h2>
                <p className="text-sm text-slate-500 max-w-2xl">
                    Registra nuevos usuarios y controla los permisos en el mismo panel. Los cambios se aplican de inmediato
                    al ecosistema NestJS.
                </p>
            </header>

            {message.text && (
                <div
                    className={`rounded-2xl border p-4 flex items-center gap-3 ${
                        message.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                    }`}
                >
                    {message.type === 'success' ? <ShieldCheck size={18} /> : <Power size={18} />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <form onSubmit={handleCreateUser} className="panel-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center">
                            <UserPlus size={18} />
                        </div>
                        <div>
                            <h3 className="panel-card__title">Crear usuario</h3>
                            <p className="text-xs text-slate-500">Asignar credenciales temporales</p>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Nombre completo</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Ej. Daniela Hurtado"
                            value={formData.fullName}
                            onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Correo corporativo</label>
                        <input
                            type="email"
                            className="input-field lowercase"
                            placeholder="operaciones@rmparking.com"
                            value={formData.email}
                            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Contraseña temporal</label>
                        <input
                            type="password"
                            className={`input-field ${formData.password && !isPasswordValid ? '!border-rose-400' : ''}`}
                            placeholder="Mínimo 8 caracteres, usa símbolos"
                            value={formData.password}
                            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                            required
                            minLength={8}
                            aria-invalid={Boolean(formData.password && !isPasswordValid)}
                        />
                        <p
                            className={`mt-1 text-xs ${isPasswordValid ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                            {isPasswordValid ? 'Contraseña válida' : PASSWORD_POLICY_MESSAGE}
                        </p>
                    </div>
                    <div>
                        <label className="form-label">Rol asignado</label>
                        <select
                            className="input-field"
                            value={formData.role}
                            onChange={(event) => setFormData({ ...formData, role: event.target.value as Role })}
                            required
                        >
                            {assignableRoles.map((role) => (
                                <option key={role} value={role}>
                                    {roleLabels[role]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="btn-primary" disabled={creating || !canSubmit}>
                        {creating ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin" size={16} /> Guardando
                            </span>
                        ) : (
                            'Registrar usuario'
                        )}
                    </button>
                </form>

                <article className="panel-card xl:col-span-2 space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <span className="pill bg-slate-900 text-white">
                                <RefreshCw size={14} /> Catálogo vivo
                            </span>
                            <h3 className="panel-card__title mt-2">Usuarios registrados</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <select
                                className="input-field md:w-40"
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value as Role | 'ALL')}
                            >
                                <option value="ALL">Todos los roles</option>
                                {filterRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {roleLabels[role]}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="input-field md:w-40"
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                            >
                                <option value="ALL">Activos e inactivos</option>
                                <option value="ACTIVE">Solo activos</option>
                                <option value="INACTIVE">Solo suspendidos</option>
                            </select>
                            <button
                                type="button"
                                className="btn-outline !w-auto px-4"
                                onClick={loadUsers}
                                disabled={loading}
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                Actualizar
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-slate-500">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="ml-2 text-sm font-medium">Sincronizando con Prisma...</span>
                        </div>
                    ) : users.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-slate-500 text-xs uppercase tracking-wide">
                                    <tr>
                                        <th className="pb-3">Colaborador</th>
                                        <th className="pb-3">Rol</th>
                                        <th className="pb-3">Estado</th>
                                        <th className="pb-3">Creado</th>
                                        <th className="pb-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((user) => {
                                        const roleOptions: Role[] =
                                            user.role === 'CLIENT'
                                                ? [...assignableRoles, 'CLIENT' as Role]
                                                : assignableRoles;
                                        return (
                                        <tr key={user.id} className="align-middle">
                                            <td className="py-4">
                                                <p className="font-semibold text-slate-900">{user.fullName}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </td>
                                            <td className="py-4">
                                                <select
                                                    className="input-field text-xs"
                                                    value={user.role}
                                                    onChange={(event) =>
                                                        handleRoleUpdate(user.id, event.target.value as Role)
                                                    }
                                                    disabled={rowLoading === user.id || user.role === 'CLIENT'}
                                                >
                                                    {roleOptions.map((role) => (
                                                        <option key={role} value={role}>
                                                            {roleLabels[role]}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-4">
                                                <span
                                                    className={`pill ${
                                                        user.isActive
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}
                                                >
                                                    {user.isActive ? 'Activo' : 'Suspendido'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-xs text-slate-500">
                                                {new Date(user.createdAt).toLocaleDateString('es-CO', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </td>
                                            <td className="py-4">
                                                <button
                                                    type="button"
                                                    className={`btn-outline !w-auto px-4 text-xs ${
                                                        user.isActive ? 'text-rose-600' : 'text-emerald-600'
                                                    }`}
                                                    onClick={() => handleStatusToggle(user)}
                                                    disabled={rowLoading === user.id}
                                                >
                                                    {rowLoading === user.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : user.isActive ? (
                                                        'Suspender'
                                                    ) : (
                                                        'Reactivar'
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">
                            No hay usuarios para los filtros seleccionados. Ajusta los criterios o crea un nuevo registro.
                        </p>
                    )}
                </article>
            </div>
        </section>
    );
};

export default UserManagementPanel;

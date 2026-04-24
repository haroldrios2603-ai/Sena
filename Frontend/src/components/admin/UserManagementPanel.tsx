import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, ShieldCheck, UserPlus, RefreshCw, Power, Pencil, Trash2 } from 'lucide-react';
import usersService, {
    type UserFilters,
    type CreateUserPayload,
    type UpdateUserPayload,
} from '../../services/users.service';
import type { Role, User, DocumentType } from '../../context/types';
import { useAutoDismiss } from '../../hooks/useAutoDismiss';
import { useAuth } from '../../context/useAuth';
import { hasScreenPermission, SCREEN_KEYS } from '../../permissions';
import ConfirmActionModal from './ConfirmActionModal';
import { DATA_UPDATED_EVENT } from '../../utils/dataRefresh';

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

const documentTypeLabels: Record<DocumentType, string> = {
    CEDULA: 'Cédula de ciudadanía',
    TARJETA_IDENTIDAD: 'Tarjeta de identidad',
    NIT: 'NIT',
    PASAPORTE: 'Pasaporte',
    PEP: 'Permiso Especial de Permanencia',
};

const documentTypes = Object.keys(documentTypeLabels) as DocumentType[];

const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
};

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/;
const PASSWORD_POLICY_MESSAGE =
    'La contraseña debe contener mayúsculas, minúsculas, números y un carácter especial';

const formatPhoneInput = (value: string) => {
    const hasLeadingPlus = value.trim().startsWith('+');
    const digits = value.replace(/\D/g, '').slice(0, 15);
    const prefix = hasLeadingPlus ? '+' : '';

    if (!digits) {
        return prefix;
    }

    if (digits.length <= 3) {
        return `${prefix}${digits}`;
    }

    if (digits.length <= 6) {
        return `${prefix}${digits.slice(0, 3)} ${digits.slice(3)}`;
    }

    if (digits.length <= 10) {
        return `${prefix}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }

    return `${prefix}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`;
};

const formatPhoneDisplay = (value: string | null | undefined) => {
    if (!value?.trim()) {
        return 'Sin teléfono';
    }
    return formatPhoneInput(value);
};

const UserManagementPanel = () => {
    const { user: sessionUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [rowLoading, setRowLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });
    const [creating, setCreating] = useState(false);
    const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [fullNameFilter, setFullNameFilter] = useState('');
    const [emailFilter, setEmailFilter] = useState('');
    const [contactPhoneFilter, setContactPhoneFilter] = useState('');
    const [documentNumberFilter, setDocumentNumberFilter] = useState('');
    const [formData, setFormData] = useState<CreateUserPayload>({
        fullName: '',
        email: '',
        contactPhone: '',
        password: '',
        role: 'OPERATOR',
        documentType: undefined,
        documentNumber: '',
    });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editForm, setEditForm] = useState<UpdateUserPayload>({
        fullName: '',
        email: '',
        contactPhone: '',
        role: 'OPERATOR',
        isActive: true,
        documentType: undefined,
        documentNumber: '',
    });
    const isMounted = useRef(true);
    const canDeleteUsers = hasScreenPermission(
        sessionUser?.role,
        sessionUser?.permissions,
        SCREEN_KEYS.USERS_DELETE,
    );

    useAutoDismiss(Boolean(message.text), () => setMessage({ text: '', type: '' }), 5000);

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
        if (fullNameFilter.trim()) {
            params.fullName = fullNameFilter.trim();
        }
        if (emailFilter.trim()) {
            params.email = emailFilter.trim();
        }
        if (contactPhoneFilter.trim()) {
            params.contactPhone = contactPhoneFilter.trim();
        }
        if (documentNumberFilter.trim()) {
            params.documentNumber = documentNumberFilter.trim();
        }
        return Object.keys(params).length ? params : undefined;
    }, [contactPhoneFilter, documentNumberFilter, emailFilter, fullNameFilter, roleFilter, statusFilter]);

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

    useEffect(() => {
        const handleDataUpdated = () => {
            void loadUsers();
        };

        window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
        return () => window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    }, [loadUsers]);

    useEffect(() => {
        if (!editingUser) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !savingEdit) {
                setEditingUser(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingUser, savingEdit]);

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
                contactPhone: formData.contactPhone.trim(),
                password: formData.password,
                role: formData.role,
                ...(formData.documentType ? { documentType: formData.documentType } : {}),
                ...(formData.documentNumber?.trim() ? { documentNumber: formData.documentNumber.trim() } : {}),
            };
            await usersService.createUser(payload);
            setFormData({ fullName: '', email: '', contactPhone: '', password: '', role: 'OPERATOR', documentType: undefined, documentNumber: '' });

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
                text: user.isActive ? 'Usuario inactivado correctamente' : 'Usuario activado correctamente',
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

    const handleDeleteUser = (user: User) => {
        if (rowLoading && rowLoading !== user.id) {
            setMessage({
                text: 'Hay otra acción en progreso. Espera un momento e inténtalo de nuevo.',
                type: 'error',
            });
            return;
        }

        // ES: Abrimos modal para confirmar eliminación en lugar de usar confirm nativo del navegador.
        setPendingDeleteUser(user);
    };

    const cancelDeleteUser = () => {
        if (!pendingDeleteUser || rowLoading === pendingDeleteUser.id) {
            return;
        }

        setPendingDeleteUser(null);
        setMessage({
            text: 'No se eliminó el usuario: operación cancelada por el operador.',
            type: 'error',
        });
        window.alert('No se eliminó el usuario: operación cancelada por el operador.');
    };

    const confirmDeleteUser = async () => {
        if (!pendingDeleteUser) {
            return;
        }

        const user = pendingDeleteUser;
        setRowLoading(user.id);
        setMessage({ text: '', type: '' });
        try {
            await usersService.deleteUser(user.id);
            // ES: Forzamos la vista principal de usuarios activos para ocultar inmediatamente el registro eliminado.
            if (statusFilter !== 'ACTIVE') {
                setStatusFilter('ACTIVE');
            } else {
                await loadUsers();
            }
            setMessage({ text: 'Usuario eliminado correctamente.', type: 'success' });
            window.alert('Usuario eliminado correctamente.');
        } catch (error) {
            const errorMessage = getErrorMessage(error, 'No se pudo eliminar el usuario');
            setMessage({
                text: errorMessage,
                type: 'error',
            });
            window.alert(`No se pudo eliminar el usuario: ${errorMessage}`);
        } finally {
            setPendingDeleteUser(null);
            setRowLoading(null);
        }
    };

    const handleClearFilters = () => {
        setFullNameFilter('');
        setEmailFilter('');
        setContactPhoneFilter('');
        setDocumentNumberFilter('');
        setRoleFilter('ALL');
        setStatusFilter('ALL');
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditForm({
            fullName: user.fullName,
            email: user.email,
            contactPhone: user.contactPhone ?? '',
            role: user.role,
            isActive: user.isActive,
            documentType: user.documentType ?? undefined,
            documentNumber: user.documentNumber ?? '',
        });
    };

    const closeEditModal = () => {
        if (savingEdit) {
            return;
        }
        setEditingUser(null);
    };

    const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingUser || savingEdit) {
            return;
        }

        const payload: UpdateUserPayload = {
            fullName: (editForm.fullName ?? '').trim(),
            email: (editForm.email ?? '').trim().toLowerCase(),
            contactPhone: (editForm.contactPhone ?? '').trim(),
            role: editForm.role,
            isActive: Boolean(editForm.isActive),
            documentType: editForm.documentType ?? null,
            documentNumber: (editForm.documentNumber ?? '').trim() || null,
        };

        setSavingEdit(true);
        setMessage({ text: '', type: '' });
        try {
            await usersService.updateUser(editingUser.id, payload);
            setMessage({ text: 'Usuario actualizado correctamente', type: 'success' });
            setEditingUser(null);
            await loadUsers();
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo actualizar el usuario'),
                type: 'error',
            });
        } finally {
            setSavingEdit(false);
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
                        <label className="form-label">Tipo de documento</label>
                        <select
                            className="input-field"
                            value={formData.documentType ?? ''}
                            onChange={(event) =>
                                setFormData({ ...formData, documentType: (event.target.value as DocumentType) || undefined })
                            }
                        >
                            <option value="">Sin documento</option>
                            {documentTypes.map((dt) => (
                                <option key={dt} value={dt}>
                                    {documentTypeLabels[dt]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Número de documento</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Ej. 1234567890"
                            value={formData.documentNumber ?? ''}
                            onChange={(event) => setFormData({ ...formData, documentNumber: event.target.value })}
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
                        <label className="form-label">Teléfono de contacto</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Ej. +57 300 123 4567"
                            value={formData.contactPhone}
                            onChange={(event) =>
                                setFormData({ ...formData, contactPhone: formatPhoneInput(event.target.value) })
                            }
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
                            <input
                                type="text"
                                className="input-field md:w-48"
                                value={fullNameFilter}
                                onChange={(event) => setFullNameFilter(event.target.value)}
                                placeholder="Filtrar por nombre"
                            />
                            <input
                                type="text"
                                className="input-field md:w-56"
                                value={emailFilter}
                                onChange={(event) => setEmailFilter(event.target.value)}
                                placeholder="Filtrar por correo"
                            />
                            <input
                                type="text"
                                className="input-field md:w-44"
                                value={contactPhoneFilter}
                                onChange={(event) => setContactPhoneFilter(formatPhoneInput(event.target.value))}
                                placeholder="Filtrar por teléfono"
                            />
                            <input
                                type="text"
                                className="input-field md:w-40"
                                value={documentNumberFilter}
                                onChange={(event) => setDocumentNumberFilter(event.target.value)}
                                placeholder="Filtrar por documento"
                            />
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
                            <button type="button" className="btn-outline !w-auto px-4" onClick={handleClearFilters}>
                                Limpiar filtros
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
                                                <button
                                                    type="button"
                                                    className="text-left"
                                                    onClick={() => openEditModal(user)}
                                                    title="Editar usuario"
                                                >
                                                    <p className="font-semibold text-slate-900 hover:text-indigo-700">{user.fullName}</p>
                                                </button>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                                <p className="text-xs text-slate-500">{formatPhoneDisplay(user.contactPhone)}</p>
                                                {user.documentNumber && (
                                                    <p className="text-xs text-slate-400">
                                                        {user.documentType ? documentTypeLabels[user.documentType] : 'Doc.'}: {user.documentNumber}
                                                    </p>
                                                )}
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
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn-outline !w-auto px-3 text-xs"
                                                        onClick={() => openEditModal(user)}
                                                    >
                                                        <Pencil size={13} /> Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn-suspend !w-auto px-4 text-xs ${
                                                            user.isActive ? 'btn-suspend--danger' : 'btn-suspend--success'
                                                        }`}
                                                        onClick={() => handleStatusToggle(user)}
                                                        disabled={rowLoading === user.id}
                                                    >
                                                        {rowLoading === user.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : user.isActive ? (
                                                            'Inactivar'
                                                        ) : (
                                                            'Activar'
                                                        )}
                                                    </button>
                                                    {canDeleteUsers && (
                                                        <button
                                                            type="button"
                                                            className="btn-suspend btn-suspend--danger !w-auto px-3 text-xs"
                                                            onClick={() => handleDeleteUser(user)}
                                                            disabled={rowLoading === user.id}
                                                        >
                                                            <Trash2 size={13} /> Eliminar
                                                        </button>
                                                    )}
                                                </div>
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

            {editingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeEditModal();
                        }
                    }}
                >
                    <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Editar usuario</h3>
                                <p className="text-xs text-slate-500">{editingUser.email}</p>
                            </div>
                            <button
                                type="button"
                                className="btn-outline !w-auto px-3 py-2"
                                onClick={closeEditModal}
                                disabled={savingEdit}
                            >
                                Cerrar
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleSaveEdit}>
                            <div>
                                <label className="form-label">Nombre completo</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={editForm.fullName ?? ''}
                                    onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })}
                                    minLength={2}
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Tipo de documento</label>
                                <select
                                    className="input-field"
                                    value={editForm.documentType ?? ''}
                                    onChange={(event) =>
                                        setEditForm({ ...editForm, documentType: (event.target.value as DocumentType) || undefined })
                                    }
                                >
                                    <option value="">Sin documento</option>
                                    {documentTypes.map((dt) => (
                                        <option key={dt} value={dt}>
                                            {documentTypeLabels[dt]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Número de documento</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Ej. 1234567890"
                                    value={editForm.documentNumber ?? ''}
                                    onChange={(event) => setEditForm({ ...editForm, documentNumber: event.target.value })}
                                />
                            </div>
                            <div>
                                <label className="form-label">Correo corporativo</label>
                                <input
                                    type="email"
                                    className="input-field lowercase"
                                    value={editForm.email ?? ''}
                                    onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Teléfono</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={editForm.contactPhone ?? ''}
                                    onChange={(event) =>
                                        setEditForm({ ...editForm, contactPhone: formatPhoneInput(event.target.value) })
                                    }
                                    minLength={7}
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Rol</label>
                                <select
                                    className="input-field"
                                    value={editForm.role}
                                    onChange={(event) => setEditForm({ ...editForm, role: event.target.value as Role })}
                                    required
                                >
                                    {filterRoles.map((role) => (
                                        <option key={role} value={role}>
                                            {roleLabels[role]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Estado</label>
                                <select
                                    className="input-field"
                                    value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    onChange={(event) =>
                                        setEditForm({ ...editForm, isActive: event.target.value === 'ACTIVE' })
                                    }
                                    required
                                >
                                    <option value="ACTIVE">Activo</option>
                                    <option value="INACTIVE">Suspendido</option>
                                </select>
                            </div>

                            <button type="submit" className="btn-primary" disabled={savingEdit}>
                                {savingEdit ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={16} /> Guardando cambios
                                    </span>
                                ) : (
                                    'Guardar cambios'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmActionModal
                isOpen={Boolean(pendingDeleteUser)}
                title="Confirmar eliminación de usuario"
                message={pendingDeleteUser
                    ? `¿Deseas eliminar a ${pendingDeleteUser.fullName}? Dejará de aparecer en el listado de usuarios registrados.`
                    : ''}
                confirmText="Aceptar"
                cancelText="Cancelar"
                isProcessing={Boolean(pendingDeleteUser && rowLoading === pendingDeleteUser.id)}
                onConfirm={confirmDeleteUser}
                onCancel={cancelDeleteUser}
            />
        </section>
    );
};

export default UserManagementPanel;

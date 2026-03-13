import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Shield } from 'lucide-react';
import type { Role, User } from '../context/types';
import permissionsService, {
    type AppScreen,
    type ScreenPermission,
} from '../services/permissions.service';
import usersService from '../services/users.service';
import { useAutoDismiss } from '../hooks/useAutoDismiss';

const roleOptions: Role[] = ['SUPER_ADMIN', 'ADMIN_PARKING', 'OPERATOR', 'AUDITOR', 'CLIENT'];

const roleLabels: Record<Role, string> = {
    SUPER_ADMIN: 'Super admin',
    ADMIN_PARKING: 'Administrador de sede',
    OPERATOR: 'Operador',
    AUDITOR: 'Auditor',
    CLIENT: 'Cliente',
};

type TabType = 'roles' | 'users';

type MessageState = {
    text: string;
    type: 'success' | 'error' | '';
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
};

const PermissionsProfiles = () => {
    const [activeTab, setActiveTab] = useState<TabType>('roles');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });

    const [screens, setScreens] = useState<AppScreen[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [selectedRole, setSelectedRole] = useState<Role>('SUPER_ADMIN');
    const [selectedUserId, setSelectedUserId] = useState('');

    const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});

    useAutoDismiss(Boolean(message.text), () => setMessage({ text: '', type: '' }), 5000);

    const currentSubjectLabel = useMemo(() => {
        if (activeTab === 'roles') {
            return roleLabels[selectedRole];
        }
        const selectedUser = users.find((user) => user.id === selectedUserId);
        return selectedUser ? `${selectedUser.fullName} (${selectedUser.email})` : 'Usuario';
    }, [activeTab, selectedRole, selectedUserId, users]);

    const loadScreens = async () => {
        const data = await permissionsService.getScreens();
        setScreens(data);
    };

    const loadUsers = async () => {
        const data = await usersService.listUsers();
        setUsers(data);
        if (!selectedUserId && data.length > 0) {
            setSelectedUserId(data[0].id);
        }
    };

    const hydrateMap = (permissions: ScreenPermission[]) => {
        const map: Record<string, boolean> = {};
        permissions.forEach((item) => {
            map[item.screenKey] = item.canView;
        });
        setPermissionMap(map);
    };

    const loadRolePermissions = async (role: Role) => {
        const data = await permissionsService.getRolePermissions(role);
        hydrateMap(data);
    };

    const loadUserPermissions = async (userId: string) => {
        const data = await permissionsService.getUserPermissions(userId);
        hydrateMap(data.permissions);
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setMessage({ text: '', type: '' });
            try {
                await Promise.all([loadScreens(), loadUsers()]);
            } catch (error) {
                setMessage({
                    text: getErrorMessage(error, 'No se pudieron cargar pantallas o usuarios.'),
                    type: 'error',
                });
            } finally {
                setLoading(false);
            }
        };
        void init();
    }, []);

    useEffect(() => {
        if (!screens.length) {
            return;
        }

        const loadPermissions = async () => {
            setLoading(true);
            setMessage({ text: '', type: '' });
            try {
                if (activeTab === 'roles') {
                    await loadRolePermissions(selectedRole);
                } else if (selectedUserId) {
                    await loadUserPermissions(selectedUserId);
                }
            } catch (error) {
                setMessage({
                    text: getErrorMessage(error, 'No se pudieron cargar los permisos.'),
                    type: 'error',
                });
            } finally {
                setLoading(false);
            }
        };

        void loadPermissions();
    }, [activeTab, screens.length, selectedRole, selectedUserId]);

    const handleToggle = (screenKey: string) => {
        setPermissionMap((prev) => ({
            ...prev,
            [screenKey]: !prev[screenKey],
        }));
    };

    const handleSave = async () => {
        if (!screens.length) {
            return;
        }

        const payload = screens.map((screen) => ({
            screenKey: screen.key,
            canView: Boolean(permissionMap[screen.key]),
        }));

        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            if (activeTab === 'roles') {
                await permissionsService.saveRolePermissions(selectedRole, payload);
            } else if (selectedUserId) {
                await permissionsService.saveUserPermissions(selectedUserId, payload);
            }
            setMessage({ text: 'Permisos guardados correctamente.', type: 'success' });
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudieron guardar los permisos.'),
                type: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 py-8">
            <div className="dashboard-shell space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <span className="pill bg-indigo-100 text-indigo-700">
                            <Shield size={16} /> Configuración
                        </span>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Permisos por perfil</h1>
                        <p className="text-sm text-slate-500">
                            Asigna qué pantallas puede ver cada rol o usuario específico.
                        </p>
                    </div>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <ArrowLeft size={16} /> Volver al dashboard
                    </Link>
                </div>

                <section className="panel-card space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('roles')}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                activeTab === 'roles'
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Roles
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('users')}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                activeTab === 'users'
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Usuarios
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {activeTab === 'roles' ? (
                            <label>
                                <span className="form-label">Rol</span>
                                <select
                                    className="input-field"
                                    value={selectedRole}
                                    onChange={(event) => setSelectedRole(event.target.value as Role)}
                                >
                                    {roleOptions.map((role) => (
                                        <option key={role} value={role}>
                                            {roleLabels[role]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <label>
                                <span className="form-label">Usuario</span>
                                <select
                                    className="input-field"
                                    value={selectedUserId}
                                    onChange={(event) => setSelectedUserId(event.target.value)}
                                >
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.fullName} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>

                    {message.text && (
                        <div
                            className={`rounded-2xl border px-4 py-3 text-sm ${
                                message.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-rose-200 bg-rose-50 text-rose-800'
                            }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 size={16} className="animate-spin" /> Cargando permisos...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">
                                Perfil seleccionado: <span className="font-semibold text-slate-800">{currentSubjectLabel}</span>
                            </p>
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Pantalla</th>
                                            <th className="px-4 py-3 text-left">Clave</th>
                                            <th className="px-4 py-3 text-left">Ruta</th>
                                            <th className="px-4 py-3 text-center">Puede ver</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {screens.map((screen) => (
                                            <tr key={screen.key} className="border-t border-slate-100">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-slate-900">{screen.name}</p>
                                                    <p className="text-xs text-slate-500">{screen.description}</p>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-600">{screen.key}</td>
                                                <td className="px-4 py-3 text-xs text-slate-600">{screen.route || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(permissionMap[screen.key])}
                                                        onChange={() => handleToggle(screen.key)}
                                                        className="h-4 w-4 accent-indigo-600"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-primary w-auto px-4"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Guardar permisos
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default PermissionsProfiles;

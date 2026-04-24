import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Role, User } from '../context/types';
import permissionsService, {
    type AppScreen,
    type ScreenPermission,
} from '../services/permissions.service';
import usersService from '../services/users.service';
import { useAutoDismiss } from '../hooks/useAutoDismiss';

const roleOptions: Role[] = ['SUPER_ADMIN', 'ADMIN_PARKING', 'OPERATOR', 'AUDITOR', 'CLIENT'];

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

interface PermissionsProfilesProps {
    embedded?: boolean;
}

const PermissionsProfiles = ({ embedded = false }: PermissionsProfilesProps) => {
    const { t } = useTranslation();
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

    const roleLabels = useMemo<Record<Role, string>>(
        () => ({
            SUPER_ADMIN: t('common.roleLabels.SUPER_ADMIN'),
            ADMIN_PARKING: t('common.roleLabels.ADMIN_PARKING'),
            OPERATOR: t('common.roleLabels.OPERATOR'),
            AUDITOR: t('common.roleLabels.AUDITOR'),
            CLIENT: t('common.roleLabels.CLIENT'),
        }),
        [t],
    );

    const currentSubjectLabel = useMemo(() => {
        if (activeTab === 'roles') {
            return roleLabels[selectedRole];
        }
        const selectedUser = users.find((user) => user.id === selectedUserId);
        return selectedUser
            ? `${selectedUser.fullName} (${selectedUser.email})`
            : t('permissionsProfiles.fallbackUser');
    }, [activeTab, roleLabels, selectedRole, selectedUserId, t, users]);

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
                    text: getErrorMessage(error, t('permissionsProfiles.loadBaseError')),
                    type: 'error',
                });
            } finally {
                setLoading(false);
            }
        };
        void init();
    }, [t]);

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
                    text: getErrorMessage(error, t('permissionsProfiles.loadPermissionsError')),
                    type: 'error',
                });
            } finally {
                setLoading(false);
            }
        };

        void loadPermissions();
    }, [activeTab, screens.length, selectedRole, selectedUserId, t]);

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
            setMessage({ text: t('permissionsProfiles.saveSuccess'), type: 'success' });
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, t('permissionsProfiles.saveError')),
                type: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={embedded ? 'space-y-6' : 'min-h-screen bg-slate-100 py-8'}>
            <div className={embedded ? 'space-y-6' : 'dashboard-shell space-y-6'}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <span className="pill bg-indigo-100 text-indigo-700">
                            <Shield size={16} /> {t('permissionsProfiles.settingsBadge')}
                        </span>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{t('permissionsProfiles.title')}</h1>
                        <p className="text-sm text-slate-500">
                            {t('permissionsProfiles.subtitle')}
                        </p>
                    </div>
                    {!embedded && (
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            <ArrowLeft size={16} /> {t('permissionsProfiles.backToDashboard')}
                        </Link>
                    )}
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
                            {t('permissionsProfiles.tabs.roles')}
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
                            {t('permissionsProfiles.tabs.users')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {activeTab === 'roles' ? (
                            <label>
                                <span className="form-label">{t('permissionsProfiles.selectors.role')}</span>
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
                                <span className="form-label">{t('permissionsProfiles.selectors.user')}</span>
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
                            <Loader2 size={16} className="animate-spin" /> {t('permissionsProfiles.loading')}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">
                                {t('permissionsProfiles.selectedProfile')} <span className="font-semibold text-slate-800">{currentSubjectLabel}</span>
                            </p>
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-4 py-3 text-left">{t('permissionsProfiles.table.screen')}</th>
                                            <th className="px-4 py-3 text-left">{t('permissionsProfiles.table.key')}</th>
                                            <th className="px-4 py-3 text-left">{t('permissionsProfiles.table.route')}</th>
                                            <th className="px-4 py-3 text-center">{t('permissionsProfiles.table.canView')}</th>
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
                                    {t('permissionsProfiles.savePermissions')}
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

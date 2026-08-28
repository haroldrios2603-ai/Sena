/**
 * Inicializa i18next para traducciones en la aplicación React.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    es: {
        translation: {
            common: {
                roleLabels: {
                    SUPER_ADMIN: 'Superadministrador',
                    ADMIN_PARKING: 'Administrador de sede',
                    OPERATOR: 'Operador',
                    AUDITOR: 'Auditor',
                    CLIENT: 'Cliente',
                },
            },
            login: {
                invalidCredentials: 'Credenciales inválidas o error del servidor.',
                forgotPassword: '¿Olvidaste tu contraseña?',
                sendingCode: 'Enviando código...',
                sendRecoveryRequiresEmail: 'Ingresa tu correo antes de solicitar la recuperación.',
                recoveryCodeSent: 'Hemos enviado un código de confirmación a tu correo.',
                recoveryMissingFields: 'Debes ingresar el código y la nueva contraseña.',
                recoveryUpdated: 'Tu contraseña se actualizó correctamente. Inicia sesión con la nueva clave.',
                brandSubtitle: 'Gestión inteligente de espacios',
                welcome: 'Bienvenido',
                credentialsPrompt: 'Ingresa tus credenciales para acceder',
                emailLabel: 'Correo electrónico',
                emailPlaceholder: 'ejemplo@rmparking.com',
                passwordLabel: 'Contraseña',
                recoveryInstructions:
                    'Ingresa el código que enviamos a {{email}} y define una nueva contraseña segura.',
                recoveryCodeLabel: 'Código de confirmación',
                recoveryCodePlaceholder: 'ABC123',
                newPasswordLabel: 'Nueva contraseña',
                updatePassword: 'Actualizar contraseña',
                updating: 'Actualizando...',
                cancel: 'Cancelar',
                signIn: 'Iniciar sesión',
                rightsReserved: 'Todos los derechos reservados.',
            },
            permissionsProfiles: {
                loadBaseError: 'No se pudieron cargar las pantallas o los usuarios.',
                loadPermissionsError: 'No se pudieron cargar los permisos.',
                saveSuccess: 'Permisos guardados correctamente.',
                saveError: 'No se pudieron guardar los permisos.',
                settingsBadge: 'Configuración',
                title: 'Permisos por perfil',
                subtitle: 'Asigna qué pantallas puede ver cada rol o usuario específico.',
                backToDashboard: 'Volver al panel',
                tabs: {
                    roles: 'Roles',
                    users: 'Usuarios',
                },
                selectors: {
                    role: 'Rol',
                    user: 'Usuario',
                },
                loading: 'Cargando permisos...',
                selectedProfile: 'Perfil seleccionado:',
                fallbackUser: 'Usuario',
                table: {
                    screen: 'Pantalla',
                    key: 'Clave',
                    route: 'Ruta',
                    canView: 'Puede ver',
                },
                savePermissions: 'Guardar permisos',
            },
            audit: {
                badge: 'Módulo de auditoría',
                title: 'Trazabilidad de eventos',
                subtitle:
                    'Revisa quién hizo qué, cuándo y desde dónde. Los registros son inmutables y se ordenan por fecha descendente.',
                exportSuccess: 'Exportación {{format}} generada',
                loadError: 'No se pudo cargar la auditoría.',
                exportError: 'No se pudo exportar la auditoría.',
                filters: {
                    from: 'Desde',
                    to: 'Hasta',
                    user: 'Usuario (correo)',
                    entity: 'Entidad',
                    operation: 'Operación',
                    result: 'Resultado',
                    recordId: 'ID del registro',
                    allOperations: 'Todas',
                    allResults: 'Todos',
                },
                columns: {
                    timestamp: 'Fecha',
                    user: 'Usuario',
                    ip: 'IP',
                    operation: 'Operación',
                    entity: 'Entidad',
                    result: 'Resultado',
                    action: 'Acción',
                },
                operationLabels: {
                    CREATE: 'Crear',
                    UPDATE: 'Actualizar',
                    DELETE: 'Eliminar',
                    VIEW: 'Consultar',
                    LOGIN: 'Inicio de sesión',
                    LOGOUT: 'Cierre de sesión',
                    LOGIN_FAILED: 'Inicio fallido',
                    FORBIDDEN: 'Acceso denegado',
                    PASSWORD_CHANGE: 'Cambio de contraseña',
                    EXPORT: 'Exportar',
                },
                resultLabels: {
                    SUCCESS: 'Éxito',
                    FAILURE: 'Fallo',
                },
                totalRecords: 'Total de registros: {{count}}',
                page: 'Página {{page}} de {{totalPages}}',
                previous: 'Anterior',
                next: 'Siguiente',
                loading: 'Cargando registros...',
                anonymousSystem: 'sistema/anónimo',
                viewDetail: 'Ver detalle',
                detailTitle: 'Detalle del registro',
                close: 'Cerrar',
                exportCsv: 'Exportar CSV',
                exportJson: 'Exportar JSON',
            },
            reports: {
                badge: 'Módulo de reportes',
                title: 'Reportes operativos',
                subtitle:
                    'Consulta indicadores de operación, facturación, mensualidades y asistencia con filtros por fecha.',
                tabs: {
                    workers: 'Trabajadores en turno',
                    vehicles: 'Vehículos por periodo',
                    billing: 'Facturación',
                    monthly: 'Mensualidades',
                    attendance: 'Asistencia',
                    income: 'Ingresos por tipo',
                    peak: 'Horas y días pico',
                },
                filters: {
                    from: 'Fecha inicial',
                    to: 'Fecha final',
                    period: 'Período',
                    referenceDate: 'Fecha de referencia',
                    client: 'Cliente',
                    allClients: 'Todos los clientes',
                    status: 'Estado',
                    employeeId: 'ID del empleado',
                    employeeIdPlaceholder: 'UUID opcional',
                },
                period: {
                    day: 'Día',
                    week: 'Semana',
                    month: 'Mes',
                },
                status: {
                    all: 'Todos',
                    current: 'Al día',
                    late: 'Atrasados',
                },
                export: {
                    excel: 'Excel',
                    pdf: 'PDF',
                    word: 'Word',
                },
                actions: {
                    query: 'Consultar',
                    loading: 'Consultando...',
                },
                messages: {
                    loaded: 'Reporte cargado correctamente.',
                    loadError: 'No fue posible cargar el reporte.',
                    exported: 'Archivo {{format}} generado correctamente.',
                    exportError: 'No fue posible exportar el reporte.',
                    noSectionPermission: 'No tienes permisos para ver las secciones de reportes.',
                },
            },
        },
    },
};

void i18n.use(initReactI18next).init({
    resources,
    lng: 'es',
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
});

export default i18n;

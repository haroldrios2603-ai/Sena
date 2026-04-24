interface ConfirmActionModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isProcessing?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmActionModal = ({
    isOpen,
    title,
    message,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    isProcessing = false,
    onConfirm,
    onCancel,
}: ConfirmActionModalProps) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
            onMouseDown={(event) => {
                if (!isProcessing && event.target === event.currentTarget) {
                    onCancel();
                }
            }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{message}</p>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        className="btn-outline !w-auto px-4 py-2"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className="btn-suspend btn-suspend--danger !w-auto px-4 py-2"
                        onClick={onConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Procesando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmActionModal;

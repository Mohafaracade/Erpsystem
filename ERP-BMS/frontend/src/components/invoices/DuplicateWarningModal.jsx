import { X, AlertTriangle } from 'lucide-react';

const DuplicateWarningModal = ({ isOpen, onClose, onProceed, duplicates }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                                Digniin
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                                Invoice la mid ah mid hore ayaa la helay
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        {/* Warning Message */}
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                            <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                                Invoice la mid ah ayaa hore loo abuuray oo leh:
                            </p>
                            <ul className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-slate-400">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    <span>Macmiilka oo isku mid ah</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    <span>Taariikhda invoice-ka iyo due date oo isku mid ah</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    <span>Qadarka guud (total) oo isku mid ah</span>
                                </li>
                            </ul>
                        </div>

                        {/* Matching Invoices */}
                        {duplicates && duplicates.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Invoice-yada la helay:
                                </h3>
                                <div className="space-y-2">
                                    {duplicates.slice(0, 3).map((invoice) => (
                                        <div
                                            key={invoice._id}
                                            className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                                                    {invoice.invoiceNumber}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${invoice.status === 'paid'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : invoice.status === 'sent'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                            : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                                                <span>{invoice.customerDetails?.name || 'N/A'}</span>
                                                <span className="font-semibold text-gray-700 dark:text-slate-300">
                                                    ${parseFloat(invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {duplicates.length > 3 && (
                                        <p className="text-xs text-gray-500 dark:text-slate-400 text-center pt-1">
                                            +{duplicates.length - 3} invoices oo kale
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Help Text */}
                        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                            Haddii aad hubtaa in invoice cusub aad u baahan tahay, gujiso "Sii wad" si aad u sii socoto.
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-3 p-6 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        Jooji
                    </button>
                    <button
                        onClick={onProceed}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                    >
                        Sii wad
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateWarningModal;

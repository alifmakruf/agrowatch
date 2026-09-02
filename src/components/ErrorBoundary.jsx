import React from 'react';
import { AlertTriangle, RefreshCw, ClipboardList } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null,
            errorInfo: null 
        });
    };

    render() {
        if (this.state.hasError) {
            const errorMessage = this.state.error?.toString() || 'Unknown error occurred';
            const isObjectError = errorMessage.includes('Objects are not valid as a React child');

            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-red-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 rounded-lg">
                                <AlertTriangle size={24} className="text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Oops! Ada Kesalahan</h1>
                                <p className="text-xs text-gray-500">Aplikasi mengalami error tidak terduga</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                            <p className="text-xs font-mono text-red-700">
                                {isObjectError
                                    ? (
                                        <span className="flex items-start gap-1.5">
                                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                            <span>Object rendering error - ada data yang tidak bisa di-render{'\n\n'}Hubungi admin jika problem berlanjut.</span>
                                        </span>
                                    )
                                    : errorMessage.slice(0, 150)
                                }
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mb-4 text-xs">
                                <summary className="cursor-pointer font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                                    <ClipboardList size={13} /> Debug Info
                                </summary>
                                <pre className="bg-gray-100 p-2 rounded text-[10px] overflow-auto max-h-32 font-mono">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={this.handleReset}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
                        >
                            <RefreshCw size={16} />
                            Refresh Halaman
                        </button>

                        <button
                            onClick={() => window.location.href = '/login'}
                            className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition-colors mt-2"
                        >
                            Kembali ke Login
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

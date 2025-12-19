import { useState, useEffect } from 'react';
import { login } from '../api';
import { listen } from '@tauri-apps/api/event';

interface LoginProps {
    onLoginSuccess: (token: string) => void;
}

const GRAPH_CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e';

export default function Login({ onLoginSuccess }: LoginProps) {
    const [clientId, setClientId] = useState(GRAPH_CLIENT_ID);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [manualUrl, setManualUrl] = useState('');

    useEffect(() => {
        // Listen for browser open failures
        const unlisten = listen<string>('oauth-url', (event) => {
            setManualUrl(event.payload);
        });
        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const handleLogin = async () => {
        if (!clientId.trim()) {
            setError('Please enter a Client ID');
            return;
        }
        setLoading(true);
        setError('');
        setManualUrl('');
        try {
            const token = await login(clientId.trim());
            onLoginSuccess(token);
        } catch (e: any) {
            console.error(e);
            setError('Login failed: ' + String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center h-full bg-gray-950 text-white overflow-hidden selection:bg-blue-500 selection:text-white">
            {/* Abstract Background Shapes */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/30 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse duration-[4000ms]"></div>

            <div className="z-10 w-full max-w-md p-8 bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400 text-sm mt-2">Connect via Microsoft Graph PowerShell</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-200">
                            We use the safe <strong>Microsoft Graph Command Line Tools</strong> ID for native authentication. You will see "Microsoft Graph Command Line Tools" on the consent screen.
                        </p>
                    </div>

                    {showAdvanced && (
                        <div className="group animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Client ID (Advanced)</label>
                            <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                            />
                        </div>
                    )}

                    {manualUrl && (
                        <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg animate-in fade-in">
                            <p className="text-sm text-yellow-200 mb-2 font-semibold">Browser failed to open?</p>
                            <p className="text-xs text-yellow-100/80 mb-2">Copy and paste this link manually:</p>
                            <div className="bg-gray-950 p-2 rounded border border-gray-800 flex gap-2">
                                <input readOnly value={manualUrl} className="bg-transparent text-xs text-gray-400 w-full outline-none font-mono" />
                                <button
                                    onClick={() => navigator.clipboard.writeText(manualUrl)}
                                    className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-white transition"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-900/50 rounded-lg flex items-start gap-3 animate-in fade-in">
                            <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-red-200">{error}</span>
                        </div>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Connect with Microsoft'}
                    </button>

                    <div className="pt-4 border-t border-gray-800 text-center">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-wider"
                        >
                            {showAdvanced ? 'Hide Custom Client ID' : 'Use Custom Client ID'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-center text-xs text-gray-600">
                <p>Your credentials are processed locally and never sent to our servers.</p>
            </div>
        </div>
    );
}

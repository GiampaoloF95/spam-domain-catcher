import { getCurrentWindow } from '@tauri-apps/api/window';
import { useState, useEffect } from 'react';

export default function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const appWindow = getCurrentWindow();

    useEffect(() => {
        const updateState = async () => {
            setIsMaximized(await appWindow.isMaximized());
        };
        updateState();

        // Listen for resize events to update the state if externally changed (optional but good)
        // For simplicity, we just toggle local state on click.
    }, []);

    const minimize = () => appWindow.minimize();
    const toggleMaximize = async () => {
        await appWindow.toggleMaximize();
        // Slight delay to allow Tauri to update window state, then fetch
        setTimeout(async () => {
            setIsMaximized(await appWindow.isMaximized());
        }, 50);
    };
    const close = () => appWindow.close();

    return (
        <div data-tauri-drag-region className="h-8 bg-slate-900 flex justify-between items-center select-none fixed top-0 left-0 right-0 z-50 border-b border-slate-800">
            <div className="pl-4 text-xs font-bold text-slate-500 tracking-wider pointer-events-none">
                SPAM ORIGIN
            </div>
            <div className="flex h-full">
                <button
                    onClick={minimize}
                    className="w-12 h-full inline-flex justify-center items-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                </button>
                <button
                    onClick={toggleMaximize}
                    className="w-12 h-full inline-flex justify-center items-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    {isMaximized ? (
                        // Restore icon: two overlapping squares
                        <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <path d="M3 3V1h6v6H7" />
                            <path d="M1 3h6v6H1z" />
                        </svg>
                    ) : (
                        // Maximize icon: single square
                        <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <rect x="1.5" y="1.5" width="7" height="7" />
                        </svg>
                    )}
                </button>
                <button
                    onClick={close}
                    className="w-12 h-full inline-flex justify-center items-center hover:bg-red-600 hover:text-white text-slate-400 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
}

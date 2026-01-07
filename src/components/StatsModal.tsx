import { SpamEmail } from '../api';

interface DomainGroup {
    domain: string;
    count: number;
    emails: SpamEmail[];
    sourceType: 'DKIM' | 'SPF' | 'HELO' | 'Sender';
}

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    rawEmails: SpamEmail[];
    groups: DomainGroup[];
}

export default function StatsModal({ isOpen, onClose, rawEmails, groups }: StatsModalProps) {
    if (!isOpen) return null;

    const total = rawEmails.length;
    if (total === 0) return null;

    // Stats Calculations
    const dkimCount = rawEmails.filter(e => e.dkim_domain && e.dkim_domain.toLowerCase() !== 'none').length;
    const spfCount = rawEmails.filter(e => e.spf_domain && e.spf_domain.toLowerCase() !== 'none').length;

    // Top Sender Address
    const senderCounts = new Map<string, number>();
    rawEmails.forEach(e => {
        const s = e.sender_address.toLowerCase();
        senderCounts.set(s, (senderCounts.get(s) || 0) + 1);
    });
    const topSenderEntry = Array.from(senderCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const topSender = topSenderEntry ? { email: topSenderEntry[0], count: topSenderEntry[1] } : null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Analysis Statistics
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Scanned</div>
                            <div className="text-2xl font-bold text-white">{total}</div>
                        </div>
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Root Domains</div>
                            <div className="text-2xl font-bold text-blue-400">{groups.length}</div>
                        </div>
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">DKIM Pass</div>
                            <div className="text-2xl font-bold text-green-400">{((dkimCount / total) * 100).toFixed(1)}%</div>
                            <div className="text-xs text-slate-500 mt-1">{dkimCount} emails</div>
                        </div>
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">SPF Pass</div>
                            <div className="text-2xl font-bold text-orange-400">{((spfCount / total) * 100).toFixed(1)}%</div>
                            <div className="text-xs text-slate-500 mt-1">{spfCount} emails</div>
                        </div>
                    </div>

                    {/* Top Sender */}
                    {topSender && (
                        <div className="bg-slate-950/30 rounded-xl p-5 border border-slate-800/50">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                Most Frequent Sender Address
                            </h3>
                            <div className="flex items-center justify-between">
                                <div className="text-lg text-white font-mono bg-slate-900 px-3 py-1 rounded border border-slate-800 truncate max-w-[70%]">
                                    {topSender.email}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-white">{topSender.count}</div>
                                    <div className="text-xs text-slate-500">emails sent</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

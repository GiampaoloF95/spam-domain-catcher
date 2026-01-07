import { useEffect, useState } from 'react';
import { getSpamDomains, SpamEmail, getUserInfo, UserProfile } from '../api';
import StatsModal from './StatsModal';

interface DashboardProps {
    token: string;
    onLogout: () => void;
}

interface DomainGroup {
    domain: string;
    count: number;
    emails: SpamEmail[];
    sourceType: 'DKIM' | 'SPF' | 'HELO' | 'Sender';
}

export default function Dashboard({ token, onLogout }: DashboardProps) {
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [groups, setGroups] = useState<DomainGroup[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
    const [fetchLimit, setFetchLimit] = useState<number>(50);
    const [rawEmails, setRawEmails] = useState<SpamEmail[]>([]);
    const [groupingMode, setGroupingMode] = useState<'dkim' | 'spf'>('dkim');
    const [showStats, setShowStats] = useState(false);

    // Fetch user info on mount
    useEffect(() => {
        getUserInfo(token).then(setUser).catch(console.error);
    }, [token]);

    // Re-aggregate when rawEmails or groupingMode changes
    useEffect(() => {
        if (rawEmails.length === 0) return;

        const groupMap = new Map<string, DomainGroup>();

        const getRootDomain = (fullDomain: string) => {
            const parts = fullDomain.split('.');
            if (parts.length > 2) {
                return parts.slice(-2).join('.');
            }
            return fullDomain;
        };

        rawEmails.forEach(email => {
            let origin = '';
            let type: DomainGroup['sourceType'] = 'Sender';

            if (groupingMode === 'dkim') {
                if (email.dkim_domain && email.dkim_domain.toLowerCase() !== 'none') {
                    origin = email.dkim_domain;
                    type = 'DKIM';
                } else if (email.spf_domain && email.spf_domain.toLowerCase() !== 'none') {
                    origin = email.spf_domain;
                    type = 'SPF';
                } else {
                    const parts = email.sender_address.split('@');
                    origin = parts.length > 1 ? parts[1] : email.sender_address;
                    type = 'Sender';
                }
            } else { // SPF Priority
                if (email.spf_domain && email.spf_domain.toLowerCase() !== 'none') {
                    origin = email.spf_domain;
                    type = 'SPF';
                } else if (email.dkim_domain && email.dkim_domain.toLowerCase() !== 'none') {
                    origin = email.dkim_domain;
                    type = 'DKIM';
                } else {
                    const parts = email.sender_address.split('@');
                    origin = parts.length > 1 ? parts[1] : email.sender_address;
                    type = 'Sender';
                }
            }

            origin = origin.toLowerCase();
            const rootDomain = getRootDomain(origin);

            if (!groupMap.has(rootDomain)) {
                groupMap.set(rootDomain, { domain: rootDomain, count: 0, emails: [], sourceType: type });
            }

            const g = groupMap.get(rootDomain)!;
            g.count++;
            if (g.emails.length < 5) g.emails.push(email);
        });

        const sorted = Array.from(groupMap.values()).sort((a, b) => b.count - a.count);
        setGroups(sorted);
    }, [rawEmails, groupingMode]);

    const handleFetch = async () => {
        setLoading(true);
        setError(null);
        try {
            const emails = await getSpamDomains(token, fetchLimit);
            setRawEmails(emails); // Triggers the effect above
            setFetched(true);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-sans">
            {/* Navbar */}
            <header className="flex items-center justify-between px-8 py-5 bg-slate-900 border-b border-slate-800 shadow-md">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-inner"></div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
                        SpamOrigin
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {user && (
                        <div className="text-sm text-slate-400">
                            Logged in as <span className="text-slate-200 font-medium">{user.mail || user.user_principal_name || user.display_name}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setShowStats(true)}
                        className={`p-2 text-slate-400 hover:text-white transition-colors ${fetched ? 'block' : 'hidden'}`}
                        title="View Statistics"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </button>
                    <button
                        onClick={onLogout}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Sign Out
                    </button>
                    <button
                        onClick={fetched ? handleFetch : undefined}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/20 ${fetched ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'hidden'}`}
                    >
                        Refresh
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                {!fetched && !loading && (
                    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in-up">
                        <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-2xl backdrop-blur-sm max-w-md text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Ready to Analyze</h2>
                            <p className="text-slate-400 mb-6 leading-relaxed">
                                Scan your Junk Email folder to identify the true origin of spam.
                                We'll bypass the spoofed "From" address and look at the headers.
                            </p>

                            <div className="flex flex-col items-center gap-3 mb-8 w-full">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fetch Limit</label>
                                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700/50">
                                    {[50, 100, 500, 9999].map((limit) => (
                                        <button
                                            key={limit}
                                            onClick={() => setFetchLimit(limit)}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${fetchLimit === limit
                                                ? 'bg-slate-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                                }`}
                                        >
                                            {limit === 9999 ? 'Max' : limit}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleFetch}
                                className="group relative w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full duration-700 transition-transform -skew-x-12"></div>
                                Analyze Junk Folder
                            </button>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
                            <div className="absolute inset-2 border-b-4 border-purple-500 border-solid rounded-full animate-spin-reverse opacity-70"></div>
                        </div>
                        <p className="text-gray-400 animate-pulse tracking-wide text-sm font-medium">ANALYZING HEADERS...</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-900/30 text-red-300 rounded-lg text-center mt-8 mx-6 border border-red-500/30 max-w-2xl mx-auto">
                        <p className="font-bold mb-2">Error during analysis</p>
                        {error}
                        <button onClick={handleFetch} className="block mx-auto mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-white rounded transition text-sm">Retry</button>
                    </div>
                )}

                {fetched && !loading && (
                    <div className="max-w-6xl mx-auto space-y-8 p-8 pb-20">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.8fr] gap-6">
                            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-lg min-w-0">
                                <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Scanned</div>
                                <div className="text-3xl font-bold text-white truncate" title={`${groups.reduce((acc, g) => acc + g.count, 0)}`}>{groups.reduce((acc, g) => acc + g.count, 0)}</div>
                            </div>
                            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-lg min-w-0">
                                <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Unique Sources</div>
                                <div className="text-3xl font-bold text-blue-400 truncate" title={`${groups.length}`}>{groups.length}</div>
                            </div>
                            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-lg min-w-0">
                                <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Top Offender</div>
                                <div className="text-xl font-bold text-purple-400 truncate" title={groups[0]?.domain}>
                                    {groups[0]?.domain || "None"}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white pl-1">Identified Sources</h3>
                            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700/50">
                                <button
                                    onClick={() => setGroupingMode('dkim')}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${groupingMode === 'dkim' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    DKIM
                                </button>
                                <button
                                    onClick={() => setGroupingMode('spf')}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${groupingMode === 'spf' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    SPF
                                </button>
                            </div>
                        </div>

                        <StatsModal
                            isOpen={showStats}
                            onClose={() => setShowStats(false)}
                            rawEmails={rawEmails}
                            groups={groups}
                        />

                        <div className="grid gap-4">
                            {groups.map((group) => (
                                <div key={group.domain} className="group p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all shadow-md min-w-0">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="min-w-0 flex-1 pr-4">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-lg font-bold text-white truncate max-w-[calc(100%-2rem)]" title={group.domain}>
                                                    {group.domain}
                                                </h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(group.domain);
                                                        setCopiedDomain(group.domain);
                                                        setTimeout(() => setCopiedDomain(null), 2000);
                                                    }}
                                                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-all shrink-0"
                                                    title="Copy domain"
                                                >
                                                    {copiedDomain === group.domain ? (
                                                        <svg className="w-4 h-4 text-green-500 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                                        ${group.sourceType === 'DKIM' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        group.sourceType === 'SPF' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                                                    Via {group.sourceType}
                                                </span>
                                                <span className="text-slate-500">Responsible for {group.count} emails</span>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-700 group-hover:text-blue-500/50 transition-colors">
                                            {group.count}
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/50 rounded-lg p-3 space-y-2 border border-slate-800/50">
                                        {(expandedGroups.has(group.domain) ? group.emails : group.emails.slice(0, 3)).map((email, i) => (
                                            <div key={i} className="flex flex-col gap-0.5 text-xs animate-in fade-in duration-300">
                                                <div className="text-slate-300 font-medium truncate" title={email.subject}>
                                                    {email.subject || '(No Subject)'}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 truncate">
                                                    {email.received_date && (
                                                        <span className="text-slate-600 text-[10px] border-r border-slate-700 pr-2 mr-1">
                                                            {new Date(email.received_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                    <span title={email.sender_address}>From: {email.sender_name || email.sender_address}</span>
                                                    {email.dkim_domain && email.dkim_domain !== 'none' && (
                                                        <span className="text-green-600/70 flex items-center gap-1" title={`DKIM: ${email.dkim_domain}`}>
                                                            ✓ DKIM ({email.dkim_domain})
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(email.dkim_domain!);
                                                                }}
                                                                className="hover:text-green-400 p-0.5 rounded"
                                                                title="Copy DKIM domain"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                            </button>
                                                        </span>
                                                    )}
                                                    {email.spf_domain && email.spf_domain !== 'none' && (
                                                        <span className="text-orange-600/70 flex items-center gap-1" title={`SPF: ${email.spf_domain}`}>
                                                            ✓ SPF ({email.spf_domain})
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(email.spf_domain!);
                                                                }}
                                                                className="hover:text-orange-400 p-0.5 rounded"
                                                                title="Copy SPF domain"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                            </button>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {group.emails.length > 3 && (
                                            <button
                                                onClick={() => {
                                                    const next = new Set(expandedGroups);
                                                    if (next.has(group.domain)) next.delete(group.domain);
                                                    else next.add(group.domain);
                                                    setExpandedGroups(next);
                                                }}
                                                className="w-full text-[10px] text-blue-400/70 hover:text-blue-400 text-center italic mt-1 py-1 transition-colors"
                                            >
                                                {expandedGroups.has(group.domain)
                                                    ? 'Show less'
                                                    : `+ ${group.emails.length - 3} more`
                                                }
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

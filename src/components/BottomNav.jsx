import { Home, Archive, BarChart3, Dices, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGameStore } from '../store/gameStore';

export default function BottomNav({ activeTab, onTabChange }) {
    const gameStatus = useGameStore(state => state.gameStatus);

    const tabs = [
        { id: 'home', label: 'Accueil', icon: Home, alwaysEnabled: true },
        { id: 'virtual', label: 'Jouer', icon: Dices, alwaysEnabled: true },
        { id: 'pastGames', label: 'Parties', icon: Archive, alwaysEnabled: true },
        { id: 'stats', label: 'Profil', icon: BarChart3, alwaysEnabled: true },
        { id: 'settings', label: 'Réglages', icon: Settings, alwaysEnabled: true },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 glass-premium dark:glass-dark safe-area-bottom z-40 shadow-xl"
            role="tablist"
            aria-label="Navigation principale"
        >
            <div className="flex items-center h-16 pb-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isDisabled = !tab.alwaysEnabled && gameStatus === 'SETUP';

                    return (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={isActive}
                            aria-label={tab.label}
                            disabled={isDisabled}
                            onClick={() => !isDisabled && onTabChange(tab.id)}
                            className={cn(
                                "relative flex-1 flex flex-col items-center justify-center h-full space-y-0.5 transition-all duration-300 active:scale-95",
                                isActive ? "text-skyjo-blue dark:text-blue-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300",
                                isDisabled && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            {/* Indicateur supérieur */}
                            {isActive && (
                                <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-skyjo-blue to-sky-500 rounded-b-lg shadow-[0_0_10px_rgba(26,72,105,0.4)]" />
                            )}
                            <Icon
                                className={cn(
                                    "h-5 w-5 transition-all duration-300 relative z-10",
                                    isActive && "stroke-skyjo-blue dark:stroke-blue-400 drop-shadow-sm"
                                )}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className={cn(
                                "text-[9px] font-bold tracking-wide transition-colors relative z-10",
                                isActive ? "text-skyjo-blue dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
                            )}>
                                {tab.label.toUpperCase()}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

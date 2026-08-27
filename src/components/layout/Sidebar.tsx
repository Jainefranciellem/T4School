import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';
import {
    LayoutDashboard,
    Calendar,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/agenda', icon: Calendar, label: 'Agenda' },
    { path: '/alunos', icon: Users, label: 'Alunos' },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
    const { user, logout } = useAuth();

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Mobile toggle button */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden"
                onClick={onToggle}
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300 ease-in-out lg:translate-x-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-sidebar-border">
                        <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-ocean">
                                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sistema de Aulas</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => window.innerWidth < 1024 && onToggle()}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                    )
                                }
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-sidebar-border">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary font-semibold">
                                    {user?.nome?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-sidebar-foreground truncate">
                                    {user?.nome || 'Usuário'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={logout}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

import React from 'react';
import { Folder, Plus, Trash2, LogOut, Sun, Moon, PieChart as PieChartIcon } from 'lucide-react';
import { Project } from '../types';
import { User } from 'firebase/auth';

interface SidebarProps {
  user: User | null;
  projects: Project[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  showDashboard: boolean;
  setShowDashboard: (show: boolean) => void;
  setIsRecordingMode: (mode: boolean) => void;
  setActiveNoteId: (id: string | null) => void;
  setIsProjectModalOpen: (open: boolean) => void;
  setDeleteProjectConfirm: (id: string | null) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  handleLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  projects,
  activeProjectId,
  setActiveProjectId,
  showDashboard,
  setShowDashboard,
  setIsRecordingMode,
  setActiveNoteId,
  setIsProjectModalOpen,
  setDeleteProjectConfirm,
  isDarkMode,
  setIsDarkMode,
  handleLogout
}) => {
  if (!user) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex h-full">
      <div className="p-6 border-b border-gray-100">
        <h1 className="font-heading text-brand-primary font-bold text-2xl tracking-tight">
          Minuta <span className="italic text-brand-accent font-medium">Inteligente</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <button
            onClick={() => {
              setShowDashboard(true);
              setIsRecordingMode(false);
              setActiveNoteId(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              showDashboard
                ? 'bg-brand-primary text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <PieChartIcon size={18} />
            <span className="font-medium">Dashboard</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proyectos</h2>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="text-gray-400 hover:text-brand-primary transition-colors p-1 rounded-md hover:bg-brand-primary/10"
            title="Nuevo Proyecto"
          >
            <Plus size={16} />
          </button>
        </div>

        <ul className="space-y-1">
          {projects.map(project => (
            <li key={project.id} className="group flex items-center justify-between">
              <button
                onClick={() => {
                  setActiveProjectId(project.id);
                  setShowDashboard(false);
                  setIsRecordingMode(false);
                  setActiveNoteId(null);
                }}
                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left truncate ${
                  activeProjectId === project.id && !showDashboard
                    ? 'bg-brand-primary text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Folder size={18} className="flex-shrink-0" />
                <span className="truncate font-medium text-sm">{project.name}</span>
              </button>
              {project.id !== 'default' && (
                <button
                  onClick={() => setDeleteProjectConfirm(project.id)}
                  className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar proyecto"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 mb-3 px-2">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            {isDarkMode ? 'Claro' : 'Oscuro'}
          </button>
          <button 
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>
    </aside>
  );
};

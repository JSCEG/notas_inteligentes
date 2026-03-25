import React from 'react';
import { FileText, Folder, PieChart as PieChartIcon } from 'lucide-react';
import { Project, Note } from '../types';
import { formatTime } from '../utils';

interface DashboardProps {
  notes: Note[];
  projects: Project[];
  setActiveProjectId: (id: string) => void;
  setActiveNoteId: (id: string | null) => void;
  setShowDashboard: (show: boolean) => void;
  setIsRecordingMode: (mode: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  notes,
  projects,
  setActiveProjectId,
  setActiveNoteId,
  setShowDashboard,
  setIsRecordingMode
}) => {
  const totalDuration = notes.reduce((acc, note) => acc + (note.duration || 0), 0);
  const recentNotes = [...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-2">Resumen General</h2>
        <p className="text-gray-500">Vista general de todos tus proyectos y minutas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Folder size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Proyectos</p>
            <p className="text-2xl font-bold text-gray-900">{projects.length - 1}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Minutas</p>
            <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center">
            <PieChartIcon size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tiempo Grabado</p>
            <p className="text-2xl font-bold text-gray-900">{formatTime(totalDuration)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Minutas Recientes</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {recentNotes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay minutas recientes.
            </div>
          ) : (
            recentNotes.map(note => {
              const project = projects.find(p => p.id === note.projectId);
              return (
                <div 
                  key={note.id}
                  onClick={() => {
                    setActiveProjectId(note.projectId);
                    setActiveNoteId(note.id);
                    setShowDashboard(false);
                    setIsRecordingMode(false);
                  }}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">{note.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{new Date(note.date).toLocaleDateString('es-MX')}</span>
                      {project && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="flex items-center gap-1"><Folder size={12} /> {project.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-brand-primary">
                    <FileText size={20} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => setIsRecordingMode(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-brand-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-accent-dark hover:scale-105 transition-all z-50 focus:outline-none focus:ring-4 focus:ring-brand-accent/30"
      >
        <Mic size={24} />
      </button>
    </div>
  );
};

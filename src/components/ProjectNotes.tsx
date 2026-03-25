import React from 'react';
import { Plus, Search, Tag, X, FileText, Trash2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Project, Note } from '../types';
import { formatTime } from '../utils';

interface ProjectNotesProps {
  activeProject: Project;
  projectNotes: Note[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTagFilter: string | null;
  setActiveTagFilter: (tag: string | null) => void;
  allTags: string[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  paginatedNotes: Note[];
  setActiveNoteId: (id: string | null) => void;
  setIsRecordingMode: (mode: boolean) => void;
  setDeleteNoteConfirm: (id: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProjectNotes: React.FC<ProjectNotesProps> = ({
  activeProject,
  projectNotes,
  searchQuery,
  setSearchQuery,
  activeTagFilter,
  setActiveTagFilter,
  allTags,
  currentPage,
  setCurrentPage,
  totalPages,
  paginatedNotes,
  setActiveNoteId,
  setIsRecordingMode,
  setDeleteNoteConfirm,
  fileInputRef,
  handleFileUpload
}) => {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-2">{activeProject.name}</h2>
          <p className="text-gray-500">{projectNotes.length} minutas en este proyecto</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept="audio/*,video/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            <Upload size={18} /> Subir Archivo
          </button>
          <button 
            onClick={() => setIsRecordingMode(true)}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-xl hover:bg-brand-primary/90 transition-colors font-medium shadow-sm shadow-brand-primary/20"
          >
            <Plus size={18} /> Nueva Minuta
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por título, contenido o etiqueta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-shadow"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <span className="text-sm text-gray-500 flex items-center gap-1 whitespace-nowrap">
              <Tag size={14} /> Etiquetas:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTagFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTagFilter === null 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTagFilter(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTagFilter === tag 
                      ? 'bg-brand-primary text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedNotes.map(note => (
          <div 
            key={note.id} 
            className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-primary/30 transition-all cursor-pointer flex flex-col h-full"
            onClick={() => setActiveNoteId(note.id)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0">
                <FileText size={20} />
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteNoteConfirm(note.id);
                }}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                title="Eliminar minuta"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2 line-clamp-2">{note.title}</h3>
            <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-1">{note.summary}</p>
            
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {note.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-50 mt-auto">
              <span>{new Date(note.date).toLocaleDateString('es-MX')}</span>
              {note.duration !== undefined && (
                <span>{formatTime(note.duration)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {projectNotes.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay minutas aún</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">Comienza grabando tu primera reunión o subiendo un archivo de audio para generar una minuta inteligente.</p>
          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
            >
              <Upload size={18} /> Subir Archivo
            </button>
            <button 
              onClick={() => setIsRecordingMode(true)}
              className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl hover:bg-brand-primary/90 transition-colors font-medium shadow-sm shadow-brand-primary/20"
            >
              <Plus size={18} /> Nueva Minuta
            </button>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-600 font-medium px-4">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

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

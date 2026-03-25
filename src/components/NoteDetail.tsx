import React, { useState } from 'react';
import { ArrowLeft, Share2, FileDown, FileText, FileType2, Edit2, Save, X, Tag, Plus, Mic, CheckSquare, PieChart as PieChartIcon, Network, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Markdown from 'react-markdown';
import { TranscriptReader } from './TranscriptReader';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Note } from '../types';
import { formatTime } from '../utils';

interface NoteDetailProps {
  activeNote: Note;
  setActiveNoteId: (id: string | null) => void;
  handleExportTxt: (note: Note) => void;
  handleExportDocx: (note: Note) => void;
  handleExportPdf: (note: Note) => void;
  handleShareNote: (noteId: string) => void;
  handleUpdateNoteContent: (noteId: string, type: 'summary' | 'transcript', content: string) => void;
  handleToggleActionItem: (noteId: string, actionItems: any[], itemId: string) => void;
  handleRemoveTag: (noteId: string, tags: string[], tagToRemove: string) => void;
  handleAddTag: (noteId: string, tags: string[], newTag: string) => void;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
  editTitleValue: string;
  setEditTitleValue: (value: string) => void;
  handleUpdateTitle: (noteId: string, newTitle: string) => void;
  isEditingContent: 'summary' | 'transcript' | false;
  setIsEditingContent: (editing: 'summary' | 'transcript' | false) => void;
  editTranscriptValue: string;
  setEditTranscriptValue: (value: string) => void;
  editSummaryValue: string;
  setEditSummaryValue: (value: string) => void;
  newTagValue: string;
  setNewTagValue: (value: string) => void;
}

export const NoteDetail: React.FC<NoteDetailProps> = ({
  activeNote,
  setActiveNoteId,
  handleExportTxt,
  handleExportDocx,
  handleExportPdf,
  handleShareNote,
  handleUpdateNoteContent,
  handleToggleActionItem,
  handleRemoveTag,
  handleAddTag,
  isEditingTitle,
  setIsEditingTitle,
  editTitleValue,
  setEditTitleValue,
  handleUpdateTitle,
  isEditingContent,
  setIsEditingContent,
  editTranscriptValue,
  setEditTranscriptValue,
  editSummaryValue,
  setEditSummaryValue,
  newTagValue,
  setNewTagValue
}) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRecordingCollapsed, setIsRecordingCollapsed] = useState(false);
  const [isActionItemsCollapsed, setIsActionItemsCollapsed] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isSpeakerStatsCollapsed, setIsSpeakerStatsCollapsed] = useState(false);
  const [isTopicsTreeCollapsed, setIsTopicsTreeCollapsed] = useState(false);
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(false);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <button 
        onClick={() => setActiveNoteId(null)}
        className="flex items-center gap-2 text-gray-500 hover:text-brand-primary mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={18} /> Volver a Minutas
      </button>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" id="note-content">
        <div className="p-6 sm:p-10 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    className="flex-1 text-3xl font-heading font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    autoFocus
                  />
                  <button 
                    onClick={() => handleUpdateTitle(activeNote.id, editTitleValue)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Save size={20} />
                  </button>
                  <button 
                    onClick={() => setIsEditingTitle(false)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2 group">
                  <h2 className="font-heading text-3xl text-brand-primary font-bold">{activeNote.title}</h2>
                  <button 
                    onClick={() => {
                      setEditTitleValue(activeNote.title);
                      setIsEditingTitle(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-brand-primary/10"
                    title="Editar título"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{new Date(activeNote.date).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</span>
                {activeNote.duration !== undefined && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>Duración: {formatTime(activeNote.duration)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleShareNote(activeNote.id)}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
              >
                <Share2 size={16} /> Compartir
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  <FileDown size={16} /> Exportar
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-1">
                    <button onClick={() => { handleExportTxt(activeNote); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <FileText size={14} /> Como Texto (.txt)
                    </button>
                    <button onClick={() => { handleExportDocx(activeNote); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <FileType2 size={14} /> Como Word (.docx)
                    </button>
                    <button onClick={() => { handleExportPdf(activeNote); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <FileDown size={14} /> Como PDF (.pdf)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Tag size={14} /> Etiquetas:
            </span>
            {activeNote.tags && activeNote.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary">
                {tag}
                <button 
                  onClick={() => handleRemoveTag(activeNote.id, activeNote.tags || [], tag)}
                  className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1 ml-2">
              <input
                type="text"
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagValue.trim()) {
                    handleAddTag(activeNote.id, activeNote.tags || [], newTagValue.trim());
                  }
                }}
                placeholder="Nueva etiqueta..."
                className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-primary w-28"
              />
              <button 
                onClick={() => {
                  if (newTagValue.trim()) {
                    handleAddTag(activeNote.id, activeNote.tags || [], newTagValue.trim());
                  }
                }}
                className="p-1 text-gray-400 hover:text-brand-primary transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 bg-white">
          {activeNote.audioUrl && (
            <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Mic size={16} /> Grabación Original
                </h3>
                <button
                  onClick={() => setIsRecordingCollapsed(!isRecordingCollapsed)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-200"
                >
                  {isRecordingCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
              {!isRecordingCollapsed && (
                <audio controls src={activeNote.audioUrl} className="w-full" />
              )}
            </div>
          )}

          {activeNote.actionItems && activeNote.actionItems.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between border-b-2 border-brand-accent/20 pb-2 mb-6">
                <h3 className="text-xl font-heading font-bold text-brand-accent flex items-center gap-2">
                  <CheckSquare size={24} /> Elementos de Acción
                </h3>
                <button
                  onClick={() => setIsActionItemsCollapsed(!isActionItemsCollapsed)}
                  className="p-1.5 text-gray-400 hover:text-brand-accent transition-colors rounded-md hover:bg-brand-accent/10"
                >
                  {isActionItemsCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>
              {!isActionItemsCollapsed && (
                <ul className="space-y-3">
                  {activeNote.actionItems.map(item => (
                    <li key={item.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:border-brand-primary/30 transition-colors">
                      <button 
                        onClick={() => handleToggleActionItem(activeNote.id, activeNote.actionItems || [], item.id)}
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${item.completed ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300 text-transparent hover:border-brand-primary'}`}
                      >
                        <Check size={14} />
                      </button>
                      <span className={`text-gray-700 ${item.completed ? 'line-through opacity-60' : ''}`}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mb-12">
            <div className="flex items-center justify-between border-b-2 border-brand-secondary/20 pb-2 mb-6">
              <h3 className="text-xl font-heading font-bold text-brand-secondary flex items-center gap-2">
                <FileText size={24} /> Resumen Ejecutivo
              </h3>
              <div className="flex items-center gap-2">
                {!isEditingContent && (
                  <button 
                    onClick={() => {
                      setEditSummaryValue(activeNote.summary);
                      setIsEditingContent('summary');
                      setIsSummaryCollapsed(false);
                    }}
                    className="p-1.5 text-gray-400 hover:text-brand-secondary transition-colors rounded-md hover:bg-brand-secondary/10"
                    title="Editar resumen"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                  className="p-1.5 text-gray-400 hover:text-brand-secondary transition-colors rounded-md hover:bg-brand-secondary/10"
                >
                  {isSummaryCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>
            </div>
            
            {!isSummaryCollapsed && (
              isEditingContent === 'summary' ? (
                <div className="bg-amber-50/50 p-6 rounded-xl border border-amber-200">
                  <textarea
                    value={editSummaryValue}
                    onChange={(e) => setEditSummaryValue(e.target.value)}
                    className="w-full min-h-[200px] p-4 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary bg-white text-gray-700"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button 
                      onClick={() => setIsEditingContent(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleUpdateNoteContent(activeNote.id, 'summary', editSummaryValue)}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-secondary/90 transition-colors"
                    >
                      <Save size={16} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 bg-amber-50/50 p-6 rounded-xl border border-amber-100">
                  <Markdown>{activeNote.summary}</Markdown>
                </div>
              )
            )}
          </div>

          {activeNote.speakerStats && activeNote.speakerStats.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between border-b-2 border-brand-primary/20 pb-2 mb-6">
                <h3 className="text-xl font-heading font-bold text-brand-primary flex items-center gap-2">
                  <PieChartIcon size={24} /> Participación por Hablante
                </h3>
                <button
                  onClick={() => setIsSpeakerStatsCollapsed(!isSpeakerStatsCollapsed)}
                  className="p-1.5 text-gray-400 hover:text-brand-primary transition-colors rounded-md hover:bg-brand-primary/10"
                >
                  {isSpeakerStatsCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>
              {!isSpeakerStatsCollapsed && (
                <div className="w-full bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={activeNote.speakerStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {activeNote.speakerStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {activeNote.topicsTree && activeNote.topicsTree.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between border-b-2 border-brand-accent/20 pb-2 mb-6">
                <h3 className="text-xl font-heading font-bold text-brand-accent flex items-center gap-2">
                  <Network size={24} /> Árbol de Temas
                </h3>
                <button
                  onClick={() => setIsTopicsTreeCollapsed(!isTopicsTreeCollapsed)}
                  className="p-1.5 text-gray-400 hover:text-brand-accent transition-colors rounded-md hover:bg-brand-accent/10"
                >
                  {isTopicsTreeCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>
              {!isTopicsTreeCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeNote.topicsTree.map((topic, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="font-bold text-brand-primary mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center text-sm">{index + 1}</span>
                        {topic.topic}
                      </h4>
                      <ul className="space-y-2 pl-8">
                        {topic.subtopics.map((sub, idx) => (
                          <li key={idx} className="text-sm text-gray-600 list-disc marker:text-brand-accent">{sub}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between border-b-2 border-gray-200 pb-2 mb-6">
              <h3 className="text-xl font-heading font-bold text-gray-900 flex items-center gap-2">
                <Mic size={24} /> Transcripción Completa
              </h3>
              <div className="flex items-center gap-2">
                {!isEditingContent && (
                  <button 
                    onClick={() => {
                      setEditTranscriptValue(activeNote.transcript);
                      setIsEditingContent('transcript');
                      setIsTranscriptCollapsed(false);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100"
                    title="Editar transcripción"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsTranscriptCollapsed(!isTranscriptCollapsed)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100"
                >
                  {isTranscriptCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>
            </div>
            
            {!isTranscriptCollapsed && (
              isEditingContent === 'transcript' ? (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <textarea
                    value={editTranscriptValue}
                    onChange={(e) => setEditTranscriptValue(e.target.value)}
                    className="w-full min-h-[300px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-gray-700"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button 
                      onClick={() => setIsEditingContent(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleUpdateNoteContent(activeNote.id, 'transcript', editTranscriptValue)}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                    >
                      <Save size={16} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <TranscriptReader transcript={activeNote.transcript} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

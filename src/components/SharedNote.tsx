import React from 'react';
import { Loader2, Check, PieChart as PieChartIcon, Network, Mic, FileText, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Note } from '../types';
import { formatTime } from '../utils';

interface SharedNoteProps {
  sharedNote: Note | null;
  sharedNoteError: string | null;
}

export const SharedNote: React.FC<SharedNoteProps> = ({ sharedNote, sharedNoteError }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (sharedNoteError) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-bg">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <X size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{sharedNoteError}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 bg-brand-primary text-white px-6 py-2 rounded-xl hover:bg-brand-primary/90 transition-colors"
          >
            Ir a la aplicación
          </button>
        </div>
      </div>
    );
  }

  if (!sharedNote) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-bg">
        <Loader2 className="animate-spin text-brand-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans overflow-y-auto pb-12">
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-heading text-brand-primary font-bold text-xl">
          Minuta <span className="italic text-brand-accent font-medium">Inteligente</span>
        </h1>
        <button onClick={() => window.location.href = '/'} className="text-sm text-brand-primary hover:underline">Ir a la aplicación</button>
      </header>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-10 border-b border-gray-100 bg-gray-50">
            <h2 className="font-heading text-3xl text-brand-primary font-bold mb-2">{sharedNote.title}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{new Date(sharedNote.date).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</span>
              {sharedNote.duration !== undefined && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span>Duración: {formatTime(sharedNote.duration)}</span>
                </>
              )}
            </div>
          </div>
          <div className="p-6 sm:p-10 bg-white">
            {sharedNote.audioUrl && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Mic size={16} /> Grabación Original
                </h3>
                <audio controls src={sharedNote.audioUrl} className="w-full" />
              </div>
            )}

            {sharedNote.actionItems && sharedNote.actionItems.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                  <Check size={24} /> Elementos de Acción
                </h3>
                <ul className="space-y-3">
                  {sharedNote.actionItems.map(item => (
                    <li key={item.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <div 
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${item.completed ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300 text-transparent'}`}
                      >
                        <Check size={14} />
                      </div>
                      <span className={`text-gray-700 ${item.completed ? 'line-through opacity-60' : ''}`}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-12">
              <h3 className="text-xl font-heading font-bold text-brand-secondary border-b-2 border-brand-secondary/20 pb-2 mb-6 flex items-center gap-2">
                <FileText size={24} /> Resumen Ejecutivo
              </h3>
              <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 bg-amber-50/50 p-6 rounded-xl border border-amber-100">
                <Markdown>{sharedNote.summary}</Markdown>
              </div>
            </div>
            
            {sharedNote.speakerStats && sharedNote.speakerStats.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-heading font-bold text-brand-primary border-b-2 border-brand-primary/20 pb-2 mb-6 flex items-center gap-2">
                  <PieChartIcon size={24} /> Participación por Hablante
                </h3>
                <div className="w-full bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={sharedNote.speakerStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {sharedNote.speakerStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {sharedNote.topicsTree && sharedNote.topicsTree.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                  <Network size={24} /> Árbol de Temas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedNote.topicsTree.map((topic, index) => (
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
              </div>
            )}

            <div>
              <h3 className="text-xl font-heading font-bold text-gray-900 border-b-2 border-gray-200 pb-2 mb-6 flex items-center gap-2">
                <Mic size={24} /> Transcripción Completa
              </h3>
              <div className="prose prose-sm sm:prose-base max-w-none text-gray-600 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <Markdown>{sharedNote.transcript}</Markdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

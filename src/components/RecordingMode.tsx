import React from 'react';
import { Mic, Square, Loader2, Play, Pause, CheckSquare, Save, X, Upload, FileText, PieChart as PieChartIcon, Network } from 'lucide-react';
import Markdown from 'react-markdown';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatTime } from '../utils';

interface RecordingModeProps {
  isRecording: boolean;
  isProcessing: boolean;
  recordingTime: number;
  startRecording: () => void;
  stopRecording: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  tempTranscript: string;
  tempSummary: string;
  tempSpeakerStats: { name: string; percentage: number }[];
  tempTopicsTree: { topic: string; subtopics: string[] }[];
  tempActionItems: { id: string; text: string; completed: boolean }[];
  tempAudioUrl?: string;
  noteTitle: string;
  setNoteTitle: (title: string) => void;
  saveNote: () => void;
  cancelRecording: () => void;
}

export const RecordingMode: React.FC<RecordingModeProps> = ({
  isRecording,
  isProcessing,
  recordingTime,
  startRecording,
  stopRecording,
  handleFileUpload,
  fileInputRef,
  tempTranscript,
  tempSummary,
  tempSpeakerStats,
  tempTopicsTree,
  tempActionItems,
  tempAudioUrl,
  noteTitle,
  setNoteTitle,
  saveNote,
  cancelRecording
}) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-gray-100 bg-gray-50 flex flex-col items-center justify-center min-h-[300px] relative">
          {isProcessing ? (
            <div className="text-center animate-pulse-slow">
              <Loader2 className="animate-spin text-brand-primary mx-auto mb-6" size={64} />
              <h2 className="text-2xl font-heading font-bold text-gray-900 mb-2">Procesando Audio...</h2>
              <p className="text-gray-500">La Inteligencia Artificial está generando la minuta.</p>
            </div>
          ) : tempTranscript ? (
            <div className="w-full">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full text-3xl font-heading font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-brand-primary focus:outline-none transition-colors px-2 py-1 mb-6 text-center"
                placeholder="Título de la minuta"
              />
              <div className="flex justify-center gap-4">
                <button
                  onClick={saveNote}
                  className="flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-xl hover:bg-brand-primary/90 transition-colors font-medium shadow-sm shadow-brand-primary/20"
                >
                  <Save size={20} /> Guardar Minuta
                </button>
                <button
                  onClick={cancelRecording}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  <X size={20} /> Descartar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-8 relative">
                <div className={`absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 transition-opacity duration-1000 ${isRecording ? 'animate-pulse' : 'hidden'}`}></div>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-32 h-32 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                    isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-primary hover:bg-brand-primary/90'
                  }`}
                >
                  {isRecording ? <Square size={40} fill="currentColor" /> : <Mic size={48} />}
                </button>
              </div>
              <h2 className="text-3xl font-heading font-bold text-gray-900 mb-3">
                {isRecording ? 'Grabando...' : 'Iniciar Grabación'}
              </h2>
              <p className="text-xl font-mono text-gray-500 mb-6 bg-white px-4 py-2 rounded-lg border border-gray-200 inline-block shadow-sm">
                {formatTime(recordingTime)}
              </p>
              
              {!isRecording && (
                <div className="mt-8 pt-8 border-t border-gray-200 w-full max-w-xs mx-auto">
                  <p className="text-sm text-gray-500 mb-4">O sube un archivo de audio/video</p>
                  <input 
                    type="file" 
                    accept="audio/*,video/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
                  >
                    <Upload size={20} /> Seleccionar Archivo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {tempTranscript && (
          <div className="p-6 sm:p-10 bg-white">
            {tempAudioUrl && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Mic size={16} /> Grabación Original
                </h3>
                <audio controls src={tempAudioUrl} className="w-full" />
              </div>
            )}

            {tempActionItems && tempActionItems.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                  <CheckSquare size={24} /> Elementos de Acción
                </h3>
                <ul className="space-y-3">
                  {tempActionItems.map(item => (
                    <li key={item.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border border-gray-300 flex items-center justify-center text-transparent">
                        <CheckSquare size={14} />
                      </div>
                      <span className="text-gray-700">{item.text}</span>
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
                <Markdown>{tempSummary}</Markdown>
              </div>
            </div>

            {tempSpeakerStats && tempSpeakerStats.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-heading font-bold text-brand-primary border-b-2 border-brand-primary/20 pb-2 mb-6 flex items-center gap-2">
                  <PieChartIcon size={24} /> Participación por Hablante
                </h3>
                <div className="w-full bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={tempSpeakerStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {tempSpeakerStats.map((entry, index) => (
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

            {tempTopicsTree && tempTopicsTree.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                  <Network size={24} /> Árbol de Temas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tempTopicsTree.map((topic, index) => (
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
                <Markdown>{tempTranscript}</Markdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

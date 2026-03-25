import React from 'react';
import { LogIn, FileText, PieChart as PieChartIcon, Network } from 'lucide-react';

interface LoginProps {
  handleLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ handleLogin }) => {
  return (
    <div className="flex min-h-screen bg-brand-bg items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary"></div>
        <div className="w-20 h-20 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
          <FileText size={40} className="text-brand-primary transform -rotate-3" />
        </div>
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-3 tracking-tight">
          Minuta <span className="italic text-brand-accent">Inteligente</span>
        </h1>
        <p className="text-gray-500 mb-10 text-lg">Tu asistente de reuniones con IA.</p>
        
        <div className="space-y-4 mb-10 text-left">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
              <FileText size={16} />
            </div>
            <span className="text-sm">Transcripciones automáticas precisas</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
              <PieChartIcon size={16} />
            </div>
            <span className="text-sm">Análisis de participación por hablante</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <Network size={16} />
            </div>
            <span className="text-sm">Extracción de temas y acuerdos clave</span>
          </div>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-brand-primary text-white px-6 py-4 rounded-xl hover:bg-brand-primary/90 transition-all font-medium text-lg shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          <LogIn size={20} />
          Iniciar Sesión con Google
        </button>
      </div>
    </div>
  );
};

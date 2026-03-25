import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Moon, Sun, Type } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useVirtualizer } from '@tanstack/react-virtual';

interface TranscriptReaderProps {
  transcript: string;
}

export const TranscriptReader: React.FC<TranscriptReaderProps> = ({ transcript }) => {
  // Estados para controles de accesibilidad
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 0: sm, 1: base, 2: lg, 3: xl
  const [highContrast, setHighContrast] = useState(false);

  const fontSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
  const currentFontSize = fontSizes[fontSizeIndex];

  // Ref para el contenedor de scroll de la virtualización
  const parentRef = useRef<HTMLDivElement>(null);

  // Dividir el texto largo en fragmentos (por doble salto de línea)
  const transcriptChunks = useMemo(() => {
    return transcript.split('\n\n').filter(chunk => chunk.trim().length > 0);
  }, [transcript]);

  // Configuración del virtualizador (solo renderiza lo que se ve en pantalla)
  const rowVirtualizer = useVirtualizer({
    count: transcriptChunks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Altura estimada de cada párrafo
    overscan: 5, // Renderizar 5 elementos extra arriba y abajo por si se hace scroll rápido
  });

  // Clases condicionales institucionales
  const containerClasses = highContrast 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-white text-gray-800 border-gray-200';
    
  // Estilo específico para los hablantes según el modo
  const getSpeakerStyle = (speakerName: string) => {
    if (highContrast) {
      return <strong className="text-[#A57F2C] block mb-1 font-bold">{speakerName}:</strong>; // Dorado SENER
    }
    return <strong className="text-brand-primary block mb-1 font-bold">{speakerName}:</strong>; // Guinda SENER
  };

  // Función para renderizar un fragmento de Markdown
  const renderChunk = (chunk: string) => {
    // Si el fragmento empieza con un nombre de hablante (ej. "Hablante 1:")
    const speakerMatch = chunk.match(/^([^:]+):/);
    
    if (speakerMatch) {
      const speakerName = speakerMatch[1];
      const text = chunk.replace(/^[^:]+:/, '').trim();
      
      return (
        <div className={`p-4 rounded-xl ${highContrast ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
          {getSpeakerStyle(speakerName)}
          <div className={`prose max-w-none ${highContrast ? 'prose-invert text-gray-300' : 'text-gray-700'}`}>
            <ReactMarkdown>
              {text}
            </ReactMarkdown>
          </div>
        </div>
      );
    }

    // Texto normal sin hablante identificado
    return (
      <div className={`prose max-w-none ${highContrast ? 'prose-invert text-gray-300' : 'text-gray-700'}`}>
        <ReactMarkdown>
          {chunk}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`rounded-2xl border transition-colors duration-300 overflow-hidden flex flex-col h-[600px] ${containerClasses}`}>
      
      {/* Barra Sticky de Accesibilidad */}
      <div className={`flex flex-wrap items-center justify-between p-3 border-b shadow-sm z-10 
        ${highContrast ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
      >
        <div className="flex items-center gap-2">
          <Type size={18} className={highContrast ? 'text-gray-400' : 'text-gray-500'} />
          <div className="flex items-center bg-black/5 rounded-lg p-1">
            <button 
              onClick={() => setFontSizeIndex(Math.max(0, fontSizeIndex - 1))}
              disabled={fontSizeIndex === 0}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-black/10 disabled:opacity-30 transition-colors"
              aria-label="Reducir tamaño de letra"
            >
              <ZoomOut size={18} />
            </button>
            <div className="w-px h-6 bg-black/10 mx-1"></div>
            <button 
              onClick={() => setFontSizeIndex(Math.min(fontSizes.length - 1, fontSizeIndex + 1))}
              disabled={fontSizeIndex === fontSizes.length - 1}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-black/10 disabled:opacity-30 transition-colors"
              aria-label="Aumentar tamaño de letra"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setHighContrast(!highContrast)}
          className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg transition-colors font-medium text-sm
            ${highContrast ? 'bg-[#A57F2C] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          aria-label="Alternar modo de alto contraste"
        >
          {highContrast ? <Sun size={18} /> : <Moon size={18} />}
          <span className="hidden sm:inline">{highContrast ? 'Modo Normal' : 'Alto Contraste'}</span>
        </button>
      </div>

      {/* Contenedor Virtualizado con Scroll */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-auto p-4 sm:p-6"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className={`absolute top-0 left-0 w-full pb-6 transition-all ${currentFontSize} leading-loose font-sans`}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderChunk(transcriptChunks[virtualRow.index])}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

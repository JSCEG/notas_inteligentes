import { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { User } from 'firebase/auth';

export function useRecording(user: User | null, setIsRecordingMode: (val: boolean) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [tempTranscript, setTempTranscript] = useState('');
  const [tempSummary, setTempSummary] = useState('');
  const [tempSpeakerStats, setTempSpeakerStats] = useState<{ name: string; percentage: number }[]>([]);
  const [tempTopicsTree, setTempTopicsTree] = useState<{ topic: string; subtopics: string[] }[]>([]);
  const [tempActionItems, setTempActionItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [tempAudioUrl, setTempAudioUrl] = useState<string | undefined>(undefined);
  const [tempDuration, setTempDuration] = useState(0);
  const [noteTitle, setNoteTitle] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob, 'webm');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTempTranscript('');
      setTempSummary('');
      setTempSpeakerStats([]);
      setTempTopicsTree([]);
      setTempActionItems([]);
      setTempAudioUrl(undefined);
      setTempDuration(0);
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      alert("No se pudo acceder al micrófono. Por favor, verifique los permisos de su navegador.\n\nSi está viendo esto dentro de un editor, intente abrir la aplicación en una nueva pestaña usando el botón de la esquina superior derecha.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsProcessing(true);
      setTempDuration(recordingTime);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRecordingMode(true);
    setIsProcessing(true);
    setTempTranscript('');
    setTempSummary('');
    setTempSpeakerStats([]);
    setTempTopicsTree([]);
    setTempActionItems([]);
    setTempAudioUrl(undefined);
    setTempDuration(0);

    const fileExt = file.name.split('.').pop() || 'mp3';
    await processAudio(file, fileExt, file.type || 'audio/mp3');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processAudio = async (blob: Blob, fileExt: string = 'webm', mimeType: string = 'audio/webm') => {
    try {
      // Upload to Firebase Storage
      let uploadedAudioUrl = undefined;
      if (user) {
        try {
          const storageRef = ref(storage, `audio/${user.uid}/${Date.now()}.${fileExt}`);
          await uploadBytes(storageRef, blob);
          uploadedAudioUrl = await getDownloadURL(storageRef);
          setTempAudioUrl(uploadedAudioUrl);
        } catch (e) {
          console.error("Error uploading audio to storage", e);
        }
      }

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64String = base64data.split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              parts: [
                { text: 'Transcribe el siguiente audio en español. Identifica a las diferentes personas que hablan (ej. Hablante 1, Hablante 2). Genera un resumen que destaque los temas principales. Además, extrae una lista de tareas o acuerdos (actionItems) que se mencionen.' },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64String
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transcript: {
                  type: Type.STRING,
                  description: "La transcripción completa de la conversación con identificación de hablantes en formato Markdown."
                },
                summary: {
                  type: Type.STRING,
                  description: "Un resumen detallado de los temas principales en formato Markdown."
                },
                speakerStats: {
                  type: Type.ARRAY,
                  description: "Estadísticas de participación por hablante.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "Nombre del hablante (ej. Hablante 1)" },
                      percentage: { type: Type.NUMBER, description: "Porcentaje de participación (0-100)" }
                    },
                    required: ["name", "percentage"]
                  }
                },
                topicsTree: {
                  type: Type.ARRAY,
                  description: "Árbol de temas discutidos para un mapa mental.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      topic: { type: Type.STRING, description: "Tema principal" },
                      subtopics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Subtemas relacionados"
                      }
                    },
                    required: ["topic", "subtopics"]
                  }
                },
                actionItems: {
                  type: Type.ARRAY,
                  description: "Lista de tareas, acuerdos o puntos de acción extraídos de la reunión.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: "Un ID único generado aleatoriamente para esta tarea" },
                      text: { type: Type.STRING, description: "Descripción de la tarea o acuerdo" },
                      completed: { type: Type.BOOLEAN, description: "Siempre falso por defecto" }
                    },
                    required: ["id", "text", "completed"]
                  }
                }
              },
              required: ["transcript", "summary", "speakerStats", "topicsTree", "actionItems"]
            }
          }
        });
        
        if (response.text) {
          try {
            const result = JSON.parse(response.text);
            setTempTranscript(result.transcript || 'Sin transcripción.');
            setTempSummary(result.summary || 'Sin resumen.');
            setTempSpeakerStats(result.speakerStats || []);
            setTempTopicsTree(result.topicsTree || []);
            setTempActionItems(result.actionItems || []);
            setNoteTitle(`Minuta - ${new Date().toLocaleString('es-MX')}`);
          } catch (e) {
            console.error("Error parsing JSON response", e);
            setTempTranscript("Error al procesar el formato de la respuesta.");
          }
        } else {
          setTempTranscript('No se pudo generar la transcripción.');
        }
        setIsProcessing(false);
      };
    } catch (error) {
      console.error("Error al procesar el audio:", error);
      setTempTranscript("Ocurrió un error al procesar el audio con la Inteligencia Artificial.");
      setIsProcessing(false);
    }
  };

  const resetRecordingState = () => {
    setIsRecordingMode(false);
    setTempTranscript('');
    setTempSummary('');
    setTempSpeakerStats([]);
    setTempTopicsTree([]);
    setTempActionItems([]);
    setTempAudioUrl(undefined);
    setTempDuration(0);
    setNoteTitle('');
  };

  return {
    isRecording,
    isProcessing,
    recordingTime,
    setRecordingTime,
    tempTranscript,
    tempSummary,
    tempSpeakerStats,
    tempTopicsTree,
    tempActionItems,
    tempAudioUrl,
    tempDuration,
    noteTitle,
    setNoteTitle,
    fileInputRef,
    startRecording,
    stopRecording,
    handleFileUpload,
    resetRecordingState
  };
}

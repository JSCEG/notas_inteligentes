import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, Copy, FileText, Check, Plus, Folder, Search, Download, FileDown, FileType2, ChevronRight, Trash2, ArrowLeft, Save, LogOut, LogIn, PieChart as PieChartIcon, Network, MessageCircle, Share2, Edit2, Tag, X, ChevronLeft } from 'lucide-react';
import { ToastContainer, Toast, ToastType } from './components/ToastContainer';
// Gemini se llama a través del proxy /api/gemini (Cloudflare Pages Function)
// La API key nunca llega al bundle del cliente
import Markdown from 'react-markdown';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Firebase imports
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, getDocs, writeBatch, getDoc, updateDoc } from 'firebase/firestore';

interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

interface Note {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  transcript: string;
  summary: string;
  date: string;
  duration?: number;
  speakerStats?: { name: string; percentage: number }[];
  topicsTree?: { topic: string; subtopics: string[] }[];
  isShared?: boolean;
  tags?: string[];
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // ── Toast system ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Firestore error handler (usa showToast) ───────────────────────────────
  const handleFirestoreError = useCallback((error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    showToast(`Error de base de datos: ${errInfo.error}`, 'error');
  }, [showToast]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState<boolean>(true);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeProjectId, searchQuery, activeTagFilter]);

  // Edit Note Title State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Tags State
  const [newTagValue, setNewTagValue] = useState('');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [tempTranscript, setTempTranscript] = useState('');
  const [tempSummary, setTempSummary] = useState('');
  const [tempSpeakerStats, setTempSpeakerStats] = useState<{ name: string; percentage: number }[]>([]);
  const [tempTopicsTree, setTempTopicsTree] = useState<{ topic: string; subtopics: string[] }[]>([]);
  const [tempDuration, setTempDuration] = useState(0);
  const [noteTitle, setNoteTitle] = useState('');
  
  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<string | null>(null);
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<string | null>(null);
  
  // Shared Note State
  const [sharedNoteId, setSharedNoteId] = useState<string | null>(null);
  const [sharedNote, setSharedNote] = useState<Note | null>(null);
  const [sharedNoteError, setSharedNoteError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auth Listener
  useEffect(() => {
    // Check if we are in shared note view
    const path = window.location.pathname;
    if (path.startsWith('/shared/')) {
      const id = path.split('/')[2];
      if (id) {
        setSharedNoteId(id);
        // Fetch shared note
        getDoc(doc(db, 'notes', id)).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data() as Note;
            if (data.isShared) {
              setSharedNote({ id: docSnap.id, ...data });
            } else {
              setSharedNoteError('Esta minuta no está compartida públicamente.');
            }
          } else {
            setSharedNoteError('La minuta no existe.');
          }
        }).catch(err => {
          console.error(err);
          setSharedNoteError('Error al cargar la minuta compartida.');
        });
        return; // Do not initialize auth if we are just viewing a shared note
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!isAuthReady || !user) {
      setProjects([]);
      setNotes([]);
      return;
    }

    const qProjects = query(collection(db, 'projects'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      const projData: Project[] = [];
      snapshot.forEach(doc => projData.push({ id: doc.id, ...doc.data() } as Project));
      
      // Ensure "General" project exists locally if not in DB, though we should create it
      if (projData.length === 0) {
        // Auto-create default project
        addDoc(collection(db, 'projects'), {
          userId: user.uid,
          name: 'General',
          createdAt: new Date().toISOString()
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'projects'));
      } else {
        setProjects(projData);
        if (activeProjectId === 'default' && projData.length > 0) {
          setActiveProjectId(projData[0].id);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    const qNotes = query(collection(db, 'notes'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const unsubNotes = onSnapshot(qNotes, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach(doc => notesData.push({ id: doc.id, ...doc.data() } as Note));
      setNotes(notesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notes'));

    return () => {
      unsubProjects();
      unsubNotes();
    };
  }, [user, isAuthReady]);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        userId: user.uid,
        name: newProjectName.trim(),
        createdAt: new Date().toISOString()
      });
      setActiveProjectId(docRef.id);
      setShowDashboard(false);
      setActiveNoteId(null);
      setIsRecordingMode(false);
      setIsProjectModalOpen(false);
      setNewProjectName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const notesToDelete = notes.filter(n => n.projectId === id);

      // Firestore writeBatch admite máximo 500 operaciones por lote
      const BATCH_SIZE = 499;
      for (let i = 0; i < notesToDelete.length; i += BATCH_SIZE) {
        const chunk = notesToDelete.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(note => batch.delete(doc(db, 'notes', note.id)));
        await batch.commit();
      }

      // Eliminar el proyecto en un batch aparte (o deleteDoc simple)
      await deleteDoc(doc(db, 'projects', id));

      if (activeProjectId === id) {
        const remaining = projects.filter(p => p.id !== id);
        if (remaining.length > 0) {
          setActiveProjectId(remaining[0].id);
        } else {
          setShowDashboard(true);
        }
        setActiveNoteId(null);
        setIsRecordingMode(false);
      }
      setDeleteProjectConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
      setDeleteNoteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
    }
  };

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
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTempTranscript('');
      setTempSummary('');
      setTempSpeakerStats([]);
      setTempTopicsTree([]);
      setTempDuration(0);
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      showToast('No se pudo acceder al micrófono. Por favor, verifique los permisos.', 'error');
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

  const processAudio = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1];

          // Llamamos al proxy /api/gemini (Cloudflare Pages Function)
          // El proxy inyecta la API key desde variables de entorno del servidor
          const requestBody = {
            model: 'gemini-2.5-flash',
            contents: [
              {
                parts: [
                  { text: 'Transcribe el siguiente audio en español. Identifica a las diferentes personas que hablan (ej. Hablante 1, Hablante 2). Además, genera un resumen que destaque los puntos de acción, decisiones tomadas y temas principales de la conversación.' },
                  {
                    inlineData: {
                      mimeType: 'audio/webm',
                      data: base64String
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  transcript: {
                    type: 'STRING',
                    description: 'La transcripción completa de la conversación con identificación de hablantes en formato Markdown.'
                  },
                  summary: {
                    type: 'STRING',
                    description: 'Un resumen detallado que incluya: Temas principales, Decisiones tomadas y Puntos de acción (tareas asignadas), en formato Markdown.'
                  },
                  speakerStats: {
                    type: 'ARRAY',
                    description: 'Estadísticas de participación por hablante.',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        name: { type: 'STRING', description: 'Nombre del hablante (ej. Hablante 1)' },
                        percentage: { type: 'NUMBER', description: 'Porcentaje de participación (0-100)' }
                      },
                      required: ['name', 'percentage']
                    }
                  },
                  topicsTree: {
                    type: 'ARRAY',
                    description: 'Árbol de temas discutidos para un mapa mental.',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        topic: { type: 'STRING', description: 'Tema principal' },
                        subtopics: {
                          type: 'ARRAY',
                          items: { type: 'STRING' },
                          description: 'Subtemas relacionados'
                        }
                      },
                      required: ['topic', 'subtopics']
                    }
                  }
                },
                required: ['transcript', 'summary', 'speakerStats', 'topicsTree']
              }
            }
          };

          const res = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Error del servidor: ${res.status} — ${errText}`);
          }

          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (text) {
            try {
              const result = JSON.parse(text);
              setTempTranscript(result.transcript || 'Sin transcripción.');
              setTempSummary(result.summary || 'Sin resumen.');
              setTempSpeakerStats(result.speakerStats || []);
              setTempTopicsTree(result.topicsTree || []);
              setNoteTitle(`Minuta - ${new Date().toLocaleString('es-MX')}`);
            } catch (e) {
              console.error('Error parsing JSON response', e);
              setTempTranscript('Error al procesar el formato de la respuesta.');
            }
          } else {
            setTempTranscript('No se pudo generar la transcripción.');
          }
        } catch (innerError) {
          console.error('Error al llamar al proxy Gemini:', innerError);
          setTempTranscript('Ocurrió un error al procesar el audio con la Inteligencia Artificial.');
        }
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Error al procesar el audio:', error);
      setTempTranscript('Ocurrió un error al procesar el audio con la Inteligencia Artificial.');
      setIsProcessing(false);
    }
  };

  const saveNote = async () => {
    if (!user) return;
    if (!noteTitle.trim()) {
      showToast('Por favor, ingrese un título para la nota.', 'error');
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, 'notes'), {
        userId: user.uid,
        projectId: activeProjectId,
        title: noteTitle,
        transcript: tempTranscript,
        summary: tempSummary,
        speakerStats: tempSpeakerStats,
        topicsTree: tempTopicsTree,
        duration: tempDuration,
        date: new Date().toISOString()
      });
      
      setIsRecordingMode(false);
      setActiveNoteId(docRef.id);
      setTempTranscript('');
      setTempSummary('');
      setTempSpeakerStats([]);
      setTempTopicsTree([]);
      setTempDuration(0);
      setNoteTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  const exportTXT = (note: Note) => {
    let content = `# ${note.title}\n\nFecha: ${new Date(note.date).toLocaleString('es-MX')}\nProyecto: ${projects.find(p => p.id === note.projectId)?.name || 'Desconocido'}\n\n## Resumen\n${note.summary}\n\n`;
    
    if (note.topicsTree && note.topicsTree.length > 0) {
      content += `## Mapa de Temas\n`;
      note.topicsTree.forEach(topic => {
        content += `- ${topic.topic}\n`;
        topic.subtopics.forEach(sub => {
          content += `  - ${sub}\n`;
        });
      });
      content += `\n`;
    }

    content += `## Transcripción\n${note.transcript}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${note.title}.txt`);
  };

  const exportDOCX = async (note: Note) => {
    const docChildren: any[] = [
      new Paragraph({ text: note.title, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Fecha: ${new Date(note.date).toLocaleString('es-MX')}` }),
      new Paragraph({ text: `Proyecto: ${projects.find(p => p.id === note.projectId)?.name || 'Desconocido'}` }),
      new Paragraph({ text: "" }),
      new Paragraph({ text: "Resumen", heading: HeadingLevel.HEADING_2 }),
      ...note.summary.split('\n').map(line => new Paragraph({ text: line })),
      new Paragraph({ text: "" }),
    ];

    if (note.topicsTree && note.topicsTree.length > 0) {
      docChildren.push(new Paragraph({ text: "Mapa de Temas", heading: HeadingLevel.HEADING_2 }));
      note.topicsTree.forEach(topic => {
        docChildren.push(new Paragraph({ text: `• ${topic.topic}`, bullet: { level: 0 } }));
        topic.subtopics.forEach(sub => {
          docChildren.push(new Paragraph({ text: `- ${sub}`, bullet: { level: 1 } }));
        });
      });
      docChildren.push(new Paragraph({ text: "" }));
    }

    docChildren.push(new Paragraph({ text: "Transcripción", heading: HeadingLevel.HEADING_2 }));
    docChildren.push(...note.transcript.split('\n').map(line => new Paragraph({ text: line })));

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren,
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${note.title}.docx`);
  };

  const exportPDF = async (note: Note) => {
    const element = document.getElementById(`note-export-content`);
    if (!element) return;
    
    // Create a clone to avoid modifying the actual DOM and causing re-renders
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Apply specific styles to the clone for PDF export
    clone.style.width = '800px';
    clone.style.maxWidth = 'none';
    clone.style.margin = '0';
    clone.style.padding = '40px';
    clone.style.background = 'white';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '-9999px';
    
    // Fix Recharts SVG issues para html-to-image (atributos width/height explícitos)
    const svgs = clone.querySelectorAll('svg.recharts-surface');
    svgs.forEach(svg => {
      const bbox = (svg as any).getBoundingClientRect?.();
      if (bbox) {
        svg.setAttribute('width', `${bbox.width}`);
        svg.setAttribute('height', `${bbox.height}`);
      }
    });

    document.body.appendChild(clone);
    
    try {
      // Use html-to-image to avoid color function errors
      const dataUrl = await toJpeg(clone, { 
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgHeight = (img.height * pdfWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`${note.title}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      showToast('Hubo un error al generar el PDF. Intente exportar a DOCX o TXT.', 'error');
    } finally {
      document.body.removeChild(clone);
    }
  };

  const shareWhatsApp = (note: Note) => {
    const text = `*Minuta: ${note.title}*\n\n*Resumen:*\n${note.summary}\n\nEnlace a la aplicación: ${window.location.origin}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const toggleShareLink = async (note: Note) => {
    try {
      const newIsShared = !note.isShared;
      await updateDoc(doc(db, 'notes', note.id), { isShared: newIsShared });
      
      if (newIsShared) {
        const url = `${window.location.origin}/shared/${note.id}`;
        await navigator.clipboard.writeText(url);
        showToast('¡Enlace copiado al portapapeles!', 'success');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${note.id}`);
    }
  };

  const handleUpdateNoteTitle = async (noteId: string) => {
    if (!editTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateDoc(doc(db, 'notes', noteId), { title: editTitleValue.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const handleAddTag = async (noteId: string, currentTags: string[] = []) => {
    const tag = newTagValue.trim().toLowerCase();
    if (!tag || currentTags.includes(tag) || currentTags.length >= 50) {
      setNewTagValue('');
      return;
    }
    try {
      await updateDoc(doc(db, 'notes', noteId), { tags: [...currentTags, tag] });
      setNewTagValue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const handleRemoveTag = async (noteId: string, tagToRemove: string, currentTags: string[] = []) => {
    try {
      await updateDoc(doc(db, 'notes', noteId), { tags: currentTags.filter(t => t !== tagToRemove) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  if (sharedNoteId) {
    if (sharedNoteError) {
      return (
        <div className="flex h-screen items-center justify-center bg-brand-bg font-sans">
          <div className="max-w-md w-full text-center px-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-8">{sharedNoteError}</p>
            <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-brand-primary text-white rounded-lg">Ir al inicio</button>
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
              <div className="mb-12">
                <h3 className="text-xl font-heading font-bold text-brand-secondary border-b-2 border-brand-secondary/20 pb-2 mb-6 flex items-center gap-2">
                  <Check size={24} /> Resumen Ejecutivo
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
                            <Cell key={`cell-${index}`} fill={['#9D2449', '#13322B', '#B38E5D', '#D4C19C', '#285C4D'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {sharedNote.topicsTree && sharedNote.topicsTree.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                    <Network size={24} /> Mapa de Temas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sharedNote.topicsTree.map((topic, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-secondary"></div>
                          {topic.topic}
                        </h4>
                        <ul className="space-y-1 pl-4 border-l-2 border-gray-100 ml-1">
                          {topic.subtopics.map((sub, sidx) => (
                            <li key={sidx} className="text-sm text-gray-600 relative before:content-[''] before:absolute before:w-2 before:h-0.5 before:bg-gray-200 before:top-2.5 before:-left-4">
                              {sub}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                  <Mic size={24} /> Transcripción Completa
                </h3>
                <div className="prose prose-sm sm:prose-base max-w-none text-gray-700">
                  <Markdown>{sharedNote.transcript}</Markdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-bg">
        <Loader2 className="animate-spin text-brand-primary" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-bg font-sans">
        <div className="max-w-2xl w-full text-center px-6">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px bg-gray-300 w-16"></div>
            <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Asistente de Reuniones · IA</p>
            <div className="h-px bg-gray-300 w-16"></div>
          </div>
          
          <h1 className="font-heading text-6xl md:text-7xl text-brand-primary mb-6 tracking-tight">
            Minuta <span className="italic text-brand-accent font-medium">Inteligente</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-lg mx-auto font-light">
            Graba, transcribe y resume tus reuniones con inteligencia artificial.
          </p>
          
          <div className="flex justify-center">
            <button 
              onClick={handleLogin}
              className="flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md text-gray-800 px-8 py-4 rounded-full font-medium transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeProject = projects.find(p => p.id === activeProjectId);
  const filteredNotes = notes
    .filter(n => n.projectId === activeProjectId)
    .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.summary.toLowerCase().includes(searchQuery.toLowerCase()) || n.transcript.toLowerCase().includes(searchQuery.toLowerCase()) || (n.tags && n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))))
    .filter(n => activeTagFilter ? n.tags?.includes(activeTagFilter) : true);

  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE);
  const paginatedNotes = filteredNotes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Get unique tags for the current project
  const projectTags = Array.from(new Set(
    notes.filter(n => n.projectId === activeProjectId).flatMap(n => n.tags || [])
  )).sort();
  
  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="flex h-screen bg-brand-bg font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h1 className="font-heading text-brand-primary text-xl font-bold leading-tight">
            Minuta <span className="italic text-brand-accent font-medium">Inteligente</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Asistente de Reuniones</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <button
              onClick={() => {
                setShowDashboard(true);
                setActiveNoteId(null);
                setIsRecordingMode(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${showDashboard ? 'bg-brand-accent text-white font-medium shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <PieChartIcon size={16} className={showDashboard ? 'text-white' : 'text-brand-secondary-dark'} />
              <span>Resumen General</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proyectos</h2>
            <button onClick={() => setIsProjectModalOpen(true)} className="text-brand-primary hover:bg-gray-100 p-1 rounded transition-colors" title="Nuevo Proyecto">
              <Plus size={16} />
            </button>
          </div>
          <ul className="space-y-1 mb-8">
            {projects.map(project => (
              <li key={project.id}>
                <button
                  onClick={() => {
                    setActiveProjectId(project.id);
                    setShowDashboard(false);
                    setActiveNoteId(null);
                    setIsRecordingMode(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${!showDashboard && activeProjectId === project.id ? 'bg-brand-accent text-white font-medium shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Folder size={16} className={!showDashboard && activeProjectId === project.id ? 'text-white' : 'text-brand-secondary-dark'} />
                    <span className="truncate">{project.name}</span>
                  </div>
                  {projects.length > 1 && (
                    <Trash2 
                      size={14} 
                      className={`opacity-0 hover:opacity-100 transition-opacity ${!showDashboard && activeProjectId === project.id ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectConfirm(project.id);
                      }}
                    />
                  )}
                </button>
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
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h1 className="font-heading text-brand-primary font-bold">Minuta Inteligente</h1>
          <div className="flex items-center gap-2">
            <select 
              className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-2 py-1.5 focus:ring-brand-primary focus:border-brand-primary max-w-[120px]"
              value={activeProjectId}
              onChange={(e) => {
                setActiveProjectId(e.target.value);
                setActiveNoteId(null);
                setIsRecordingMode(false);
              }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={handleLogout} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* View: Dashboard */}
            {showDashboard && !isRecordingMode && !activeNoteId && (
              <div className="animate-fadeIn">
                <div className="mb-8">
                  <h2 className="font-heading text-3xl text-brand-primary font-bold">Resumen General</h2>
                  <p className="text-gray-500 mt-1">Métricas y actividad reciente en todos tus proyectos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total de Minutas</p>
                      <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                      <Mic size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Tiempo Grabado</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatTime(notes.reduce((acc, note) => acc + (note.duration || 0), 0))}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                      <Folder size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Proyectos Activos</p>
                      <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                  <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-heading text-xl text-brand-primary font-bold">Minutas Recientes</h3>
                  </div>
                  {notes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No hay minutas recientes.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {notes.slice(0, 5).map(note => (
                        <li key={note.id} className="group hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between p-4 sm:p-6 cursor-pointer" onClick={() => {
                            setActiveProjectId(note.projectId);
                            setActiveNoteId(note.id);
                            setShowDashboard(false);
                          }}>
                            <div className="flex-1 min-w-0 pr-4">
                              <h4 className="text-lg font-semibold text-gray-900 truncate mb-1 group-hover:text-brand-accent transition-colors">{note.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                                <span>{new Date(note.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span className="flex items-center gap-1"><Folder size={12} /> {projects.find(p => p.id === note.projectId)?.name || 'Proyecto'}</span>
                              </div>
                            </div>
                            <ChevronRight className="text-gray-300 group-hover:text-brand-primary transition-colors" size={24} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* View: Project Notes List */}
            {!showDashboard && !isRecordingMode && !activeNoteId && (
              <div className="animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="font-heading text-3xl text-brand-primary font-bold">{activeProject?.name || 'Cargando...'}</h2>
                    <p className="text-gray-500 mt-1">Gestione las minutas y transcripciones de este proyecto.</p>
                  </div>
                  <button 
                    onClick={() => setIsRecordingMode(true)}
                    className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                    disabled={!activeProject}
                  >
                    <Mic size={20} />
                    Nueva Minuta
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar por palabra, tema o etiqueta..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
                      />
                    </div>
                    {projectTags.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Etiquetas:</span>
                        <button
                          onClick={() => setActiveTagFilter(null)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!activeTagFilter ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          Todas
                        </button>
                        {projectTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setActiveTagFilter(tag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTagFilter === tag ? 'bg-brand-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {filteredNotes.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="text-gray-300" size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No hay minutas</h3>
                      <p className="text-gray-500 text-sm max-w-sm">
                        {searchQuery ? 'No se encontraron resultados para su búsqueda.' : 'Comience creando una nueva minuta para este proyecto.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-gray-100">
                        {paginatedNotes.map(note => (
                          <li key={note.id} className="group hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between p-4 sm:p-6 cursor-pointer" onClick={() => setActiveNoteId(note.id)}>
                              <div className="flex items-start gap-4 flex-1 min-w-0 pr-4">
                                <div className="mt-1 bg-brand-primary/10 p-2 rounded-lg text-brand-primary hidden sm:block">
                                  <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-lg font-semibold text-gray-900 truncate mb-1 group-hover:text-brand-accent transition-colors">{note.title}</h4>
                                  <p className="text-sm text-gray-500 mb-2">{new Date(note.date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{note.summary.replace(/[#*]/g, '')}</p>
                                  {note.tags && note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {note.tags.map(tag => (
                                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteNoteConfirm(note.id);
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  title="Eliminar"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <ChevronRight className="text-gray-300 group-hover:text-brand-primary transition-colors" size={24} />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          >
                            <ChevronLeft size={16} /> Anterior
                          </button>
                          <span className="text-sm text-gray-500 font-medium">
                            Página {currentPage} de {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          >
                            Siguiente <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* View: Recording Mode */}
            {isRecordingMode && (
              <div className="animate-fadeIn">
                <button 
                  onClick={() => setIsRecordingMode(false)}
                  className="flex items-center gap-2 text-gray-500 hover:text-brand-primary mb-6 transition-colors text-sm font-medium"
                >
                  <ArrowLeft size={16} /> Volver al proyecto
                </button>

                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Mic className="text-brand-accent" size={28} />
                      <h2 className="font-heading text-2xl text-brand-primary">Grabar Nueva Minuta</h2>
                    </div>
                    <p className="text-gray-600 mb-8 max-w-2xl">
                      Presione el botón para comenzar a grabar. La inteligencia artificial transcribirá el audio, identificará a los participantes y generará un resumen estructurado.
                    </p>
                    
                    <div className="flex flex-col items-center justify-center py-16 bg-[#F9F9F9] rounded-xl border-2 border-dashed border-gray-200 mb-8 transition-all">
                      {!isRecording && !isProcessing && !tempTranscript && (
                        <button 
                          onClick={startRecording}
                          className="flex items-center gap-3 bg-brand-accent hover:bg-brand-accent-dark text-white px-8 py-4 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                          <Mic size={24} />
                          Iniciar Grabación
                        </button>
                      )}
                      
                      {isRecording && (
                        <div className="flex flex-col items-center">
                          <div className="text-5xl font-mono text-brand-primary mb-6 font-bold tracking-wider">
                            {formatTime(recordingTime)}
                          </div>
                          <div className="flex items-center gap-3 mb-8">
                            <span className="relative flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                            </span>
                            <span className="text-red-500 font-medium animate-pulse">Grabando audio en curso...</span>
                          </div>
                          <button 
                            onClick={stopRecording}
                            className="flex items-center gap-3 bg-brand-primary hover:bg-brand-primary-dark text-white px-8 py-4 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
                          >
                            <Square size={24} />
                            Detener y Procesar
                          </button>
                        </div>
                      )}

                      {isProcessing && (
                        <div className="flex flex-col items-center">
                          <Loader2 className="animate-spin text-brand-accent mb-4" size={48} />
                          <p className="text-brand-accent font-bold text-lg">Procesando audio e IA...</p>
                          <p className="text-sm text-gray-500 mt-2 text-center max-w-md">
                            Generando transcripción y resumen ejecutivo. Esto puede tomar unos momentos.
                          </p>
                        </div>
                      )}

                      {tempTranscript && !isProcessing && (
                        <div className="w-full max-w-2xl px-6">
                          <div className="bg-green-50 text-green-800 p-4 rounded-lg mb-6 flex items-start gap-3 border border-green-200">
                            <Check className="mt-0.5 flex-shrink-0" size={20} />
                            <div>
                              <h4 className="font-bold">Procesamiento completado</h4>
                              <p className="text-sm mt-1">Revise el título y guarde la minuta en el proyecto actual.</p>
                            </div>
                          </div>
                          
                          <label className="block text-sm font-bold text-gray-700 mb-2">Título de la Minuta</label>
                          <input 
                            type="text" 
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none mb-6 text-lg font-medium"
                            placeholder="Ej. Reunión de planeación Q3"
                          />
                          
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => {
                                setTempTranscript('');
                                setTempSummary('');
                                setNoteTitle('');
                              }}
                              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                              Descartar
                            </button>
                            <button 
                              onClick={saveNote}
                              className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent-dark text-white px-6 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
                            >
                              <Save size={18} />
                              Guardar Minuta
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View: Note Detail */}
            {activeNote && !isRecordingMode && (
              <div className="animate-fadeIn pb-12">
                <button 
                  onClick={() => setActiveNoteId(null)}
                  className="flex items-center gap-2 text-gray-500 hover:text-brand-primary mb-6 transition-colors text-sm font-medium"
                >
                  <ArrowLeft size={16} /> Volver a minutas
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 sm:p-10 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateNoteTitle(activeNote.id);
                              if (e.key === 'Escape') setIsEditingTitle(false);
                            }}
                            className="font-heading text-2xl sm:text-3xl text-brand-primary font-bold bg-white border border-brand-primary/30 rounded-lg px-3 py-1 w-full max-w-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleUpdateNoteTitle(activeNote.id)}
                            className="p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors"
                            title="Guardar"
                          >
                            <Check size={20} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 mb-2 group">
                          <h2 className="font-heading text-3xl text-brand-primary font-bold truncate">{activeNote.title}</h2>
                          <button 
                            onClick={() => {
                              setEditTitleValue(activeNote.title);
                              setIsEditingTitle(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-gray-200 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                            title="Editar título"
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1.5"><Folder size={14} /> {activeProject?.name}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span>{new Date(activeNote.date).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</span>
                        {activeNote.duration !== undefined && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>Duración: {formatTime(activeNote.duration)}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag size={16} className="text-gray-400" />
                        {activeNote.tags && activeNote.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary">
                            {tag}
                            <button onClick={() => handleRemoveTag(activeNote.id, tag, activeNote.tags)} className="hover:text-red-500 focus:outline-none">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={newTagValue}
                            onChange={(e) => setNewTagValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(activeNote.id, activeNote.tags);
                              }
                            }}
                            placeholder="Añadir etiqueta..."
                            className="text-xs bg-transparent border-b border-dashed border-gray-300 focus:border-brand-primary outline-none px-1 py-1 w-28 placeholder-gray-400"
                          />
                          <button 
                            onClick={() => handleAddTag(activeNote.id, activeNote.tags)}
                            className="text-gray-400 hover:text-brand-primary p-1"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => toggleShareLink(activeNote)} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-all shadow-sm ${activeNote.isShared ? 'bg-brand-accent text-white border-brand-accent hover:bg-brand-accent-dark' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                        title={activeNote.isShared ? "Desactivar enlace público" : "Crear enlace público"}
                      >
                        <Share2 size={16} /> {activeNote.isShared ? 'Compartido' : 'Compartir'}
                      </button>
                      <button onClick={() => shareWhatsApp(activeNote)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] transition-all shadow-sm" title="Compartir resumen por WhatsApp">
                        <MessageCircle size={16} /> WhatsApp
                      </button>
                      <button onClick={() => exportTXT(activeNote)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                        <FileText size={16} className="text-gray-500" /> TXT
                      </button>
                      <button onClick={() => exportDOCX(activeNote)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                        <FileType2 size={16} className="text-blue-600" /> DOCX
                      </button>
                      <button onClick={() => exportPDF(activeNote)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                        <FileDown size={16} className="text-red-500" /> PDF
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1"></div>
                      <button 
                        onClick={() => setDeleteNoteConfirm(activeNote.id)} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                        title="Eliminar minuta"
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Content to be exported to PDF */}
                  <div id="note-export-content" className="p-6 sm:p-10 bg-white">
                    <div className="mb-12">
                      <h3 className="text-xl font-heading font-bold text-brand-secondary border-b-2 border-brand-secondary/20 pb-2 mb-6 flex items-center gap-2">
                        <Check size={24} /> Resumen Ejecutivo
                      </h3>
                      <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 bg-amber-50/50 p-6 rounded-xl border border-amber-100">
                        <Markdown>{activeNote.summary}</Markdown>
                      </div>
                    </div>

                    {activeNote.speakerStats && activeNote.speakerStats.length > 0 && (
                      <div className="mb-12">
                        <h3 className="text-xl font-heading font-bold text-brand-primary border-b-2 border-brand-primary/20 pb-2 mb-6 flex items-center gap-2">
                          <PieChartIcon size={24} /> Participación por Hablante
                        </h3>
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
                                  <Cell key={`cell-${index}`} fill={['#9D2449', '#13322B', '#B38E5D', '#D4C19C', '#285C4D'][index % 5]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `${value}%`} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {activeNote.topicsTree && activeNote.topicsTree.length > 0 && (
                      <div className="mb-12">
                        <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                          <Network size={24} /> Mapa de Temas
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {activeNote.topicsTree.map((topic, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand-secondary"></div>
                                {topic.topic}
                              </h4>
                              <ul className="space-y-1 pl-4 border-l-2 border-gray-100 ml-1">
                                {topic.subtopics.map((sub, sidx) => (
                                  <li key={sidx} className="text-sm text-gray-600 relative before:content-[''] before:absolute before:w-2 before:h-0.5 before:bg-gray-200 before:top-2.5 before:-left-4">
                                    {sub}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-heading font-bold text-brand-accent border-b-2 border-brand-accent/20 pb-2 mb-6 flex items-center gap-2">
                        <Mic size={24} /> Transcripción Completa
                      </h3>
                      <div className="prose prose-sm sm:prose-base max-w-none text-gray-700">
                        <Markdown>{activeNote.transcript}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Global styles for PDF export to ensure it looks good when captured */}
      <style>{`
        .pdf-export-mode {
          width: 800px !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 40px !important;
          background: white !important;
        }
        .pdf-export-mode .prose {
          color: black !important;
        }
      `}</style>

      {/* Modals */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-brand-primary mb-4">Nuevo Proyecto</h3>
            <input 
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nombre del proyecto"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none mb-6"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleCreateProject} className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-dark transition-colors">Crear</button>
            </div>
          </div>
        </div>
      )}

      {deleteProjectConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-red-600 mb-2">Eliminar Proyecto</h3>
            <p className="text-gray-600 mb-6">¿Está seguro de eliminar este proyecto y todas sus minutas asociadas? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteProjectConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={() => handleDeleteProject(deleteProjectConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {deleteNoteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-red-600 mb-2">Eliminar Minuta</h3>
            <p className="text-gray-600 mb-6">¿Está seguro de eliminar esta minuta? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteNoteConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={() => handleDeleteNote(deleteNoteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

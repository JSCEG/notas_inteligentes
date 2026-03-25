import { useState, useEffect } from 'react';
import { Loader2, Sun, Moon, LogOut } from 'lucide-react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

// Firebase imports
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, getDoc, updateDoc } from 'firebase/firestore';

// Types and Utils
import { Project, Note } from './types';
import { formatTime, handleFirestoreError, OperationType } from './utils';

// Components
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectNotes } from './components/ProjectNotes';
import { RecordingMode } from './components/RecordingMode';
import { NoteDetail } from './components/NoteDetail';
import { SharedNote } from './components/SharedNote';
import { Login } from './components/Login';

// Hooks
import { useRecording } from './hooks/useRecording';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeProjectId, searchQuery, activeTagFilter]);

  // Edit Note Title State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Edit Note Content State
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editTranscriptValue, setEditTranscriptValue] = useState('');
  const [editSummaryValue, setEditSummaryValue] = useState('');
  
  // Tags State
  const [newTagValue, setNewTagValue] = useState('');

  // Recording State
  const {
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
  } = useRecording(user, setIsRecordingMode);
  
  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<string | null>(null);
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<string | null>(null);
  
  // Shared Note State
  const [sharedNoteId, setSharedNoteId] = useState<string | null>(null);
  const [sharedNote, setSharedNote] = useState<Note | null>(null);
  const [sharedNoteError, setSharedNoteError] = useState<string | null>(null);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
      // Delete project
      await deleteDoc(doc(db, 'projects', id));
      
      // Delete associated notes
      const notesToDelete = notes.filter(n => n.projectId === id);
      for (const note of notesToDelete) {
        await deleteDoc(doc(db, 'notes', note.id));
      }

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

  const saveNote = async () => {
    if (!user) return;
    if (!noteTitle.trim()) {
      alert("Por favor, ingrese un título para la nota.");
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
        actionItems: tempActionItems,
        audioUrl: tempAudioUrl,
        duration: tempDuration,
        date: new Date().toISOString()
      });
      
      setActiveNoteId(docRef.id);
      resetRecordingState();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  const cancelRecording = () => {
    resetRecordingState();
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
    
    // Fix Recharts SVG issues for html2canvas
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
      alert("Hubo un error al generar el PDF. Intente exportar a DOCX o TXT.");
    } finally {
      document.body.removeChild(clone);
    }
  };

  const toggleShareLink = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    try {
      const newIsShared = !note.isShared;
      await updateDoc(doc(db, 'notes', note.id), { isShared: newIsShared });
      
      if (newIsShared) {
        const url = `${window.location.origin}/shared/${note.id}`;
        await navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles: ' + url);
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

  const handleRemoveTag = async (noteId: string, currentTags: string[] = [], tagToRemove: string) => {
    try {
      await updateDoc(doc(db, 'notes', noteId), { tags: currentTags.filter(t => t !== tagToRemove) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const handleUpdateNoteContent = async (noteId: string, field: 'summary' | 'transcript', value: string) => {
    try {
      await updateDoc(doc(db, 'notes', noteId), { [field]: value });
      setIsEditingContent(false);
      setEditSummaryValue('');
      setEditTranscriptValue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const handleToggleActionItem = async (noteId: string, actionItems: any[], itemId: string) => {
    try {
      const updatedItems = actionItems.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      await updateDoc(doc(db, 'notes', noteId), { actionItems: updatedItems });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  if (sharedNoteId) {
    return (
      <SharedNote 
        sharedNoteError={sharedNoteError}
        sharedNote={sharedNote}
      />
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
    return <Login handleLogin={handleLogin} />;
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
      <Sidebar 
        user={user}
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        showDashboard={showDashboard}
        setShowDashboard={setShowDashboard}
        setIsRecordingMode={setIsRecordingMode}
        setActiveNoteId={setActiveNoteId}
        setIsProjectModalOpen={setIsProjectModalOpen}
        setDeleteProjectConfirm={setDeleteProjectConfirm}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h1 className="font-heading text-brand-primary font-bold">Minuta Inteligente</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
              title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
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
              <Dashboard 
                notes={notes}
                projects={projects}
                setActiveProjectId={setActiveProjectId}
                setActiveNoteId={setActiveNoteId}
                setShowDashboard={setShowDashboard}
                setIsRecordingMode={setIsRecordingMode}
              />
            )}

            {/* View: Project Notes List */}
            {!showDashboard && !isRecordingMode && !activeNoteId && activeProject && (
              <ProjectNotes 
                activeProject={activeProject}
                projectNotes={filteredNotes}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeTagFilter={activeTagFilter}
                setActiveTagFilter={setActiveTagFilter}
                allTags={projectTags}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                paginatedNotes={paginatedNotes}
                setActiveNoteId={setActiveNoteId}
                setIsRecordingMode={setIsRecordingMode}
                setDeleteNoteConfirm={setDeleteNoteConfirm}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
              />
            )}

            {/* View: Recording Mode */}
            {isRecordingMode && (
              <RecordingMode 
                isRecording={isRecording}
                isProcessing={isProcessing}
                recordingTime={recordingTime}
                startRecording={startRecording}
                stopRecording={stopRecording}
                handleFileUpload={handleFileUpload}
                fileInputRef={fileInputRef}
                tempTranscript={tempTranscript}
                tempSummary={tempSummary}
                tempSpeakerStats={tempSpeakerStats}
                tempTopicsTree={tempTopicsTree}
                tempActionItems={tempActionItems}
                tempAudioUrl={tempAudioUrl}
                noteTitle={noteTitle}
                setNoteTitle={setNoteTitle}
                saveNote={saveNote}
                cancelRecording={cancelRecording}
              />
            )}

            {/* View: Note Detail */}
            {activeNote && !isRecordingMode && (
              <NoteDetail 
                activeNote={activeNote}
                setActiveNoteId={setActiveNoteId}
                handleExportTxt={exportTXT}
                handleExportDocx={exportDOCX}
                handleExportPdf={exportPDF}
                handleShareNote={toggleShareLink}
                handleUpdateNoteContent={handleUpdateNoteContent}
                handleToggleActionItem={handleToggleActionItem}
                handleRemoveTag={handleRemoveTag}
                handleAddTag={handleAddTag}
                isEditingTitle={isEditingTitle}
                setIsEditingTitle={setIsEditingTitle}
                editTitleValue={editTitleValue}
                setEditTitleValue={setEditTitleValue}
                handleUpdateTitle={handleUpdateNoteTitle}
                isEditingContent={isEditingContent as any}
                setIsEditingContent={setIsEditingContent as any}
                editTranscriptValue={editTranscriptValue}
                setEditTranscriptValue={setEditTranscriptValue}
                editSummaryValue={editSummaryValue}
                setEditSummaryValue={setEditSummaryValue}
                newTagValue={newTagValue}
                setNewTagValue={setNewTagValue}
              />
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
    </div>
  );
}

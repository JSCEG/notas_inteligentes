export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface Note {
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
  actionItems?: { id: string; text: string; completed: boolean }[];
  audioUrl?: string;
}

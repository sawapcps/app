// src/lib/storage.ts
import { Project } from '../types';

// ? «” ŒœÂ «‰—«»◊ ÂÊ .env
const API_URL = import.meta.env.VITE_API_URL || 'https://cloud.madartech.uk/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

console.log('?? API URL:', API_URL);
console.log('?? API Key:', API_KEY ? '? ÂËÃËœ' : '? Â·‚Ëœ');

export async function loadProjects(): Promise<Project[]> {
  try {
    const response = await fetch(`${API_URL}/wrapper_projects`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    
    if (!response.ok) throw new Error('Failed to load');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading from API:', error);
    // Fallback: localStorage
    try {
      const raw = localStorage.getItem('wraply_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function saveProject(project: Omit<Project, 'id' | 'created_at' | 'status'>): Promise<Project> {
  const full: Project = {
    ...project,
    id: crypto.randomUUID().replace(/-/g, ''),
    status: 'ready',
    created_at: new Date().toISOString(),
  };
  
  try {
    const response = await fetch(`${API_URL}/wrapper_projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(full),
    });
    
    if (response.ok) {
      return full;
    }
  } catch (error) {
    console.warn('API save failed:', error);
  }
  
  // Fallback: localStorage
  const existing = await loadProjects();
  localStorage.setItem('wraply_projects', JSON.stringify([full, ...existing]));
  return full;
}

export async function buildApp(url: string, name: string, platform: string): Promise<Blob> {
  const response = await fetch(`${API_URL}/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ url, name, platform }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '·‘‰ »Ê«¡ «‰ ◊»Í‚');
  }
  
  return await response.blob();
}
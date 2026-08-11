// src/lib/storage.ts
import { Project } from '../types';

// استخدام متغيرات البيئة من ملف .env
const API_URL = import.meta.env.VITE_API_URL || 'https://cloud.madartech.uk/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

console.log('📡 API URL:', API_URL);
console.log('🔑 API Key:', API_KEY ? '✅ موجود' : '❌ مفقود');

// جلب المشاريع من الخادم
export async function loadProjects(): Promise<Project[]> {
  try {
    const response = await fetch(`${API_URL}/wrapper_projects`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    
    if (!response.ok) throw new Error('فشل في تحميل المشاريع');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('خطأ في تحميل المشاريع:', error);
    // في حال فشل الاتصال، نستخدم التخزين المحلي
    try {
      const raw = localStorage.getItem('wraply_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

// حفظ مشروع جديد
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
    console.warn('فشل الحفظ في الخادم:', error);
  }
  
  // في حال فشل الاتصال، نحفظ محلياً
  const existing = await loadProjects();
  localStorage.setItem('wraply_projects', JSON.stringify([full, ...existing]));
  return full;
}

// ✅ بناء التطبيق (إنشاء ملف APK/EXE/DMG)
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
    throw new Error(error.error || 'فشل في بناء التطبيق');
  }
  
  return await response.blob();
}

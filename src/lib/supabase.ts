// src/lib/supabase.ts
// ? Á–« «‰Â‰· ‰Â ÍŸœ Â” ŒœÂ«Î - Ê” »œ‰Á »«‰« ’«‰ »ÂÊ’… Madartech

import { Project } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://cloud.madartech.uk/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// ?? ÁÍœ—“ «‰Â’«œ‚…
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
  };
}

// ============================================
// œË«‰ Â‘«»Á… ‰‡ Supabase Ë‰„Ê  ” ŒœÂ ÂÊ’… Madartech
// ============================================

export const supabase = {
  // Ã‰» «‰»Í«Ê« 
  from: (table: string) => ({
    // SELECT * FROM table
    select: (columns?: string) => ({
      order: (column: string, options?: { ascending?: boolean }) => ({
        then: async (callback?: (data: any) => void) => {
          try {
            const response = await fetch(`${API_URL}/${table}`, {
              headers: getHeaders(),
            });
            const data = await response.json();
            const result = { data: data[table] || [], error: null };
            if (callback) callback(result);
            return result;
          } catch (error) {
            return { data: null, error };
          }
        }
      }),
      then: async (callback?: (data: any) => void) => {
        try {
          const response = await fetch(`${API_URL}/${table}`, {
            headers: getHeaders(),
          });
          const data = await response.json();
          const result = { data: data[table] || [], error: null };
          if (callback) callback(result);
          return result;
        } catch (error) {
          return { data: null, error };
        }
      }
    }),
    
    // INSERT INTO table
    insert: (data: any) => ({
      select: () => ({
        then: async (callback?: (data: any) => void) => {
          try {
            const response = await fetch(`${API_URL}/${table}`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(data),
            });
            const result = await response.json();
            const output = { data: result, error: null };
            if (callback) callback(output);
            return output;
          } catch (error) {
            return { data: null, error };
          }
        }
      })
    }),
    
    // UPDATE table
    update: (data: any) => ({
      eq: (column: string, value: string) => ({
        then: async (callback?: (data: any) => void) => {
          try {
            const response = await fetch(`${API_URL}/${table}/${value}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify(data),
            });
            const result = await response.json();
            const output = { data: result, error: null };
            if (callback) callback(output);
            return output;
          } catch (error) {
            return { data: null, error };
          }
        }
      })
    }),
    
    // DELETE FROM table
    delete: () => ({
      eq: (column: string, value: string) => ({
        then: async (callback?: (data: any) => void) => {
          try {
            const response = await fetch(`${API_URL}/${table}/${value}`, {
              method: 'DELETE',
              headers: getHeaders(),
            });
            const result = await response.json();
            const output = { data: result, error: null };
            if (callback) callback(output);
            return output;
          } catch (error) {
            return { data: null, error };
          }
        }
      })
    })
  })
};

// ============================================
// œË«‰ Â”«Ÿœ… Â»«‘—…
// ============================================

// Ã‰» ÃÂÍŸ «‰Â‘«—ÍŸ
export async function getProjects() {
  const response = await fetch(`${API_URL}/projects`, {
    headers: getHeaders(),
  });
  return await response.json();
}

// ≈Ê‘«¡ Â‘—ËŸ ÃœÍœ
export async function createProject(project: any) {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(project),
  });
  return await response.json();
}

// »Ê«¡ «‰ ◊»Í‚
export async function buildApp(url: string, name: string, platform: string) {
  const response = await fetch(`${API_URL}/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
    },
    body: JSON.stringify({ url, name, platform }),
  });
  
  if (!response.ok) {
    throw new Error('·‘‰ »Ê«¡ «‰ ◊»Í‚');
  }
  
  return await response.blob();
}

console.log('?? API URL:', API_URL);
console.log('?? API Key:', API_KEY ? '? ÂËÃËœ' : '? Â·‚Ëœ');
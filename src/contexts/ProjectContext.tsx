import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProjectContextType {
  selectedProjectIds: Set<string>;
  setSelectedProjectIds: (ids: Set<string>) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem('selectedProjectIds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedProjectIds', JSON.stringify(Array.from(selectedProjectIds)));
  }, [selectedProjectIds]);

  return (
    <ProjectContext.Provider value={{ selectedProjectIds, setSelectedProjectIds }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return context;
}

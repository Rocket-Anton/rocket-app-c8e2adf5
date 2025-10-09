import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

interface ProjectContextType {
  selectedProjectIds: Set<string>;
  setSelectedProjectIds: (ids: Set<string>) => void;
  cachedAddresses: any[];
  setCachedAddresses: (addresses: any[]) => void;
  listScrollPosition: number;
  setListScrollPosition: (position: number) => void;
  mapViewState: { center: [number, number]; zoom: number } | null;
  setMapViewState: (state: { center: [number, number]; zoom: number } | null) => void;
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

  const [cachedAddresses, setCachedAddresses] = useState<any[]>([]);
  const [listScrollPosition, setListScrollPosition] = useState(0);
  const [mapViewState, setMapViewState] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedProjectIds', JSON.stringify(Array.from(selectedProjectIds)));
  }, [selectedProjectIds]);

  // Memoize context value - only depend on state values, NOT setters (they are stable)
  const value = useMemo(() => ({
    selectedProjectIds, 
    setSelectedProjectIds,
    cachedAddresses,
    setCachedAddresses,
    listScrollPosition,
    setListScrollPosition,
    mapViewState,
    setMapViewState
  }), [selectedProjectIds, cachedAddresses, listScrollPosition, mapViewState]);

  return (
    <ProjectContext.Provider value={value}>
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

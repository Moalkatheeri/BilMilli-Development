import React, { createContext, useState, useContext, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { storageService } from '../services/storageService';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [stages, setStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      if (!forceRefresh) {
        const cached = await storageService.getCache('projects');
        if (cached) {
          setProjects(cached);
          setIsLoading(false);
          return cached;
        }
      }

      const response = await apiService.getProjects();
      setProjects(response.projects || []);
      
      // Cache the results
      await storageService.setCache('projects', response.projects || [], 15);
      
      return response.projects || [];
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
      
      // Return cached data on error
      const cached = await storageService.getCache('projects');
      if (cached) {
        setProjects(cached);
        return cached;
      }
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProject = useCallback(async (projectId) => {
    try {
      setIsLoading(true);
      setError(null);

      const cacheKey = `project_${projectId}`;
      
      // Check cache
      const cached = await storageService.getCache(cacheKey);
      if (cached) {
        setCurrentProject(cached);
      }

      const response = await apiService.getProject(projectId);
      setCurrentProject(response.project);
      
      // Cache the result
      await storageService.setCache(cacheKey, response.project, 10);
      
      return response.project;
    } catch (err) {
      console.error('Error fetching project:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStages = useCallback(async (projectId) => {
    try {
      setIsLoading(true);
      
      const response = await apiService.getStages(projectId);
      setStages(response.stages || []);
      return response.stages || [];
    } catch (err) {
      console.error('Error fetching stages:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData) => {
    try {
      setIsLoading(true);
      const response = await apiService.createProject(projectData);
      
      // Update local state
      setProjects(prev => [response.project, ...prev]);
      
      // Invalidate cache
      await storageService.setCache('projects', null);
      
      return response.project;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStage = useCallback(async (projectId, stageId, stageData) => {
    try {
      const response = await apiService.updateStage(projectId, stageId, stageData);
      
      // Update local state
      setStages(prev => 
        prev.map(stage => 
          stage.id === stageId ? { ...stage, ...response.stage } : stage
        )
      );
      
      return response.stage;
    } catch (err) {
      console.error('Error updating stage:', err);
      throw err;
    }
  }, []);

  const approveStage = useCallback(async (projectId, stageId, notes) => {
    try {
      const response = await apiService.approveStage(projectId, stageId, notes);
      
      // Update local state
      setStages(prev => 
        prev.map(stage => 
          stage.id === stageId ? { ...stage, ...response.stage } : stage
        )
      );
      
      return response.stage;
    } catch (err) {
      console.error('Error approving stage:', err);
      throw err;
    }
  }, []);

  const uploadPhoto = useCallback(async (photoUri, metadata) => {
    try {
      // Try to upload immediately
      const response = await apiService.uploadPhoto(photoUri, metadata);
      return response;
    } catch (err) {
      console.error('Error uploading photo, queuing for later:', err);
      
      // Queue for offline sync
      await storageService.addToOfflineQueue({
        type: 'photo_upload',
        data: { photoUri, metadata },
      });
      
      return { queued: true };
    }
  }, []);

  const analyzePhoto = useCallback(async (photoUri, metadata) => {
    try {
      const response = await apiService.analyzePhoto(photoUri, metadata);
      return response;
    } catch (err) {
      console.error('Error analyzing photo:', err);
      throw err;
    }
  }, []);

  const getProjectStats = useCallback(() => {
    if (!projects.length) return null;

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalValue = projects.reduce((sum, p) => sum + (p.value || 0), 0);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalValue,
    };
  }, [projects]);

  const value = {
    projects,
    currentProject,
    stages,
    isLoading,
    error,
    fetchProjects,
    fetchProject,
    fetchStages,
    createProject,
    updateStage,
    approveStage,
    uploadPhoto,
    analyzePhoto,
    setCurrentProject,
    getProjectStats,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

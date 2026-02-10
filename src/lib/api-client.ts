// API Client for FastAPI Backend

import { logger } from './logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    logger.info('API Client initialized', { baseUrl });
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response, endpoint: string): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      const errorMessage = error.detail || `HTTP ${response.status}`;
      logger.error(`API Error: ${endpoint}`, new Error(errorMessage), { status: response.status });
      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      logger.debug(`API Success: ${endpoint} (No Content)`);
      return {} as T;
    }

    const data = await response.json();
    logger.debug(`API Success: ${endpoint}`, { status: response.status });
    return data;
  }

  // Projects
  async getProjects() {
    try {
      const response = await fetch(`${this.baseUrl}/projects/`, {
        headers: this.getHeaders(),
      });
      return this.handleResponse(response, 'GET /projects');
    } catch (error) {
      logger.error('Failed to get projects', error as Error);
      throw error;
    }
  }

  async createProject(name: string, description?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name, description }),
      });
      return this.handleResponse(response, 'POST /projects');
    } catch (error) {
      logger.error('Failed to create project', error as Error, { name });
      throw error;
    }
  }

  async getProject(projectId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        headers: this.getHeaders(),
      });
      return this.handleResponse(response, `GET /projects/${projectId}`);
    } catch (error) {
      logger.error('Failed to get project', error as Error, { projectId });
      throw error;
    }
  }

  async updateProject(projectId: string, data: { name?: string; description?: string }) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse(response, `PUT /projects/${projectId}`);
    } catch (error) {
      logger.error('Failed to update project', error as Error, { projectId });
      throw error;
    }
  }

  async deleteProject(projectId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return this.handleResponse(response, `DELETE /projects/${projectId}`);
    } catch (error) {
      logger.error('Failed to delete project', error as Error, { projectId });
      throw error;
    }
  }

  // Datasets
  async uploadDataset(projectId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${this.baseUrl}/datasets/upload?project_id=${projectId}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      logger.info('Dataset upload started', { fileName: file.name, projectId });
      return this.handleResponse(response, 'POST /datasets/upload');
    } catch (error) {
      logger.error('Failed to upload dataset', error as Error, { fileName: file.name, projectId });
      throw error;
    }
  }

  async getDataset(datasetId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/datasets/${datasetId}`, {
        headers: this.getHeaders(),
      });
      return this.handleResponse(response, `GET /datasets/${datasetId}`);
    } catch (error) {
      logger.error('Failed to get dataset', error as Error, { datasetId });
      throw error;
    }
  }

  async previewDataset(datasetId: string, limit: number = 100) {
    try {
      const response = await fetch(
        `${this.baseUrl}/datasets/${datasetId}/preview?limit=${limit}`,
        {
          headers: this.getHeaders(),
        }
      );
      return this.handleResponse(response, `GET /datasets/${datasetId}/preview`);
    } catch (error) {
      logger.error('Failed to preview dataset', error as Error, { datasetId, limit });
      throw error;
    }
  }

  // Quality Checks
  async getQualityDimensions(projectId: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/quality/dimensions?project_id=${projectId}`,
        {
          headers: this.getHeaders(),
        }
      );
      return this.handleResponse(response, 'GET /quality/dimensions');
    } catch (error) {
      logger.error('Failed to get quality dimensions', error as Error, { projectId });
      throw error;
    }
  }

  async createQualityDimension(data: { name: string; key: string; description?: string; icon?: string; is_active?: boolean }) {
    try {
      const response = await fetch(`${this.baseUrl}/quality/dimensions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      logger.info('Creating quality dimension', { key: data.key });
      return this.handleResponse(response, 'POST /quality/dimensions');
    } catch (error) {
      logger.error('Failed to create quality dimension', error as Error, { key: data.key });
      throw error;
    }
  }

  async updateQualityDimension(dimensionId: string, data: { name?: string; description?: string; icon?: string; is_active?: boolean }) {
    try {
      const response = await fetch(`${this.baseUrl}/quality/dimensions/${dimensionId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      logger.info('Updating quality dimension', { dimensionId });
      return this.handleResponse(response, `PUT /quality/dimensions/${dimensionId}`);
    } catch (error) {
      logger.error('Failed to update quality dimension', error as Error, { dimensionId });
      throw error;
    }
  }

  async deleteQualityDimension(dimensionId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/quality/dimensions/${dimensionId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      logger.info('Deleting quality dimension', { dimensionId });
      return this.handleResponse(response, `DELETE /quality/dimensions/${dimensionId}`);
    } catch (error) {
      logger.error('Failed to delete quality dimension', error as Error, { dimensionId });
      throw error;
    }
  }

  async runQualityChecks(datasetId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/quality/run?dataset_id=${datasetId}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      logger.info('Running quality checks', { datasetId });
      return this.handleResponse(response, 'POST /quality/run');
    } catch (error) {
      logger.error('Failed to run quality checks', error as Error, { datasetId });
      throw error;
    }
  }

  async getQualityResults(datasetId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/quality/results/${datasetId}`, {
        headers: this.getHeaders(),
      });
      return this.handleResponse(response, `GET /quality/results/${datasetId}`);
    } catch (error) {
      logger.error('Failed to get quality results', error as Error, { datasetId });
      throw error;
    }
  }
}

export const apiClient = new ApiClient(API_URL);
export default apiClient;

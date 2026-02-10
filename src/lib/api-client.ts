// API Client for FastAPI Backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Projects
  async getProjects() {
    const response = await fetch(`${this.baseUrl}/projects/`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createProject(name: string, description?: string) {
    const response = await fetch(`${this.baseUrl}/projects/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    return this.handleResponse(response);
  }

  async getProject(projectId: string) {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateProject(projectId: string, data: { name?: string; description?: string }) {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deleteProject(projectId: string) {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Datasets
  async uploadDataset(projectId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(
      `${this.baseUrl}/datasets/upload?project_id=${projectId}`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );
    return this.handleResponse(response);
  }

  async getDataset(datasetId: string) {
    const response = await fetch(`${this.baseUrl}/datasets/${datasetId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async previewDataset(datasetId: string, limit: number = 100) {
    const response = await fetch(
      `${this.baseUrl}/datasets/${datasetId}/preview?limit=${limit}`,
      {
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  // Quality Checks
  async getQualityDimensions(projectId: string) {
    const response = await fetch(
      `${this.baseUrl}/quality/dimensions?project_id=${projectId}`,
      {
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async createQualityDimension(data: { name: string; key: string; description?: string; icon?: string; is_active?: boolean }) {
    const response = await fetch(`${this.baseUrl}/quality/dimensions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateQualityDimension(dimensionId: string, data: { name?: string; description?: string; icon?: string; is_active?: boolean }) {
    const response = await fetch(`${this.baseUrl}/quality/dimensions/${dimensionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deleteQualityDimension(dimensionId: string) {
    const response = await fetch(`${this.baseUrl}/quality/dimensions/${dimensionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async runQualityChecks(datasetId: string) {
    const response = await fetch(`${this.baseUrl}/quality/run?dataset_id=${datasetId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getQualityResults(datasetId: string) {
    const response = await fetch(`${this.baseUrl}/quality/results/${datasetId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiClient = new ApiClient(API_URL);
export default apiClient;

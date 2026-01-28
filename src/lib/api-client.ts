// API Client for FastAPI Backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AuthTokens {
  access_token: string;
  token_type: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    this.token = localStorage.getItem('access_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
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

  // Authentication
  async register(email: string, password: string, full_name?: string) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });
    return this.handleResponse(response);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    const data = await this.handleResponse<AuthTokens>(response);
    this.token = data.access_token;
    localStorage.setItem('access_token', data.access_token);
    return data;
  }

  async logout() {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    this.token = null;
    localStorage.removeItem('access_token');
    return this.handleResponse(response);
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
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

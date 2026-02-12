// API Client using Supabase

import { supabase } from './supabase';
import { logger } from './logger';

class ApiClient {
  constructor() {
    logger.info('API Client initialized with Supabase');
  }

  // Projects
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get projects', new Error(error.message));
      throw new Error(error.message);
    }
    logger.debug('GET projects', { count: data?.length });
    return data;
  }

  async createProject(name: string, description?: string) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || '',
        owner_id: '00000000-0000-0000-0000-000000000000',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create project', new Error(error.message), { name });
      throw new Error(error.message);
    }
    logger.info('Created project', { name, id: data.id });
    return data;
  }

  async getProject(projectId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      logger.error('Failed to get project', new Error(error.message), { projectId });
      throw new Error(error.message);
    }
    logger.debug(`GET project ${projectId}`);
    return data;
  }

  async updateProject(projectId: string, updates: { name?: string; description?: string }) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update project', new Error(error.message), { projectId });
      throw new Error(error.message);
    }
    logger.info('Updated project', { projectId });
    return data;
  }

  async deleteProject(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      logger.error('Failed to delete project', new Error(error.message), { projectId });
      throw new Error(error.message);
    }
    logger.info('Deleted project', { projectId });
    return {};
  }

  // Datasets
  async uploadDataset(projectId: string, file: File) {
    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const rows = lines.slice(1)
      .filter(line => line.trim().length > 0)
      .map(line => {
        const values = this.parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

    const { data, error } = await supabase
      .from('datasets')
      .insert({
        project_id: projectId,
        name: file.name.replace(/\.csv$/i, ''),
        file_name: file.name,
        row_count: rows.length,
        column_count: headers.length,
        file_data: rows,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to upload dataset', new Error(error.message), { fileName: file.name, projectId });
      throw new Error(error.message);
    }

    // Insert column metadata
    const columnInserts = headers.map((header, index) => ({
      dataset_id: data.id,
      column_name: header,
      column_index: index,
      data_type: 'text',
    }));

    const { error: colError } = await supabase
      .from('dataset_columns')
      .insert(columnInserts);

    if (colError) {
      logger.warn('Failed to insert column metadata', { error: colError.message });
    }

    logger.info('Dataset uploaded', { fileName: file.name, projectId, datasetId: data.id });
    return data;
  }

  async getDataset(datasetId: string) {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();

    if (error) {
      logger.error('Failed to get dataset', new Error(error.message), { datasetId });
      throw new Error(error.message);
    }
    return data;
  }

  async previewDataset(datasetId: string, limit: number = 100) {
    const { data, error } = await supabase
      .from('datasets')
      .select('file_data')
      .eq('id', datasetId)
      .single();

    if (error) {
      logger.error('Failed to preview dataset', new Error(error.message), { datasetId });
      throw new Error(error.message);
    }

    const rows = (data.file_data as Record<string, string>[]) || [];
    return rows.slice(0, limit);
  }

  // Quality Dimensions
  async getQualityDimensions(projectId: string) {
    const { data, error } = await supabase
      .from('quality_dimension_config')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Failed to get quality dimensions', new Error(error.message), { projectId });
      throw new Error(error.message);
    }
    return data;
  }

  async createQualityDimension(dimensionData: {
    name: string;
    key: string;
    description?: string;
    icon?: string;
    is_active?: boolean;
  }) {
    const { data, error } = await supabase
      .from('quality_dimension_config')
      .insert({
        name: dimensionData.name,
        key: dimensionData.key,
        description: dimensionData.description || '',
        icon: dimensionData.icon || 'check-circle',
        color: '#14b8a6',
        is_active: dimensionData.is_active ?? true,
        display_order: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create quality dimension', new Error(error.message), { key: dimensionData.key });
      throw new Error(error.message);
    }
    logger.info('Created quality dimension', { key: dimensionData.key });
    return data;
  }

  async updateQualityDimension(dimensionId: string, updates: {
    name?: string;
    description?: string;
    icon?: string;
    is_active?: boolean;
  }) {
    const { data, error } = await supabase
      .from('quality_dimension_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', dimensionId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update quality dimension', new Error(error.message), { dimensionId });
      throw new Error(error.message);
    }
    logger.info('Updated quality dimension', { dimensionId });
    return data;
  }

  async deleteQualityDimension(dimensionId: string) {
    const { error } = await supabase
      .from('quality_dimension_config')
      .delete()
      .eq('id', dimensionId);

    if (error) {
      logger.error('Failed to delete quality dimension', new Error(error.message), { dimensionId });
      throw new Error(error.message);
    }
    logger.info('Deleted quality dimension', { dimensionId });
    return {};
  }

  // Quality Results
  async getQualityResults(datasetId: string) {
    const { data, error } = await supabase
      .from('quality_results')
      .select('*')
      .eq('dataset_id', datasetId)
      .order('executed_at', { ascending: false });

    if (error) {
      logger.error('Failed to get quality results', new Error(error.message), { datasetId });
      throw new Error(error.message);
    }
    return data;
  }

  // Helper: parse CSV line handling quoted values
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}

export const apiClient = new ApiClient();
export default apiClient;

// API Client using Supabase

import { supabase } from './supabase';
import { logger } from './logger';

class ApiClient {
  constructor() {
    logger.info('API Client initialized with Supabase');
  }

  // Projects
  async getProjects(currentUserDisplayName: string, isAdmin = false) {
    // Fetch all projects with member count
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*, project_members(count)')
      .order('created_at', { ascending: false });

    if (projectsError) {
      logger.error('Failed to get projects', new Error(projectsError.message));
      throw new Error(projectsError.message);
    }

    // Fetch all memberships for the current user across all projects
    const { data: membershipsData } = await supabase
      .from('project_members')
      .select('project_id, role')
      .eq('display_name', currentUserDisplayName);

    const membershipMap = new Map<string, 'owner' | 'editor' | 'viewer'>();
    (membershipsData || []).forEach((m: { project_id: string; role: string }) => {
      membershipMap.set(m.project_id, m.role as 'owner' | 'editor' | 'viewer');
    });

    const projects = (projectsData || []).map((p: Record<string, unknown>) => {
      const membersArr = p.project_members as Array<{ count: number }> | null;
      const isCreator = (p.owner_name as string | null) === currentUserDisplayName;
      const memberRole = membershipMap.get(p.id as string);

      let userRole: 'owner' | 'co-owner' | 'editor' | 'viewer';
      if (isCreator) {
        userRole = 'owner';
      } else if (p.owner_name === null) {
        // Legacy project created before ownership tracking — treat as owner
        userRole = 'owner';
      } else if (memberRole === 'owner') {
        userRole = 'co-owner';
      } else if (memberRole === 'editor') {
        userRole = 'editor';
      } else if (memberRole === 'viewer') {
        userRole = 'viewer';
      } else if (p.is_public) {
        userRole = 'viewer';
      } else if (isAdmin) {
        userRole = 'viewer'; // admin can see but not edit
      } else {
        return null; // not accessible
      }

      return {
        ...p,
        project_members: undefined,
        member_count: membersArr?.[0]?.count ?? 0,
        userRole,
      };
    }).filter(Boolean);

    logger.debug('GET projects', { count: projects.length });
    return projects;
  }

  async createProject(name: string, description?: string, is_public?: boolean, ownerName?: string, iconUrl?: string | null) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || '',
        is_public: is_public ?? false,
        owner_name: ownerName ?? null,
        icon_url: iconUrl ?? null,
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

  async updateProject(projectId: string, updates: { name?: string; description?: string; is_public?: boolean; icon_url?: string | null }) {
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

  // Project Members
  async getProjectMembers(projectId: string) {
    const { data, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get project members', new Error(error.message), { projectId });
      throw new Error(error.message);
    }
    logger.debug('GET project members', { projectId, count: data?.length });
    return data;
  }

  async addProjectMember(projectId: string, displayName: string, role: 'owner' | 'editor' | 'viewer') {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, display_name: displayName, role })
      .select()
      .single();

    if (error) {
      logger.error('Failed to add project member', new Error(error.message), { projectId, displayName });
      throw new Error(error.message);
    }
    logger.info('Added project member', { projectId, displayName, role });
    return data;
  }

  async updateMemberRole(memberId: string, role: 'owner' | 'editor' | 'viewer') {
    const { data, error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update member role', new Error(error.message), { memberId });
      throw new Error(error.message);
    }
    logger.info('Updated member role', { memberId, role });
    return data;
  }

  async removeProjectMember(memberId: string) {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      logger.error('Failed to remove project member', new Error(error.message), { memberId });
      throw new Error(error.message);
    }
    logger.info('Removed project member', { memberId });
    return {};
  }

  // Datasets
  async getProjectDatasets(projectId: string) {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get project datasets', new Error(error.message), { projectId });
      throw new Error(error.message);
    }
    logger.debug('GET project datasets', { projectId, count: data?.length });
    return data;
  }

  async uploadDataset(projectId: string, file: File, customName?: string, description?: string) {
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
        name: customName?.trim() || file.name.replace(/\.csv$/i, ''),
        description: description?.trim() || null,
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

  async renameDataset(datasetId: string, name: string, description?: string | null) {
    const updates: Record<string, unknown> = { name };
    if (description !== undefined) updates.description = description;
    const { data, error } = await supabase
      .from('datasets')
      .update(updates)
      .eq('id', datasetId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update dataset', new Error(error.message), { datasetId });
      throw new Error(error.message);
    }
    logger.info('Updated dataset', { datasetId, name });
    return data;
  }

  async deleteDataset(datasetId: string) {
    const { error } = await supabase
      .from('datasets')
      .delete()
      .eq('id', datasetId);

    if (error) {
      logger.error('Failed to delete dataset', new Error(error.message), { datasetId });
      throw new Error(error.message);
    }
    logger.info('Deleted dataset', { datasetId });
    return {};
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

  // Templates
  async getTemplates(datasetId?: string) {
    let query = supabase
      .from('quality_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (datasetId) {
      query = query.eq('dataset_id', datasetId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get templates', new Error(error.message));
      throw new Error(error.message);
    }
    return data;
  }

  async saveTemplate(name: string, templateData: Record<string, unknown>, datasetId?: string) {
    const { data, error } = await supabase
      .from('quality_templates')
      .insert({
        name,
        template_data: templateData,
        ...(datasetId ? { dataset_id: datasetId } : {}),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save template', new Error(error.message), { name });
      throw new Error(error.message);
    }
    logger.info('Saved template', { name, id: data.id });
    return data;
  }

  async deleteTemplate(templateId: string) {
    const { error } = await supabase
      .from('quality_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      logger.error('Failed to delete template', new Error(error.message), { templateId });
      throw new Error(error.message);
    }
    logger.info('Deleted template', { templateId });
    return {};
  }

  // Quality Results
  async saveQualityResults(datasetId: string, results: Array<{
    column_name: string;
    dimension: string;
    passed_count: number;
    failed_count: number;
    total_count: number;
    score: number;
  }>) {
    // Delete previous results for this dataset first
    const { error: deleteError } = await supabase
      .from('quality_results')
      .delete()
      .eq('dataset_id', datasetId);

    if (deleteError) {
      logger.warn('Failed to clear old results', { error: deleteError.message });
    }

    const rows = results.map(r => ({
      dataset_id: datasetId,
      column_name: r.column_name,
      dimension: r.dimension,
      passed_count: r.passed_count,
      failed_count: r.failed_count,
      total_count: r.total_count,
      score: r.score,
      executed_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('quality_results')
      .insert(rows)
      .select();

    if (error) {
      logger.error('Failed to save quality results', new Error(error.message), { datasetId });
      throw new Error(error.message);
    }
    logger.info('Saved quality results', { datasetId, count: data.length });
    return data;
  }

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

  // App Users
  async loginOrCreateUser(displayName: string) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('app_users')
      .upsert(
        { display_name: displayName, last_seen_at: now },
        { onConflict: 'display_name' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to login/create user', new Error(error.message), { displayName });
      throw new Error(error.message);
    }
    logger.info('User logged in', { displayName, id: data.id });
    return data;
  }

  async createUser(displayName: string) {
    const { data, error } = await supabase
      .from('app_users')
      .insert({ display_name: displayName })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create user', new Error(error.message), { displayName });
      throw new Error(error.message);
    }
    logger.info('Created user', { displayName, id: data.id });
    return data;
  }

  async getAllUsers() {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get all users', new Error(error.message));
      throw new Error(error.message);
    }
    return data;
  }

  async updateUserRole(userId: string, role: 'admin' | 'user') {
    const { data, error } = await supabase
      .from('app_users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update user role', new Error(error.message), { userId });
      throw new Error(error.message);
    }
    logger.info('Updated user role', { userId, role });
    return data;
  }

  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', userId);

    if (error) {
      logger.error('Failed to delete user', new Error(error.message), { userId });
      throw new Error(error.message);
    }
    logger.info('Deleted user', { userId });
    return {};
  }

  async getUserMemberships(displayName: string) {
    const { data, error } = await supabase
      .from('project_members')
      .select('role, project_id, projects(id, name)')
      .eq('display_name', displayName);

    if (error) {
      logger.error('Failed to get user memberships', new Error(error.message), { displayName });
      throw new Error(error.message);
    }
    return (data || []) as Array<{
      role: 'owner' | 'editor' | 'viewer';
      project_id: string;
      projects: { id: string; name: string } | null;
    }>;
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

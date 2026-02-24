export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id?: string;
  owner_name: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectUserRole = 'owner' | 'co-owner' | 'editor' | 'viewer';

export interface ProjectWithRole extends Project {
  userRole: ProjectUserRole;
  member_count?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  display_name: string | null;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export type QualityDimension = 'completeness' | 'consistency' | 'validity' | 'uniqueness' | 'accuracy' | 'timeliness';

export interface QualityResult {
  id: string;
  dataset_id: string;
  rule_id: string;
  column_name: string;
  dimension: QualityDimension;
  passed_count: number;
  failed_count: number;
  total_count: number;
  score: number;
  executed_at: string;
}

export interface Template {
  id: string;
  name: string;
  rules: TemplateData;
  user_id?: string;
  created_at?: string;
}

export interface TemplateData {
  dimensionRules: Record<string, string[]>;
  configuredColumns: Record<string, string[]>;
}

export interface AppUser {
  id: string;
  display_name: string;
  role: 'admin' | 'user';
  created_at: string;
  last_seen_at: string;
}

export interface QualityDimensionConfig {
  id: string;
  name: string;
  key: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

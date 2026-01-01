export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Dataset {
  id: string;
  project_id: string;
  name: string;
  row_count: number;
  column_count: number;
  file_data: any[];
  created_at: string;
}

export interface DatasetColumn {
  id: string;
  dataset_id: string;
  column_name: string;
  column_index: number;
  data_type: string;
}

export type QualityDimension = 'completeness' | 'consistency' | 'validity' | 'uniqueness';
export type RuleStatus = 'pending' | 'ready' | 'completed';

export interface QualityRule {
  id: string;
  dataset_id: string;
  column_name: string;
  dimension: QualityDimension;
  rule_type: string;
  rule_config: Record<string, any>;
  status: RuleStatus;
  description: string;
}

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
  rules: any[];
  user_id: string;
  created_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  microsoft_tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

import { useState, useEffect } from 'react';
import { X, Settings, Globe, Lock, UserPlus, UserMinus } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { ProjectMember, AppUser } from '../types/database';

interface ProjectSettingsPanelProps {
  projectId: string;
  projectName: string;
  projectDescription: string;
  ownerName: string | null;
  isPublic: boolean;
  isOwner: boolean;
  onClose: () => void;
  onVisibilityChange: (isPublic: boolean) => Promise<void>;
  onMemberAdded: (member: ProjectMember) => void;
  onMemberRoleChanged: (memberId: string, role: 'owner' | 'editor' | 'viewer') => void;
  onMemberRemoved: (memberId: string) => void;
}

function getRoleBadgeClass(role: 'owner' | 'editor' | 'viewer') {
  switch (role) {
    case 'owner':  return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'editor': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'viewer': return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

// Members with role='owner' in project_members are Co-owners (not the true project owner)
function getRoleDisplayLabel(role: 'owner' | 'editor' | 'viewer') {
  switch (role) {
    case 'owner':  return 'Co-owner';
    case 'editor': return 'Editor';
    case 'viewer': return 'Viewer';
  }
}

export default function ProjectSettingsPanel({
  projectId,
  projectName,
  projectDescription,
  ownerName,
  isPublic,
  isOwner,
  onClose,
  onVisibilityChange,
  onMemberAdded,
  onMemberRoleChanged,
  onMemberRemoved,
}: ProjectSettingsPanelProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [newMemberDisplayName, setNewMemberDisplayName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingMembers(true);
    Promise.all([
      apiClient.getProjectMembers(projectId),
      apiClient.getAllUsers(),
    ])
      .then(([membersData, usersData]) => {
        if (!cancelled) {
          setMembers((membersData || []) as ProjectMember[]);
          setAllUsers((usersData || []) as AppUser[]);
        }
      })
      .catch((err) => console.error('Failed to load members:', err))
      .finally(() => { if (!cancelled) setLoadingMembers(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleVisibilityToggle() {
    setSavingVisibility(true);
    try {
      await onVisibilityChange(!isPublic);
    } catch (err) {
      console.error('Failed to update visibility:', err);
      alert('Failed to update visibility. Please try again.');
    } finally {
      setSavingVisibility(false);
    }
  }

  async function handleAddMember() {
    const name = newMemberDisplayName.trim();
    if (!name) return;
    setIsAddingMember(true);
    try {
      const member = await apiClient.addProjectMember(projectId, name, newMemberRole) as ProjectMember;
      setMembers(prev => [...prev, member]);
      setNewMemberDisplayName('');
      onMemberAdded(member);
    } catch (err) {
      console.error('Failed to add member:', err);
      alert('Failed to add member. Please try again.');
    } finally {
      setIsAddingMember(false);
    }
  }

  async function handleRoleChange(memberId: string, role: 'owner' | 'editor' | 'viewer') {
    setUpdatingRoleId(memberId);
    try {
      await apiClient.updateMemberRole(memberId, role);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
      onMemberRoleChanged(memberId, role);
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Remove this member from the project?')) return;
    setRemovingMemberId(memberId);
    try {
      await apiClient.removeProjectMember(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      onMemberRemoved(memberId);
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove member. Please try again.');
    } finally {
      setRemovingMemberId(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Project Settings</h2>
              <p className="text-xs text-slate-500 truncate max-w-[220px]">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── SECTION: Project Info ── */}
          <div className="px-6 py-5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Project Info
            </p>
            <p className="text-sm font-semibold text-slate-800">{projectName}</p>
            {projectDescription && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{projectDescription}</p>
            )}
          </div>

          {/* ── SECTION: Visibility ── */}
          <div className="px-6 py-5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Visibility
            </p>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isPublic ? 'bg-teal-100' : 'bg-slate-200'
                }`}>
                  {isPublic
                    ? <Globe className="w-5 h-5 text-teal-600" />
                    : <Lock className="w-5 h-5 text-slate-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {isPublic ? 'Public' : 'Private'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isPublic
                      ? 'All logged-in users can see this project'
                      : 'Only members you add can see this project'}
                  </p>
                </div>
              </div>

              {isOwner ? (
                <button
                  onClick={handleVisibilityToggle}
                  disabled={savingVisibility}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
                    isPublic ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                  title={isPublic ? 'Switch to Private' : 'Switch to Public'}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              ) : (
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  isPublic
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {isPublic ? 'Public' : 'Private'}
                </span>
              )}
            </div>
          </div>

          {/* ── SECTION: Members ── */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Members
              </p>
              {!loadingMembers && (
                <span className="text-xs text-slate-500">
                  {/* count = owner + non-owner members (excluding owner from project_members) */}
                  {1 + members.filter(m => m.display_name !== ownerName).length} member{1 + members.filter(m => m.display_name !== ownerName).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Loading */}
            {loadingMembers && (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full" />
              </div>
            )}

            {/* Owner row — always shown at the top */}
            {!loadingMembers && ownerName && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 mb-1">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {ownerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate">{ownerName}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border font-medium bg-purple-100 text-purple-700 border-purple-300 flex-shrink-0">
                  Owner
                </span>
              </div>
            )}

            {/* Empty state — no other members besides owner */}
            {!loadingMembers && members.filter(m => m.display_name !== ownerName).length === 0 && (
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">No other members added yet</p>
                {isOwner && (
                  <p className="text-xs mt-1">Use the form below to add members</p>
                )}
              </div>
            )}

            {/* Members list — excluding owner */}
            {!loadingMembers && members.filter(m => m.display_name !== ownerName).length > 0 && (
              <div className="space-y-1 mb-5">
                {members.filter(m => m.display_name !== ownerName).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(member.display_name ?? '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {member.display_name ?? 'Unknown'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {/* Role — selector for owners, badge for others */}
                      {isOwner ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(
                            member.id,
                            e.target.value as 'owner' | 'editor' | 'viewer'
                          )}
                          disabled={updatingRoleId === member.id}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-teal-500 outline-none bg-white text-slate-700 disabled:opacity-50 cursor-pointer"
                        >
                          <option value="owner">Co-owner</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getRoleBadgeClass(member.role)}`}>
                          {getRoleDisplayLabel(member.role)}
                        </span>
                      )}

                      {/* Remove button — owners only */}
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingMemberId === member.id}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingMemberId === member.id ? (
                            <div className="w-3.5 h-3.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserMinus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add member form — owners only */}
            {isOwner && (() => {
              // Exclude already-added members and the project owner themselves
              const addedNames = new Set(members.map(m => m.display_name));
              const availableUsers = allUsers.filter(u =>
                !addedNames.has(u.display_name) && u.display_name !== ownerName
              );
              return (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <p className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-teal-600" />
                    <span>Add Member</span>
                  </p>
                  {availableUsers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">All registered users are already members.</p>
                  ) : (
                    <>
                      <select
                        value={newMemberDisplayName}
                        onChange={(e) => setNewMemberDisplayName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white text-slate-700 cursor-pointer"
                      >
                        <option value="">— Select a user —</option>
                        {availableUsers.map(u => (
                          <option key={u.id} value={u.display_name}>
                            {u.display_name}{u.role === 'admin' ? ' (admin)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center space-x-2">
                        <select
                          value={newMemberRole}
                          onChange={(e) => setNewMemberRole(e.target.value as 'owner' | 'editor' | 'viewer')}
                          className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-700"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="owner">Co-owner</option>
                        </select>
                        <button
                          onClick={handleAddMember}
                          disabled={!newMemberDisplayName || isAddingMember}
                          className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-teal-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAddingMember ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                          <span>Add</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Viewer — read only &nbsp;·&nbsp; Editor — upload & run checks &nbsp;·&nbsp; Co-owner — full control
                      </p>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}

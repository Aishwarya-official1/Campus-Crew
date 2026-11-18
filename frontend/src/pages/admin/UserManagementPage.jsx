import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Users, Search, ShieldAlert, ShieldCheck, UserCheck, AlertCircle, Award } from 'lucide-react';

const ROLES = ['ALL', 'STUDENT', 'COORDINATOR', 'ADMIN'];

export const UserManagementPage = () => {
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [search, setSearch] = useState('');
  const [appointModalUser, setAppointModalUser] = useState(null);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [submittingCoordinator, setSubmittingCoordinator] = useState(false);
  const { addToast } = useToast();

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', selectedRole, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (search) params.append('search', search);
      const res = await api.get(`/users?${params.toString()}`);
      return res;
    },
  });

  const users = usersData?.data || [];

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Set status of ${user.name} to ${nextStatus}?`)) return;

    try {
      await api.patch(`/users/${user.id}/status`, { status: nextStatus });
      addToast(`User ${user.name} is now ${nextStatus}`, 'info');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleRoleChange = async (user, newRole) => {
    if (newRole === 'COORDINATOR') {
      // Admin must specify the club the individual is a member of
      setAppointModalUser(user);
      setSelectedClubId(user.clubMemberships?.[0]?.club?.id || '');
      return;
    }

    try {
      await api.patch(`/users/${user.id}/role`, { role: newRole });
      addToast(`Updated ${user.name} role to ${newRole}`, 'success');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAppointCoordinator = async (e) => {
    e?.preventDefault();
    if (!selectedClubId) {
      addToast('Please select a club.', 'warning');
      return;
    }

    setSubmittingCoordinator(true);
    try {
      await api.patch(`/clubs/${selectedClubId}/coordinator`, {
        studentId: appointModalUser.id,
      });
      addToast(
        `Appointed ${appointModalUser.name} as Coordinator! (Club updated with single coordinator)`,
        'success'
      );
      setAppointModalUser(null);
      setSelectedClubId('');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmittingCoordinator(false);
    }
  };

  const openAppointModal = (user) => {
    setAppointModalUser(user);
    setSelectedClubId(user.clubMemberships?.[0]?.club?.id || '');
  };

  const activeClubs = appointModalUser?.clubMemberships?.map((m) => m.club) || [];
  const selectedClub = activeClubs.find((c) => c.id === selectedClubId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student & Staff Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Account governance, role appointments, and club coordinator assignments
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by name, roll, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-2">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRole === role
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Department & Year</th>
                  <th className="py-3.5 px-6">Active Clubs</th>
                  <th className="py-3.5 px-6">Platform Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const clubsJoined = u.clubMemberships || [];
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img
                          src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6366f1&color=fff`}
                          alt={u.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {u.department} (Yr {u.year}) • {u.rollNumber}
                      </td>
                      <td className="py-4 px-6">
                        {clubsJoined.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {clubsJoined.map((cm) => (
                              <span
                                key={cm.id}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {cm.club.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No club memberships</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="COORDINATOR">COORDINATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                          {u.role === 'STUDENT' && (
                            <button
                              onClick={() => openAppointModal(u)}
                              className="py-1 px-2.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1 shrink-0"
                              title="Appoint as Coordinator of their club"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Appoint as Coordinator
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={u.status} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No users found"
            description="No student or staff accounts matching your current search parameters."
          />
        )}
      </div>

      {/* Appoint Coordinator Modal */}
      {appointModalUser && (
        <Modal
          isOpen={!!appointModalUser}
          onClose={() => setAppointModalUser(null)}
          title={`Appoint Club Coordinator: ${appointModalUser.name}`}
          maxWidth="max-w-md"
        >
          {activeClubs.length === 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Club Membership Required</span>
                </div>
                <p>
                  <strong>{appointModalUser.name}</strong> is not currently a member of any campus club.
                </p>
                <p className="text-amber-700 font-medium">
                  Rule: To appoint an individual as Coordinator, the admin must specify a club, and the individual must already be part of that club.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAppointModalUser(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleAppointCoordinator} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">
                  Candidate: <strong>{appointModalUser.name}</strong> ({appointModalUser.rollNumber} • {appointModalUser.department})
                </span>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 mt-3">
                  Specify Club (Candidate is a member)
                </label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-brand-500"
                >
                  {activeClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClub && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950">Single Coordinator Enforced</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200">
                      1 Coordinator Max
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    A club can only have 1 student coordinator. Appointing {appointModalUser.name} will assign them as the sole coordinator for <strong>{selectedClub.name}</strong>.
                  </p>
                  {selectedClub.studentCoordinatorId && selectedClub.studentCoordinatorId !== appointModalUser.id ? (
                    <p className="text-amber-800 font-bold text-[11px] bg-amber-50 p-2 rounded-lg border border-amber-200">
                      ⚠️ Handover: The existing coordinator of this club will be automatically demoted back to regular club member.
                    </p>
                  ) : null}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAppointModalUser(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCoordinator}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  {submittingCoordinator ? 'Appointing...' : 'Appoint Coordinator'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

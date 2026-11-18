import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ShieldCheck, Check, X, Users, Mail, Phone, UserCheck, Edit3, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ClubApprovalsPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('PENDING_APPROVAL');
  const [editingClubId, setEditingClubId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const { addToast } = useToast();

  const { data: clubsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-club-approvals', selectedStatus],
    queryFn: async () => {
      const res = await api.get(`/clubs?status=${selectedStatus}`);
      return res;
    },
  });

  const clubs = clubsData?.data || [];

  const handleApprove = async (id, name) => {
    try {
      await api.patch(`/clubs/${id}/approve`);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      addToast(`Approved "${name}"! Club is now active and public.`, 'success');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Reject constitution for "${name}"?`)) return;

    try {
      await api.patch(`/clubs/${id}/reject`);
      addToast(`Rejected "${name}".`, 'info');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAssignCoordinator = async (clubId, clubName) => {
    if (!selectedStudentId) {
      addToast('Please select a club member first.', 'warning');
      return;
    }

    try {
      await api.patch(`/clubs/${clubId}/coordinator`, { studentId: selectedStudentId });
      addToast(`Successfully appointed coordinator for "${clubName}"! (A club can only have 1 coordinator)`, 'success');
      setEditingClubId(null);
      setSelectedStudentId('');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Club Governance & Charters</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review club constitutions, grant campus charters, and appoint student coordinators from active club members
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2">
        {['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStatus === status
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : clubs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clubs.map((club) => (
            <div
              key={club.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between card-hover"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={club.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=6366f1&color=fff`}
                      alt={club.name}
                      className="w-12 h-12 rounded-2xl object-cover bg-slate-50 border border-slate-200"
                    />
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{club.name}</h3>
                      <Badge variant={club.category} className="mt-1" />
                    </div>
                  </div>
                  <Badge variant={club.status} />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{club.description}</p>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Faculty Sponsor:</span>
                    <span className="font-bold text-slate-800">{club.facultyCoordinator}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Student Coordinator:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {club.studentCoordinator?.name || 'None Assigned'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingClubId(editingClubId === club.id ? null : club.id);
                          setSelectedStudentId(club.studentCoordinatorId || '');
                        }}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-3 h-3" /> {club.studentCoordinator ? 'Change' : 'Assign'}
                      </button>
                    </div>
                  </div>

                  {editingClubId === club.id && (
                    <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl space-y-2.5 mt-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 block">
                          Appoint Club Coordinator
                        </span>
                        <span className="text-[10px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                          1 Coordinator Max
                        </span>
                      </div>

                      {club.members && club.members.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedStudentId}
                              onChange={(e) => setSelectedStudentId(e.target.value)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-slate-800"
                            >
                              <option value="">-- Select Member of {club.name} --</option>
                              {club.members.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.user?.name} ({m.user?.rollNumber || m.user?.department} • Current: {m.role})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignCoordinator(club.id, club.name)}
                              className="py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
                            >
                              Save
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            * The individual must be a member of this club. Selecting a new coordinator will replace any existing coordinator.
                          </p>
                        </>
                      ) : (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            This club currently has no members. A student must join or be part of <strong>{club.name}</strong> before they can be appointed as coordinator.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="font-mono text-[11px] text-slate-600">{club.contactEmail}</span>
                  </div>
                </div>
              </div>

              {club.status === 'PENDING_APPROVAL' && (
                <div className="pt-2 flex items-center gap-3 border-t border-slate-100">
                  <button
                    onClick={() => handleApprove(club.id, club.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4" /> Approve & Charter
                  </button>
                  <button
                    onClick={() => handleReject(club.id, club.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs transition-colors"
                  >
                    <X className="w-4 h-4" /> Reject Proposal
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No clubs with status ${selectedStatus.replace('_', ' ')}`}
          description="Club proposals submitted by coordinators will appear here for administrative approval."
        />
      )}
    </div>
  );
};

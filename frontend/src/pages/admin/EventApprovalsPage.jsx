import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  MessageSquare,
  Users,
  ExternalLink,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const EventApprovalsPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('PENDING_APPROVAL');
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingEventId, setApprovingEventId] = useState(null);
  const [submittingReject, setSubmittingReject] = useState(false);
  const { addToast } = useToast();

  const { data: eventsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-event-approvals', selectedStatus],
    queryFn: async () => {
      const res = await api.get(`/events/admin/approvals?status=${selectedStatus}`);
      return res;
    },
  });

  const events = eventsData?.data || [];

  const handleApprove = async (event) => {
    setApprovingEventId(event.id);
    try {
      await api.patch(`/events/${event.id}/approve`, {
        adminNotes: `Approved for venue "${event.venue}" on ${new Date(event.startDateTime).toLocaleDateString()}`,
      });
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      addToast(`Approved "${event.title}"! Coordinator can now publish it to announcements.`, 'success');
      refetch();
    } catch (err) {
      // If algorithm denies approval due to clash, err.message has the explicit collision details
      addToast(err.message, 'error');
    } finally {
      setApprovingEventId(null);
    }
  };

  const handleOpenReject = (event) => {
    setRejectingEvent(event);
    setRejectReason(
      `Please choose an alternate venue or time slot: The requested slot at "${event.venue}" conflicts with existing campus schedules.`
    );
  };

  const handleConfirmReject = async (e) => {
    e?.preventDefault();
    if (!rejectReason.trim()) {
      addToast('Please provide feedback or reschedule instructions.', 'warning');
      return;
    }

    setSubmittingReject(true);
    try {
      await api.patch(`/events/${rejectingEvent.id}/reject`, {
        reason: rejectReason.trim(),
      });
      addToast(`Changes requested for "${rejectingEvent.title}". Coordinator has been notified.`, 'info');
      setRejectingEvent(null);
      setRejectReason('');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Venue & Event Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review proposed club events, resolve venue conflicts with strict algorithmic prevention, and authorize schedules before announcements.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'PENDING_APPROVAL', label: 'Pending Review' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'REJECTED', label: 'Changes Requested / Rejected' },
          { key: 'ALL', label: 'All Events' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStatus === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 gap-5">
          {events.map((evt) => (
            <EventApprovalCard
              key={evt.id}
              event={evt}
              onApprove={() => handleApprove(evt)}
              onReject={() => handleOpenReject(evt)}
              isApproving={approvingEventId === evt.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${selectedStatus.replace('_', ' ').toLowerCase()} events`}
          description="Club coordinators will submit new event proposals requiring venue bookings here."
        />
      )}

      {/* Reject / Request Reschedule Modal */}
      {rejectingEvent && (
        <Modal
          isOpen={!!rejectingEvent}
          onClose={() => setRejectingEvent(null)}
          title={`Request Rescheduling / Feedback: ${rejectingEvent.title}`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Reschedule Guidance</p>
                <p className="text-[11px] mt-0.5">
                  Let the coordinator know which slots or venues are available so they can update and resubmit their event.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admin Instructions & Reschedule Feedback
              </label>
              <textarea
                required
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify reasons or suggest alternate venues/times..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingEvent(null)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReject}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-60"
              >
                {submittingReject ? 'Submitting...' : 'Send Feedback & Request Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

/**
 * Event Card with Real-time Venue Conflict Detection Inspector
 */
const EventApprovalCard = ({ event, onApprove, onReject, isApproving }) => {
  // Check for live venue clash
  const { data: availabilityData } = useQuery({
    queryKey: ['venue-clash-check', event.venue, event.startDateTime, event.endDateTime, event.id],
    queryFn: async () => {
      const res = await api.get(
        `/events/check-venue?venue=${encodeURIComponent(event.venue)}&startDateTime=${encodeURIComponent(
          event.startDateTime
        )}&endDateTime=${encodeURIComponent(event.endDateTime)}&excludeEventId=${event.id}`
      );
      return res.data;
    },
    enabled: !!event.venue && !!event.startDateTime && !!event.endDateTime,
  });

  const conflicts = availabilityData?.conflicts || [];
  const hasClash = conflicts.length > 0;

  const startDate = new Date(event.startDateTime).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = new Date(event.startDateTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(event.endDateTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`bg-white rounded-3xl p-6 border shadow-sm transition-all ${
        hasClash ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        {/* Left: Club & Event Info */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-sm text-brand-600">{event.club?.name}</span>
            <span className="text-slate-300">•</span>
            <Badge variant={event.category} />
            <Badge variant={event.status} />
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">{event.title}</h3>

          <p className="text-xs text-slate-600 line-clamp-2">{event.description}</p>

          {/* Schedule & Venue Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Requested Venue</span>
                <span className="font-bold text-slate-800 truncate block">{event.venue}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Date & Timing</span>
                <span className="font-bold text-slate-800 truncate block">
                  {startDate} ({startTime} - {endTime})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <Users className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Capacity & Submitter</span>
                <span className="font-bold text-slate-800 truncate block">
                  {event.maxCapacity} Seats • {event.createdBy?.name || 'Coordinator'}
                </span>
              </div>
            </div>
          </div>

          {/* Algorithmic Venue Clash Alert Banner */}
          {hasClash && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-extrabold text-rose-700">
                  ALGORITHM VENUE CLASH WARNING: Venue Already Booked!
                </p>
                {conflicts.map((c) => (
                  <p key={c.id} className="text-[11px] mt-0.5 text-rose-800">
                    &bull; Clashes with <strong className="font-bold">"{c.title}"</strong> ({c.club?.name}) scheduled from{' '}
                    {new Date(c.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to{' '}
                    {new Date(c.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  </p>
                ))}
                <p className="text-[10px] text-rose-600 font-medium mt-1">
                  Note: Even if you attempt to approve, the algorithmic safety lock will strictly reject the approval until rescheduled.
                </p>
              </div>
            </div>
          )}

          {/* Admin Feedback Notes if previously rejected */}
          {event.adminNotes && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block text-[11px]">Admin Review Notes:</span>
                <span className="text-slate-600 text-[11px]">{event.adminNotes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
          {event.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={onApprove}
                disabled={isApproving}
                className={`py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                  hasClash
                    ? 'bg-amber-600 hover:bg-amber-700 opacity-90'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                title={hasClash ? 'Algorithm will block approval due to collision' : 'Approve event and venue'}
              >
                <Check className="w-4 h-4" />
                <span>{isApproving ? 'Verifying...' : hasClash ? 'Try Approve (Clash Risk)' : 'Approve Venue & Event'}</span>
              </button>

              <button
                onClick={onReject}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Request Changes</span>
              </button>
            </>
          )}

          {event.status === 'APPROVED' && (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Approved by Admin</span>
            </div>
          )}

          {event.status === 'REJECTED' && (
            <button
              onClick={onReject}
              className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold"
            >
              Update Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


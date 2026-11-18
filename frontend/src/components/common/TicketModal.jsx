import React from 'react';
import { Modal } from './Modal';
import { Calendar, MapPin, User, Ticket, Download, CheckCircle2, ShieldCheck, Hash } from 'lucide-react';

export const TicketModal = ({ isOpen, onClose, registration, event }) => {
  if (!registration || !event) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Event Entry Pass" maxWidth="max-w-md">
      <div className="flex flex-col items-center">
        {/* Pass card with perforated edges visual styling */}
        <div className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-800/40">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-brand-500/20 rounded-full blur-2xl"></div>

          {/* Top header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-brand-300 uppercase bg-brand-900/60 px-2.5 py-1 rounded-full border border-brand-500/30">
                {event.category || 'CAMPUS EVENT'}
              </span>
              <h4 className="text-lg font-bold mt-2 text-white line-clamp-1">{event.title}</h4>
            </div>
            <Ticket className="w-6 h-6 text-brand-400 shrink-0" />
          </div>

          {/* Event details */}
          <div className="space-y-2 py-3 border-y border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400 shrink-0" />
              <span>{new Date(event.startDateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-brand-400 shrink-0" />
              <span>Attendee: {registration.user?.name || 'Registered Student'}</span>
            </div>
          </div>

          {/* Official Ticket Pass Box */}
          <div className="flex flex-col items-center justify-center pt-6 pb-2">
            <div className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                <CheckCircle2 className="w-4 h-4" /> Confirmed Reservation
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Ticket Reference Code</span>
              <div className="font-mono text-xl sm:text-2xl font-black text-brand-300 tracking-widest mt-1 bg-slate-950/80 px-4 py-2 rounded-xl border border-brand-500/30">
                {registration.ticketCode}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Present this ticket code at the front registration desk for event entry
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full mt-6">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-all shadow-md shadow-brand-600/20 active:scale-98"
          >
            <Download className="w-4 h-4" /> Print or Save Entry Ticket
          </button>
        </div>
      </div>
    </Modal>
  );
};

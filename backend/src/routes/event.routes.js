import { Router } from 'express';
import {
  getEvents,
  getEventBySlugOrId,
  createEvent,
  updateEvent,
  registerForEvent,
  cancelRegistration,
  getMyEvents,
  getEventParticipants,
  checkVenueAvailability,
  getPendingApprovalEvents,
  approveEvent,
  rejectEvent,
  publishEvent,
} from '../controllers/event.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { createEventSchema, updateEventSchema } from '../validators/schemas.js';

const router = Router();

// Public / Discovery
router.get('/', optionalAuthenticate, getEvents);
router.get('/my-events', authenticate, getMyEvents);

// Venue Availability & Admin Approvals (Placed above /:identifier to avoid route clash)
router.get('/check-venue', authenticate, checkVenueAvailability);
router.get('/admin/approvals', authenticate, requireRole('ADMIN'), getPendingApprovalEvents);
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), approveEvent);
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), rejectEvent);

// Coordinator Event Publishing to Announcements
router.post('/:id/publish', authenticate, publishEvent);

// Single Event Details
router.get('/:identifier', optionalAuthenticate, getEventBySlugOrId);

// Coordinator Event Management
router.post('/', authenticate, validate(createEventSchema), createEvent);
router.put('/:id', authenticate, validate(updateEventSchema), updateEvent);
router.get('/:id/participants', authenticate, getEventParticipants);

// Concurrency-Safe Student Registration
router.post('/:id/register', authenticate, registerForEvent);
router.delete('/:id/register', authenticate, cancelRegistration);

export default router;

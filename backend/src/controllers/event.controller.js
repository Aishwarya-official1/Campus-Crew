import prisma from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { createNotification, createBulkNotifications } from '../services/notification.service.js';
import { emitToEvent } from '../sockets/socketManager.js';

/**
 * Strict Venue Clash Prevention Algorithm
 * Checks if another active/approved event occupies the given venue during the requested time window.
 * Overlap condition: (newEventStart < existingEnd) && (newEventEnd > existingStart)
 */
export const checkVenueConflict = async ({ venue, startDateTime, endDateTime, excludeEventId = null }) => {
  if (!venue || !startDateTime || !endDateTime) return [];

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  // Active / Approved statuses that reserve the venue:
  const blockingStatuses = [
    'APPROVED',
    'PUBLISHED',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'ONGOING',
  ];

  const conflicts = await prisma.event.findMany({
    where: {
      id: excludeEventId ? { not: excludeEventId } : undefined,
      venue: { equals: venue.trim(), mode: 'insensitive' },
      status: { in: blockingStatuses },
      AND: [
        { startDateTime: { lt: end } },
        { endDateTime: { gt: start } },
      ],
    },
    include: {
      club: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
    orderBy: { startDateTime: 'asc' },
  });

  return conflicts;
};

export const checkVenueAvailability = async (req, res, next) => {
  try {
    const { venue, startDateTime, endDateTime, excludeEventId } = req.query;
    if (!venue || !startDateTime || !endDateTime) {
      return sendError(res, 'Venue, startDateTime, and endDateTime are required query parameters.', 400);
    }

    const conflicts = await checkVenueConflict({
      venue,
      startDateTime,
      endDateTime,
      excludeEventId,
    });

    // Also check other pending requests for the same slot (for admin visibility)
    const pendingRequests = await prisma.event.findMany({
      where: {
        id: excludeEventId ? { not: excludeEventId } : undefined,
        venue: { equals: venue.trim(), mode: 'insensitive' },
        status: 'PENDING_APPROVAL',
        AND: [
          { startDateTime: { lt: new Date(endDateTime) } },
          { endDateTime: { gt: new Date(startDateTime) } },
        ],
      },
      include: {
        club: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { startDateTime: 'asc' },
    });

    return sendSuccess(res, 'Venue availability evaluated', {
      available: conflicts.length === 0,
      conflicts,
      pendingRequests,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingApprovalEvents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    } else {
      where.status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        club: { select: { id: true, name: true, slug: true, logoUrl: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, 'Pending approval events list', events);
  } catch (error) {
    next(error);
  }
};

export const approveEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body || {};

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true, studentCoordinatorId: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!event) {
      return sendError(res, 'Event not found', 404);
    }

    // STRICT VENUE CLASH PREVENTION ALGORITHM
    // If admin tries to approve unknowingly when there's an event clash, algo MUST deny the approval!
    const conflicts = await checkVenueConflict({
      venue: event.venue,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      excludeEventId: event.id,
    });

    if (conflicts.length > 0) {
      const clashing = conflicts[0];
      const startStr = new Date(clashing.startDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      const endStr = new Date(clashing.endDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

      return sendError(
        res,
        `APPROVAL DENIED BY ALGORITHM: Venue clash detected! "${clashing.title}" (${clashing.club.name}) is already scheduled at "${event.venue}" between ${startStr} and ${endStr}. Please notify the coordinator to select an alternate venue or time.`,
        409,
        { conflicts }
      );
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        adminNotes: adminNotes || 'Approved by administrator.',
      },
      include: {
        club: true,
        approvedBy: { select: { id: true, name: true } },
      },
    });

    // Notify coordinator that event was approved
    const targetUserId = event.createdById || event.club.studentCoordinatorId;
    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        title: `Event Approved! 🎉 ${event.title}`,
        message: `Your event "${event.title}" has been approved for venue "${event.venue}". You can now review and publish it to announcements!`,
        type: 'EVENT_UPDATE',
        linkUrl: `/coordinator/events`,
      });
    }

    return sendSuccess(res, 'Event approved successfully. Coordinator can now publish it.', updated);
  } catch (error) {
    next(error);
  }
};

export const rejectEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return sendError(res, 'A feedback reason or rescheduling instructions must be provided to the coordinator.', 400);
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true, studentCoordinatorId: true } },
      },
    });

    if (!event) {
      return sendError(res, 'Event not found', 404);
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes: reason.trim(),
      },
      include: { club: true },
    });

    // Notify coordinator with actionable feedback
    const targetUserId = event.createdById || event.club.studentCoordinatorId;
    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        title: `Venue Action Required ⚠️: ${event.title}`,
        message: `Admin review for "${event.title}": ${reason.trim()}. Please update the venue, date, or time slot and resubmit.`,
        type: 'EVENT_UPDATE',
        linkUrl: `/coordinator/events`,
      });
    }

    return sendSuccess(res, 'Feedback submitted and coordinator notified successfully.', updated);
  } catch (error) {
    next(error);
  }
};

export const publishEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { club: true },
    });

    if (!event) {
      return sendError(res, 'Event not found', 404);
    }

    // Verify permission: User must be Admin or Club Coordinator
    if (req.user.role !== 'ADMIN') {
      const isDirectCoordinator =
        event.createdById === req.user.id || event.club.studentCoordinatorId === req.user.id;

      const membership = await prisma.clubMembership.findFirst({
        where: {
          clubId: event.clubId,
          userId: req.user.id,
          status: 'ACTIVE',
          role: { in: ['COORDINATOR', 'SECRETARY'] },
        },
      });

      if (!isDirectCoordinator && !membership) {
        return sendError(res, 'Unauthorized: Only the club coordinator or an administrator can publish this event.', 403);
      }
    }

    // Event must be approved first!
    if (event.status !== 'APPROVED') {
      return sendError(
        res,
        `Cannot publish event: Current status is "${event.status}". Events must first be approved by the administrator.`,
        400
      );
    }

    // Algorithm safety re-check for clashes before publishing
    const conflicts = await checkVenueConflict({
      venue: event.venue,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      excludeEventId: event.id,
    });

    if (conflicts.length > 0) {
      return sendError(
        res,
        `Cannot publish event: Unexpected venue clash with "${conflicts[0].title}". Contact admin for review.`,
        409
      );
    }

    // Update status to REGISTRATION_OPEN
    const published = await prisma.event.update({
      where: { id },
      data: {
        status: 'REGISTRATION_OPEN',
      },
      include: { club: true },
    });

    // Automatically post in Announcements
    const announcement = await prisma.announcement.create({
      data: {
        clubId: event.clubId,
        eventId: event.id,
        authorId: req.user.id,
        title: `📢 Event Announcement: ${event.title}`,
        content: `🎉 We are excited to announce our upcoming event "${event.title}"!\n\n📍 Venue: ${event.venue}\n🗓 Date & Time: ${new Date(event.startDateTime).toLocaleString()} - ${new Date(event.endDateTime).toLocaleTimeString()}\n\n${event.description}\n\nSeats: Max capacity ${event.maxCapacity} participants. Registrations are officially open!`,
        targetRole: 'ALL',
        isPinned: true,
      },
    });

    // Notify all active club members
    const clubMembers = await prisma.clubMembership.findMany({
      where: { clubId: event.clubId, status: 'ACTIVE' },
      select: { userId: true },
    });

    const notifications = clubMembers.map((m) => ({
      userId: m.userId,
      title: `New Event Announced: ${event.title} 📢`,
      message: `${event.club.name} has scheduled "${event.title}" at ${event.venue}. Registration is now open!`,
      type: 'EVENT_NEW',
      linkUrl: `/events/${event.slug}`,
    }));

    await createBulkNotifications(notifications);

    return sendSuccess(res, 'Event published and broadcast to announcements successfully!', {
      event: published,
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req, res, next) => {
  try {
    const { category, status, search, clubId, upcoming, page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (category) {
      where.category = category;
    }

    if (clubId) {
      where.clubId = clubId;
    }

    if (status) {
      where.status = status;
    } else if (req.user?.role !== 'ADMIN' && req.user?.role !== 'COORDINATOR') {
      where.status = { notIn: ['DRAFT', 'PENDING_APPROVAL', 'REJECTED'] };
    }

    if (upcoming === 'true') {
      where.startDateTime = { gte: new Date() };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip,
        take,
        include: {
          club: {
            select: { id: true, name: true, slug: true, logoUrl: true, category: true },
          },
          _count: {
            select: {
              registrations: { where: { status: 'REGISTERED' } },
              volunteerOpportunities: true,
            },
          },
        },
        orderBy: { startDateTime: 'asc' },
      }),
    ]);

    return sendSuccess(res, 'Events list retrieved', events, 200, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    next(error);
  }
};

export const getEventBySlugOrId = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.id;

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            category: true,
            contactEmail: true,
            studentCoordinator: { select: { id: true, name: true, email: true } },
          },
        },
        volunteerOpportunities: {
          include: {
            _count: { select: { assignments: true, applications: true } },
          },
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            registrations: { where: { status: 'REGISTERED' } },
            tasks: true,
          },
        },
      },
    });

    if (!event) {
      return sendError(res, 'Event not found', 404);
    }

    // Check user's registration status and volunteer status if logged in
    let userRegistration = null;
    let userVolunteerAssignment = null;

    if (userId) {
      userRegistration = await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
      });

      userVolunteerAssignment = await prisma.volunteerAssignment.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
      });
    }

    return sendSuccess(res, 'Event details loaded', {
      ...event,
      userRegistration,
      userVolunteerAssignment,
    });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const {
      clubId,
      title,
      slug,
      description,
      category,
      venue,
      startDateTime,
      endDateTime,
      registrationStartDate,
      registrationEndDate,
      maxCapacity,
      bannerUrl,
      status,
    } = req.body;

    const existing = await prisma.event.findFirst({
      where: { OR: [{ slug }, { title, clubId }] },
    });

    if (existing) {
      return sendError(res, 'An event with this title or slug already exists in this club.', 409);
    }

    // Default status:
    // If Admin creates it, they can set status or default to APPROVED.
    // If Coordinator creates it, it MUST be PENDING_APPROVAL so admin can review and approve venue!
    const initialStatus = req.user.role === 'ADMIN' ? (status || 'APPROVED') : 'PENDING_APPROVAL';

    const event = await prisma.event.create({
      data: {
        clubId,
        createdById: req.user.id,
        title,
        slug,
        description,
        category,
        venue,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        registrationStartDate: new Date(registrationStartDate),
        registrationEndDate: new Date(registrationEndDate),
        maxCapacity: parseInt(maxCapacity),
        registeredCount: 0,
        bannerUrl: bannerUrl || null,
        status: initialStatus,
      },
      include: { club: true },
    });

    // Notify admins if created by coordinator
    if (req.user.role !== 'ADMIN') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });

      if (admins.length > 0) {
        const notifications = admins.map((admin) => ({
          userId: admin.id,
          title: `Event Approval Required 🏛️: ${event.title}`,
          message: `${event.club.name} coordinator submitted "${event.title}" requesting venue "${event.venue}" for ${new Date(event.startDateTime).toLocaleDateString()}. Please review.`,
          type: 'EVENT_UPDATE',
          linkUrl: `/admin/event-approvals`,
        }));
        await createBulkNotifications(notifications);
      }
    } else {
      // If admin created it and marked it PUBLISHED/REGISTRATION_OPEN, notify club members
      if (['PUBLISHED', 'REGISTRATION_OPEN'].includes(event.status)) {
        const clubMembers = await prisma.clubMembership.findMany({
          where: { clubId, status: 'ACTIVE' },
          select: { userId: true },
        });

        const notifications = clubMembers.map((m) => ({
          userId: m.userId,
          title: `New Event Announced: ${event.title} 📢`,
          message: `${event.club.name} has scheduled "${event.title}" on ${new Date(event.startDateTime).toLocaleDateString()}. Registration is opening soon!`,
          type: 'EVENT_NEW',
          linkUrl: `/events/${event.slug}`,
        }));

        await createBulkNotifications(notifications);
      }
    }

    return sendSuccess(
      res,
      req.user.role === 'ADMIN'
        ? 'Event created successfully!'
        : 'Event submitted successfully! It is now pending Admin approval for venue booking.',
      event,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      venue,
      startDateTime,
      endDateTime,
      registrationStartDate,
      registrationEndDate,
      maxCapacity,
      bannerUrl,
      status,
    } = req.body;

    const existing = await prisma.event.findUnique({
      where: { id },
      include: {
        club: true,
        registrations: { where: { status: 'REGISTERED' }, select: { userId: true } },
      },
    });

    if (!existing) {
      return sendError(res, 'Event not found', 404);
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (venue) updateData.venue = venue;
    if (startDateTime) updateData.startDateTime = new Date(startDateTime);
    if (endDateTime) updateData.endDateTime = new Date(endDateTime);
    if (registrationStartDate) updateData.registrationStartDate = new Date(registrationStartDate);
    if (registrationEndDate) updateData.registrationEndDate = new Date(registrationEndDate);
    if (maxCapacity) updateData.maxCapacity = parseInt(maxCapacity);
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (status) updateData.status = status;

    // If venue or timing changed by non-admin on an already processed event, require re-approval
    const timingOrVenueChanged =
      (venue && venue.trim().toLowerCase() !== existing.venue.trim().toLowerCase()) ||
      (startDateTime && new Date(startDateTime).getTime() !== new Date(existing.startDateTime).getTime()) ||
      (endDateTime && new Date(endDateTime).getTime() !== new Date(existing.endDateTime).getTime());

    if (timingOrVenueChanged && req.user.role !== 'ADMIN') {
      updateData.status = 'PENDING_APPROVAL';
      updateData.approvedById = null;
      updateData.approvedAt = null;
      updateData.adminNotes = 'Venue or schedule was modified by coordinator. Awaiting re-approval.';
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
      include: { club: true },
    });

    // Notify admins if schedule was changed and requires re-approval
    if (timingOrVenueChanged && req.user.role !== 'ADMIN') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      if (admins.length > 0) {
        await createBulkNotifications(
          admins.map((a) => ({
            userId: a.id,
            title: `Event Rescheduled ⚠️: ${updated.title}`,
            message: `${updated.club.name} coordinator modified venue/time for "${updated.title}" to "${updated.venue}". Re-approval required.`,
            type: 'EVENT_UPDATE',
            linkUrl: `/admin/event-approvals`,
          }))
        );
      }
    }

    // Notify all registered attendees of changes if already published
    if (['PUBLISHED', 'REGISTRATION_OPEN', 'ONGOING'].includes(existing.status) && existing.registrations.length > 0) {
      const notifications = existing.registrations.map((r) => ({
        userId: r.userId,
        title: `Event Update: ${updated.title} ℹ️`,
        message: `Important updates have been made to "${updated.title}" (Venue: ${updated.venue}, Date: ${new Date(updated.startDateTime).toLocaleDateString()}).`,
        type: 'EVENT_UPDATE',
        linkUrl: `/events/${updated.slug}`,
      }));

      await createBulkNotifications(notifications);
    }

    emitToEvent(id, 'event:updated', updated);

    return sendSuccess(res, 'Event updated successfully!', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * CONCURRENCY-SAFE REGISTRATION:
 * Enforces capacity with conditional atomic update and serializable transactions.
 * Guarantees that registeredCount will NEVER exceed maxCapacity even under simultaneous high-frequency requests.
 */
export const registerForEvent = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    if (req.user?.role === 'ADMIN') {
      return sendError(res, 'Administrators cannot register for events.', 403);
    }

    // Check event basic eligibility
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return sendError(res, 'Event not found.', 404);
    }

    if (event.status !== 'REGISTRATION_OPEN' && event.status !== 'PUBLISHED') {
      return sendError(res, `Registration is closed for this event (Status: ${event.status}).`, 400);
    }

    const now = new Date();
    if (now < new Date(event.registrationStartDate)) {
      return sendError(res, 'Registration for this event has not opened yet.', 400);
    }
    if (now > new Date(event.registrationEndDate)) {
      return sendError(res, 'Registration deadline for this event has passed.', 400);
    }

    // Execute atomic registration in transaction with row-level lock
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire exclusive lock on the event row
      const lockedEvents = await tx.$queryRaw`
        SELECT id, "registeredCount", "maxCapacity", "status"
        FROM "Event"
        WHERE id = ${eventId}
        FOR UPDATE
      `;

      const lockedEvent = lockedEvents[0];
      if (!lockedEvent) {
        const err = new Error('Event not found.');
        err.statusCode = 404;
        throw err;
      }

      // 2. Strict capacity check on locked row
      if (lockedEvent.registeredCount >= lockedEvent.maxCapacity) {
        const err = new Error('Registration failed: Event is at maximum capacity.');
        err.statusCode = 409;
        throw err;
      }

      // 3. Check for existing registration
      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });

      if (existing && existing.status === 'REGISTERED') {
        const err = new Error('You are already registered for this event.');
        err.statusCode = 409;
        throw err;
      }

      // 4. Safely increment registered count
      await tx.$executeRaw`
        UPDATE "Event"
        SET "registeredCount" = "registeredCount" + 1
        WHERE id = ${eventId}
      `;

      // 5. Generate unique ticket code
      const ticketCode = `TKT-${event.slug.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 6. Save registration record
      let registration;
      if (existing) {
        registration = await tx.eventRegistration.update({
          where: { id: existing.id },
          data: {
            status: 'REGISTERED',
            ticketCode,
            registeredAt: new Date(),
            cancelledAt: null,
          },
        });
      } else {
        registration = await tx.eventRegistration.create({
          data: {
            eventId,
            userId,
            ticketCode,
            status: 'REGISTERED',
          },
        });
      }

      return { registration, ticketCode };
    });

    // Notify student
    await createNotification({
      userId,
      title: `Registration Confirmed! 🎟️ ${event.title}`,
      message: `You are confirmed for "${event.title}". Ticket code: ${result.ticketCode}. Access your QR pass from your dashboard.`,
      type: 'REGISTRATION_CONFIRMED',
      linkUrl: `/student/events`,
    });

    return sendSuccess(res, 'Registered successfully for the event!', result.registration, 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

export const cancelRegistration = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    const registration = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: true },
    });

    if (!registration || registration.status !== 'REGISTERED') {
      return sendError(res, 'Active registration not found for this event.', 404);
    }

    // Atomic transaction to cancel and decrement seat count safely
    await prisma.$transaction(async (tx) => {
      await tx.eventRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      await tx.$executeRaw`
        UPDATE "Event"
        SET "registeredCount" = GREATEST("registeredCount" - 1, 0)
        WHERE "id" = ${eventId}
      `;
    });

    await createNotification({
      userId,
      title: 'Registration Cancelled',
      message: `Your registration for "${registration.event.title}" has been cancelled and seat released.`,
      type: 'REGISTRATION_CANCELLED',
      linkUrl: `/student/events`,
    });

    return sendSuccess(res, 'Registration cancelled successfully.');
  } catch (error) {
    next(error);
  }
};

export const getMyEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const registrations = await prisma.eventRegistration.findMany({
      where: { userId, status: 'REGISTERED' },
      include: {
        event: {
          include: {
            club: { select: { id: true, name: true, slug: true, logoUrl: true } },
          },
        },
      },
      orderBy: { event: { startDateTime: 'asc' } },
    });

    return sendSuccess(res, 'Your registered events', registrations);
  } catch (error) {
    next(error);
  }
};

export const getEventParticipants = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;

    const participants = await prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
            year: true,
            phone: true,
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    // Check attendance status for each participant
    const attendances = await prisma.attendance.findMany({
      where: { eventId },
      select: { userId: true, checkInTime: true, method: true },
    });

    const attendanceMap = new Map();
    attendances.forEach((a) => attendanceMap.set(a.userId, a));

    const enrichedParticipants = participants.map((p) => ({
      ...p,
      attendance: attendanceMap.get(p.userId) || null,
    }));

    return sendSuccess(res, 'Participants list retrieved', enrichedParticipants);
  } catch (error) {
    next(error);
  }
};

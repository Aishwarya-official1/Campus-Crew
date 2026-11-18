import prisma from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { createNotification } from '../services/notification.service.js';

export const getClubs = async (req, res, next) => {
  try {
    const { category, search, status, page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    // Filter by approval status
    if (status) {
      if (req.user?.role === 'ADMIN') {
        where.status = status;
      } else {
        where.status = 'APPROVED';
      }
    } else if (req.user?.role !== 'ADMIN') {
      where.status = 'APPROVED';
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, clubs] = await Promise.all([
      prisma.club.count({ where }),
      prisma.club.findMany({
        where,
        skip,
        take,
        include: {
          studentCoordinator: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          members: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              userId: true,
              role: true,
              user: {
                select: { id: true, name: true, rollNumber: true, department: true, email: true },
              },
            },
          },
          _count: {
            select: {
              members: { where: { status: 'ACTIVE' } },
              events: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return sendSuccess(res, 'Clubs retrieved successfully', clubs, 200, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    next(error);
  }
};

export const getClubByIdOrSlug = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    const club = await prisma.club.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        studentCoordinator: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                rollNumber: true,
                department: true,
                year: true,
                avatarUrl: true,
              },
            },
          },
        },
        events: {
          where: {
            status: { in: ['PUBLISHED', 'REGISTRATION_OPEN', 'ONGOING'] },
          },
          orderBy: { startDateTime: 'asc' },
          take: 5,
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        recruitmentDrives: {
          where: { status: 'OPEN' },
          include: {
            applications: {
              select: { id: true, userId: true, status: true, appliedAt: true },
            },
          },
          take: 5,
        },
        _count: {
          select: {
            members: { where: { status: 'ACTIVE' } },
            events: true,
          },
        },
      },
    });

    if (!club) {
      return sendError(res, 'Club not found', 404);
    }

    return sendSuccess(res, 'Club details retrieved', club);
  } catch (error) {
    next(error);
  }
};

export const createClub = async (req, res, next) => {
  try {
    const { name, slug, description, category, facultyCoordinator, contactEmail, contactPhone, logoUrl, bannerUrl } = req.body;

    const existingSlug = await prisma.club.findUnique({ where: { slug } });
    if (existingSlug) {
      return sendError(res, 'A club with this slug already exists.', 409);
    }

    const existingName = await prisma.club.findUnique({ where: { name } });
    if (existingName) {
      return sendError(res, 'A club with this name already exists.', 409);
    }

    const club = await prisma.club.create({
      data: {
        name,
        slug,
        description,
        category,
        facultyCoordinator,
        studentCoordinatorId: req.user.id,
        contactEmail,
        contactPhone,
        logoUrl,
        bannerUrl,
        status: req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING_APPROVAL',
        members: {
          create: {
            userId: req.user.id,
            role: 'COORDINATOR',
            status: 'ACTIVE',
          },
        },
      },
    });

    // Ensure the creator's user record reflects their coordinator role
    if (req.user.role !== 'COORDINATOR' && req.user.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { role: 'COORDINATOR' },
      });
    }

    // Notify user
    await createNotification({
      userId: req.user.id,
      title: 'Club Registration Submitted! 📋',
      message: `Your constitution for "${name}" has been received and is pending administrative review.`,
      type: 'ANNOUNCEMENT',
      linkUrl: `/clubs/${slug}`,
    });

    return sendSuccess(
      res,
      req.user.role === 'ADMIN'
        ? 'Club registered and published immediately!'
        : 'Club registration submitted for administrative approval.',
      club,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const updateClub = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await prisma.club.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(res, 'Club updated successfully!', updated);
  } catch (error) {
    next(error);
  }
};

export const assignClubCoordinator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return sendError(res, 'studentId is required.', 400);
    }

    const club = await prisma.club.findUnique({
      where: { id },
      include: { studentCoordinator: true },
    });

    if (!club) {
      return sendError(res, 'Club not found.', 404);
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return sendError(res, 'User not found.', 404);
    }

    // REQUIREMENT: The particular individual MUST be an active member of the club
    const membership = await prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId: id, userId: studentId } },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return sendError(
        res,
        `Cannot appoint coordinator: ${student.name} must first be an active member of "${club.name}".`,
        400
      );
    }

    // REQUIREMENT: A club cannot have 2 coordinators.
    // If the club already has a coordinator and it's a different person, hand over and demote the previous coordinator
    if (club.studentCoordinatorId && club.studentCoordinatorId !== studentId) {
      const oldCoordinatorId = club.studentCoordinatorId;

      // 1. Demote old coordinator's membership role in this club to MEMBER
      await prisma.clubMembership.updateMany({
        where: { clubId: id, userId: oldCoordinatorId },
        data: { role: 'MEMBER' },
      });

      // 2. Check if previous coordinator manages any other club
      const otherCoordinatingClubs = await prisma.club.count({
        where: { studentCoordinatorId: oldCoordinatorId, id: { not: id } },
      });

      // If no other clubs, revert platform role back to STUDENT
      if (otherCoordinatingClubs === 0) {
        await prisma.user.update({
          where: { id: oldCoordinatorId },
          data: { role: 'STUDENT' },
        });
      }

      // 3. Notify previous coordinator of the handover
      await createNotification({
        userId: oldCoordinatorId,
        title: `Coordinator Role Handover: ${club.name}`,
        message: `You have handed over the Student Coordinator responsibilities for "${club.name}" to ${student.name}.`,
        type: 'ANNOUNCEMENT',
        linkUrl: `/clubs/${club.slug}`,
      });
    }

    // Update new coordinator user role to COORDINATOR
    await prisma.user.update({
      where: { id: studentId },
      data: { role: 'COORDINATOR' },
    });

    // Update their membership role in this club to COORDINATOR
    await prisma.clubMembership.update({
      where: { id: membership.id },
      data: { role: 'COORDINATOR' },
    });

    // Set as the single club student coordinator
    const updatedClub = await prisma.club.update({
      where: { id },
      data: { studentCoordinatorId: studentId },
      include: {
        studentCoordinator: {
          select: { id: true, name: true, email: true, rollNumber: true, avatarUrl: true },
        },
      },
    });

    // Notify new coordinator
    await createNotification({
      userId: studentId,
      title: `Appointed as Student Coordinator! 🌟`,
      message: `You have been appointed as the Student Coordinator for "${club.name}" by the Platform Administrator.`,
      type: 'ANNOUNCEMENT',
      linkUrl: `/coordinator`,
    });

    return sendSuccess(res, `Appointed ${student.name} as Coordinator for ${club.name}`, updatedClub);
  } catch (error) {
    next(error);
  }
};

export const joinClub = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const club = await prisma.club.findUnique({
      where: { id },
    });

    if (!club || club.status !== 'APPROVED') {
      return sendError(res, 'Active club not found', 404);
    }

    // Check if user is already an active member
    const existingMembership = await prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (existingMembership && existingMembership.status === 'ACTIVE') {
      return sendError(res, 'You are already an active member of this club.', 400);
    }

    // Ensure there is an open recruitment drive for the club
    const openRecruitment = await prisma.recruitmentDrive.findFirst({
      where: {
        clubId: id,
        status: 'OPEN',
        OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
      },
    });

    if (!openRecruitment) {
      return sendError(res, 'Club recruitment is not open currently', 403);
    }

    return sendError(
      res,
      'Club recruitment requires an application submission. Please apply to an open recruitment drive.',
      400
    );
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    const membership = await prisma.clubMembership.update({
      where: { id: memberId },
      data: { role },
      include: { user: true, club: true },
    });

    await createNotification({
      userId: membership.userId,
      title: `Role Updated in ${membership.club.name}`,
      message: `Your membership role has been updated to ${role}.`,
      type: 'ANNOUNCEMENT',
      linkUrl: `/clubs/${membership.club.slug}`,
    });

    return sendSuccess(res, 'Member role updated successfully', membership);
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;

    await prisma.clubMembership.delete({
      where: { id: memberId },
    });

    return sendSuccess(res, 'Member removed from club successfully');
  } catch (error) {
    next(error);
  }
};

export const approveClub = async (req, res, next) => {
  try {
    const { id } = req.params;

    const club = await prisma.club.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    if (club.studentCoordinatorId) {
      await createNotification({
        userId: club.studentCoordinatorId,
        title: `Club Approved! 🎉 ${club.name}`,
        message: `Your club "${club.name}" has been approved by the platform administrator and is now live.`,
        type: 'ANNOUNCEMENT',
        linkUrl: `/clubs/${club.slug}`,
      });
    }

    return sendSuccess(res, 'Club approved successfully!', club);
  } catch (error) {
    next(error);
  }
};

export const rejectClub = async (req, res, next) => {
  try {
    const { id } = req.params;

    const club = await prisma.club.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    if (club.studentCoordinatorId) {
      await createNotification({
        userId: club.studentCoordinatorId,
        title: `Club Registration Update`,
        message: `Your club proposal "${club.name}" was not approved at this time.`,
        type: 'ANNOUNCEMENT',
        linkUrl: `/clubs`,
      });
    }

    return sendSuccess(res, 'Club proposal rejected', club);
  } catch (error) {
    next(error);
  }
};

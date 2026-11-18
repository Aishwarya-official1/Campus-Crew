import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Campus Crew database seeding with 5 core clubs and active memberships...');

  // Clean existing tables in reverse dependency order
  await prisma.notificationPreference.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.volunteerAssignment.deleteMany();
  await prisma.volunteerApplication.deleteMany();
  await prisma.volunteerOpportunity.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.recruitmentApplication.deleteMany();
  await prisma.recruitmentDrive.deleteMany();
  await prisma.clubMembership.deleteMany();
  await prisma.club.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Core Platform Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Eleanor Vance',
      rollNumber: 'ADM-001',
      department: 'Dean of Student Affairs',
      year: 4,
      role: 'ADMIN',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
  });

  const coordinator1 = await prisma.user.create({
    data: {
      email: 'coordinator@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Arjun Sharma',
      rollNumber: 'CS2023041',
      department: 'Computer Science & Engineering',
      year: 3,
      role: 'COORDINATOR',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const coordinator2 = await prisma.user.create({
    data: {
      email: 'sarah.art@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Sarah Jenkins',
      rollNumber: 'DS2023018',
      department: 'Design & Visual Arts',
      year: 3,
      role: 'COORDINATOR',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
  });

  const coordinator3 = await prisma.user.create({
    data: {
      email: 'rohan.kumar@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Rohan Kumar',
      rollNumber: 'HS2023012',
      department: 'Humanities & Social Sciences',
      year: 3,
      role: 'COORDINATOR',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  const coordinator4 = await prisma.user.create({
    data: {
      email: 'tanvi.gupta@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Tanvi Gupta',
      rollNumber: 'ME2023055',
      department: 'Mechanical Engineering',
      year: 3,
      role: 'COORDINATOR',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
  });

  const coordinator5 = await prisma.user.create({
    data: {
      email: 'neha.kulkarni@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Neha Kulkarni',
      rollNumber: 'EE2023088',
      department: 'Electrical Engineering',
      year: 3,
      role: 'COORDINATOR',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'student@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Sneha Reddy',
      rollNumber: 'IT2024089',
      department: 'Information Technology',
      year: 2,
      role: 'STUDENT',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'rohit.k@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Rohit Kumar',
      rollNumber: 'CS2024102',
      department: 'Computer Science',
      year: 2,
      role: 'STUDENT',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'ananya.m@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Ananya Mishra',
      rollNumber: 'EC2024045',
      department: 'Electronics & Comm.',
      year: 2,
      role: 'STUDENT',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    },
  });

  const student4 = await prisma.user.create({
    data: {
      email: 'kavya.i@campuscrew.edu',
      passwordHash: defaultPasswordHash,
      name: 'Kavya Iyer',
      rollNumber: 'BT2024021',
      department: 'Biotechnology',
      year: 2,
      role: 'STUDENT',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const allUsers = [
    admin,
    coordinator1,
    coordinator2,
    coordinator3,
    coordinator4,
    coordinator5,
    student1,
    student2,
    student3,
    student4,
  ];

  for (const u of allUsers) {
    await prisma.notificationPreference.create({
      data: {
        userId: u.id,
        emailEventReminders: true,
        emailTaskUpdates: true,
        emailRecruitment: true,
        inAppAnnouncements: true,
        inAppTasks: true,
        inAppEvents: true,
      },
    });
  }

  // 2. Create the 5 Core Campus Clubs
  const sdcClub = await prisma.club.create({
    data: {
      name: 'Software Development Club',
      slug: 'software-development-club',
      description: 'The premier student coding hub driving full-stack engineering, open source projects, hackathons, and software excellence across campus.',
      category: 'TECHNICAL',
      facultyCoordinator: 'Dr. T. Sunil Kumar',
      studentCoordinatorId: coordinator1.id,
      contactEmail: 'sdc@nitw.ac.in',
      contactPhone: '9848022111',
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000',
    },
  });

  const photoClub = await prisma.club.create({
    data: {
      name: 'Photography Club',
      slug: 'photography-club',
      description: 'Capturing campus moments, visual storytelling, photo exhibitions, photo-walks, and masterclasses in digital photography and editing.',
      category: 'CULTURAL',
      facultyCoordinator: 'Prof. Satti Venu Gopala Kumari',
      studentCoordinatorId: coordinator2.id,
      contactEmail: 'svenu@nitw.ac.in',
      contactPhone: '8897489096',
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1000',
    },
  });

  const litClub = await prisma.club.create({
    data: {
      name: 'Literary & Debating Club',
      slug: 'literary-debating-club',
      description: 'The premier forum for parliamentary debates, creative writing, poetry slams, public speaking, model united nations, and literary publications.',
      category: 'CULTURAL',
      facultyCoordinator: 'Prof. Satyam Gupta',
      studentCoordinatorId: coordinator3.id,
      contactEmail: 'gsatyam@nitw.ac.in',
      contactPhone: '9452887114',
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1000',
    },
  });

  const roboticsClub = await prisma.club.create({
    data: {
      name: 'Robotics Club',
      slug: 'robotics-club',
      description: 'Designing autonomous rovers, combat bots, drone avionics, embedded electronics, and competing in national robotics challenges.',
      category: 'TECHNICAL',
      facultyCoordinator: 'Prof. V. Vasu',
      studentCoordinatorId: coordinator4.id,
      contactEmail: 'vasu@nitw.ac.in',
      contactPhone: '9490164972',
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=200',
      bannerUrl: 'https://media.istockphoto.com/id/2210278635/photo/advanced-robotics-operates-in-a-high-tech-assembly-line-for-electronic-devices-at-a.webp?a=1&b=1&s=612x612&w=0&k=20&c=wH867qR08Q79fVX8Frq8ySVnoWvLiSHrK4dMwac4CR0=',
    },
  });

  const igClub = await prisma.club.create({
    data: {
      name: 'Innovation Garage',
      slug: 'innovation-garage',
      description: 'Campus 24/7 makerspace, student incubator, prototype testing lab, design sprints, and startup venture development center.',
      category: 'ENTREPRENEURSHIP',
      facultyCoordinator: 'Prof. P. Srihari Rao',
      studentCoordinatorId: coordinator5.id,
      contactEmail: 'srihari@nitw.ac.in',
      contactPhone: '9440174548',
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1000',
    },
  });

  // 3. Create Club Memberships (Guarantees every club has at least 2 members + coordinator)
  await prisma.clubMembership.createMany({
    data: [
      // 1) Software Development Club: 3 members
      { clubId: sdcClub.id, userId: coordinator1.id, role: 'COORDINATOR', status: 'ACTIVE' },
      { clubId: sdcClub.id, userId: student1.id, role: 'MEMBER', status: 'ACTIVE' },
      { clubId: sdcClub.id, userId: student2.id, role: 'CORE_MEMBER', status: 'ACTIVE' },

      // 2) Photography Club: 3 members
      { clubId: photoClub.id, userId: coordinator2.id, role: 'COORDINATOR', status: 'ACTIVE' },
      { clubId: photoClub.id, userId: student2.id, role: 'MEMBER', status: 'ACTIVE' },
      { clubId: photoClub.id, userId: student3.id, role: 'MEMBER', status: 'ACTIVE' },

      // 3) Literary & Debating Club: 3 members
      { clubId: litClub.id, userId: coordinator3.id, role: 'COORDINATOR', status: 'ACTIVE' },
      { clubId: litClub.id, userId: student1.id, role: 'MEMBER', status: 'ACTIVE' },
      { clubId: litClub.id, userId: student3.id, role: 'CORE_MEMBER', status: 'ACTIVE' },

      // 4) Robotics Club: 3 members
      { clubId: roboticsClub.id, userId: coordinator4.id, role: 'COORDINATOR', status: 'ACTIVE' },
      { clubId: roboticsClub.id, userId: student2.id, role: 'CORE_MEMBER', status: 'ACTIVE' },
      { clubId: roboticsClub.id, userId: student4.id, role: 'MEMBER', status: 'ACTIVE' },

      // 5) Innovation Garage: 3 members
      { clubId: igClub.id, userId: coordinator5.id, role: 'COORDINATOR', status: 'ACTIVE' },
      { clubId: igClub.id, userId: student1.id, role: 'CORE_MEMBER', status: 'ACTIVE' },
      { clubId: igClub.id, userId: student4.id, role: 'MEMBER', status: 'ACTIVE' },
    ],
  });

  // 4. Recruitment Drives & Applications
  const sdcRecruit = await prisma.recruitmentDrive.create({
    data: {
      clubId: sdcClub.id,
      title: 'Software Development Club Core Committee Induction 2026',
      description: 'Seeking passionate full-stack developers, UI/UX designers, and open-source enthusiasts to lead high-impact campus projects.',
      requirements: 'Experience with web technologies (React/Node/Next.js) or systems programming. Strong collaborative spirit.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
    },
  });

  const photoDrive = await prisma.recruitmentDrive.create({
    data: {
      clubId: photoClub.id,
      title: 'Photography Club Executive Member Induction',
      description: 'Open call for creative photographers, digital editors, and photojournalists for campus events and annual magazine coverage.',
      requirements: 'Portfolio of 5-10 photographs. Open to all years and branches.',
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
    },
  });

  await prisma.recruitmentApplication.create({
    data: {
      driveId: sdcRecruit.id,
      userId: student1.id,
      statementOfPurpose: 'I have built multiple web projects and served as a volunteer for HackCampus last year. I would love to lead the frontend workshops.',
      experience: '2 years of React, Tailwind, and Node.js. Active open source contributor.',
      portfolioUrl: 'https://github.com/sneha-reddy',
      status: 'SHORTLISTED',
      reviewNotes: 'Impressive GitHub portfolio and proven volunteer track record.',
      reviewedAt: new Date(),
    },
  });

  await prisma.recruitmentApplication.create({
    data: {
      driveId: sdcRecruit.id,
      userId: student2.id,
      statementOfPurpose: 'Interested in competitive programming training and problem setting for junior students.',
      experience: 'Candidate Master on Codeforces, solved 800+ LeetCode problems.',
      portfolioUrl: 'https://codeforces.com/profile/rohit_k',
      status: 'UNDER_REVIEW',
    },
  });

  // 5. Events
  const hackCampus = await prisma.event.create({
    data: {
      clubId: sdcClub.id,
      createdById: coordinator1.id,
      title: 'HackCampus 2026: 36-Hour National Hackathon',
      slug: 'hackcampus-2026',
      description: 'The largest student hackathon on campus! Join 500+ builders, innovators, and designers for 36 hours of non-stop hacking, mentoring sessions, and exciting prizes.',
      category: 'HACKATHON',
      venue: 'Main Innovation Center & CS Auditorium',
      startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      registrationStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      registrationEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      maxCapacity: 120,
      registeredCount: 3,
      status: 'REGISTRATION_OPEN',
      checkInSecret: 'hackcampus-checkin-secret-token-2026',
      bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1000',
    },
  });

  const photoWalk = await prisma.event.create({
    data: {
      clubId: photoClub.id,
      createdById: coordinator2.id,
      title: 'Golden Hour: Heritage Campus Photo Walk',
      slug: 'golden-hour-campus-photowalk',
      description: 'Explore the architectural monuments and biodiversity of NITW campus during golden hour with professional guidance from guest photographers.',
      category: 'WORKSHOP',
      venue: 'Heritage Quadrangle & Lake View',
      startDateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      registrationStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      registrationEndDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      maxCapacity: 60,
      registeredCount: 2,
      status: 'REGISTRATION_OPEN',
      checkInSecret: 'photowalk-secret-token-2026',
      bannerUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1000',
    },
  });

  const aiWorkshop = await prisma.event.create({
    data: {
      clubId: sdcClub.id,
      createdById: coordinator1.id,
      title: 'Building Enterprise LLM Agents Workshop',
      slug: 'enterprise-llm-agents-workshop',
      description: 'Hands-on intensive masterclass on building retrieval-augmented generation (RAG) agents, function-calling models, and vector stores.',
      category: 'WORKSHOP',
      venue: 'Advanced Computing Lab 4B',
      startDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      registrationStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      registrationEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      maxCapacity: 50,
      registeredCount: 2,
      status: 'REGISTRATION_OPEN',
      checkInSecret: 'llm-workshop-secret-token-2026',
      bannerUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1000',
    },
  });

  // 6. Event Registrations (Students only)
  await prisma.eventRegistration.createMany({
    data: [
      {
        eventId: hackCampus.id,
        userId: student1.id,
        ticketCode: 'TKT-HC26-8901',
        status: 'REGISTERED',
      },
      {
        eventId: hackCampus.id,
        userId: student2.id,
        ticketCode: 'TKT-HC26-8902',
        status: 'REGISTERED',
      },
      {
        eventId: hackCampus.id,
        userId: student3.id,
        ticketCode: 'TKT-HC26-8903',
        status: 'REGISTERED',
      },
      {
        eventId: photoWalk.id,
        userId: student1.id,
        ticketCode: 'TKT-PW26-1001',
        status: 'REGISTERED',
      },
      {
        eventId: photoWalk.id,
        userId: student3.id,
        ticketCode: 'TKT-PW26-1002',
        status: 'REGISTERED',
      },
      {
        eventId: aiWorkshop.id,
        userId: student1.id,
        ticketCode: 'TKT-AI26-4401',
        status: 'REGISTERED',
      },
      {
        eventId: aiWorkshop.id,
        userId: student2.id,
        ticketCode: 'TKT-AI26-4402',
        status: 'REGISTERED',
      },
    ],
  });

  // 7. Volunteer Opportunities
  const volOpp1 = await prisma.volunteerOpportunity.create({
    data: {
      eventId: hackCampus.id,
      roleTitle: 'Registration & Participant Check-In Lead',
      description: 'Manage the front desk, verify attendee registration passes, distribute identity lanyards, and guide arriving hackathon teams.',
      skillsRequired: 'Good communication, punctual, organized record-keeping.',
      volunteersNeeded: 6,
      status: 'OPEN',
    },
  });

  const volOpp2 = await prisma.volunteerOpportunity.create({
    data: {
      eventId: hackCampus.id,
      roleTitle: 'Technical Infrastructure & Wi-Fi Monitor',
      description: 'Assist teams with laboratory networking, hardware peripherals, and power distribution strips.',
      skillsRequired: 'Basic networking and hardware troubleshooting skills.',
      volunteersNeeded: 4,
      status: 'OPEN',
    },
  });

  // Volunteer Application & Assignment
  await prisma.volunteerApplication.create({
    data: {
      opportunityId: volOpp1.id,
      userId: student1.id,
      note: 'I helped coordinate registration during orientation week last semester and loved the energy!',
      status: 'ACCEPTED',
      reviewedAt: new Date(),
    },
  });

  await prisma.volunteerAssignment.create({
    data: {
      opportunityId: volOpp1.id,
      eventId: hackCampus.id,
      userId: student1.id,
      roleName: 'Registration & Participant Check-In Lead',
      reportingTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000),
      reportingVenue: 'Main Innovation Center Front Desk',
      status: 'ASSIGNED',
      notes: 'Please pick up attendee badges from Room 204 at 8:00 AM.',
    },
  });

  await prisma.volunteerApplication.create({
    data: {
      opportunityId: volOpp2.id,
      userId: student2.id,
      note: 'CS sophomore, happy to help with network routers and switches.',
      status: 'ACCEPTED',
      reviewedAt: new Date(),
    },
  });

  await prisma.volunteerAssignment.create({
    data: {
      opportunityId: volOpp2.id,
      eventId: hackCampus.id,
      userId: student2.id,
      roleName: 'Technical Infrastructure & Wi-Fi Monitor',
      reportingTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
      reportingVenue: 'Innovation Center Server Room',
      status: 'ASSIGNED',
      notes: 'Coordinate with Campus IT for network switch passwords.',
    },
  });

  // 8. Tasks (Assigned to students only)
  const task1 = await prisma.task.create({
    data: {
      eventId: hackCampus.id,
      assignedToUserId: student1.id,
      title: 'Prepare Check-In Desk and Print 120 Badges',
      description: 'Sort attendee registration list alphabetically and print participant badges for HackCampus.',
      priority: 'HIGH',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'COMPLETED',
      verifiedById: coordinator1.id,
      verifiedAt: new Date(),
      pointsValue: 10,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      eventId: hackCampus.id,
      assignedToUserId: student2.id,
      title: 'Configure Dedicated Wi-Fi SSIDs and Power Drops',
      description: 'Coordinate with university network admins to allocate high-bandwidth SSIDs for 30 participating hackathon teams.',
      priority: 'URGENT',
      deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      pointsValue: 15,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      eventId: hackCampus.id,
      assignedToUserId: student1.id,
      title: 'Organize Sponsor Swag Bags and Participant Kits',
      description: 'Sort and bag t-shirts, stickers, notebooks, and sponsor merchandise for distribution at the front desk.',
      priority: 'MEDIUM',
      deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      pointsValue: 5,
    },
  });

  // Task Comments
  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: student1.id,
      comment: 'All 120 attendee badges have been sorted alphabetically into boxes by college name.',
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: coordinator1.id,
      comment: 'Excellent work Sneha! Verified and awarded 10 contribution points.',
    },
  });

  // 9. Announcements
  await prisma.announcement.create({
    data: {
      clubId: sdcClub.id,
      authorId: coordinator1.id,
      title: '🎉 Welcome to HackCampus 2026 Preparation!',
      content: 'We are thrilled to announce HackCampus 2026! Registrations are now open. Volunteers please check your assigned tasks and reporting times.',
      targetRole: 'ALL',
      isPinned: true,
    },
  });

  await prisma.announcement.create({
    data: {
      clubId: sdcClub.id,
      eventId: hackCampus.id,
      authorId: coordinator1.id,
      title: 'Volunteer Briefing Meeting Schedule',
      content: 'All accepted volunteers for HackCampus must attend the mandatory briefing on Thursday at 5:00 PM in CS Lab 2.',
      targetRole: 'VOLUNTEERS',
      isPinned: false,
    },
  });

  // 10. Attendance Records (Manual desk check-in)
  await prisma.attendance.create({
    data: {
      eventId: aiWorkshop.id,
      userId: student1.id,
      markedById: coordinator1.id,
      method: 'MANUAL',
      checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  // 11. Contributions & Points
  await prisma.contribution.create({
    data: {
      userId: student1.id,
      clubId: sdcClub.id,
      eventId: hackCampus.id,
      points: 10,
      reason: 'Completed check-in desk setup and badge printing task with stellar accuracy',
      category: 'TASK_COMPLETION',
      verifiedById: coordinator1.id,
    },
  });

  await prisma.contribution.create({
    data: {
      userId: student1.id,
      clubId: sdcClub.id,
      eventId: aiWorkshop.id,
      points: 5,
      reason: 'Active attendance and engagement in LLM Masterclass',
      category: 'VOLUNTEER_WORK',
      verifiedById: coordinator1.id,
    },
  });

  await prisma.contribution.create({
    data: {
      userId: student2.id,
      clubId: sdcClub.id,
      eventId: hackCampus.id,
      points: 10,
      reason: 'Assisted in network setup and hardware configuration',
      category: 'VOLUNTEER_WORK',
      verifiedById: coordinator1.id,
    },
  });

  // 12. In-App Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: student1.id,
        title: 'Task Verified: 10 Points Awarded! 🌟',
        message: 'Your task "Prepare Check-In Desk and Print 120 Badges" has been verified by Arjun Sharma.',
        type: 'TASK_STATUS',
        linkUrl: '/student/tasks',
        isRead: false,
      },
      {
        userId: student1.id,
        title: 'Volunteer Application Accepted!',
        message: 'You have been appointed as Registration & Participant Check-In Lead for HackCampus 2026.',
        type: 'VOLUNTEER_STATUS',
        linkUrl: '/student/tasks',
        isRead: true,
        readAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        userId: student1.id,
        title: 'Event Registration Confirmed: HackCampus 2026',
        message: 'Your registration ticket TKT-HC26-8901 is confirmed. Check details in your events dashboard.',
        type: 'REGISTRATION_CONFIRMED',
        linkUrl: '/student/events',
        isRead: true,
        readAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      {
        userId: student2.id,
        title: 'Urgent Task Assigned: Wi-Fi Setup',
        message: 'You have been assigned to configure dedicated Wi-Fi SSIDs for HackCampus 2026.',
        type: 'TASK_ASSIGNED',
        linkUrl: '/student/tasks',
        isRead: false,
      },
    ],
  });

  console.log(`✅ Seeding completed successfully! Created 5 campus clubs with >= 2 members each.`);
  console.log('--- DEFAULT CREDENTIALS ---');
  console.log('Admin:       admin@campuscrew.edu       / Password123!');
  console.log('Coordinator: coordinator@campuscrew.edu / Password123!');
  console.log('Student:     student@campuscrew.edu     / Password123!');
  console.log('---------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

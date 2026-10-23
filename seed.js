const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Import existing Mongoose models
const User = require('./models/User');
const Department = require('./models/Department');
const Resource = require('./models/Resource');
const Booking = require('./models/Booking');
const Event = require('./models/Event');
const Notification = require('./models/Notification');

// Predictable demo emails & codes for safe idempotent reseeding
const DEMO_EMAILS = [
  'admin@campussync.com',
  'coordinator.cse@campussync.com',
  'coordinator.mech@campussync.com',
  'coordinator.eee@campussync.com',
  'coordinator.civil@campussync.com',
  'faculty.cse@campussync.com',
  'faculty.mech@campussync.com',
  'faculty.eee@campussync.com',
  'student.alex@campussync.com',
  'student.sarah@campussync.com',
  'student.david@campussync.com',
];

const DEMO_DEPARTMENT_CODES = ['CSE', 'MECH', 'EEE', 'CIVIL'];

/**
 * Helper to compute dynamic future date relative to today
 */
const getFutureDate = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Main Database Seeder Function
 */
const seedDatabase = async () => {
  console.log('====================================================');
  console.log('       CampusSync Database Seeder Initializing       ');
  console.log('====================================================');

  try {
    // 1. Connect to MongoDB using existing connection setup
    console.log('[1/7] Connecting to MongoDB...');
    await connectDB();
    console.log(`[Database] Connection Status: CONNECTED (${mongoose.connection.host}/${mongoose.connection.name})`);

    // 2. Clean only previously seeded demo data to ensure idempotency
    console.log('\n[2/7] Cleaning previous demo records (preserving custom/user data)...');

    // Find previous demo users and departments to cascade delete demo bookings/events
    const previousDemoUsers = await User.find({ email: { $in: DEMO_EMAILS } }).select('_id');
    const demoUserIds = previousDemoUsers.map((u) => u._id);

    const previousDemoDepts = await Department.find({ code: { $in: DEMO_DEPARTMENT_CODES } }).select('_id');
    const demoDeptIds = previousDemoDepts.map((d) => d._id);

    const previousDemoResources = await Resource.find({ ownerDepartment: { $in: demoDeptIds } }).select('_id');
    const demoResourceIds = previousDemoResources.map((r) => r._id);

    const deletedBookings = await Booking.deleteMany({
      $or: [
        { requestedBy: { $in: demoUserIds } },
        { resource: { $in: demoResourceIds } },
        { department: { $in: demoDeptIds } },
      ],
    });

    const deletedEvents = await Event.deleteMany({
      $or: [
        { createdBy: { $in: demoUserIds } },
        { department: { $in: demoDeptIds } },
        { resource: { $in: demoResourceIds } },
      ],
    });

    const deletedNotifications = await Notification.deleteMany({
      recipient: { $in: demoUserIds },
    });

    const deletedResources = await Resource.deleteMany({ ownerDepartment: { $in: demoDeptIds } });
    const deletedUsers = await User.deleteMany({ email: { $in: DEMO_EMAILS } });
    const deletedDepartments = await Department.deleteMany({ code: { $in: DEMO_DEPARTMENT_CODES } });

    console.log(` -> Cleared demo records: ${deletedUsers.deletedCount} users, ${deletedDepartments.deletedCount} departments, ${deletedResources.deletedCount} resources, ${deletedBookings.deletedCount} bookings, ${deletedEvents.deletedCount} events, ${deletedNotifications.deletedCount} notifications.`);

    // 3. Seed Departments (3-4 Departments)
    console.log('\n[3/7] Creating Departments...');
    const departmentsData = [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Mechanical Engineering', code: 'MECH' },
      { name: 'Electrical & Electronics Engineering', code: 'EEE' },
      { name: 'Civil Engineering', code: 'CIVIL' },
    ];

    const departments = {};
    for (const d of departmentsData) {
      const deptDoc = await Department.create(d);
      departments[d.code] = deptDoc;
      console.log(`  + Department created: ${deptDoc.name} [${deptDoc.code}]`);
    }

    // 4. Seed Users (Admin, Coordinators, Faculty, Students)
    console.log('\n[4/7] Creating Users (with bcrypt hashed passwords)...');

    const usersData = [
      // 1 Admin
      {
        name: 'System Administrator',
        email: 'admin@campussync.com',
        password: 'admin123',
        role: 'ADMIN',
        department: null,
      },
      // 4 Department Coordinators
      {
        name: 'Dr. Alan Turing',
        email: 'coordinator.cse@campussync.com',
        password: 'coord123',
        role: 'DEPARTMENT_COORDINATOR',
        department: departments.CSE._id,
      },
      {
        name: 'Dr. Nikola Tesla',
        email: 'coordinator.mech@campussync.com',
        password: 'coord123',
        role: 'DEPARTMENT_COORDINATOR',
        department: departments.MECH._id,
      },
      {
        name: 'Dr. Michael Faraday',
        email: 'coordinator.eee@campussync.com',
        password: 'coord123',
        role: 'DEPARTMENT_COORDINATOR',
        department: departments.EEE._id,
      },
      {
        name: 'Dr. Arthur Casagrande',
        email: 'coordinator.civil@campussync.com',
        password: 'coord123',
        role: 'DEPARTMENT_COORDINATOR',
        department: departments.CIVIL._id,
      },
      // 3 Faculty Users
      {
        name: 'Prof. Barbara Liskov',
        email: 'faculty.cse@campussync.com',
        password: 'faculty123',
        role: 'FACULTY',
        department: departments.CSE._id,
      },
      {
        name: 'Prof. James Watt',
        email: 'faculty.mech@campussync.com',
        password: 'faculty123',
        role: 'FACULTY',
        department: departments.MECH._id,
      },
      {
        name: 'Prof. James Maxwell',
        email: 'faculty.eee@campussync.com',
        password: 'faculty123',
        role: 'FACULTY',
        department: departments.EEE._id,
      },
      // 3 Student Users
      {
        name: 'Alex Johnson',
        email: 'student.alex@campussync.com',
        password: 'student123',
        role: 'STUDENT',
        department: departments.CSE._id,
      },
      {
        name: 'Sarah Smith',
        email: 'student.sarah@campussync.com',
        password: 'student123',
        role: 'STUDENT',
        department: departments.MECH._id,
      },
      {
        name: 'David Lee',
        email: 'student.david@campussync.com',
        password: 'student123',
        role: 'STUDENT',
        department: departments.EEE._id,
      },
    ];

    const users = {};
    for (const u of usersData) {
      // User.create triggers mongoose pre('save') hook to hash password with bcrypt
      const userDoc = await User.create(u);
      users[u.email] = userDoc;
      console.log(`  + User created: ${userDoc.name} (${userDoc.email}) -> Role: [${userDoc.role}]`);
    }

    // Link Coordinators back to Departments
    departments.CSE.coordinator = users['coordinator.cse@campussync.com']._id;
    await departments.CSE.save();

    departments.MECH.coordinator = users['coordinator.mech@campussync.com']._id;
    await departments.MECH.save();

    departments.EEE.coordinator = users['coordinator.eee@campussync.com']._id;
    await departments.EEE.save();

    departments.CIVIL.coordinator = users['coordinator.civil@campussync.com']._id;
    await departments.CIVIL.save();

    console.log('  -> Assigned Department Coordinators to respective departments.');

    // 5. Seed Resources across departments
    console.log('\n[5/7] Creating Campus Resources...');
    const resourcesData = [
      {
        name: 'AI & Machine Learning Lab',
        type: 'COMPUTER_LAB',
        description: 'High-performance GPU cluster with 40 workstations for AI/ML and Data Science research.',
        location: 'Tech Block 3, Room 301',
        capacity: 40,
        status: 'AVAILABLE',
        ownerDepartment: departments.CSE._id,
      },
      {
        name: 'CSE Seminar Hall',
        type: 'SEMINAR_HALL',
        description: 'Air-conditioned auditorium-style seminar hall with laser projection and surround sound.',
        location: 'Tech Block 3, 1st Floor',
        capacity: 120,
        status: 'AVAILABLE',
        ownerDepartment: departments.CSE._id,
      },
      {
        name: 'Robotics & CAD/CAM Laboratory',
        type: 'LABORATORY',
        description: 'Automated robotics testing cell, 3D printing bay, and industrial simulation rigs.',
        location: 'Workshop Block B, Ground Floor',
        capacity: 35,
        status: 'AVAILABLE',
        ownerDepartment: departments.MECH._id,
      },
      {
        name: 'Advanced 4K Projector Unit - Mech',
        type: 'PROJECTOR',
        description: 'Portable high-lumen 4K projection equipment with wireless presentation gateway.',
        location: 'Mechanical Dept Office - Equipment Bay 2',
        capacity: 0,
        status: 'AVAILABLE',
        ownerDepartment: departments.MECH._id,
      },
      {
        name: 'Power Systems & IoT Laboratory',
        type: 'LABORATORY',
        description: 'Digital oscilloscopes, embedded IoT testing benches, and microgrid testbed.',
        location: 'Electrical Block, Room 204',
        capacity: 30,
        status: 'AVAILABLE',
        ownerDepartment: departments.EEE._id,
      },
      {
        name: 'Main Campus Auditorium',
        type: 'AUDITORIUM',
        description: 'Premier campus auditorium for conferences, convocations, and symposiums.',
        location: 'Central Academic Complex',
        capacity: 500,
        status: 'AVAILABLE',
        ownerDepartment: departments.EEE._id,
      },
      {
        name: 'Civil Engineering Conference Room',
        type: 'MEETING_ROOM',
        description: 'Executive conference room with hybrid video-meeting setup and interactive smart screen.',
        location: 'Civil Block, Room 105',
        capacity: 22,
        status: 'AVAILABLE',
        ownerDepartment: departments.CIVIL._id,
      },
    ];

    const resources = [];
    for (const r of resourcesData) {
      const resDoc = await Resource.create(r);
      resources.push(resDoc);
      console.log(`  + Resource created: "${resDoc.name}" (${resDoc.type}) - ${resDoc.location}`);
    }

    // 6. Seed Sample Bookings
    console.log('\n[6/7] Creating Sample Bookings...');
    const bookingsData = [
      {
        resource: resources[0]._id, // AI & Machine Learning Lab
        requestedBy: users['faculty.cse@campussync.com']._id,
        department: departments.CSE._id,
        date: getFutureDate(1),
        startTime: '09:00',
        endTime: '11:00',
        purpose: 'Deep Learning Hands-on Workshop for Final Year Students',
        status: 'APPROVED',
        approvalMessage: 'Approved. Lab technician notified to ensure GPU nodes are active.',
      },
      {
        resource: resources[1]._id, // CSE Seminar Hall
        requestedBy: users['student.alex@campussync.com']._id,
        department: departments.CSE._id,
        date: getFutureDate(2),
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'Campus Coding Club Hackathon Orientation & Team Formation',
        status: 'PENDING',
        approvalMessage: '',
      },
      {
        resource: resources[2]._id, // Robotics & CAD/CAM Laboratory
        requestedBy: users['student.sarah@campussync.com']._id,
        department: departments.MECH._id,
        date: getFutureDate(3),
        startTime: '10:00',
        endTime: '13:00',
        purpose: 'Autonomous Rover Chassis Fabrication Testing',
        status: 'APPROVED',
        approvalMessage: 'Approved by Coordinator. Safety goggles mandatory.',
      },
      {
        resource: resources[5]._id, // Main Campus Auditorium
        requestedBy: users['faculty.eee@campussync.com']._id,
        department: departments.EEE._id,
        date: getFutureDate(5),
        startTime: '13:00',
        endTime: '17:00',
        purpose: 'Inter-Departmental Renewable Energy & EV Tech Symposium',
        status: 'APPROVED',
        approvalMessage: 'Approved by Central Administration for campus-wide participation.',
      },
      {
        resource: resources[3]._id, // Advanced 4K Projector Unit - Mech
        requestedBy: users['student.david@campussync.com']._id,
        department: departments.EEE._id,
        date: getFutureDate(4),
        startTime: '11:00',
        endTime: '12:30',
        purpose: 'Senior Capstone Design Presentation',
        status: 'PENDING',
        approvalMessage: '',
      },
    ];

    const bookings = [];
    for (const b of bookingsData) {
      const bDoc = await Booking.create(b);
      bookings.push(bDoc);
      console.log(`  + Booking created: ${b.startTime}-${b.endTime} for "${bDoc.purpose}" -> [${bDoc.status}]`);
    }

    // 7. Seed Sample Events
    console.log('\n[7/7] Creating Sample Events & Notifications...');
    const eventsData = [
      {
        title: 'Annual HackCampus 2026 Hackathon',
        description: 'A 48-hour inter-departmental innovation hackathon focusing on AI agents and campus sustainability.',
        department: departments.CSE._id,
        createdBy: users['coordinator.cse@campussync.com']._id,
        eventDate: getFutureDate(7),
        startTime: '09:00',
        endTime: '18:00',
        resource: resources[1]._id, // CSE Seminar Hall
        expectedParticipants: 120,
        status: 'UPCOMING',
      },
      {
        title: 'National Robotics & Automation Expo',
        description: 'Live demonstrations of industrial robots, autonomous drones, and mechatronic systems.',
        department: departments.MECH._id,
        createdBy: users['coordinator.mech@campussync.com']._id,
        eventDate: getFutureDate(10),
        startTime: '10:00',
        endTime: '16:00',
        resource: resources[2]._id, // Robotics Lab
        expectedParticipants: 85,
        status: 'UPCOMING',
      },
      {
        title: 'Future of Clean Energy Keynote',
        description: 'Keynote lecture on microgrids, battery technology, and smart city infrastructure.',
        department: departments.EEE._id,
        createdBy: users['coordinator.eee@campussync.com']._id,
        eventDate: getFutureDate(14),
        startTime: '11:00',
        endTime: '13:00',
        resource: resources[5]._id, // Main Auditorium
        expectedParticipants: 350,
        status: 'UPCOMING',
      },
    ];

    const events = [];
    for (const ev of eventsData) {
      const evDoc = await Event.create(ev);
      events.push(evDoc);
      console.log(`  + Event created: "${evDoc.title}" on ${evDoc.eventDate.toLocaleDateString()} -> [${evDoc.status}]`);
    }

    // Sample Notifications for realistic inbox testing
    const notificationsData = [
      {
        recipient: users['student.alex@campussync.com']._id,
        title: 'Booking Submitted',
        message: 'Your booking request for CSE Seminar Hall has been submitted and is awaiting approval.',
        type: 'BOOKING',
        relatedId: bookings[1]._id,
        isRead: false,
      },
      {
        recipient: users['faculty.cse@campussync.com']._id,
        title: 'Booking Approved',
        message: 'Your booking for AI & Machine Learning Lab has been approved by Dr. Alan Turing.',
        type: 'BOOKING',
        relatedId: bookings[0]._id,
        isRead: false,
      },
      {
        recipient: users['coordinator.cse@campussync.com']._id,
        title: 'New Booking Request',
        message: 'Alex Johnson submitted a booking request for CSE Seminar Hall.',
        type: 'BOOKING',
        relatedId: bookings[1]._id,
        isRead: false,
      },
      {
        recipient: users['admin@campussync.com']._id,
        title: 'System Notice: Database Initialized',
        message: 'CampusSync database has been populated with seed demo data.',
        type: 'SYSTEM',
        relatedId: null,
        isRead: false,
      },
    ];

    for (const notif of notificationsData) {
      await Notification.create(notif);
    }
    console.log(`  + Notifications created: ${notificationsData.length} initial inbox alerts.`);

    console.log('\n====================================================');
    console.log('              SEEDING COMPLETE SUMMARY              ');
    console.log('====================================================');
    console.log(`  MongoDB Status    : CONNECTED`);
    console.log(`  Departments Total : ${Object.keys(departments).length}`);
    console.log(`  Users Total       : ${Object.keys(users).length}`);
    console.log(`    - Admins        : 1`);
    console.log(`    - Coordinators  : 4`);
    console.log(`    - Faculty       : 3`);
    console.log(`    - Students      : 3`);
    console.log(`  Resources Total   : ${resources.length}`);
    console.log(`  Bookings Total    : ${bookings.length}`);
    console.log(`  Events Total      : ${events.length}`);
    console.log(`  Notifications     : ${notificationsData.length}`);
    console.log('====================================================');
    console.log('DEMO LOGIN CREDENTIALS:');
    console.log('  Admin       : admin@campussync.com          | admin123');
    console.log('  Coordinator : coordinator.cse@campussync.com| coord123');
    console.log('  Faculty     : faculty.cse@campussync.com    | faculty123');
    console.log('  Student     : student.alex@campussync.com   | student123');
    console.log('====================================================');

    await mongoose.disconnect();
    console.log('[Database] Disconnected cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('\n[Seeder Error] Failed to seed database:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Execute seeder
seedDatabase();

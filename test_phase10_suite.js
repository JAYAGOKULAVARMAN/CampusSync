// test_phase10_suite.js
// Automated verification for CampusSync Phase 10: Interactive Room Availability & Timetable

const BASE_URL = 'http://127.0.0.1:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200 || !res.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token: res.data.token, user: res.data.user };
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function checkTimeOverlap(startA, endA, startB, endB) {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

function formatDate(dateObj) {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   CAMPUSSYNC PHASE 10: AUTOMATED TEST SUITE        ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate users of all 4 roles using seeded credentials
  console.log('--- Step 1: Role Authentication ---');
  const student = await login('student.alex@campussync.com', 'student123');
  const faculty = await login('faculty.cse@campussync.com', 'faculty123');
  const coord = await login('coordinator.cse@campussync.com', 'coord123');
  const admin = await login('admin@campussync.com', 'admin123');

  assert(student.user.role === 'STUDENT', 'Student logged in successfully');
  assert(faculty.user.role === 'FACULTY', 'Faculty logged in successfully');
  assert(coord.user.role === 'DEPARTMENT_COORDINATOR', 'Coordinator logged in successfully');
  assert(admin.user.role === 'ADMIN', 'Admin logged in successfully');

  // Fetch all resources
  const resResources = await request('/resources', {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  const resources = resResources.data?.resources || [];
  assert(resources.length > 0, `Fetched ${resources.length} resources from catalog`);

  // Fetch seeded bookings and events to retrieve exact test dates
  const resBookings = await request('/bookings', {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const bookings = resBookings.data?.bookings || [];
  assert(bookings.length > 0, `Found ${bookings.length} existing bookings in database`);

  const resEvents = await request('/events', {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const events = resEvents.data?.events || [];
  assert(events.length > 0, `Found ${events.length} existing events in database`);

  // Identify sample booking and event for testing
  const sampleBooking = bookings.find((b) => b.status === 'APPROVED' || b.status === 'PENDING');
  const sampleBookingResource = sampleBooking.resource?._id || sampleBooking.resource;
  const sampleBookingDate = formatDate(sampleBooking.date);

  const sampleEvent = events.find((e) => e.resource && (e.status === 'UPCOMING' || e.status === 'ONGOING'));
  const sampleEventResource = sampleEvent.resource?._id || sampleEvent.resource;
  const sampleEventDate = formatDate(sampleEvent.eventDate);

  console.log(`\nIdentified Seeded Data:`);
  console.log(` - Sample Booking: Resource ${sampleBookingResource} on ${sampleBookingDate} (${sampleBooking.startTime}-${sampleBooking.endTime}, ${sampleBooking.status})`);
  console.log(` - Sample Event: "${sampleEvent.title}" on Resource ${sampleEventResource} on ${sampleEventDate} (${sampleEvent.startTime}-${sampleEvent.endTime})`);

  // Test A: Select a resource with NO bookings
  console.log('\n--- Test A: Select Resource with NO Bookings ---');
  const futureEmptyDate = '2026-12-25';
  const resEmptyAvail = await request(`/resources/${sampleBookingResource}/availability?date=${futureEmptyDate}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });

  assert(resEmptyAvail.status === 200, 'Availability endpoint returned 200');
  assert(resEmptyAvail.data?.resource?._id === sampleBookingResource.toString(), 'Returned correct resource metadata');
  assert(resEmptyAvail.data?.bookings?.length === 0, `0 bookings returned for empty date ${futureEmptyDate}`);
  assert(resEmptyAvail.data?.events?.length === 0, `0 events returned for empty date ${futureEmptyDate}`);

  // Test B: Select a resource with EXISTING bookings
  console.log('\n--- Test B: Select Resource with EXISTING Bookings ---');
  const resBookedAvail = await request(`/resources/${sampleBookingResource}/availability?date=${sampleBookingDate}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });

  assert(resBookedAvail.status === 200, 'Availability endpoint returned 200');
  assert(resBookedAvail.data?.bookings?.length > 0, `Found ${resBookedAvail.data?.bookings?.length} existing booking(s) on ${sampleBookingDate}`);
  const matchBooking = resBookedAvail.data.bookings.find((b) => b._id === sampleBooking._id.toString());
  assert(!!matchBooking, 'Seeded booking present in availability payload');
  assert(matchBooking?.startTime === sampleBooking.startTime, `Booking start time matches: ${matchBooking?.startTime}`);

  // Test C: Select a resource with an EXISTING event
  console.log('\n--- Test C: Select Resource with EXISTING Event ---');
  const resEventAvail = await request(`/resources/${sampleEventResource}/availability?date=${sampleEventDate}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });

  assert(resEventAvail.status === 200, 'Availability endpoint returned 200');
  assert(resEventAvail.data?.events?.length > 0, `Found ${resEventAvail.data?.events?.length} scheduled event(s) on ${sampleEventDate}`);
  const matchEvent = resEventAvail.data.events.find((e) => e._id === sampleEvent._id.toString());
  assert(!!matchEvent, `Seeded event "${matchEvent?.title}" present in availability payload`);
  assert(matchEvent?.startTime === sampleEvent.startTime, `Event start time matches: ${matchEvent?.startTime}`);

  // Test D: Try booking an occupied time (Collision Prevention)
  console.log('\n--- Test D: Try Booking an OCCUPIED Time (Collision Prevention) ---');
  // Attempt 1: Overlapping with existing booking
  const resConflictBooking = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}` },
    body: JSON.stringify({
      resource: sampleBookingResource,
      date: sampleBookingDate,
      startTime: sampleBooking.startTime,
      endTime: sampleBooking.endTime,
      purpose: 'Conflicting booking attempt overlapping with existing booking',
    }),
  });

  assert(resConflictBooking.status === 409, `Backend rejected overlapping booking with HTTP 409 (got ${resConflictBooking.status})`);
  assert(resConflictBooking.data?.message?.toLowerCase().includes('already booked') || resConflictBooking.data?.message?.toLowerCase().includes('conflict'), `Error message indicates conflict: "${resConflictBooking.data?.message}"`);

  // Attempt 2: Overlapping with scheduled campus event
  const resConflictEvent = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}` },
    body: JSON.stringify({
      resource: sampleEventResource,
      date: sampleEventDate,
      startTime: sampleEvent.startTime,
      endTime: sampleEvent.endTime,
      purpose: 'Conflicting booking attempt overlapping with campus event',
    }),
  });

  assert(resConflictEvent.status === 409, `Backend rejected event collision with HTTP 409 (got ${resConflictEvent.status})`);
  assert(resConflictEvent.data?.message?.includes('Event') || resConflictEvent.data?.message?.toLowerCase().includes('event'), `Error message indicates event collision: "${resConflictEvent.data?.message}"`);

  // Test E: Book an AVAILABLE time
  console.log('\n--- Test E: Book an AVAILABLE Time ---');
  const freshDate = '2026-12-10';
  const resBookSuccess = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}` },
    body: JSON.stringify({
      resource: sampleBookingResource,
      date: freshDate,
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Phase 10 Verified Student Workshop on Machine Learning',
    }),
  });

  assert(resBookSuccess.status === 201, `Booking created successfully with HTTP 201 (got ${resBookSuccess.status})`);
  const createdBooking = resBookSuccess.data?.booking;
  assert(createdBooking && createdBooking.startTime === '10:00' && createdBooking.endTime === '12:00', 'Booking has correct slot time');

  // Test F: Verify backend collision detection still works on the newly booked slot
  console.log('\n--- Test F: Backend Collision Detection on Newly Booked Slot ---');
  const resDuplicateOverlap = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${faculty.token}` },
    body: JSON.stringify({
      resource: sampleBookingResource,
      date: freshDate,
      startTime: '11:00',
      endTime: '13:00',
      purpose: 'Faculty colliding booking attempt',
    }),
  });

  assert(resDuplicateOverlap.status === 409, `Overlapping booking on newly booked slot rejected with HTTP 409 (got ${resDuplicateOverlap.status})`);
  assert(resDuplicateOverlap.data?.message?.toLowerCase().includes('already booked') || resDuplicateOverlap.data?.message?.toLowerCase().includes('conflict'), 'Collision message returned');

  // Test G: Test as Student
  console.log('\n--- Test G: Role Verification - STUDENT ---');
  const studentAvail = await request(`/resources/${sampleBookingResource}/availability?date=${freshDate}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  assert(studentAvail.status === 200, 'Student can view resource availability');
  assert(studentAvail.data?.bookings?.some((b) => b.purpose.includes('Phase 10 Verified')), 'Student sees real-time booking in availability');

  // Test H: Test as Faculty
  console.log('\n--- Test H: Role Verification - FACULTY ---');
  const facultyAvail = await request(`/resources/${sampleBookingResource}/availability?date=${freshDate}`, {
    headers: { Authorization: `Bearer ${faculty.token}` },
  });
  assert(facultyAvail.status === 200, 'Faculty can view resource availability');
  const facultyBooking = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${faculty.token}` },
    body: JSON.stringify({
      resource: sampleBookingResource,
      date: freshDate,
      startTime: '14:00',
      endTime: '16:00',
      purpose: 'Faculty Guest Seminar',
    }),
  });
  assert(facultyBooking.status === 201, 'Faculty can book resources where permitted (HTTP 201)');

  // Test I: Test as Coordinator
  console.log('\n--- Test I: Role Verification - DEPARTMENT COORDINATOR ---');
  const coordAvail = await request(`/resources/${sampleBookingResource}/availability?date=${freshDate}`, {
    headers: { Authorization: `Bearer ${coord.token}` },
  });
  assert(coordAvail.status === 200, 'Department Coordinator can view availability');
  assert(coordAvail.data?.bookings?.length >= 2, 'Coordinator views updated real-time schedule');

  // Test J: Test as Admin
  console.log('\n--- Test J: Role Verification - ADMIN ---');
  const adminAvail = await request(`/resources/${sampleBookingResource}/availability?date=${freshDate}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  assert(adminAvail.status === 200, 'Admin can view availability for any resource');
  const adminResources = await request('/resources', {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  assert(adminResources.status === 200, 'Admin can view and manage all campus resources');

  // Summary
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

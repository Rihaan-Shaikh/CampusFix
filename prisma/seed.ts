import { PrismaClient, UserRole, IssueStatus, IssuePriority, AuditAction, EmailStatus } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const CAMPUS_LOCATIONS = [
  "Academic Block A • Lecture Hall 302",
  "Academic Block B • Seminar Room 104",
  "Central Library • 2nd Floor Quiet Study Area",
  "Central Library • Digital Resource Centre",
  "Science Block • Chemistry Lab Corridor",
  "Science Block • Physics Optics Lab 201",
  "Technology Tower • Embedded Systems Lab 210",
  "Technology Tower • Cloud Computing Center 405",
  "Hostel Block 4 • Ground Floor Washrooms",
  "Hostel Block 7 • 3rd Floor Common Room",
  "Student Activity Center • Food Court Exit",
  "Administration Wing • Admissions Registrar Hall",
  "BioTech Annex • Microbiology Cleanroom 03",
  "Mechanical Workshop • CNC Milling Bay",
];

const ISSUE_TEMPLATES = [
  {
    title: "Overhead HDMI projector flickering and dropping signal",
    category: "Classroom Equipment",
    priority: IssuePriority.HIGH,
    description: "BenQ projector loses HDMI sync every 2-3 minutes during lectures. Audio static audible across house speakers.",
  },
  {
    title: "Wi-Fi AP dropouts across reading zone",
    category: "Network",
    priority: IssuePriority.MEDIUM,
    description: "Access Point CF-LIB-AP04 frequently drops client handshakes. DNS requests timeout intermittently.",
  },
  {
    title: "Continuous pipe seepage pooling near chemical reagent cabinet",
    category: "Plumbing",
    priority: IssuePriority.HIGH,
    description: "Supply valve beneath emergency eyewash station has an active drip. Water has begun pooling near chemical storage cabinet C2.",
  },
  {
    title: "Loose power receptacle sparking on workbench #4",
    category: "Electrical",
    priority: IssuePriority.HIGH,
    description: "Dual 16A wall receptacle on workbench sparks whenever oscilloscope plug is inserted. Receptacle faceplate is loose.",
  },
  {
    title: "Damaged lecture chair armrests with exposed sharp brackets",
    category: "Furniture",
    priority: IssuePriority.LOW,
    description: "Row D chairs 7 and 8 have sheared armrest supports exposing sharp metal edges. Poses hazard to students.",
  },
  {
    title: "Fume hood exhaust ventilation fan velocity alarm triggering",
    category: "Laboratory",
    priority: IssuePriority.HIGH,
    description: "Hood exhaust unit #2 fails to draw adequate airflow. Digital velocity sensor reads 0.0 m/s with audible beeping.",
  },
  {
    title: "Overflowing recycling receptacles after club orientation",
    category: "Cleanliness",
    priority: IssuePriority.LOW,
    description: "Cardboard bins and plastic sorting units overflowing outside cafeteria doors. Requires urgent housekeeping clearance.",
  },
  {
    title: "Corridor fire exit push-bar latch alignment stuck",
    category: "Other",
    priority: IssuePriority.MEDIUM,
    description: "Push-bar panic hardware requires excessive force to unlatch. Door alignment has shifted causing the top bolt to catch.",
  },
  {
    title: "Server room rack B temperature alert exceeding 28C",
    category: "Electrical",
    priority: IssuePriority.HIGH,
    description: "Secondary ceiling split AC unit has frozen coils. Backup airflow is inadequate and thermal sensors are warning.",
  },
  {
    title: "Split AC water condensation dripping into lecture podium",
    category: "Plumbing",
    priority: IssuePriority.MEDIUM,
    description: "Drainage pipe on the rear wall AC unit is backed up. Condensation is dripping directly above instructor's AV desk.",
  },
  {
    title: "Broken window pane latch vibrating violently in wind",
    category: "Furniture",
    priority: IssuePriority.LOW,
    description: "South-facing casement window cannot be secured shut. The metal latch has snapped off completely.",
  },
  {
    title: "Intermittent power trip on circuit breaker 3B",
    category: "Electrical",
    priority: IssuePriority.HIGH,
    description: "Whenever all 30 desktop PCs in the lab boot simultaneously, breaker 3B in distribution board DB-4 trips.",
  },
];

async function main() {
  console.log("🌱 Starting CampusFix database seeding...");

  // 1. Clean existing records in reverse dependency order
  await prisma.emailDelivery.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.issueStatusHistory.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleared existing database tables.");

  // 2. Hash default development passwords
  const adminPasswordHash = await hashPassword("Admin@12345");
  const staffPasswordHash = await hashPassword("Staff@12345");
  const studentPasswordHash = await hashPassword("Student@12345");
  const guestPasswordHash = await hashPassword("Guest@12345");

  // 3. Create Seed Users
  // Helper to create user and matching Better Auth credential account
  async function createSeedUser(name: string, email: string, role: UserRole, passwordHash: string) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        role,
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id, // Better Auth credential provider requires accountId === user.id
        providerId: "credential",
        password: passwordHash,
      },
    });

    return user;
  }

  // 3. Create Seed Users
  const adminUser = await createSeedUser("Dr. Vikram Sethi", "admin@campusfix.local", UserRole.ADMIN, adminPasswordHash);
  const staffUser = await createSeedUser("Rajesh Sharma (Facilities Lead)", "staff@campusfix.local", UserRole.ADMIN, staffPasswordHash);
  const studentUser1 = await createSeedUser("Aarav Patel", "student@campusfix.local", UserRole.MEMBER, studentPasswordHash);
  const studentUser2 = await createSeedUser("Riya Verma", "riya.verma@campusfix.local", UserRole.MEMBER, studentPasswordHash);
  const studentUser3 = await createSeedUser("Karan Singh", "karan.singh@campusfix.local", UserRole.MEMBER, studentPasswordHash);
  const guestUser = await createSeedUser("Visitor Guest", "guest@campusfix.local", UserRole.GUEST, guestPasswordHash);

  console.log("👤 Created 6 seed users with Better Auth credential accounts.");

  // 4. Seed Issues, Status History, Audit Logs, and Email Records
  const reporters = [studentUser1, studentUser2, studentUser3];
  const assignees = [staffUser, adminUser];

  let issueCounter = 8900;

  for (let i = 0; i < ISSUE_TEMPLATES.length; i++) {
    const template = ISSUE_TEMPLATES[i];
    issueCounter += Math.floor(Math.random() * 8) + 1;
    const referenceCode = `CFX-${issueCounter}`;

    const reporter = reporters[i % reporters.length];
    const assignee = i % 2 === 0 ? assignees[i % assignees.length] : null;
    const location = CAMPUS_LOCATIONS[i % CAMPUS_LOCATIONS.length];

    // Status distribution: some Open, some In Progress, some Resolved
    let status: IssueStatus = IssueStatus.OPEN;
    if (i % 3 === 1) status = IssueStatus.IN_PROGRESS;
    if (i % 3 === 2) status = IssueStatus.RESOLVED;

    const reportedDaysAgo = (ISSUE_TEMPLATES.length - i) * 1.5;
    const createdAt = new Date(Date.now() - reportedDaysAgo * 24 * 60 * 60 * 1000);
    const resolvedAt = status === IssueStatus.RESOLVED ? new Date(createdAt.getTime() + 18 * 60 * 60 * 1000) : null;

    const issue = await prisma.issue.create({
      data: {
        referenceCode,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        status,
        location,
        createdById: reporter.id,
        assignedToId: assignee?.id || null,
        createdAt,
        updatedAt: resolvedAt || createdAt,
        resolvedAt,
      },
    });

    // Initial Status History (OPEN upon creation)
    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        previousStatus: null,
        newStatus: IssueStatus.OPEN,
        changedById: reporter.id,
        note: "Initial campus incident reported.",
        createdAt,
      },
    });

    // Audit Log for Issue Creation
    await prisma.auditLog.create({
      data: {
        actorUserId: reporter.id,
        action: AuditAction.ISSUE_CREATED,
        entityType: "Issue",
        entityId: issue.id,
        metadata: {
          referenceCode: issue.referenceCode,
          title: issue.title,
          category: issue.category,
          priority: issue.priority,
        },
        createdAt,
      },
    });

    // If IN_PROGRESS or RESOLVED, add subsequent history & audit
    if (status === IssueStatus.IN_PROGRESS || status === IssueStatus.RESOLVED) {
      const inProgressTime = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          previousStatus: IssueStatus.OPEN,
          newStatus: IssueStatus.IN_PROGRESS,
          changedById: staffUser.id,
          note: "Work order dispatched to campus electrical/maintenance contractors.",
          createdAt: inProgressTime,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: staffUser.id,
          action: AuditAction.STATUS_CHANGED,
          entityType: "Issue",
          entityId: issue.id,
          metadata: {
            from: "OPEN",
            to: "IN_PROGRESS",
            assignedTo: staffUser.name,
          },
          createdAt: inProgressTime,
        },
      });
    }

    if (status === IssueStatus.RESOLVED && resolvedAt) {
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          previousStatus: IssueStatus.IN_PROGRESS,
          newStatus: IssueStatus.RESOLVED,
          changedById: adminUser.id,
          note: "Remediation verified by facilities superintendent.",
          createdAt: resolvedAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: adminUser.id,
          action: AuditAction.STATUS_CHANGED,
          entityType: "Issue",
          entityId: issue.id,
          metadata: {
            from: "IN_PROGRESS",
            to: "RESOLVED",
            verifiedBy: adminUser.name,
          },
          createdAt: resolvedAt,
        },
      });
    }

    // Seed realistic transactional email delivery records
    await prisma.emailDelivery.create({
      data: {
        providerMessageId: `msg_${faker.string.alphanumeric(16)}`,
        recipient: reporter.email,
        subject: `[CampusFix] Issue Report Confirmation - ${issue.referenceCode}`,
        template: "issue-created-confirmation",
        status: EmailStatus.DELIVERED,
        eventType: "email.delivered",
        issueId: issue.id,
        userId: reporter.id,
        providerEventId: `evt_${faker.string.alphanumeric(20)}`,
        payload: {
          email_id: `msg_${faker.string.alphanumeric(16)}`,
          to: [reporter.email],
          from: "CampusFix Facilities <onboarding@resend.dev>",
          subject: `[CampusFix] Issue Report Confirmation - ${issue.referenceCode}`,
          created_at: createdAt.toISOString(),
        },
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  console.log(`📦 Seeded ${ISSUE_TEMPLATES.length} relational campus issues with audit logs, status histories, and email delivery receipts.`);
  console.log("\n=======================================================");
  console.log("Demo Credentials:");
  console.log("  Admin:   admin@campusfix.local   / Admin@12345");
  console.log("  Staff:   staff@campusfix.local   / Staff@12345");
  console.log("  Student: student@campusfix.local / Student@12345");
  console.log("  Guest:   guest@campusfix.local   / Guest@12345");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { db } from "@/lib/db/db";

export type StaffJobPosting = {
  id: number;
  institution_id: number | null;
  institution_name?: string | null;
  title: string;
  slug?: string | null;
  department: string;
  employment_type: string;
  experience_level: string;
  work_mode: string;
  location: string;
  salary_range: string;
  openings_count: number;
  deadline: string | null;
  description: string;
  requirements: string;
  benefits?: string | null;
  status: "Active" | "Draft" | "Closed" | "Archived";
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  applications_count?: number;
};

export type StaffJobApplication = {
  id: number;
  job_id: number;
  job_title?: string;
  job_department?: string;
  job_employment_type?: string;
  institution_id: number | null;
  institution_name?: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  resume_url: string | null;
  cover_letter: string | null;
  experience_years: string | null;
  current_organization: string | null;
  status: "Pending" | "Shortlisted" | "Interviewing" | "Rejected" | "Hired";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

let tablesEnsured = false;

export async function ensureJobTables() {
  if (tablesEnsured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff_job_postings (
        id SERIAL PRIMARY KEY,
        institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        department VARCHAR(150) NOT NULL,
        employment_type VARCHAR(50) DEFAULT 'Full-time',
        experience_level VARCHAR(100) DEFAULT '1-3 Years',
        work_mode VARCHAR(50) DEFAULT 'On-site',
        location VARCHAR(255) DEFAULT 'Campus',
        salary_range VARCHAR(100) DEFAULT 'Best in Industry',
        openings_count INTEGER DEFAULT 1,
        deadline DATE,
        description TEXT NOT NULL,
        requirements TEXT,
        benefits TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES staff_job_postings(id) ON DELETE CASCADE,
        institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
        applicant_name VARCHAR(255) NOT NULL,
        applicant_email VARCHAR(255) NOT NULL,
        applicant_phone VARCHAR(50),
        resume_url TEXT,
        cover_letter TEXT,
        experience_years VARCHAR(50),
        current_organization VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_staff_job_postings_inst ON staff_job_postings(institution_id);
      CREATE INDEX IF NOT EXISTS idx_staff_job_postings_status ON staff_job_postings(status);
      CREATE INDEX IF NOT EXISTS idx_staff_job_apps_job ON staff_job_applications(job_id);
    `);

    tablesEnsured = true;

    // Seed default jobs if table is empty
    const countRes = await db.query("SELECT COUNT(*)::int as count FROM staff_job_postings");
    if (countRes.rows[0].count === 0) {
      const defaultJobs = [
        // Jobs for Institution ID: 160 (Maa Sharda Institute PVT LTD)
        {
          institution_id: 160,
          title: "Senior Secondary Mathematics Faculty (IIT-JEE / Foundation)",
          department: "Academic & Teaching",
          employment_type: "Full-time",
          experience_level: "3-5 Years",
          work_mode: "On-site",
          location: "Varanasi Campus, Maa Sharda Institute",
          salary_range: "₹45,000 - ₹65,000 / month",
          openings_count: 2,
          deadline: "2026-10-31",
          description: "We are seeking an experienced, passionate Mathematics Faculty to teach Class 11th & 12th CBSE and JEE Main/Advanced batches. Responsibilities include classroom lectures, problem-solving doubt sessions, test creation, and mentoring students.",
          requirements: "• M.Sc. / B.Tech in Mathematics or related field\n• 3+ years of proven teaching experience for JEE / Board exams\n• Excellent communication skills in Hindi & English\n• Strong command over Calculus, Coordinate Geometry, and Algebra",
          benefits: "• Performance-based annual bonuses\n• Subsidized faculty housing & transportation\n• Paid professional development seminars\n• Health insurance coverage",
          status: "Active",
        },
        {
          institution_id: 160,
          title: "Computer Science & Artificial Intelligence Instructor",
          department: "Computer Science & IT",
          employment_type: "Full-time",
          experience_level: "2-4 Years",
          work_mode: "On-site",
          location: "Varanasi Campus, Maa Sharda Institute",
          salary_range: "₹38,000 - ₹55,000 / month",
          openings_count: 1,
          deadline: "2026-11-15",
          description: "Conduct practical labs and classroom sessions for Python programming, Web Development fundamentals, Data Structures, and basic AI/ML concepts for high school and diploma students.",
          requirements: "• MCA / B.Tech (CS/IT) / BCA\n• Hands-on coding proficiency in Python, SQL, HTML/CSS/JavaScript\n• Prior teaching or lab instructor experience is an advantage\n• Passion for mentoring students on real-world projects",
          benefits: "• Modern high-speed computing lab environment\n• Free campus meals & wellness benefits\n• Annual technology allowance",
          status: "Active",
        },
        {
          institution_id: 160,
          title: "Academic Counselor & Admissions Executive",
          department: "Admissions & Counselling",
          employment_type: "Full-time",
          experience_level: "1-3 Years",
          work_mode: "On-site",
          location: "Main Campus Reception",
          salary_range: "₹25,000 - ₹35,000 / month + Incentives",
          openings_count: 2,
          deadline: "2026-09-30",
          description: "Guide prospective students and parents through admission procedures, program offerings, entrance test guidelines, and fee payment schedules. Maintain CRM inquiries and followup logs.",
          requirements: "• Bachelor's Degree in any discipline\n• Strong interpersonal and persuasive communication skills\n• Basic proficiency with spreadsheets and CRM tools\n• Empathetic and customer-centric mindset",
          benefits: "• High incentive structure on successful enrollments\n• PF & Gratuity benefits\n• Structured career progression to Admissions Lead",
          status: "Active",
        },
        {
          institution_id: 160,
          title: "Physics Lab Demonstrator & Assistant Faculty",
          department: "Mathematics & Science",
          employment_type: "Full-time",
          experience_level: "1-3 Years",
          work_mode: "On-site",
          location: "Science Block Labs",
          salary_range: "₹28,000 - ₹38,000 / month",
          openings_count: 1,
          deadline: "2026-10-15",
          description: "Assist senior faculty during laboratory experiments, oversee apparatus safety, prepare practical exam materials, and conduct evening remedial classes for Class 9th & 10th students.",
          requirements: "• B.Sc. / M.Sc. in Physics\n• Familiarity with standard CBSE/State Board lab equipment & experiments\n• Good organizational and lab management skills",
          benefits: "• Campus staff quarters availability\n• Subsidized child education benefits",
          status: "Active",
        },

        // Platform Admin Global Vacancies (institution_id: NULL)
        {
          institution_id: null,
          title: "Senior Curriculum & Educational Content Architect",
          department: "Academic & Teaching",
          employment_type: "Full-time",
          experience_level: "5+ Years",
          work_mode: "Hybrid",
          location: "EduBird Corporate HQ / Remote",
          salary_range: "₹80,000 - ₹1,20,000 / month",
          openings_count: 2,
          deadline: "2026-11-30",
          description: "Lead the design of unified master curricula, question banks, adaptive practice exams, and multi-tier syllabus taxonomies for affiliated institutions nationwide on the EduBird ecosystem.",
          requirements: "• Master's / Ph.D. in Education or Core STEM discipline\n• 5+ years experience in curriculum development for competitive exams or central boards\n• Strong pedagogy and digital e-learning content design expertise",
          benefits: "• Comprehensive family health & dental insurance\n• Flexible work-from-home policy\n• Stock options (ESOPs) & performance incentives\n• Laptop & home-office setup stipend",
          status: "Active",
        },
        {
          institution_id: null,
          title: "Full Stack Software Engineer (Next.js & PostgreSQL)",
          department: "Computer Science & IT",
          employment_type: "Full-time",
          experience_level: "3-5 Years",
          work_mode: "Remote",
          location: "Pan India / Remote",
          salary_range: "₹70,000 - ₹1,10,000 / month",
          openings_count: 3,
          deadline: "2026-12-31",
          description: "Build robust multi-tenant features, high-concurrency examination systems, real-time analytics dashboards, and interactive learning portals across web and mobile surfaces for EduBird.",
          requirements: "• Strong expertise in TypeScript, React, Next.js App Router, Tailwind CSS\n• Proficient in PostgreSQL schema modeling, indexing, and complex queries\n• Experience with RESTful APIs, caching, and cloud infrastructure\n• Passion for clean, resilient, and performant code",
          benefits: "• 100% remote work flexibility\n• Unlimited paid time off (PTO)\n• Annual learning and conference budget ($1,000/yr)\n• Premium health insurance",
          status: "Active",
        },
        {
          institution_id: null,
          title: "Regional Institutional Partnerships Manager",
          department: "Administration & HR",
          employment_type: "Full-time",
          experience_level: "4-7 Years",
          work_mode: "On-site",
          location: "North Region (UP / Bihar / MP)",
          salary_range: "₹60,000 - ₹90,000 / month + Target Bonus",
          openings_count: 2,
          deadline: "2026-10-31",
          description: "Drive institutional onboarding, school/college partnerships, digital transformation consultations, and enterprise ERP deployments across educational institutes.",
          requirements: "• MBA / PGDM in Marketing or Business Development\n• 4+ years B2B sales or institutional partnership experience in EdTech/Education\n• Excellent presentation, contract negotiation, and relationship management skills",
          benefits: "• Travel allowance & company car lease support\n• Industry-leading quarterly incentive structure\n• Executive medical checkup packages",
          status: "Active",
        },
      ];

      for (const j of defaultJobs) {
        const slug = j.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        await db.query(
          `INSERT INTO staff_job_postings (
            institution_id, title, slug, department, employment_type,
            experience_level, work_mode, location, salary_range, openings_count,
            deadline, description, requirements, benefits, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            j.institution_id,
            j.title,
            slug,
            j.department,
            j.employment_type,
            j.experience_level,
            j.work_mode,
            j.location,
            j.salary_range,
            j.openings_count,
            j.deadline,
            j.description,
            j.requirements,
            j.benefits,
            j.status,
          ]
        );
      }
    }
  } catch (err) {
    console.error("Failed to ensure job tables:", err);
  }
}

export async function getJobsList(params: {
  search?: string;
  status?: string;
  department?: string;
  employmentType?: string;
  institutionId?: number | null;
  page?: number;
  limit?: number;
}) {
  await ensureJobTables();

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["1=1"];
  const values: any[] = [];

  if (params.institutionId) {
    values.push(params.institutionId);
    conditions.push(`(j.institution_id = $${values.length} OR j.institution_id IS NULL)`);
  }

  if (params.status && params.status !== "all") {
    values.push(params.status);
    conditions.push(`j.status ILIKE $${values.length}`);
  }

  if (params.department && params.department !== "all") {
    values.push(params.department);
    conditions.push(`j.department ILIKE $${values.length}`);
  }

  if (params.employmentType && params.employmentType !== "all") {
    values.push(params.employmentType);
    conditions.push(`j.employment_type ILIKE $${values.length}`);
  }

  if (params.search && params.search.trim()) {
    values.push(`%${params.search.trim()}%`);
    const idx = values.length;
    conditions.push(`(j.title ILIKE $${idx} OR j.department ILIKE $${idx} OR j.location ILIKE $${idx} OR i.name ILIKE $${idx})`);
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM staff_job_postings j
    LEFT JOIN institution_profiles i ON i.id = j.institution_id
    WHERE ${whereClause}
  `;
  const countRes = await db.query(countQuery, values);
  const total = Number(countRes.rows[0]?.total || 0);

  const queryValues = [...values, limit, offset];
  const listQuery = `
    SELECT 
      j.*,
      i.name AS institution_name,
      u.full_name AS created_by_name,
      COALESCE(app_counts.total_apps, 0)::int AS applications_count
    FROM staff_job_postings j
    LEFT JOIN institution_profiles i ON i.id = j.institution_id
    LEFT JOIN users u ON u.id = j.created_by
    LEFT JOIN (
      SELECT job_id, COUNT(*)::int AS total_apps
      FROM staff_job_applications
      GROUP BY job_id
    ) app_counts ON app_counts.job_id = j.id
    WHERE ${whereClause}
    ORDER BY j.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const listRes = await db.query(listQuery, queryValues);
  return {
    data: listRes.rows as StaffJobPosting[],
    total,
    page,
    pageCount: Math.ceil(total / limit),
  };
}

export async function getJobById(id: number) {
  await ensureJobTables();

  const query = `
    SELECT 
      j.*,
      i.name AS institution_name,
      u.full_name AS created_by_name,
      COALESCE(app_counts.total_apps, 0)::int AS applications_count
    FROM staff_job_postings j
    LEFT JOIN institution_profiles i ON i.id = j.institution_id
    LEFT JOIN users u ON u.id = j.created_by
    LEFT JOIN (
      SELECT job_id, COUNT(*)::int AS total_apps
      FROM staff_job_applications
      GROUP BY job_id
    ) app_counts ON app_counts.job_id = j.id
    WHERE j.id = $1
  `;

  const res = await db.query(query, [id]);
  return (res.rows[0] as StaffJobPosting) || null;
}

export async function createJobPosting(data: {
  institution_id?: number | null;
  title: string;
  department: string;
  employment_type?: string;
  experience_level?: string;
  work_mode?: string;
  location?: string;
  salary_range?: string;
  openings_count?: number;
  deadline?: string | null;
  description: string;
  requirements?: string;
  benefits?: string;
  status?: string;
  created_by?: number | null;
}) {
  await ensureJobTables();

  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const query = `
    INSERT INTO staff_job_postings (
      institution_id, title, slug, department, employment_type,
      experience_level, work_mode, location, salary_range, openings_count,
      deadline, description, requirements, benefits, status, created_by,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *;
  `;

  const values = [
    data.institution_id || null,
    data.title.trim(),
    slug,
    data.department.trim(),
    data.employment_type || "Full-time",
    data.experience_level || "1-3 Years",
    data.work_mode || "On-site",
    data.location || "Campus",
    data.salary_range || "Best in Industry",
    data.openings_count || 1,
    data.deadline ? new Date(data.deadline) : null,
    data.description.trim(),
    data.requirements?.trim() || "",
    data.benefits?.trim() || "",
    data.status || "Active",
    data.created_by || null,
  ];

  const res = await db.query(query, values);
  return res.rows[0] as StaffJobPosting;
}

export async function updateJobPosting(
  id: number,
  data: Partial<{
    institution_id: number | null;
    title: string;
    department: string;
    employment_type: string;
    experience_level: string;
    work_mode: string;
    location: string;
    salary_range: string;
    openings_count: number;
    deadline: string | null;
    description: string;
    requirements: string;
    benefits: string;
    status: string;
  }>
) {
  await ensureJobTables();

  const fields: string[] = [];
  const values: any[] = [];

  const addField = (col: string, val: any) => {
    values.push(val);
    fields.push(`${col} = $${values.length}`);
  };

  if (data.title !== undefined) {
    addField("title", data.title.trim());
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    addField("slug", slug);
  }
  if (data.institution_id !== undefined) addField("institution_id", data.institution_id);
  if (data.department !== undefined) addField("department", data.department.trim());
  if (data.employment_type !== undefined) addField("employment_type", data.employment_type);
  if (data.experience_level !== undefined) addField("experience_level", data.experience_level);
  if (data.work_mode !== undefined) addField("work_mode", data.work_mode);
  if (data.location !== undefined) addField("location", data.location);
  if (data.salary_range !== undefined) addField("salary_range", data.salary_range);
  if (data.openings_count !== undefined) addField("openings_count", data.openings_count);
  if (data.deadline !== undefined) addField("deadline", data.deadline ? new Date(data.deadline) : null);
  if (data.description !== undefined) addField("description", data.description.trim());
  if (data.requirements !== undefined) addField("requirements", data.requirements.trim());
  if (data.benefits !== undefined) addField("benefits", data.benefits.trim());
  if (data.status !== undefined) addField("status", data.status);

  if (fields.length === 0) return getJobById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE staff_job_postings
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING *;
  `;

  const res = await db.query(query, values);
  return (res.rows[0] as StaffJobPosting) || null;
}

export async function deleteJobPosting(id: number) {
  await ensureJobTables();
  await db.query("DELETE FROM staff_job_postings WHERE id = $1", [id]);
  return true;
}

export async function getJobApplications(jobId: number) {
  await ensureJobTables();

  const query = `
    SELECT 
      a.*,
      j.title AS job_title,
      i.name AS institution_name
    FROM staff_job_applications a
    JOIN staff_job_postings j ON j.id = a.job_id
    LEFT JOIN institution_profiles i ON i.id = a.institution_id
    WHERE a.job_id = $1
    ORDER BY a.created_at DESC
  `;

  const res = await db.query(query, [jobId]);
  return res.rows as StaffJobApplication[];
}

export async function createJobApplication(data: {
  job_id: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  resume_url?: string;
  cover_letter?: string;
  experience_years?: string;
  current_organization?: string;
}) {
  await ensureJobTables();

  const job = await getJobById(data.job_id);
  if (!job) throw new Error("Job vacancy not found");

  const query = `
    INSERT INTO staff_job_applications (
      job_id, institution_id, applicant_name, applicant_email, applicant_phone,
      resume_url, cover_letter, experience_years, current_organization,
      status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      'Pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *;
  `;

  const values = [
    data.job_id,
    job.institution_id || null,
    data.applicant_name.trim(),
    data.applicant_email.trim().toLowerCase(),
    data.applicant_phone?.trim() || null,
    data.resume_url?.trim() || null,
    data.cover_letter?.trim() || null,
    data.experience_years?.trim() || null,
    data.current_organization?.trim() || null,
  ];

  const res = await db.query(query, values);
  return res.rows[0] as StaffJobApplication;
}

export async function getAllJobApplications(params: {
  search?: string;
  status?: string;
  jobId?: number | null;
  institutionId?: number | null;
  page?: number;
  limit?: number;
}) {
  await ensureJobTables();

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["1=1"];
  const values: any[] = [];

  if (params.institutionId) {
    values.push(params.institutionId);
    conditions.push(`(a.institution_id = $${values.length} OR j.institution_id = $${values.length})`);
  }

  if (params.jobId) {
    values.push(params.jobId);
    conditions.push(`a.job_id = $${values.length}`);
  }

  if (params.status && params.status !== "all") {
    values.push(params.status);
    conditions.push(`a.status ILIKE $${values.length}`);
  }

  if (params.search && params.search.trim()) {
    values.push(`%${params.search.trim()}%`);
    const idx = values.length;
    conditions.push(`(a.applicant_name ILIKE $${idx} OR a.applicant_email ILIKE $${idx} OR a.applicant_phone ILIKE $${idx} OR j.title ILIKE $${idx} OR i.name ILIKE $${idx})`);
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `
    SELECT 
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE a.status = 'Pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE a.status = 'Shortlisted')::int AS shortlisted_count,
      COUNT(*) FILTER (WHERE a.status = 'Interviewing')::int AS interviewing_count,
      COUNT(*) FILTER (WHERE a.status = 'Hired')::int AS hired_count,
      COUNT(*) FILTER (WHERE a.status = 'Rejected')::int AS rejected_count
    FROM staff_job_applications a
    JOIN staff_job_postings j ON j.id = a.job_id
    LEFT JOIN institution_profiles i ON i.id = a.institution_id
    WHERE ${whereClause}
  `;

  const countRes = await db.query(countQuery, values);
  const total = Number(countRes.rows[0]?.total || 0);

  const queryValues = [...values, limit, offset];
  const listQuery = `
    SELECT 
      a.*,
      j.title AS job_title,
      j.department AS job_department,
      j.employment_type AS job_employment_type,
      COALESCE(i.name, 'EduBird Global / Platform') AS institution_name
    FROM staff_job_applications a
    JOIN staff_job_postings j ON j.id = a.job_id
    LEFT JOIN institution_profiles i ON i.id = a.institution_id
    WHERE ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const listRes = await db.query(listQuery, queryValues);
  return {
    data: listRes.rows as StaffJobApplication[],
    total,
    page,
    pageCount: Math.ceil(total / limit),
    stats: {
      totalApplicants: total,
      pendingCount: Number(countRes.rows[0]?.pending_count || 0),
      shortlistedCount: Number(countRes.rows[0]?.shortlisted_count || 0),
      interviewingCount: Number(countRes.rows[0]?.interviewing_count || 0),
      hiredCount: Number(countRes.rows[0]?.hired_count || 0),
      rejectedCount: Number(countRes.rows[0]?.rejected_count || 0),
    },
  };
}

export async function getJobApplicationById(id: number) {
  await ensureJobTables();

  const query = `
    SELECT 
      a.*,
      j.title AS job_title,
      j.department AS job_department,
      j.employment_type AS job_employment_type,
      COALESCE(i.name, 'EduBird Global / Platform') AS institution_name
    FROM staff_job_applications a
    JOIN staff_job_postings j ON j.id = a.job_id
    LEFT JOIN institution_profiles i ON i.id = a.institution_id
    WHERE a.id = $1
  `;

  const res = await db.query(query, [id]);
  return (res.rows[0] as StaffJobApplication) || null;
}

export async function updateJobApplicationStatus(
  id: number,
  data: {
    status?: string;
    notes?: string;
  }
) {
  await ensureJobTables();

  const fields: string[] = [];
  const values: any[] = [];

  if (data.status) {
    values.push(data.status);
    fields.push(`status = $${values.length}`);
  }
  if (data.notes !== undefined) {
    values.push(data.notes);
    fields.push(`notes = $${values.length}`);
  }

  if (fields.length === 0) return getJobApplicationById(id);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE staff_job_applications
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING *;
  `;

  const res = await db.query(query, values);
  return (res.rows[0] as StaffJobApplication) || null;
}

export async function deleteJobApplication(id: number) {
  await ensureJobTables();
  await db.query("DELETE FROM staff_job_applications WHERE id = $1", [id]);
  return true;
}

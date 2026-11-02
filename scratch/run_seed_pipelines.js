const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS operations_project_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      icon VARCHAR(100) DEFAULT 'FolderKanban',
      status VARCHAR(20) DEFAULT 'active',
      institution_id INTEGER,
      created_by INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_project_types_name_inst 
    ON operations_project_types (LOWER(TRIM(name)), COALESCE(institution_id, 0));
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS operations_project_pipelines (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      project_type_id INTEGER REFERENCES operations_project_types(id) ON DELETE CASCADE,
      description TEXT,
      status VARCHAR(20) DEFAULT 'active',
      is_default BOOLEAN DEFAULT FALSE,
      phases JSONB DEFAULT '[]'::jsonb,
      institution_id INTEGER,
      created_by INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_type_id INTEGER;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_type_name VARCHAR(255);
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS pipeline_id INTEGER;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS pipeline_name VARCHAR(255);
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS pipeline_phases JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS current_phase_index INTEGER DEFAULT 0;
  `);

  const existingPt = await pool.query("SELECT COUNT(*)::int as count FROM operations_project_types");
  console.log('Existing project types count:', existingPt.rows[0].count);

  if (existingPt.rows[0].count === 0) {
    const initialProjectTypes = [
      {
        name: "Website Development",
        description: "Custom corporate websites, e-commerce stores, web portals, and landing pages.",
        icon: "Globe",
        pipelineName: "Standard Website Development",
        phases: [
          { id: "p1", name: "Requirement Gathering", description: "Detailed scoping, client interviews, and technical discovery.", order: 1, estimated_duration_hours: 8, assigned_role: "Business Analyst", is_mandatory: true, requires_approval: false },
          { id: "p2", name: "Documentation", description: "SRS, functional specifications, and architectural documentation.", order: 2, estimated_duration_hours: 6, assigned_role: "Project Manager", is_mandatory: true, requires_approval: false },
          { id: "p3", name: "UI/UX Design", description: "Figma wireframes, design system, and responsive component mockups.", order: 3, estimated_duration_hours: 16, assigned_role: "UI/UX Designer", is_mandatory: true, requires_approval: true },
          { id: "p4", name: "Client Approval", description: "Formal presentation and client sign-off on design direction.", order: 4, estimated_duration_hours: 4, assigned_role: "Account Manager", is_mandatory: true, requires_approval: true },
          { id: "p5", name: "Frontend Development", description: "Next.js / React component implementation, animations, and responsive styling.", order: 5, estimated_duration_hours: 24, assigned_role: "Frontend Developer", is_mandatory: true, requires_approval: false },
          { id: "p6", name: "Backend Development", description: "API endpoints, database models, auth flows, and core business logic.", order: 6, estimated_duration_hours: 24, assigned_role: "Backend Developer", is_mandatory: true, requires_approval: false },
          { id: "p7", name: "API Integration", description: "Frontend-to-backend communication, payment gateways, and third-party webhooks.", order: 7, estimated_duration_hours: 12, assigned_role: "Full Stack Developer", is_mandatory: true, requires_approval: false },
          { id: "p8", name: "Testing", description: "Manual QA, cross-browser compatibility, responsive tests, and bug resolution.", order: 8, estimated_duration_hours: 8, assigned_role: "QA Engineer", is_mandatory: true, requires_approval: false },
          { id: "p9", name: "Client Demo", description: "Walkthrough of staging deployment with client stakeholders.", order: 9, estimated_duration_hours: 4, assigned_role: "Project Manager", is_mandatory: true, requires_approval: true },
          { id: "p10", name: "Revisions", description: "Addressing feedback items and adjustments requested during demo.", order: 10, estimated_duration_hours: 8, assigned_role: "Full Stack Developer", is_mandatory: false, requires_approval: false },
          { id: "p11", name: "Deployment", description: "Domain configuration, SSL certificates, production deployment, and monitoring.", order: 11, estimated_duration_hours: 4, assigned_role: "DevOps Engineer", is_mandatory: true, requires_approval: false },
          { id: "p12", name: "Completed", description: "Project handover, documentation delivery, and formal client sign-off.", order: 12, estimated_duration_hours: 2, assigned_role: "Project Manager", is_mandatory: true, requires_approval: true },
        ],
      },
      {
        name: "Application Development",
        description: "Native and cross-platform mobile application development for Android and iOS.",
        icon: "Smartphone",
        pipelineName: "Cross-Platform Mobile App Pipeline",
        phases: [
          { id: "p1", name: "Architecture & Wireframing", description: "App architecture, database schema, and navigation user flow.", order: 1, estimated_duration_hours: 12, is_mandatory: true },
          { id: "p2", name: "UI/UX Prototype", description: "Interactive mobile prototypes and design sign-off.", order: 2, estimated_duration_hours: 16, is_mandatory: true, requires_approval: true },
          { id: "p3", name: "App Core Development", description: "Flutter / React Native screen development and state management.", order: 3, estimated_duration_hours: 40, is_mandatory: true },
          { id: "p4", name: "API & Auth Integration", description: "Backend REST/GraphQL APIs, push notifications, and auth tokens.", order: 4, estimated_duration_hours: 16, is_mandatory: true },
          { id: "p5", name: "Device Testing & QA", description: "Physical device testing, memory profiling, and offline testing.", order: 5, estimated_duration_hours: 12, is_mandatory: true },
          { id: "p6", name: "App Store & Play Store Submission", description: "Release builds, privacy declarations, and store publishing.", order: 6, estimated_duration_hours: 6, is_mandatory: true, requires_approval: true },
        ],
      },
      {
        name: "UI/UX & Graphic Designing",
        description: "Brand identity, graphic assets, product design, wireframing, and user interfaces.",
        icon: "Palette",
        pipelineName: "UI/UX & Brand Design Pipeline",
        phases: [
          { id: "p1", name: "Design Brief & Research", description: "Brand moodboard, target audience research, and design guidelines.", order: 1, estimated_duration_hours: 4, is_mandatory: true },
          { id: "p2", name: "Low-Fidelity Wireframes", description: "Information architecture and structural layout concepts.", order: 2, estimated_duration_hours: 8, is_mandatory: true },
          { id: "p3", name: "High-Fidelity Mockups", description: "Polished visual assets, typography, and color palette implementation.", order: 3, estimated_duration_hours: 16, is_mandatory: true, requires_approval: true },
          { id: "p4", name: "Interactive Prototyping", description: "Clickable Figma prototype simulating real user interactions.", order: 4, estimated_duration_hours: 8, is_mandatory: true },
          { id: "p5", name: "Asset Export & Handover", description: "Exporting production-ready vector SVG, PNG, and font bundles.", order: 5, estimated_duration_hours: 4, is_mandatory: true, requires_approval: true },
        ],
      },
      {
        name: "Video Editing & Animation",
        description: "Video post-production, motion graphics, commercial reels, and promotional animation.",
        icon: "Video",
        pipelineName: "Video Production Pipeline",
        phases: [
          { id: "p1", name: "Raw Footage Ingestion & Script Review", description: "Reviewing raw assets, storyboard alignment, and asset cataloging.", order: 1, estimated_duration_hours: 4, is_mandatory: true },
          { id: "p2", name: "Rough Cut & Pacing", description: "Timeline assembly, scene sequencing, and narrative flow.", order: 2, estimated_duration_hours: 8, is_mandatory: true },
          { id: "p3", name: "Sound Design & Color Grading", description: "Audio normalization, sound effects, BGM, and LUT color grading.", order: 3, estimated_duration_hours: 8, is_mandatory: true },
          { id: "p4", name: "Motion Graphics & Titles", description: "Animated lower thirds, typography, and transition effects.", order: 4, estimated_duration_hours: 6, is_mandatory: false },
          { id: "p5", name: "Client Review & Final Render", description: "Review pass, timestamped revisions, and 4K master rendering.", order: 5, estimated_duration_hours: 4, is_mandatory: true, requires_approval: true },
        ],
      },
      {
        name: "Data Scraping",
        description: "Automated web scraping, data extraction, ETL pipelines, and dataset structuring.",
        icon: "Database",
        pipelineName: "Web Scraping & Extraction Pipeline",
        phases: [
          { id: "p1", name: "Target Site Analysis & Anti-Bot Check", description: "Inspect DOM structures, network requests, rate limits, and proxy requirements.", order: 1, estimated_duration_hours: 4, is_mandatory: true },
          { id: "p2", name: "Scraper Scripting & Extraction", description: "Developing robust crawler with error retry, concurrency, and pagination.", order: 2, estimated_duration_hours: 12, is_mandatory: true },
          { id: "p3", name: "Data Cleaning & Validation", description: "Deduplication, normalization, regex parsing, and schema validation.", order: 3, estimated_duration_hours: 6, is_mandatory: true },
          { id: "p4", name: "Output Delivery", description: "Exporting verified datasets to PostgreSQL, CSV, Excel, or JSON format.", order: 4, estimated_duration_hours: 2, is_mandatory: true, requires_approval: true },
        ],
      },
      {
        name: "SEO & Digital Marketing",
        description: "Search engine optimization, keyword strategy, backlink building, and digital campaigns.",
        icon: "TrendingUp",
        pipelineName: "SEO Audit & Growth Pipeline",
        phases: [
          { id: "p1", name: "Technical SEO Audit", description: "Crawl analysis, Core Web Vitals, robots.txt, and sitemap validation.", order: 1, estimated_duration_hours: 6, is_mandatory: true },
          { id: "p2", name: "Keyword & Competitor Gap Analysis", description: "High-intent keyword discovery and SERP competitor ranking analysis.", order: 2, estimated_duration_hours: 6, is_mandatory: true },
          { id: "p3", name: "On-Page Optimization", description: "Meta tags, header hierarchy, internal linking, and semantic schema markup.", order: 3, estimated_duration_hours: 12, is_mandatory: true },
          { id: "p4", name: "Content Strategy & Backlinking", description: "Publishing pillar content and executing authoritative link outreach.", order: 4, estimated_duration_hours: 16, is_mandatory: true },
          { id: "p5", name: "Performance & Ranking Report", description: "Monthly organic search traffic report and conversion metrics review.", order: 5, estimated_duration_hours: 4, is_mandatory: true, requires_approval: true },
        ],
      },
      {
        name: "Custom Project",
        description: "Flexible multi-disciplinary initiatives, custom milestones, and general client deliverables.",
        icon: "FolderKanban",
        pipelineName: "General Milestone Pipeline",
        phases: [
          { id: "p1", name: "Project Kickoff", description: "Initial stakeholder alignment and scope confirmation.", order: 1, estimated_duration_hours: 4, is_mandatory: true },
          { id: "p2", name: "Milestone Execution", description: "Core delivery and active sprint execution.", order: 2, estimated_duration_hours: 20, is_mandatory: true },
          { id: "p3", name: "Quality Assurance & Review", description: "Internal testing and verification against requirements.", order: 3, estimated_duration_hours: 6, is_mandatory: true },
          { id: "p4", name: "Handover & Sign-Off", description: "Delivery of all assets and formal project sign-off.", order: 4, estimated_duration_hours: 4, is_mandatory: true, requires_approval: true },
        ],
      },
    ];

    for (const pt of initialProjectTypes) {
      const ptRes = await pool.query(
        "INSERT INTO operations_project_types (name, description, icon, status) VALUES ($1, $2, $3, 'active') RETURNING id",
        [pt.name, pt.description, pt.icon]
      );
      const ptId = ptRes.rows[0].id;
      await pool.query(
        "INSERT INTO operations_project_pipelines (name, project_type_id, description, status, is_default, phases) VALUES ($1, $2, $3, 'active', true, $4::jsonb)",
        [pt.pipelineName, ptId, 'Default pipeline for ' + pt.name, JSON.stringify(pt.phases)]
      );
    }
    console.log('Successfully seeded initial 7 project types and pipelines!');
  }

  const types = await pool.query("SELECT id, name, status FROM operations_project_types");
  console.log('Project types in DB count:', types.rows.length);
  const pipes = await pool.query("SELECT id, name, project_type_id, is_default, jsonb_array_length(phases) as phase_count FROM operations_project_pipelines");
  console.log('Project pipelines in DB count:', pipes.rows.length);

  await pool.end();
}
run();


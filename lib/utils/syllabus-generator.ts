export interface LessonNode {
  id: string;
  lesson_number?: string | number;
  title: string;
  description?: string;
  duration_mins?: number | string;
}

export interface ChapterNode {
  id: string;
  chapter_number?: string | number;
  title: string;
  description?: string;
  lessons: LessonNode[];
}

export interface UnitNode {
  id: string;
  unit_number?: string | number;
  title: string;
  description?: string;
  chapters: ChapterNode[];
}

export function generateDefaultSyllabusForSubject(
  subjectId: string | number,
  subjectName: string
): UnitNode[] {
  const name = (subjectName || "Subject").trim();
  const lower = name.toLowerCase();
  const sId = String(subjectId || "sub");

  // 1. Hindi
  if (
    lower.includes("hindi") ||
    lower.includes("हिंदी") ||
    lower.includes("हिन्दी")
  ) {
    return [
      {
        id: `unit-${sId}-1`,
        unit_number: 1,
        title: "गद्य खण्ड (Prose & Literature)",
        description: "प्रसिद्ध साहित्यकारों की रचनाएं, कहानियां एवं निबंध",
        chapters: [
          {
            id: `ch-${sId}-1`,
            chapter_number: 1,
            title: "पाठ एवं निबंध अध्ययन",
            description: "साहित्यिक पाठों का अध्ययन एवं भावार्थ",
            lessons: [
              { id: `les-${sId}-1-1`, title: "पाठ का सारांश एवं केन्द्रीय भाव", duration_mins: 45 },
              { id: `les-${sId}-1-2`, title: "गद्यांश व्याख्या एवं कठिन शब्दार्थ", duration_mins: 50 },
              { id: `les-${sId}-1-3`, title: "प्रश्नोत्तर एवं अभ्यास कार्य", duration_mins: 40 },
            ],
          },
          {
            id: `ch-${sId}-2`,
            chapter_number: 2,
            title: "कथा एवं एकांकी",
            description: "चरित्र चित्रण एवं कथा प्रसंग",
            lessons: [
              { id: `les-${sId}-2-1`, title: "पात्र परिचय एवं कथानक विश्लेषण", duration_mins: 45 },
              { id: `les-${sId}-2-2`, title: "प्रमुख संवाद एवं तात्त्विक समीक्षा", duration_mins: 50 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-2`,
        unit_number: 2,
        title: "काव्य खण्ड (Poetry & Verses)",
        description: "प्राचीन एवं आधुनिक कवियों की रचनाएं",
        chapters: [
          {
            id: `ch-${sId}-3`,
            chapter_number: 3,
            title: "पद्य एवं दोहावली",
            description: "काव्य पाठ एवं भाव सौंदर्य",
            lessons: [
              { id: `les-${sId}-3-1`, title: "पद्यांश सप्रसंग व्याख्या", duration_mins: 50 },
              { id: `les-${sId}-3-2`, title: "रस, छंद एवं अलंकार सौंदर्य", duration_mins: 45 },
              { id: `les-${sId}-3-3`, title: "काव्यगत प्रश्न एवं अभ्यास", duration_mins: 40 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-3`,
        unit_number: 3,
        title: "हिन्दी व्याकरण एवं व्यावहारिक रचना",
        description: "व्याकरणिक नियम एवं लेखन कौशल",
        chapters: [
          {
            id: `ch-${sId}-4`,
            chapter_number: 4,
            title: "व्यावहारिक व्याकरण",
            description: "संधि, समास, उपसर्ग, प्रत्यय एवं मुहावरे",
            lessons: [
              { id: `les-${sId}-4-1`, title: "संधि एवं समास के भेद व उदाहरण", duration_mins: 45 },
              { id: `les-${sId}-4-2`, title: "उपसर्ग, प्रत्यय एवं शब्द शुद्धि", duration_mins: 40 },
              { id: `les-${sId}-4-3`, title: "मुहावरे एवं लोकोक्तियाँ", duration_mins: 35 },
            ],
          },
          {
            id: `ch-${sId}-5`,
            chapter_number: 5,
            title: "रचनात्मक लेखन एवं अपठित बोध",
            description: "निबंध, पत्र एवं संवाद लेखन",
            lessons: [
              { id: `les-${sId}-5-1`, title: "अपठित गद्यांश एवं पद्यांश बोध", duration_mins: 40 },
              { id: `les-${sId}-5-2`, title: "औपचारिक एवं अनौपचारिक पत्र लेखन", duration_mins: 45 },
              { id: `les-${sId}-5-3`, title: "समसामयिक विषयों पर निबंध लेखन", duration_mins: 55 },
            ],
          },
        ],
      },
    ];
  }

  // 2. English / Language Arts
  if (
    lower.includes("english") ||
    lower.includes("literature") ||
    lower.includes("grammar") ||
    lower.includes("language")
  ) {
    return [
      {
        id: `unit-${sId}-1`,
        unit_number: 1,
        title: "Unit 1: Prose & Literary Texts",
        description: "In-depth comprehension, critical reading, and thematic analysis",
        chapters: [
          {
            id: `ch-${sId}-1`,
            chapter_number: 1,
            title: "Key Stories & Narrative Essays",
            description: "Plot structures, central themes, and character development",
            lessons: [
              { id: `les-${sId}-1-1`, title: "Text Overview & Background Context", duration_mins: 45 },
              { id: `les-${sId}-1-2`, title: "Detailed Analysis & Vocabulary in Context", duration_mins: 50 },
              { id: `les-${sId}-1-3`, title: "Comprehension Questions & Discussion", duration_mins: 40 },
            ],
          },
          {
            id: `ch-${sId}-2`,
            chapter_number: 2,
            title: "Poetry & Literary Devices",
            description: "Metaphor, imagery, rhythm, and poetic interpretation",
            lessons: [
              { id: `les-${sId}-2-1`, title: "Poetic Forms & Verse Breakdown", duration_mins: 45 },
              { id: `les-${sId}-2-2`, title: "Stanza-by-Stanza Explanation & Themes", duration_mins: 50 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-2`,
        unit_number: 2,
        title: "Unit 2: Applied Grammar & Vocabulary",
        description: "Grammatical rules, syntax, and sentence transformations",
        chapters: [
          {
            id: `ch-${sId}-3`,
            chapter_number: 3,
            title: "Core Grammar Modules",
            description: "Tenses, voice, clauses, and subject-verb agreement",
            lessons: [
              { id: `les-${sId}-3-1`, title: "Tenses, Modals & Active/Passive Voice", duration_mins: 45 },
              { id: `les-${sId}-3-2`, title: "Direct and Indirect Speech & Clauses", duration_mins: 50 },
              { id: `les-${sId}-3-3`, title: "Common Error Spotting & Sentence Editing", duration_mins: 40 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-3`,
        unit_number: 3,
        title: "Unit 3: Writing Skills & Composition",
        description: "Formal and informal communications, essays, and reports",
        chapters: [
          {
            id: `ch-${sId}-4`,
            chapter_number: 4,
            title: "Composition & Unseen Comprehension",
            description: "Structured writing formats and unseen passage interpretation",
            lessons: [
              { id: `les-${sId}-4-1`, title: "Reading Comprehension Strategies", duration_mins: 45 },
              { id: `les-${sId}-4-2`, title: "Formal Letters, Notices & Email Drafting", duration_mins: 50 },
              { id: `les-${sId}-4-3`, title: "Descriptive & Argumentative Essays", duration_mins: 55 },
            ],
          },
        ],
      },
    ];
  }

  // 3. Mathematics / Statistics
  if (
    lower.includes("math") ||
    lower.includes("algebra") ||
    lower.includes("calculus") ||
    lower.includes("geometry") ||
    lower.includes("statistic") ||
    lower.includes("ganit") ||
    lower.includes("गणित")
  ) {
    return [
      {
        id: `unit-${sId}-1`,
        unit_number: 1,
        title: `Unit 1: Foundations of ${name}`,
        description: "Core algebraic formulations, number systems, and basic identities",
        chapters: [
          {
            id: `ch-${sId}-1`,
            chapter_number: 1,
            title: "Fundamental Concepts & Number Properties",
            description: "Key definitions, standard equations, and operations",
            lessons: [
              { id: `les-${sId}-1-1`, title: "Introduction & Basic Principles", duration_mins: 45 },
              { id: `les-${sId}-1-2`, title: "Standard Problem Patterns & Methods", duration_mins: 60 },
              { id: `les-${sId}-1-3`, title: "Step-by-Step Derivations & Solutions", duration_mins: 50 },
            ],
          },
          {
            id: `ch-${sId}-2`,
            chapter_number: 2,
            title: "Equations, Expressions & Formulas",
            description: "Solving linear, quadratic, and polynomial systems",
            lessons: [
              { id: `les-${sId}-2-1`, title: "Expression Manipulation & Factoring", duration_mins: 50 },
              { id: `les-${sId}-2-2`, title: "Word Problems & Practical Scenarios", duration_mins: 55 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-2`,
        unit_number: 2,
        title: "Unit 2: Geometric & Analytical Methods",
        description: "Shapes, coordinate systems, theorems, and spatial analysis",
        chapters: [
          {
            id: `ch-${sId}-3`,
            chapter_number: 3,
            title: "Geometric Properties & Theorems",
            description: "Core geometric theorems, proofs, and spatial calculations",
            lessons: [
              { id: `les-${sId}-3-1`, title: "Theorems, Axioms & Proofs", duration_mins: 50 },
              { id: `les-${sId}-3-2`, title: "Measurement, Areas & Volume Analysis", duration_mins: 60 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-3`,
        unit_number: 3,
        title: "Unit 3: Advanced Applications & Problem Solving",
        description: "Complex problem sets, previous year questions, and mock exercises",
        chapters: [
          {
            id: `ch-${sId}-4`,
            chapter_number: 4,
            title: "Applied Problem Sets & Exercises",
            description: "High-order thinking questions and exam patterns",
            lessons: [
              { id: `les-${sId}-4-1`, title: "Advanced Problem Sets & Shortcuts", duration_mins: 55 },
              { id: `les-${sId}-4-2`, title: "Comprehensive Revision & Practice Tests", duration_mins: 60 },
            ],
          },
        ],
      },
    ];
  }

  // 4. Physics / Chemistry / Biology / Science
  if (
    lower.includes("physic") ||
    lower.includes("chem") ||
    lower.includes("bio") ||
    lower.includes("science") ||
    lower.includes("vigyan") ||
    lower.includes("विज्ञान")
  ) {
    return [
      {
        id: `unit-${sId}-1`,
        unit_number: 1,
        title: `Unit 1: Fundamentals of ${name}`,
        description: "Core physical laws, chemical principles, and observational models",
        chapters: [
          {
            id: `ch-${sId}-1`,
            chapter_number: 1,
            title: "Foundational Theories & Principles",
            description: "Basic laws, units, dimensions, and definitions",
            lessons: [
              { id: `les-${sId}-1-1`, title: "Introduction & Scope of Study", duration_mins: 45 },
              { id: `les-${sId}-1-2`, title: "Fundamental Laws & Scientific Models", duration_mins: 55 },
              { id: `les-${sId}-1-3`, title: "Formulas, Equations & Units", duration_mins: 45 },
            ],
          },
          {
            id: `ch-${sId}-2`,
            chapter_number: 2,
            title: "Experimental Analysis & Phenomena",
            description: "Laboratory observations and analytical derivations",
            lessons: [
              { id: `les-${sId}-2-1`, title: "Core Phenomena & Experimental Setup", duration_mins: 50 },
              { id: `les-${sId}-2-2`, title: "Data Analysis & Numerical Computations", duration_mins: 60 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-2`,
        unit_number: 2,
        title: "Unit 2: Applied Concepts & Systems",
        description: "Complex interactions, mechanisms, and real-world systems",
        chapters: [
          {
            id: `ch-${sId}-3`,
            chapter_number: 3,
            title: "Systems, Reactions & Dynamics",
            description: "In-depth study of physical and chemical processes",
            lessons: [
              { id: `les-${sId}-3-1`, title: "Process Dynamics & Key Mechanisms", duration_mins: 50 },
              { id: `les-${sId}-3-2`, title: "Industrial & Practical Applications", duration_mins: 55 },
            ],
          },
        ],
      },
      {
        id: `unit-${sId}-3`,
        unit_number: 3,
        title: "Unit 3: Numerical Problems & Revision",
        description: "Comprehensive problem solving, case studies, and exam preparation",
        chapters: [
          {
            id: `ch-${sId}-4`,
            chapter_number: 4,
            title: "Problem Solving & Case Studies",
            description: "Selected questions, worksheets, and concept maps",
            lessons: [
              { id: `les-${sId}-4-1`, title: "Numerical Problem Solving & Worksheets", duration_mins: 60 },
              { id: `les-${sId}-4-2`, title: "Mock Tests & Concept Mastery", duration_mins: 50 },
            ],
          },
        ],
      },
    ];
  }

  // 5. Default Academic Subject Structure
  return [
    {
      id: `unit-${sId}-1`,
      unit_number: 1,
      title: `Unit 1: Introduction & Fundamentals of ${name}`,
      description: "Basic concepts, definitions, historical overview, and core principles",
      chapters: [
        {
          id: `ch-${sId}-1`,
          chapter_number: 1,
          title: "Foundational Theories & Frameworks",
          description: "Essential knowledge and foundational frameworks",
          lessons: [
            { id: `les-${sId}-1-1`, title: "Overview & Key Terminology", duration_mins: 45 },
            { id: `les-${sId}-1-2`, title: "Core Concepts & Structural Principles", duration_mins: 50 },
            { id: `les-${sId}-1-3`, title: "Foundational Exercises & Review", duration_mins: 40 },
          ],
        },
        {
          id: `ch-${sId}-2`,
          chapter_number: 2,
          title: "Key Methodologies & Processes",
          description: "Standard practices, classification, and analysis",
          lessons: [
            { id: `les-${sId}-2-1`, title: "Classification & Functional Elements", duration_mins: 45 },
            { id: `les-${sId}-2-2`, title: "Analytical Methods & Case Examples", duration_mins: 50 },
          ],
        },
      ],
    },
    {
      id: `unit-${sId}-2`,
      unit_number: 2,
      title: `Unit 2: Advanced Topics & Applications`,
      description: "Intermediate and advanced topics, real-world context, and problem solving",
      chapters: [
        {
          id: `ch-${sId}-3`,
          chapter_number: 3,
          title: "Applied Concepts & Practical Case Studies",
          description: "Hands-on problem sets and real-world applications",
          lessons: [
            { id: `les-${sId}-3-1`, title: "Case Studies & Practical Scenarios", duration_mins: 55 },
            { id: `les-${sId}-3-2`, title: "Advanced Formulations & Worksheets", duration_mins: 50 },
          ],
        },
      ],
    },
    {
      id: `unit-${sId}-3`,
      unit_number: 3,
      title: `Unit 3: Review, Evaluation & Mastery`,
      description: "Synthesized topic summary, sample assessments, and revision",
      chapters: [
        {
          id: `ch-${sId}-4`,
          chapter_number: 4,
          title: "Comprehensive Revision & Practice Tests",
          description: "Practice questions, mock assessments, and self-evaluation",
          lessons: [
            { id: `les-${sId}-4-1`, title: "Topic Summary & Revision Points", duration_mins: 45 },
            { id: `les-${sId}-4-2`, title: "Practice Tests & Assessment Exercises", duration_mins: 60 },
          ],
        },
      ],
    },
  ];
}

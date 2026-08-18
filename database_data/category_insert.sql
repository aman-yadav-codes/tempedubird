-- =========================================================
-- MAIN ROOT CATEGORIES
-- =========================================================

INSERT INTO categories (
  name,
  slug,
  parent_id,
  depth
)
VALUES
('CLASS (1 TO 5)', 'class-1-to-5', NULL, 1),
('CLASS (6 TO 8)', 'class-6-to-8', NULL, 1),
('CLASS (9 TO 10)', 'class-9-to-10', NULL, 1),
('CLASS (11 TO 12)', 'class-11-to-12', NULL, 1),
('BACHELORS', 'bachelors', NULL, 1),
('MASTERS', 'masters', NULL, 1),
('PHD', 'phd', NULL, 1),
('PROFESSIONAL COURSE', 'professional-course', NULL, 1),
('COMPETITIVE EXAM', 'competitive-exam', NULL, 1),
('DIPLOMA', 'diploma', NULL, 1);







-- =========================================================
-- CHILD CATEGORIES
-- =========================================================

-- CLASS (1 TO 5)
INSERT INTO categories (name, slug, parent_id, depth)
VALUES
('Class 1', 'class-1', 1, 2),
('Class 2', 'class-2', 1, 2),
('Class 3', 'class-3', 1, 2),
('Class 4', 'class-4', 1, 2),
('Class 5', 'class-5', 1, 2);

-- CLASS (6 TO 8)
INSERT INTO categories (name, slug, parent_id, depth)
VALUES
('Class 6', 'class-6', 2, 2),
('Class 7', 'class-7', 2, 2),
('Class 8', 'class-8', 2, 2);

-- CLASS (9 TO 10)
INSERT INTO categories (name, slug, parent_id, depth)
VALUES
('Class 9', 'class-9', 3, 2),
('Class 10', 'class-10', 3, 2);

-- CLASS (11 TO 12)
INSERT INTO categories (name, slug, parent_id, depth)
VALUES
('Class 11', 'class-11', 4, 2),
('Class 12', 'class-12', 4, 2);









-- self relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  id,
  id,
  0
FROM categories
WHERE id NOT IN (
  SELECT descendant_id
  FROM category_closure
);

-- parent -> child relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  parent.id,
  child.id,
  1
FROM categories child
JOIN categories parent
ON child.parent_id = parent.id
WHERE NOT EXISTS (
  SELECT 1
  FROM category_closure cc
  WHERE cc.ancestor_id = parent.id
  AND cc.descendant_id = child.id
);














-- =========================================================
-- BACHELORS CHILD CATEGORIES
-- parent_id = 5 (BACHELORS)
-- =========================================================

INSERT INTO categories (name, slug, parent_id, depth)
VALUES

('B. Pharma (Bachelor of Pharmacy)', 'b-pharma', 5, 2),
('B.Com (Bachelor of Commerce)', 'bcom', 5, 2),

('B.Tech - Basic Science & Mathematics', 'btech-basic-science-mathematics', 5, 2),
('B.Tech - Civil Engineering', 'btech-civil-engineering', 5, 2),
('B.Tech - Computer Science Engineering', 'btech-computer-science-engineering', 5, 2),
('B.Tech - Electrical Engineering (EE)', 'btech-electrical-engineering', 5, 2),
('B.Tech - Electronics & Communication Engineering', 'btech-electronics-communication-engineering', 5, 2),
('B.Tech - Mechanical Engineering', 'btech-mechanical-engineering', 5, 2),
('B.Tech - Professional / Soft Skills', 'btech-professional-soft-skills', 5, 2),

('BA Business Economics', 'ba-business-economics', 5, 2),
('BA Economics', 'ba-economics', 5, 2),

('Bachelor of Commerce in Global Accounting', 'bachelor-commerce-global-accounting', 5, 2),
('Bachelor of Economics & Finance', 'bachelor-economics-finance', 5, 2),
('Bachelor of Entrepreneurship', 'bachelor-entrepreneurship', 5, 2),
('Bachelor of Event Management', 'bachelor-event-management', 5, 2),
('Bachelor of Financial Economics', 'bachelor-financial-economics', 5, 2),
('Bachelor of Hospitality & Tourism Management', 'bachelor-hospitality-tourism-management', 5, 2),
('Bachelor of Hotel Management (BHM)', 'bhm', 5, 2),
('Bachelor of International Business (BIB)', 'bib', 5, 2),
('Bachelor of Retail Management', 'bachelor-retail-management', 5, 2),
('Bachelor of Supply Chain Management', 'bachelor-supply-chain-management', 5, 2),
('Bachelor of Travel & Tourism Management', 'bachelor-travel-tourism-management', 5, 2),

('BAF (Bachelor of Accounting and Finance)', 'baf', 5, 2),
('BAMS (Bachelor of Ayurvedic Medicine and Surgery)', 'bams', 5, 2),

('BBA (Bachelor of Business Administration)', 'bba', 5, 2),
('BBI (Bachelor of Banking & Insurance)', 'bbi', 5, 2),
('BBM (Bachelor of Business Management)', 'bbm', 5, 2),
('BBS (Bachelor of Business Studies)', 'bbs', 5, 2),

('BCA (Bachelor of Computer Applications)', 'bca', 5, 2),

('BDS (Bachelor of Dental Surgery)', 'bds', 5, 2),

('BFA (Bachelor of Fine Arts)', 'bfa', 5, 2),
('BFM (Bachelor of Financial Markets)', 'bfm', 5, 2),

('BMS (Bachelor of Management Studies)', 'bms', 5, 2),

('BSc (Bachelor of Science)', 'bsc', 5, 2);




-- self relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  id,
  id,
  0
FROM categories
WHERE id NOT IN (
  SELECT descendant_id
  FROM category_closure
);

-- bachelors -> child relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  5,
  id,
  1
FROM categories
WHERE parent_id = 5
AND NOT EXISTS (
  SELECT 1
  FROM category_closure cc
  WHERE cc.ancestor_id = 5
  AND cc.descendant_id = categories.id
);





-- =========================================================
-- MASTERS CHILD CATEGORIES
-- parent_id = 6 (MASTERS)
-- =========================================================

INSERT INTO categories (name, slug, parent_id, depth)
VALUES

('LLM (Master of Laws)', 'llm', 6, 2),

('M.Sc (Master of Science)', 'msc', 6, 2),

('M.A (Journalism / Mass Communication)', 'ma-journalism-mass-communication', 6, 2),
('M.A (Master of Arts)', 'ma-master-of-arts', 6, 2),

('M.Com (Master of Commerce)', 'mcom', 6, 2),

('M.Des (Master of Design)', 'mdes', 6, 2),

('M.E (Master of Engineering)', 'me', 6, 2),

('M.Ed (Master of Education)', 'med', 6, 2),

('M.Sc Nursing (Master of Science in Nursing)', 'msc-nursing', 6, 2),

('M.Stat (Master of Statistics)', 'mstat', 6, 2),

('M.Tech (Master of Technology)', 'mtech', 6, 2),

('MA Education (Master of Arts in Education)', 'ma-education', 6, 2),

('MA Fashion Design', 'ma-fashion-design', 6, 2),

('MAHRM (Master of Arts in Human Resource Management)', 'mahrm', 6, 2),

('MBA (Master of Business Administration)', 'mba', 6, 2),

('MCA (Master of Computer Applications)', 'mca', 6, 2),

('MD (Doctor of Medicine)', 'md', 6, 2),

('MDS (Master of Dental Surgery)', 'mds', 6, 2),

('MFA (Master of Fine Arts)', 'mfa', 6, 2),

('MFM (Master of Financial Management)', 'mfm', 6, 2),

('MHA (Master of Hospital Administration)', 'mha', 6, 2),

('MHRM (Master of Human Resource Management)', 'mhrm', 6, 2),

('MIB (International Business)', 'mib', 6, 2),

('MJMC (Master of Journalism & Mass Communication)', 'mjmc', 6, 2),

('MMS (Master of Management Studies)', 'mms', 6, 2),

('MPH (Master of Public Health)', 'mph', 6, 2),

('MPT (Master of Physiotherapy)', 'mpt', 6, 2),

('MS (Master of Surgery)', 'ms', 6, 2),

('MSW (Master of Social Work)', 'msw', 6, 2);





-- self relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  id,
  id,
  0
FROM categories
WHERE id NOT IN (
  SELECT descendant_id
  FROM category_closure
);

-- masters -> child relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  6,
  id,
  1
FROM categories
WHERE parent_id = 6
AND NOT EXISTS (
  SELECT 1
  FROM category_closure cc
  WHERE cc.ancestor_id = 6
  AND cc.descendant_id = categories.id
);






-- =========================================================
-- PHD CHILD CATEGORIES
-- parent_id = 7 (PHD)
-- =========================================================

INSERT INTO categories (name, slug, parent_id, depth)
VALUES

('Agricultural & Environmental Sciences', 'agricultural-environmental-sciences', 7, 2),

('Arts, Humanities & Social Sciences', 'arts-humanities-social-sciences', 7, 2),

('Business & Management', 'business-management', 7, 2),

('Design & Creative Arts', 'design-creative-arts', 7, 2),

('Interdisciplinary / Emerging Fields', 'interdisciplinary-emerging-fields', 7, 2),

('Medical & Health Sciences', 'medical-health-sciences', 7, 2),

('Science & Technology', 'science-technology', 7, 2);



-- self relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  id,
  id,
  0
FROM categories
WHERE id NOT IN (
  SELECT descendant_id
  FROM category_closure
);

-- phd -> child relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  7,
  id,
  1
FROM categories
WHERE parent_id = 7
AND NOT EXISTS (
  SELECT 1
  FROM category_closure cc
  WHERE cc.ancestor_id = 7
  AND cc.descendant_id = categories.id
);



-- =========================================================
-- PROFESSIONAL COURSE CHILD CATEGORIES
-- parent_id = 8 (PROFESSIONAL COURSE)
-- =========================================================

INSERT INTO categories (name, slug, parent_id, depth)
VALUES

('App Development', 'app-development', 8, 2),

('CCC', 'ccc', 8, 2),

('Digital Marketing', 'digital-marketing', 8, 2),

('Graphics Design', 'graphics-design', 8, 2),

('O Level', 'o-level', 8, 2),

('Spoken English', 'spoken-english', 8, 2),

('Tally/GST', 'tally-gst', 8, 2),

('Website Development', 'website-development', 8, 2);




-- self relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  id,
  id,
  0
FROM categories
WHERE id NOT IN (
  SELECT descendant_id
  FROM category_closure
);

-- professional course -> child relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  8,
  id,
  1
FROM categories
WHERE parent_id = 8
AND NOT EXISTS (
  SELECT 1
  FROM category_closure cc
  WHERE cc.ancestor_id = 8
  AND cc.descendant_id = categories.id
);




-- =========================================================
-- COMPETITIVE EXAM CHILD CATEGORIES
-- parent_id = 9 (COMPETITIVE EXAM)
-- =========================================================

INSERT INTO categories (name, slug, parent_id, depth)
VALUES

('Banking', 'banking', 9, 2),

('Defence Exams', 'defence-exams', 9, 2),

('Police Exams', 'police-exams', 9, 2),

('Railway Exams', 'railway-exams', 9, 2),

('SSC', 'ssc', 9, 2),

('UPSC', 'upsc', 9, 2),

('Physical Fitness Test (PFT)', 'physical-fitness-test-pft', 9, 2),

('SSB Interview Training', 'ssb-interview-training', 9, 2);



-- =========================================================
-- SELF RELATIONS
-- adds (id,id,0) for categories not already inserted
-- =========================================================

INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  id,
  id,
  0
FROM categories
WHERE id NOT IN (
  SELECT descendant_id
  FROM category_closure
);

-- =========================================================
-- COMPETITIVE EXAM -> CHILD RELATIONS
-- parent_id = 9
-- =========================================================

INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  9,
  id,
  1
FROM categories
WHERE parent_id = 9
AND NOT EXISTS (
  SELECT 1
  FROM category_closure cc
  WHERE cc.ancestor_id = 9
  AND cc.descendant_id = categories.id
);






-- =========================================================
-- DIPLOMA CHILD CATEGORIES
-- parent_id = 10 (DIPLOMA)
-- =========================================================

INSERT INTO categories (name, slug, parent_id, depth)
VALUES

('ADCA', 'adca', 10, 2),

('DFA', 'dfa', 10, 2);




-- self relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  id,
  id,
  0
FROM categories
WHERE id NOT IN (
  SELECT descendant_id
  FROM category_closure
);

-- diploma -> child relations
INSERT INTO category_closure (
  ancestor_id,
  descendant_id,
  depth
)
SELECT
  10,
  id,
  1
FROM categories
WHERE parent_id = 10
AND NOT EXISTS (
  SELECT 1
  FROM category_closure cc
  WHERE cc.ancestor_id = 10
  AND cc.descendant_id = categories.id
);





-- =========================================================
-- INSERT GLOBAL BOARDS
-- =========================================================

INSERT INTO boards (
  name,
  slug
)
VALUES

(
  'CBSE (Central Board of Secondary Education)',
  'cbse'
),

(
  'National Institute of Open Schooling (NIOS)',
  'nios'
),

(
  'SCERT Delhi (State Council of Educational Research and Training)',
  'scert-delhi'
),

(
  'UP Board - UPMSP (Uttar Pradesh Madhyamik Shiksha Parishad)',
  'up-board-upmsp'
);
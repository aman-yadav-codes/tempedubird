-- IF  HAVE THE MAIN CATEGORY AND SECOND DEPTH CHILD

-- =========================================================
-- MAP CBSE BOARD TO CLASS 1
-- Class 1 category_id = 11
-- CBSE board_id = 1
-- =========================================================

INSERT INTO category_boards (
  category_id,
  board_id
)
VALUES
(11,1);



-- =========================================================
-- ADD SUBJECTS FOR:
-- CLASS (1 TO 5)
--   → Class 1
--      → CBSE
-- =========================================================

INSERT INTO subjects (
  category_id,
  board_id,
  name,
  slug
)
VALUES

(11,1,'English','english'),

(11,1,'EVS (Environmental Studies)','evs'),

(11,1,'GK / Moral Science','gk-moral-science'),

(11,1,'Hindi','hindi'),

(11,1,'Mathematics','mathematics');










-- CREATE API AND TEST : RESUME
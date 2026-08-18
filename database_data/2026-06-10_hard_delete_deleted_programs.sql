DELETE FROM institution_programs
WHERE COALESCE(is_deleted, FALSE) = TRUE;

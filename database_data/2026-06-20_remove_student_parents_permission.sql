WITH removed_permissions AS (
    SELECT id
    FROM permissions
    WHERE code IN (
        'managestudents.parents.view',
        'managestudents.parents.create',
        'managestudents.parents.edit',
        'managestudents.parents.delete',
        'manage_students.parents.view',
        'manage_students.parents.create',
        'manage_students.parents.edit',
        'manage_students.parents.delete',
        'student_management.parents.view',
        'student_management.parents.create',
        'student_management.parents.edit',
        'student_management.parents.delete',
        'students.parents.view',
        'students.parents.create',
        'students.parents.edit',
        'students.parents.delete'
    )
),
deleted_role_permissions AS (
    DELETE FROM role_permissions
    WHERE permission_id IN (SELECT id FROM removed_permissions)
),
deleted_institution_permissions AS (
    DELETE FROM institution_role_permissions
    WHERE permission_id IN (SELECT id FROM removed_permissions)
)
DELETE FROM permissions
WHERE id IN (SELECT id FROM removed_permissions);

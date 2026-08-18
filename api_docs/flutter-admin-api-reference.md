# EduBird API Reference for Flutter

Updated: 2026-06-05

This document explains how the current API, roles, permissions, and institution scoping work. Use it as the contract for Flutter and any future client app.

## Base Rules

- Base URL in local development: `http://localhost:3000`
- Production base URL currently used in browser testing: `https://final-edubird.vercel.app`
- API paths should normally start with `/api`.
- Flutter may either set `baseUrl` to `https://final-edubird.vercel.app` and call `/api/...`, or set it to `https://final-edubird.vercel.app/api` and call paths without the `/api` prefix.
- Do not call admin page URLs such as `/admin/institutions/list` from Flutter. Those are browser pages, not JSON APIs.
- All request and response bodies are JSON unless the endpoint is a file upload.
- Protected APIs use:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

- The access token is a short-lived JWT. The client must not use decoded JWT data for authorization decisions.
- Server authorization always reloads the current user, roles, memberships, and permissions from the database on every protected API request.
- The login response is intentionally minimal. It is for display and navigation only, not for security.

## Flutter URL Structure

Use one of these two patterns consistently:

```dart
// Recommended: keep /api in the base URL.
final dio = Dio(BaseOptions(baseUrl: 'https://final-edubird.vercel.app/api'));
await dio.get('/institutions');
await dio.post('/auth/register', data: payload);
```

```dart
// Also valid: keep the domain as base URL and include /api in every path.
final dio = Dio(BaseOptions(baseUrl: 'https://final-edubird.vercel.app'));
await dio.get('/api/institutions');
await dio.post('/api/auth/register', data: payload);
```

If Flutter calls `/institutions` against the plain domain, the app now returns the public institution lookup for compatibility. The canonical API path is still `/api/institutions`.

## Permission Model

### Tables

| Table | Purpose |
| --- | --- |
| `scope_types` | Stores available permission scopes. Current scopes should be only `platform` and `institution`. |
| `permissions` | Stores permission codes such as `institutions.institutions.read`, `users.all.manage`, `content.categories.subjects.edit`. |
| `roles` | Stores role definitions such as `platform_admin`, `institution_admin`, `teacher`, `student`, `parent`, `driver`. Each role links to one scope. |
| `role_permissions` | Default permissions for a role. Example: Institution Admin gets `institutions.institutions.manage`, `users.all.manage`. |
| `institution_memberships` | Assigns a user to one institution with one institution-scoped role. Example: Mohit is Institution Admin of M.P. English School. |
| `institution_role_permissions` | Extra permission overrides for a role inside one institution. Example: Driver normally has no institution permissions, but M.P. English School can grant that Driver extra permissions. |

Effective institution permissions are:

```text
role_permissions for the membership role
+ institution_role_permissions for that institution and role
```

Example:

- Teacher default role has 7 permissions in `role_permissions`.
- M.P. English School adds `analytics.read` in `institution_role_permissions` for Teacher.
- A Teacher member of M.P. English School has 8 effective permissions inside that institution.
- After changing overrides, existing logged-in clients should refresh `/api/auth/me` or log in again so `allowed_admin_paths` is recalculated for the sidebar.

### Permission Code Format

Permission codes use this structure:

```text
module.path.action
```

Examples:

```text
institutions.institutions.read
institutions.programs.create
content.categories.subjects.edit
institutions.master.institution_type.delete
users.all.manage
```

The dot format is used so one glance tells where the permission belongs:

- `institutions.programs.read` means "view Programs under Institutions".
- `content.categories.subjects.edit` means "edit Subjects under Content > Categories".
- `institutions.master.institution_type.create` means "create Institution Types under Institutions > Master".

### Action Meaning

| Action | Meaning | Page Access |
| --- | --- | --- |
| `.read` | Can open/list/view that module. | Required to open the module page. |
| `.create` | Can create records in that module. | Does not allow page access by itself unless paired with `.read` or `.manage`. |
| `.edit` | Can update records in that module. | Does not allow page access by itself unless paired with `.read` or `.manage`. |
| `.delete` | Can delete records in that module. | Does not allow page access by itself unless paired with `.read` or `.manage`. |
| `.manage` | Includes read, create, edit, and delete for that module. | Allows page access. |
| `*` | Full system access. | Platform super admin only. |

Important: page access requires either `module.read`, `module.manage`, or `*`.

### Role Levels

| Role | Scope | What It Means |
| --- | --- | --- |
| Platform Admin | Platform | Super admin/developer-level role. Can manage access control and global data. Should be the only platform role in user forms. |
| Institution Admin | Institution | Admin for one or more institutions. Can only access institution-scoped records for their own institutions. |
| Teacher | Institution | Institution user role. Admin access depends on permissions assigned to the teacher role or institution override. |
| Student | Institution | Usually no admin permissions. If no permissions are assigned, show the "No access" screen. |
| Parent | Institution | Usually app/customer role, not admin unless permissions are added. |
| Driver | Institution | Institution role, can receive limited permissions through overrides. |

## Institution Scope Rules

Platform Admin with `*` or platform-level permissions can access global records.

Institution-scoped users can only access:

- Institutions where they have an active `institution_memberships` row.
- For user management, users whose profile/membership belongs to the same allowed institution.

Example:

- Mohit is Institution Admin for M.P. English School.
- Mohit has `users.all.manage`.
- Mohit can open Users and manage users under M.P. English School only.
- Mohit must not see users from another institution.

Example override:

- Driver role default permissions: no institution management.
- M.P. English School adds override `institutions.institutions.read` for Driver.
- A driver in M.P. English School can view institution data only inside M.P. English School.

## Public Lookup APIs

These APIs are for Flutter signup forms and basic dropdowns. They do not require an access token.

### GET `/api/institutions`

Use this for student, teacher, driver, or parent signup screens when the user needs to select an institution.

Compatibility:

- Canonical API path: `/api/institutions`
- Compatibility path: `/institutions`
- Prefer `/api/institutions` in new Flutter code.

Query params:

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `page` | number | No | Default `1`. |
| `limit` | number | No | Default `10`, max `50`. |
| `search` | string | No | Text searches name/slug. Numeric search matches exact institution ID. |

Example:

```http
GET /api/institutions?page=1&limit=10&search=maha
```

Response:

```json
{
  "data": [
    {
      "id": 5,
      "name": "M.P. English School"
    }
  ],
  "pageCount": 1,
  "total": 1
}
```

Flutter usage:

```dart
final response = await dio.get(
  '/institutions',
  queryParameters: {
    'page': 1,
    'limit': 10,
    'search': searchText,
  },
);

final institutions = response.data['data'] as List<dynamic>;
```

`GET /api/admin/institutions/profiles` also returns this public list when no Bearer token is sent, for older Postman/Flutter collections. New Flutter code should prefer `/api/institutions`.

### GET `/api/designations`

Use this for institution admin signup screens when the user needs to select a designation.

Compatibility:

- Canonical API path: `/api/designations`
- Compatibility path: `/designations`
- `GET /api/admin/master-data/designations` also returns this public list when no Bearer token is sent.
- Prefer `/api/designations` in new Flutter code.

Query params:

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `page` | number | No | Default `1`. |
| `limit` | number | No | Default `10`, max `50`. |
| `search` | string | No | Text searches name/slug. Numeric search matches exact designation ID. |

Response:

```json
{
  "data": [
    {
      "id": 604,
      "name": "Class Teacher"
    }
  ],
  "pageCount": 1,
  "total": 1
}
```

Flutter usage:

```dart
final response = await dio.get(
  '/designations',
  queryParameters: {
    'page': 1,
    'limit': 10,
    'search': searchText,
  },
);

final designations = response.data['data'] as List<dynamic>;
```

Signup rule:

- Institution Admin: `designation_id` is required.
- Teacher/student/driver/parent: do not send `designation_id`.

## Auth APIs

### POST `/api/auth/register`

Creates a public user account.

Request:

```json
{
  "full_name": "Rohan Teacher",
  "email": "rohan@gmail.com",
  "phone": "8546589658",
  "password": "rohan123",
  "confirmPassword": "rohan123",
  "role_code": "teacher",
  "institution_id": 5
}
```

Optional role fields:

- Use either `role_code` or `role_id`.
- `role_code` examples: `teacher`, `student`, `parent`, `driver`, `institution_admin`.
- Public signup cannot assign `platform_admin`; Platform Admin must be assigned from the admin panel.

Optional profile fields:

- `designation_id`: required only for `institution_admin`; rejected for `teacher`, `student`, `driver`, and `parent`.
- `is_teacher`: optional boolean. If `role_code` is `teacher`, the server sets `is_teacher: true` by default.
- `teacher_type`: optional, but public teacher signup is stored as an institute teacher.
- `institution_id`: required for `institution_admin`, `teacher`, `student`, and `driver`. This attaches the user to that institution.
- `under_institution_id`: optional alias for `institution_id` when the signup flow already uses this profile field.
- Institution admin, teacher, student, and driver signups with `institution_id` start as inactive so the institution owner/platform admin can review and activate them.

Role-specific Flutter payloads:

Institution admin signup sends both institution and designation:

```json
{
  "full_name": "Rohan Admin",
  "email": "admin@gmail.com",
  "phone": "8546589658",
  "password": "admin123",
  "confirmPassword": "admin123",
  "role_code": "institution_admin",
  "institution_id": 5,
  "designation_id": 604
}
```

Teacher signup sends institution only:

```json
{
  "full_name": "Rohan Teacher",
  "email": "rohan.teacher.school@gmail.com",
  "phone": "8546589662",
  "password": "rohan123",
  "confirmPassword": "rohan123",
  "role_code": "teacher",
  "institution_id": 5
}
```

Student signup sends the institution instead of teacher fields:

```json
{
  "full_name": "Rohan Student",
  "email": "student@gmail.com",
  "phone": "8546589659",
  "password": "student123",
  "confirmPassword": "student123",
  "role_code": "student",
  "institution_id": 5
}
```

Driver signup sends institution only:

```json
{
  "full_name": "Rohan Driver",
  "email": "driver@gmail.com",
  "phone": "8546589660",
  "password": "driver123",
  "confirmPassword": "driver123",
  "role_code": "driver",
  "institution_id": 5
}
```

Parent signup is currently the basic account fields plus parent role:

```json
{
  "full_name": "Rohan Parent",
  "email": "parent@gmail.com",
  "phone": "8546589661",
  "password": "parent123",
  "confirmPassword": "parent123",
  "role_code": "parent"
}
```

Validation:

- `full_name`: required, 2 to 100 characters.
- `email`: required, valid email.
- `phone`: required, exactly 10 digits.
- `password`: required, 6 to 100 characters.
- `confirmPassword`: required, must match `password`.
- `role_id`: optional positive number.
- `role_code`: optional role code.
- `designation_id`: required positive number only for `institution_admin`; rejected for `teacher`, `student`, `driver`, and `parent`.
- `institution_id`: required positive number for `institution_admin`, `teacher`, `student`, and `driver`.

Success `201`:

```json
{ "message": "User registered successfully" }
```

Failure examples:

```json
{
  "error": "Validation failed",
  "issues": {
    "phone": ["Phone number must be exactly 10 digits"],
    "confirmPassword": ["Passwords do not match"]
  }
}
```

```json
{ "error": "User exists" }
```

```json
{ "error": "Platform admin role can only be assigned from the admin panel" }
```

Status codes:

- `201` registered.
- `400` invalid `role_id` or `role_code`.
- `403` attempted public signup as Platform Admin.
- `409` duplicate user or register conflict.
- `422` validation failed.

### Suspension Rules

No extra suspension table is required for the current workflow. Suspension is derived from existing active flags:

- `users.is_active = false`: that user cannot log in or continue using an existing session.
- `institution_profiles.is_active = false`: users attached to that institution cannot log in if they have no other active institution.
- If all active Institution Admin memberships for an institution are disabled, users attached to that institution are treated as institution-suspended.
- Institution-scoped API access only uses active institutions with at least one active Institution Admin.
- Platform Admin can reactivate an Institution Admin or institution to restore access.

Suspended login/session responses:

```json
{
  "error": "Account suspended",
  "error_code": "ACCOUNT_SUSPENDED"
}
```

```json
{
  "error": "Institution suspended",
  "error_code": "INSTITUTION_SUSPENDED"
}
```

Client behavior:

- Show the suspended account page.
- Message: "Your account has been suspended. Contact your institution for more details."
- Provide Home and Contact Institution buttons.

### POST `/api/auth/login`

Logs in a user and creates a refresh session.

Request:

```json
{
  "email": "mohit@gmail.com",
  "password": "mohit123"
}
```

Success `200`:

```json
{
  "user": {
    "full_name": "Test User Mohit",
    "is_active": true,
    "roles": ["Institution Admin"],
    "primary_role": "Institution Admin",
    "is_super_admin": false,
    "can_access_admin": true,
    "allowed_admin_paths": [
      "/admin/users",
      "/admin/institutions/list",
      "/admin/institutions/programs"
    ]
  },
  "accessToken": "jwt-access-token"
}
```

Failure:

```json
{ "error": "Invalid credentials" }
```

Status codes:

- `200` login success.
- `401` invalid email/password, inactive user, or login error.
- `422` invalid request body.

Flutter notes:

- Store `accessToken` securely.
- Use `allowed_admin_paths` only to choose the first screen or hide obvious navigation.
- Do not store or trust role ids, permission lists, or institution ids from login. They are intentionally not returned.

### GET `/api/auth/me`

Returns the current minimal session user. If the web refresh cookie is valid and the access token is expired/missing, it may return a new access token.

Headers:

```http
Authorization: Bearer <accessToken>
```

Success `200`:

```json
{
  "user": {
    "full_name": "Test User Mohit",
    "is_active": true,
    "roles": ["Institution Admin"],
    "primary_role": "Institution Admin",
    "is_super_admin": false,
    "can_access_admin": true,
    "allowed_admin_paths": ["/admin/users"]
  }
}
```

Success with refreshed token:

```json
{
  "user": {
    "full_name": "Test User Mohit",
    "is_active": true,
    "roles": ["Institution Admin"],
    "primary_role": "Institution Admin",
    "is_super_admin": false,
    "can_access_admin": true,
    "allowed_admin_paths": ["/admin/users"]
  },
  "accessToken": "new-jwt-access-token"
}
```

Failure:

```json
{ "error": "Unauthorized" }
```

### POST `/api/auth/refresh`

Creates a new access token from a refresh session.

Current web behavior:

- Web uses an httpOnly `refresh_token` cookie set by login.
- The route also accepts a refresh token in the `Authorization` header if a mobile refresh token strategy is added later.

Success `200`:

```json
{ "accessToken": "new-jwt-access-token" }
```

Failure:

```json
{ "error": "Invalid refresh token" }
```

Flutter note: if Flutter needs long-lived login without web cookies, add a mobile refresh-token contract intentionally instead of exposing database session ids casually.

### POST `/api/auth/logout`

Logs out the current web session and clears the refresh cookie.

Success:

```json
{ "message": "Logged out successfully" }
```

Failure:

```json
{ "error": "No active session found" }
```

## Common Error Responses

| Status | Meaning | Example |
| --- | --- | --- |
| `400` | Bad request or invalid id/query. | `{ "error": "Invalid user id" }` |
| `401` | Missing/expired/invalid token. | `{ "error": "Unauthorized" }` |
| `403` | Authenticated, but missing required permission/scope. | `{ "error": "Forbidden: Admin access required" }` |
| `404` | Record not found or not visible in current scope. | `{ "error": "User not found" }` |
| `409` | Duplicate/conflict. | `{ "error": "Email already exists" }` |
| `422` | Validation failed. | `{ "error": "Validation failed", "issues": { "email": ["Invalid email address"] } }` |
| `500` | Unexpected server error. | `{ "error": "Something went wrong" }` |

Flutter should handle:

- `401`: clear local session or refresh token, then show login.
- `403`: show permission denied.
- `404`: show not found or "not available in your institution".
- `422`: show field errors.
- Network failure/no response: show retry screen.

## Admin Permission Reference

For every module below:

- `GET` requires `.read` or `.manage`.
- `POST` requires `.create` or `.manage`.
- `PATCH`/`PUT` requires `.edit` or `.manage`.
- `DELETE` requires `.delete` or `.manage`.
- `*` bypasses all checks.

| Admin Page | API Area | Permission Family |
| --- | --- | --- |
| `/admin` | Dashboard | `dashboard.*` |
| `/admin/users` | Users | `users.*` |
| `/admin/users/leads` | Leads | `analytics.leads.*` |
| `/admin/analytics` | Analytics | `analytics.*` |
| `/admin/analytics/reports` | Analytics Reports | `analytics.reports.*` |
| `/admin/content/tree` | Category Tree | `content.categories.tree.*` |
| `/admin/content/categories` | Manage Categories | `content.categories.manage_categories.*` |
| `/admin/content/boards` | Boards | `content.categories.boards.*` |
| `/admin/content/subjects` | Subjects | `content.categories.subjects.*` |
| `/admin/master-data/skills` | Skills | `content.master.skills.*` |
| `/admin/master-data/designations` | Designations | `content.master.designations.*` |
| `/admin/master-data/locations` | Locations | `content.master.locations.*` |
| `/admin/content/media` | Media/uploads | `content.media.*` |
| `/admin/institutions/types` | Institution Types | `institutions.master.institution_type.*` |
| `/admin/institutions/subtypes` | Institution Subtypes | `institutions.master.institution_subtype.*` |
| `/admin/institutions/program-types` | Program Types | `institutions.master.program_type.*` |
| `/admin/institutions/facility-types` | Facility Types | `institutions.master.facility_type.*` |
| `/admin/institutions/languages` | Languages | `institutions.master.language.*` |
| `/admin/institutions/list` | Institutions | `institution.*` |
| `/admin/institutions/programs` | Programs | `institutions.programs.*` |
| `/admin/institutions/placements` | Placements | `institutions.placements.*` |
| `/admin/institutions/cutoffs` | Cutoffs | `institutions.cutoffs.*` |
| `/admin/institutions/scholarships` | Scholarships | `institutions.scholarships.*` |
| `/admin/institutions/news` | News | `institutions.news.*` |
| `/admin/notifications` | Notifications | `notifications.*` |
| `/admin/notifications/muted` | Muted Notifications | `notifications.muted.*` |
| `/admin/notifications/settings` | Institution Notification Controls | `notifications.controls.*` plus institution scope |
| `/admin/tracker` | Tracker Sessions | `tracker.*` |
| `/admin/settings` | General Settings | `settings.general.*` |
| `/admin/settings/tracker` | Tracker Settings | `settings.tracker.*` |
| `/admin/settings/notifications` | Platform Notification Types | `settings.notifications.*` |
| `/admin/ai-settings` | AI Settings | `settings.ai.*` |
| `/admin/settings/security` | Security Settings | `settings.security.*` |

## Shared Lookup APIs

These are authenticated lookup APIs. Any logged-in user can read them because forms need them for profile editing, education, teacher data, and institution selection.

They still require a valid access token, but they do not require a module permission.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/admin/categories` | GET | Category list/search. |
| `/api/admin/categories/tree` | GET | Category tree. |
| `/api/admin/categories/tree/search` | GET | Search categories/subjects by type. |
| `/api/admin/categories/qualifications` | GET | Qualification lookup. |
| `/api/admin/boards` | GET | Boards lookup. |
| `/api/admin/subjects` | GET | Subjects lookup. |
| `/api/admin/master-data/skills` | GET | Skills lookup. |
| `/api/admin/master-data/designations` | GET | Public active `{ id, name }` list without Bearer token; admin full lookup with Bearer token. |
| `/api/admin/institutions/types` | GET | Institution type lookup. |
| `/api/admin/institutions/subtypes` | GET | Institution subtype lookup. |
| `/api/admin/institutions/program-types` | GET | Program type lookup. |
| `/api/admin/institutions/facility-types` | GET | Facility type lookup. |
| `/api/admin/institutions/languages` | GET | Language lookup. |

Common query params:

```text
search=<text>
page=1
limit=20
type=subject
categoryIds=11,12
```

Success example:

```json
{
  "data": [
    { "id": 127, "name": "View Institutions", "code": "institutions.institutions.read" }
  ],
  "hasMore": false
}
```

## Notification Module APIs

The notification system is hierarchical:

1. Platform notification type registry: `notification_templates`
2. Institution-level assignment: `institution_notification_settings`
3. User-level mute preferences: `notification_preferences`
4. User delivery inbox: `notifications` + `notification_recipients`

Decision flow when generating a notification:

```text
Check notification_templates
-> stop if type is missing or globally inactive
-> if institution event, require institution_notification_settings.is_enabled = true
-> determine recipients
-> skip users who muted the type in notification_preferences
-> critical types ignore user mute settings
-> create notification + notification_recipients rows
```

Critical types always ignore user mute settings:

```text
system.alert
security.alert
account.locked
password.changed
```

### Pages

| Page | Purpose | Scope |
| --- | --- | --- |
| `/admin/notifications` | User notification inbox. | Current logged-in user |
| `/admin/notifications/muted` | User muted notification preferences. | Current logged-in user |
| `/admin/notifications/settings` | Institution notification controls. | Platform admin sees all institutions; institution admin sees only their institutions |
| `/admin/settings/notifications` | Platform notification type registry. | Platform admin only |

### Endpoint Summary

| Endpoint | Methods | Purpose | Permission |
| --- | --- | --- | --- |
| `/api/admin/notifications` | GET, PATCH | Current user inbox, unread count, mark read/all read. | `notifications.all.read` |
| `/api/admin/notification-preferences` | GET, PATCH | Current user mute preferences. | `notifications.all.read` |
| `/api/admin/notification-templates` | GET, POST, PATCH, DELETE | Platform notification type registry and bulk actions. | `settings.notifications.*` |
| `/api/admin/notification-templates/{id}` | PATCH, DELETE | Update/delete a single platform notification type. | `settings.notifications.*` |
| `/api/admin/institution-notification-settings` | GET, PATCH | Institution notification assignments and bulk actions. | Admin access + institution scope |

### GET `/api/admin/notifications`

Returns notifications for the logged-in user.

Query params:

```text
limit=8
```

Response:

```json
{
  "data": [
    {
      "recipient_id": "11",
      "notification_id": "5",
      "type": "news.published",
      "title": "News published",
      "message": "A new article is live.",
      "priority": "normal",
      "entity_type": "news",
      "entity_id": "44",
      "payload": {},
      "is_read": false,
      "read_at": null,
      "created_at": "2026-06-05T10:30:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

### PATCH `/api/admin/notifications`

Mark notifications as read.

Mark all read:

```json
{ "action": "mark_all_read" }
```

Mark one read:

```json
{
  "action": "mark_read",
  "notification_id": 5
}
```

### GET `/api/admin/notification-preferences`

Returns all known notification types with the current user's preference status. Missing preference rows are treated as enabled.

Response:

```json
{
  "data": [
    {
      "notification_type": "news.published",
      "is_enabled": true,
      "is_critical": false
    },
    {
      "notification_type": "security.alert",
      "is_enabled": true,
      "is_critical": true
    }
  ]
}
```

### PATCH `/api/admin/notification-preferences`

Mute or unmute a type for the logged-in user.

```json
{
  "notification_type": "news.published",
  "is_enabled": false
}
```

Critical types return enabled even if the client tries to mute them.

### GET `/api/admin/notification-templates`

Platform admin endpoint. Lists all notification type templates created by platform admin.

Response:

```json
{
  "data": [
    {
      "id": 1,
      "code": "user.created",
      "title_template": "New User Registered",
      "body_template": "{{name}} has joined the platform.",
      "is_active": true,
      "created_at": "2026-06-05T10:30:00.000Z",
      "updated_at": "2026-06-05T10:30:00.000Z"
    }
  ]
}
```

### POST `/api/admin/notification-templates`

Create a platform notification type.

```json
{
  "code": "news.published",
  "title_template": "News published",
  "body_template": "{{title}} is now live.",
  "is_active": true
}
```

### PATCH `/api/admin/notification-templates`

Bulk enable or disable platform notification types.

```json
{
  "ids": [1, 2, 3],
  "is_active": false
}
```

If `is_active = false`, no notifications of that type should be generated anywhere.

### DELETE `/api/admin/notification-templates`

Bulk delete platform notification types.

```json
{ "ids": [1, 2, 3] }
```

Deleting a template also clears institution assignments for those type codes.

### PATCH `/api/admin/notification-templates/{id}`

Edit one platform notification type.

```json
{
  "code": "user.created",
  "title_template": "New User Registered",
  "body_template": "{{name}} has joined the platform.",
  "is_active": true
}
```

### DELETE `/api/admin/notification-templates/{id}`

Delete one platform notification type and clear institution assignments for it.

### GET `/api/admin/institution-notification-settings`

Returns institution notification controls.

Scope behavior:

- Platform admin receives all institutions.
- Institution admin receives only institutions in their membership scope.
- Optional query `institution_id=4` narrows to one institution and is still scope-checked.

Response returns one row per institution + platform type combination:

```json
{
  "data": [
    {
      "institution_id": 4,
      "institution_name": "Banaras Hindu University",
      "notification_type": "user.created",
      "title_template": "New User Registered",
      "is_enabled": true
    }
  ]
}
```

Missing `institution_notification_settings` rows are treated as disabled for institution events. Institutions must explicitly assign the platform-defined types they want enabled.

### PATCH `/api/admin/institution-notification-settings`

Assign platform-created types to one institution:

```json
{
  "institution_id": 4,
  "enabled_types": ["user.created", "news.published"]
}
```

Enable/disable one institution/type:

```json
{
  "institution_id": 4,
  "notification_type": "news.published",
  "is_enabled": false
}
```

Bulk action across selected institutions:

```json
{
  "institution_ids": [4, 7],
  "action": "disable_all"
}
```

Supported bulk actions:

```text
enable_all
disable_all
clear_types
```

For institution admins, every institution ID in the request is checked against their institution scope.

### Centralized Notification Service

Server modules should create notifications through the centralized `NotificationService` instead of writing directly to tables.

Expected module flow:

```ts
await notificationService.create({
  type: "news.published",
  institutionId: 4,
  recipients: [12, 15, 19],
  entityType: "news",
  entityId: 44,
  payload: { title: "Admission update" },
  createdBy: 1
});
```

The service:

- Loads the template by notification type.
- Renders `{{placeholder}}` values from `payload`.
- Stops if platform template is missing or inactive.
- Stops for institution events if the institution has not enabled that type.
- Filters users who muted that type.
- Ignores user mute settings for critical types.
- Creates `notifications` and `notification_recipients`.

## User APIs

### GET `/api/admin/users`

Permission:

- `users.read`, `users.all.manage`, or `*`.

Institution scope:

- Platform Admin sees all users.
- Institution Admin sees only users connected to their allowed institution(s).

Query:

```text
page=1
limit=10
search=rohan
```

Success:

```json
{
  "data": [
    {
      "id": 64,
      "full_name": "Rohan Teacher",
      "email": "rohan@gmail.com",
      "phone": "8546589658",
      "role": "Teacher",
      "role_code": "teacher",
      "is_active": true,
      "is_verified": false,
      "created_at": "2026-06-03T02:42:23.085Z"
    }
  ],
  "pageCount": 1,
  "total": 1
}
```

### POST `/api/admin/users`

Permission:

- `users.create`, `users.all.manage`, or `*`.

Institution scope:

- Platform Admin can create platform or institution users.
- Institution Admin can create/update users only inside their own institution and only with institution-scoped roles.
- Only Platform Admin can assign `platform_admin`.
- Only Platform Admin or Institution Admin can manage role assignment, `is_active`, `is_verified`, and password/security actions.
- Teacher-only profile fields are accepted only when the selected role is `teacher`.
- `profile.designation_id` is required for `institution_admin`, optional for `teacher`, and rejected for `student`, `driver`, and `parent`.

Request:

```json
{
  "full_name": "Rohan Teacher",
  "email": "rohan@gmail.com",
  "phone": "8546589658",
  "avatar_url": null,
  "role_id": 8,
  "is_active": true,
  "is_verified": false,
  "profile": {
    "about": null,
    "is_teacher": true,
    "teacher_type": "institute_teacher",
    "under_institution_id": 5,
    "designation_id": null,
    "gender": null,
    "hourly_charges": null
  },
  "location": null,
  "experiences": [],
  "education": [],
  "certifications": [],
  "teaching_categories": [11],
  "teaching_subjects": [37]
}
```

Teacher rules:

- If `profile.is_teacher` is `true`, `profile.teacher_type` is required.
- If `teacher_type` is `institute_teacher`, `profile.under_institution_id` is required.
- Teacher uses `profile.under_institution_id`; `profile.designation_id` is optional for admin-created/edited teacher records.
- Student and driver use `profile.under_institution_id` and no designation.
- Institution Admin uses `profile.under_institution_id` plus required `profile.designation_id`.
- Parent uses no institution and no designation.

Success:

```json
{
  "data": {
    "id": 64,
    "full_name": "Rohan Teacher",
    "email": "rohan@gmail.com",
    "role": "Teacher",
    "profile": {
      "is_teacher": true,
      "teacher_type": "institute_teacher",
      "under_institution_id": 5,
      "under_institution_name": "M.P. English School",
      "designation_id": null,
      "designation_name": null
    }
  }
}
```

### GET `/api/admin/users/{id}`

Permission:

- `users.read`, `users.all.manage`, or `*`.

Returns full user profile details for admin editing/view sheet.

Institution scope:

- Institution Admin can fetch only users in their institution.

### PATCH `/api/admin/users/{id}`

Permission:

- `users.edit`, `users.all.manage`, or `*`.

Request body is the same shape as create, except password is not included here.

Success:

```json
{
  "data": {
    "id": 64,
    "full_name": "Rohan Teacher",
    "role_id": 8,
    "roles": ["Teacher"],
    "profile": {
      "teacher_type": "institute_teacher",
      "under_institution_id": 5,
      "designation_id": 604
    }
  }
}
```

### DELETE `/api/admin/users/{id}`

Permission:

- `users.delete`, `users.all.manage`, or `*`.

Scope behavior:

- Platform Admin soft deletes the user account and hides it from active admin lists.
- Institution Admin does not delete the account. The user is only removed from the institution(s) the admin is allowed to manage.
- Institution Admin cannot remove a user who is not connected to one of their institutions.

Platform Admin success:

```json
{
  "data": {
    "id": 64,
    "action": "soft_deleted"
  }
}
```

Institution Admin success:

```json
{
  "data": {
    "id": 64,
    "action": "removed_from_institution",
    "institution_ids": [5]
  }
}
```

### PATCH `/api/admin/users/{id}/password`

Permission:

- `users.edit`, `users.all.manage`, or `*`.

Additional scope rule:

- Platform Admin can update any user password.
- Institution Admin can update passwords only for users in their own institution.

Request:

```json
{
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

Success:

```json
{ "success": true }
```

### GET `/api/admin/roles`

Permission:

- `users.read`, `users.all.manage`, or `*`.

Use this for role dropdowns.

Success:

```json
{
  "data": [
    { "id": 7, "name": "Institution Admin", "code": "institution_admin", "scope_code": "institution" },
    { "id": 8, "name": "Teacher", "code": "teacher", "scope_code": "institution" }
  ]
}
```

UI rule:

- Platform Admin sees all assignable roles, including Platform Admin.
- Institution Admin sees institution-scoped roles only; `platform_admin` is hidden and rejected by the user create/update APIs.
- Other roles receive an empty role list and should hide role assignment, Active, Verified, and Security/password controls.

## Access Control APIs

These APIs manage roles, permissions, scopes, memberships, and institution role permission overrides.

Permission:

- `*` only.
- Only Platform Admin/super admin should access these APIs and pages.

Endpoint pattern:

```text
/api/admin/access/{resource}
/api/admin/access/options
```

Resources:

```text
scope-types
permissions
roles
role-permissions
institution-memberships
institution-role-permissions
```

Success list:

```json
{
  "data": [],
  "pageCount": 1,
  "total": 0
}
```

Create/update success:

```json
{ "data": { "id": 1 } }
```

Forbidden:

```json
{ "error": "Forbidden: Admin access required" }
```

## Institution APIs

All institution APIs are scoped.

For public signup institution search, prefer `/api/institutions`. `GET /api/admin/institutions/profiles` is also public-compatible for list reads only. Use all other `/api/admin/institutions/...` endpoints only after login with an admin user and a Bearer token.

Platform Admin:

- Can access all institutions.

Institution Admin:

- Can access only owned/member institutions.
- Lists return only allowed institution records.
- Single-record GET/PATCH/DELETE checks institution ownership before returning or changing data.

### Institution Profiles

| Endpoint | Method | Permission |
| --- | --- | --- |
| `/api/admin/institutions/profiles` | GET | Public active list without Bearer token; scoped admin list with `institutions.institutions.read` or `institutions.institutions.manage` when Bearer token is sent |
| `/api/admin/institutions/profiles` | POST | `institution.create` or `institutions.institutions.manage` |
| `/api/admin/institutions/profiles/{id}` | GET | `institutions.institutions.read` or `institutions.institutions.manage` |
| `/api/admin/institutions/profiles/{id}` | PATCH | `institution.edit` or `institutions.institutions.manage` |
| `/api/admin/institutions/profiles/{id}` | DELETE | `institution.delete` or `institutions.institutions.manage` |

List query:

```text
page=1
limit=10
search=school
```

Success:

```json
{
  "data": [
    {
      "id": 5,
      "name": "M.P. English School",
      "slug": "mp-english-school",
      "status": "active"
    }
  ],
  "pageCount": 1,
  "total": 1
}
```

### Institution Child Modules

| Module | Endpoint Pattern | Permission Family |
| --- | --- | --- |
| Programs | `/api/admin/institutions/programs` and `/api/admin/institutions/programs/{id}` | `institutions.programs.*` |
| Placements | `/api/admin/institutions/placements` and `/api/admin/institutions/placements/{id}` | `institutions.placements.*` |
| Cutoffs | `/api/admin/institutions/cutoffs` and `/api/admin/institutions/cutoffs/{id}` | `institutions.cutoffs.*` |
| Scholarships | `/api/admin/institutions/scholarships` and `/api/admin/institutions/scholarships/{id}` | `institutions.scholarships.*` |
| News | `/api/admin/institutions/news` and `/api/admin/institutions/news/{id}` | `institutions.news.*` |

For each module:

- `GET` list/detail requires `.read` or `.manage`.
- `POST` requires `.create` or `.manage`.
- `PATCH` requires `.edit` or `.manage`.
- `DELETE` requires `.delete` or `.manage`.
- Institution Admin can only access records whose `institution_id` is in their allowed institutions.

### Institution Master Data

GET requests are shared lookups for authenticated users. Writes require module permissions.

| Endpoint Pattern | Write Permission Family |
| --- | --- |
| `/api/admin/institutions/types` | `institutions.master.institution_type.*` |
| `/api/admin/institutions/subtypes` | `institutions.master.institution_subtype.*` |
| `/api/admin/institutions/program-types` | `institutions.master.program_type.*` |
| `/api/admin/institutions/facility-types` | `institutions.master.facility_type.*` |
| `/api/admin/institutions/languages` | `institutions.master.language.*` |

## Content APIs

GET requests for these are shared authenticated lookups. Writes require module permissions.

| Endpoint Pattern | Write Permission Family |
| --- | --- |
| `/api/admin/categories/tree` | `content.categories.tree.*` |
| `/api/admin/categories` | `content.categories.manage_categories.*` |
| `/api/admin/boards` | `content.categories.boards.*` |
| `/api/admin/subjects` | `content.categories.subjects.*` |
| `/api/admin/master-data/skills` | `content.master.skills.*` |
| `/api/admin/master-data/designations` | `content.master.designations.*` |
| `/api/admin/master-data/locations` | `content.master.locations.*` |
| `/api/admin/institutions/institution-media` | `content.media.*` |
| `/api/admin/institutions/program-media` | `content.media.*` |

### Authenticated Upload

`POST /api/admin/uploads/image` requires only a valid access token. It does not require `content.media.*`, because avatar/profile/form uploads are needed by many roles.

Request:

```http
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `file` | file | Yes | Image or video file. Images max 5MB. Videos max 100MB. |

Success:

```json
{
  "data": {
    "url": "https://res.cloudinary.com/.../file.webp",
    "public_id": "program_media/file",
    "resource_type": "image",
    "media_type": "image"
  }
}
```

Errors:

- `401` when token is missing or invalid.
- `400` when `file` is missing.
- `422` when file type or size is not allowed.
- `502` when Cloudinary upload fails.

## Tracker APIs

### Public Tracker

These are public website/tracker APIs and do not require admin permission.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/tracker/settings` | GET | Public tracker settings. |
| `/api/tracker/activity` | POST | Track user activity. |
| `/api/tracker/lead` | POST | Create lead from public flow. |

### Admin Tracker

| Endpoint Pattern | Permission Family |
| --- | --- |
| `/api/admin/tracker/settings` | `settings.tracker.*` |
| `/api/admin/tracker/sessions` | `tracker.*` |
| `/api/admin/tracker/sessions/{token}` | `tracker.*` |

## AI and Settings APIs

| Endpoint Pattern | Permission Family |
| --- | --- |
| `/api/admin/ai/providers` | `settings.ai.*` |
| `/api/admin/ai/content-types` | `settings.ai.*` |
| `/api/admin/ai/field-settings` | `settings.ai.*` |
| `/api/admin/ai/generate` | `settings.ai.*` |

## Account API

### GET `/api/admin/account`

Returns the current logged-in user's complete account/profile view.

Permission:

- User must be authenticated and allowed into the admin area.

Success:

```json
{
  "data": {
    "full_name": "Test User Mohit",
    "roles": ["Institution Admin"],
    "profile": {},
    "memberships": []
  }
}
```

## Flutter Implementation Checklist

1. On login, save only `accessToken` and minimal session user.
2. Send `Authorization: Bearer <accessToken>` on every protected request.
3. Use `/api/auth/me` at app start to restore the session.
4. Use `allowed_admin_paths` only for UI navigation hints.
5. If an API returns `403`, show a permission denied screen.
6. If an API returns `401`, refresh/re-login.
7. For dropdown/search fields, use server search with `page` and `limit`.
8. For institution admins, never assume they can see all institutions or all users. The server will scope responses.
9. For page access, require `.read` or `.manage`.
10. For actions, show buttons only when the API/action permission is available from server-provided UI policy or from a future dedicated capability endpoint.

## Recommended Future Mobile Capability Endpoint

For Flutter, avoid exposing raw permission lists in login. If the app needs button-level visibility, add a dedicated endpoint later:

```text
GET /api/auth/capabilities
```

Recommended response:

```json
{
  "admin": {
    "can_access": true,
    "allowed_paths": ["/admin/users"],
    "actions": {
      "users": ["read", "create", "edit"],
      "institutions.programs": ["read", "manage"]
    }
  }
}
```

This endpoint should still be treated as UI hints only. The real security check remains on the API route.


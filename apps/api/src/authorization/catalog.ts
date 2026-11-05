export const targetTypes = ["global"] as const;

export type TargetType = (typeof targetTypes)[number];

type PermissionDefinition = {
  code: string;
  name: string;
  description: string;
  targetType: TargetType;
  active: true;
};

type ModuleDefinition = {
  code: string;
  name: string;
  active: true;
  permissions: readonly PermissionDefinition[];
};

export const authorizationModules = [
  {
    code: "users",
    name: "Users",
    active: true,
    permissions: [
      { code: "view-users", name: "View Users", description: "View user accounts.", targetType: "global", active: true },
      { code: "list-users", name: "List Users", description: "List user accounts.", targetType: "global", active: true },
      { code: "detail-users", name: "Detail Users", description: "View a user account.", targetType: "global", active: true },
      { code: "create-users", name: "Create Users", description: "Create user accounts.", targetType: "global", active: true },
      { code: "update-users", name: "Update Users", description: "Update user accounts.", targetType: "global", active: true },
    ],
  },
  {
    code: "roles",
    name: "Roles",
    active: true,
    permissions: [
      { code: "view-roles", name: "View Roles", description: "View roles.", targetType: "global", active: true },
      { code: "list-roles", name: "List Roles", description: "List roles.", targetType: "global", active: true },
      { code: "detail-roles", name: "Detail Roles", description: "View a role.", targetType: "global", active: true },
      { code: "create-roles", name: "Create Roles", description: "Create roles.", targetType: "global", active: true },
      { code: "update-roles", name: "Update Roles", description: "Update roles.", targetType: "global", active: true },
      { code: "delete-roles", name: "Delete Roles", description: "Delete roles.", targetType: "global", active: true },
    ],
  },
  {
    code: "permissions",
    name: "Permissions",
    active: true,
    permissions: [
      { code: "view-permissions", name: "View Permissions", description: "View permissions.", targetType: "global", active: true },
      { code: "list-permissions", name: "List Permissions", description: "List permissions.", targetType: "global", active: true },
      { code: "detail-permissions", name: "Detail Permissions", description: "View a permission.", targetType: "global", active: true },
    ],
  },
  {
    code: "role-permissions",
    name: "Role Permissions",
    active: true,
    permissions: [
      { code: "list-role-permissions", name: "List Role Permissions", description: "List a role's permissions.", targetType: "global", active: true },
      { code: "create-role-permissions", name: "Grant Role Permission", description: "Grant a permission to a role.", targetType: "global", active: true },
      { code: "delete-role-permissions", name: "Revoke Role Permission", description: "Revoke a permission from a role.", targetType: "global", active: true },
    ],
  },
  {
    code: "role-assignments",
    name: "Role Assignments",
    active: true,
    permissions: [
      { code: "list-role-assignments", name: "List Role Assignments", description: "List a user's roles.", targetType: "global", active: true },
      { code: "create-role-assignments", name: "Assign Role", description: "Assign a role to a user.", targetType: "global", active: true },
      { code: "delete-role-assignments", name: "Unassign Role", description: "Remove a role from a user.", targetType: "global", active: true },
    ],
  },
  {
    code: "test-runner",
    name: "Test Runner",
    active: true,
    permissions: [
      { code: "view-test-sets", name: "View Test Sets", description: "View test sets and cases.", targetType: "global", active: true },
      { code: "manage-test-sets", name: "Manage Test Sets", description: "Create and edit test sets and cases.", targetType: "global", active: true },
      { code: "execute-test-runs", name: "Execute Test Runs", description: "Run test sets.", targetType: "global", active: true },
      { code: "view-test-runs", name: "View Test Runs", description: "View test run results.", targetType: "global", active: true },
    ],
  },
  {
    code: "cloudflare-os-management",
    name: "Cloudflare OS Management",
    active: true,
    permissions: [
      { code: "view-agent-instructions", name: "View Agent Instructions", description: "View deployment-wide agent instructions.", targetType: "global", active: true },
      { code: "manage-agent-instructions", name: "Manage Agent Instructions", description: "Edit deployment-wide agent instructions.", targetType: "global", active: true },
      { code: "view-skills-context", name: "View Skills and Context", description: "View context collections, documents, and skills.", targetType: "global", active: true },
      { code: "manage-skills-context", name: "Manage Skills and Context", description: "Manage web context collections, documents, and skills.", targetType: "global", active: true },
      { code: "view-model-providers", name: "View Model Providers", description: "View account models and deployment model metadata.", targetType: "global", active: true },
      { code: "view-connectors", name: "View Connectors", description: "View deployment connector availability and resource types.", targetType: "global", active: true },
    ],
  },
] as const satisfies readonly ModuleDefinition[];

export type AuthorizationModuleCode = (typeof authorizationModules)[number]["code"];
export type PermissionCode = (typeof authorizationModules)[number]["permissions"][number]["code"];

export const permissionByCode = Object.freeze(
  Object.fromEntries(
    authorizationModules.flatMap((module) =>
      module.permissions.map((permission) => [permission.code, { module, permission }]),
    ),
  ) as Record<
    PermissionCode,
    {
      module: (typeof authorizationModules)[number];
      permission: (typeof authorizationModules)[number]["permissions"][number];
    }
  >,
);

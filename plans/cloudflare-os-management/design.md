# Cloudflare OS management

Design: Approved
Implementation: Current

## 1. Purpose and scope

Add four Carta menus backed by the current Cloudflare OS RPC API: Agent
Instructions, Skills and Context, Model Providers, and Connectors. Cloudflare
OS remains the source of truth. Use the configured backend account and local
endpoint. Do not store duplicate configuration in Carta tables. Credentials
and session capabilities stay in the backend.

This record covers the requested menus. It does not change experiments,
operational data, the runner, or framework packages. Browser tests remain
disabled by user instruction.

## 2. Functional requirements

| # | Capability | Users and access | Expected result |
|---|---|---|---|
| R1 | Agent Instructions | Carta manage permission and upstream administrator | One form loads and saves deployment-wide instructions through the same API as Cloudflare OS /admin. |
| R2 | Skills and Context | Carta view/manage permissions and upstream collection permissions | One combined menu lists collections. Collection detail contains its documents and skills, with standard create, read, update, and delete controls where allowed. |
| R3 | Model Providers | Carta view permission | Read-only provider and model lists/details combine account-configured models with deployment AI Gateway metadata when available. |
| R4 | Connectors | Carta view permission and upstream administrator for admin inventory | Read-only list/details show deployment connector availability and advertised resource types. |

Use standard Carta ListView, DetailView, and forms. The user requested a standard
Card with a text heading for Agent Instructions, without NavigationHeader. Keep
the form in its separate content Card below the header Card.
Skills and Context is a top-level menu. Agent Instructions, Model Providers,
and Connectors remain in Settings. Test Sets and Test Runs share a separate
Test Runner navigation group.
Do not add explanatory information cards above these menus.
No custom import format or
Cloudflare OS iframe is needed. Keep new configuration permissions separate
from test-set permissions. No provider tests, model requests, connector
connections, credential changes, or enable/disable actions belong to the
read-only pages.

## 3. Data and business rules

| Record | Fields shown or edited | Rules |
|---|---|---|
| Instructions | Instruction text | Deployment-wide, not workspace-specific. Maximum 8000 characters. Empty text clears instructions. This edits the instance instruction text, not the entire built-in system prompt. |
| Collection | ID, title, description, optional icon, visibility, content source, document count, timestamps | CRUD for web-managed collections. Public collection creation requires upstream admin. Keep visibility fixed on edit because the current update API does not offer visibility conversion. |
| Context document | Path, description, text body, content type, returned timestamps | Scoped to its collection. Respect upstream edit permissions. Path identifies the document. Use ordinary text forms. |
| Skill | Manifest path, description, Markdown body, supporting documents | Uses the same collection storage. Use the skill-specific create and delete methods so directory validation and removal of supporting files follow Cloudflare OS rules. Keep skills and documents in one menu. |
| Provider/model | Provider, model ID/name, safe endpoint and runtime configuration, source, upstream availability metadata | Read only. Account-configured models are user-scoped; AI Gateway configuration is deployment-scoped. Secrets and secret-bearing headers/URL fields are excluded from browser responses. No inferred health status. |
| Connector | Vendor ID/name, ordinary enabled state or ambient mode, advertised resource type title/description/pattern and enabled state | Deployment inventory, not a list of active workspace connections. Resource patterns are not tool signatures. Do not invent tool lists or connection health. |

Read provider configuration with listModels/getModelConfig and the optional
gatewayModels section of AdminApi.getSettings. Read connector inventory from
resourceVendors in those settings. A missing gatewayModels section means the
instance is not in AI Gateway mode; it does not mean it has no models.

Read instructions through getAdminApi/getSettings and save with
setInstanceInstructions. Access the Context management capability through
getGatekeeperApp('context').ui, then call its collection/document/skill API.
The Context capability is account-scoped, not specific to the configured
experiment workspace. Respect returned collection permissions.

Git-backed content is read-only in this initial UI. Git token management,
sharing administration, archive import/export, and moving or renaming skill
directories are outside the requested basic CRUD scope.

## 4. User journeys and workflows

1. Open Agent Instructions, load the current text, edit, and submit. Show that
   the change applies across the deployment before saving.
2. Open Skills and Context, select or create a collection, and manage its
   documents and skills from the collection detail.
3. Open Model Providers or Connectors to inspect current configuration.

| Trigger or condition | Result | Next step |
|---|---|---|
| Blank instructions or empty collection list | Show the actual empty state. | User can enter instructions or create a collection. |
| Missing upstream admin or collection edit access | Show access denial or read-only controls, as applicable. | Do not attempt the write. |
| Context management capability is unavailable | Show that Skills and Context is unavailable. | Configure it in Cloudflare OS outside this page. |
| Request fails | Show the error and preserve form input. | User can retry. |
| Save succeeds but reload fails | Report saved data with a refresh error. | Refresh without repeating the write. |

Disable duplicate submissions. Confirm deletion with the collection or item
name and its scope. Refresh affected data after writes. No automatic fallback
to a different workspace, account, or Cloudflare OS instance.

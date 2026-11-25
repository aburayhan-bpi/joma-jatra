
## UI Guidelines
- Use 'cursor-pointer' (or 'hover:cursor-pointer') on all clickable elements like buttons and links to ensure the hand cursor appears. Be careful not to add it pointlessly to non-interactive elements.

## Core Operational Workflow & Security
- **End-to-End Delivery:** Every feature must be fully synced between Backend (API, DB) and Frontend (Redux, UI components). No half-done features.
- **Security Sync:** Strict Role-based access control (RBAC) must be enforced on both API routes and Frontend pages/actions. Ensure there are no security gaps.
- **Type Safety:** Always run `pnpm check` and resolve any TypeScript/linting issues safely and carefully before finalizing a feature.
- **API Response Structure:** All API responses must strictly follow the `IBaseResponse` format: `{ success, statusCode, message, meta, data }` (with `message` placed at the top level alongside success and statusCode).
- **Postman Generation & Cloud Sync:** Whenever any API endpoint is added, updated, or removed, you MUST:
  1. Update `postman/joma-jatra.postman_collection.json` with exact request definitions (method, URL, query params, headers, body, test scripts) and accurate `IBaseResponse` saved response examples (using anonymized dummy emails/phones only — never real personal data or secrets).
  2. Sync those exact changes to the connected Postman Cloud collection (`JomaJatra — Pure Money Management API (v1)` in `My Workspace`) via the Postman MCP (`postman_postman`) using targeted request/response tools (`createCollectionRequest`, `updateCollectionRequest`, `deleteCollectionRequest`, `createCollectionResponse`, `updateCollectionResponse`) in small batches (5–8 calls per batch) so local JSON and Postman Cloud stay 100% in sync.
- **Pagination & Search:** Every API that handles lists of data must have a pagination filter and search implementation.
  - Frontend Pagination tools: `src/components/dashboard/pagination.tsx` and `src/utils/setParamsForPagination.tsx`
  - Frontend Search tools: `src/hooks/useDebounce.ts`
- **Soft Delete:** Use soft deletion instead of hard deletion. Always implement a Restore User/Data system so that data can be recovered if necessary.

## Coding Standards & Code Quality
- **Clean Architecture & Human-like Code:** Do NOT write messy, complex, "AI-like" code. Write clean, simple, and maintainable code just like a real professional human developer.
- **Commenting:** Always use clear, descriptive comment lines to explain what the code does so that future developers can easily understand the logic.
- **Framework Best Practices:** Always use framework-specific optimized components. For example, in Next.js, NEVER use the native HTML `<img>` tag; always use `<Image>` from `next/image`. Be extremely careful to follow the native features and conventions of the framework you are working in.

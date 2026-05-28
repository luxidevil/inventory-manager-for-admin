---
name: Generated hook naming convention
description: Orval-generated React Query hooks use verb-first names, not REST-verb names
---

The Orval codegen in this project generates hooks with operation-id-based names, NOT REST-verb-based names.

**Rule:** Always check the actual exports in `lib/api-client-react/src/generated/api.ts` before using hooks.

**Pattern observed:**
- `useListBatches` (not `useGetBatches`)
- `useCreateBatch` (not `usePostBatches`)
- `useUpdateBatch` (not `usePatchBatchesId`)
- `useDeleteBatch` (not `useDeleteBatchesId`)
- `useListInventory` (not `useGetInventory`)
- `useListSales`, `useCreateSale`, `useRenewSale`
- `useListReports`, `useCreateReport`, `useUpdateReport`
- `useReplaceReportItem`, `useBulkReplaceReport`
- `useListNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`
- `useListSettlements`, `useCreateSettlement`
- `useListContacts`, `useCreateContact`, `useUpdateContact`, `useDeleteContact`
- `useListUsers`, `useUpdateUser`, `useDeleteUser`
- `useLogin`, `useRegister`, `useLogout` (not `usePostAuthLogin`)
- `useGetDashboardStats`, `useGetRecentActivity`, `useGetExpirySummary`
- `useExtractEmails`, `useUploadBatchRecords`

**Why:** Orval uses the OpenAPI operationId field to name hooks. This project's OpenAPI spec uses descriptive operation IDs rather than HTTP method + path patterns.

**How to apply:** Before writing any frontend hook import, grep the generated file: `grep "^export" lib/api-client-react/src/generated/api.ts`

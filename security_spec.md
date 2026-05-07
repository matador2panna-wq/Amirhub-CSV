# Security Specification - Shutter-Gen

## 1. Data Invariants
- A user document must exist in the `/users/` collection with the document ID matching the user's Firebase Authentication UID.
- Users can only read and write their own documents.
- API keys must be stored in an array of exactly 5 strings (or fewer if allowed, but schema says array of strings).
- `updatedAt` must be a server timestamp.

## 2. Dirty Dozen Payloads (Rejection Tests)

1. **Identity Spoofing**: Attempt to write to `/users/someone_else_id` while authenticated as `my_id`.
2. **Unauthenticated Write**: Attempt to create/update `/users/my_id` without being signed in.
3. **Shadow Field Injection**: Attempt to add an `isAdmin: true` field to the user document.
4. **Invalid Type (mistralApiKeys)**: Send `mistralApiKeys` as a string instead of an array.
5. **Malicious ID Poisoning**: Attempt to create a document with an ID that is 2KB long.
6. **PII Leakage**: Attempt to list all documents in `/users/` to find other users' emails.
7. **Bypass Validation**: Attempt to update `mistralApiKeys` without including the mandatory `updatedAt` field.
8. **Resource Exhaustion**: Send an array of 50,000 API keys.
9. **Identity Integrity Failure**: `setDoc` with a valid UID but `updatedAt` set to a client-controlled date from 2005.
10. **Orphaned Write**: Attempting to write to a subcollection that doesn't exist (though none defined).
11. **State Shortcut**: (Not applicable to this simple CRUD).
12. **Conflict Resolution**: Attempting to overwrite `updatedAt` with an older timestamp.

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would verify these rejections.

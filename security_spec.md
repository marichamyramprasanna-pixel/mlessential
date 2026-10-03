# Security Specification: Firestore Rules for Network Anomaly Detection

## 1. Data Invariants

1. **User Identity Invariant**: Documents stored under `/users/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId`.
2. **Session Ownership Invariant**: Analysis sessions stored under `/users/{userId}/sessions/{sessionId}` must have `incoming().userId == request.auth.uid`, ensuring users cannot inject session runs into another user profile.
3. **Immutability of Identity**: On session updates, `incoming().userId == existing().userId` and `incoming().sessionId == existing().sessionId`.
4. **Denial-of-Wallet & Size Enforcements**: Document IDs must conform to `^[a-zA-Z0-9_-]+$` with length <= 128. Strings are bounded by length constraints.
5. **No Blanket Reads**: Listing sessions is strictly bounded to the user's own subcollection `/users/{userId}/sessions` where `request.auth.uid == userId`.

## 2. The Dirty Dozen Payloads (Target Rejection Scenarios)

1. **Unauthenticated Read**: Attempting to read `/users/user123` with `request.auth == null` -> DENIED.
2. **Cross-User Profile Read**: User A (`auth.uid = "userA"`) attempting to get `/users/userB` -> DENIED.
3. **Cross-User Session Creation**: User A attempting to create `/users/userB/sessions/session1` -> DENIED.
4. **ID Poisoning in Path**: Attempting to access `/users/user<script>alert(1)</script>` -> DENIED.
5. **Session ID Spoofing**: Attempting to create a session document where `incoming().userId` does not match `request.auth.uid` -> DENIED.
6. **Massive String Injection**: Attempting to write a 1MB payload in `title` or `datasetName` -> DENIED.
7. **Unbounded Feature Array**: Attempting to write 5,000 array elements into `selectedFeatures` -> DENIED.
8. **Negative Anomaly Count**: Attempting to write negative `totalRecords` or negative `numAnomalies` -> DENIED.
9. **Global Catch-All Access**: Attempting to read or write an arbitrary collection `/randomCollection/doc1` -> DENIED.
10. **Ownership Hijack on Update**: Attempting to update `/users/userA/sessions/session1` to set `userId: "userB"` -> DENIED.
11. **Session Delete by Non-Owner**: User B attempting to delete `/users/userA/sessions/session1` -> DENIED.
12. **Ghost Field Injection**: Attempting to inject administrative privilege fields (`isAdmin: true`) into user profile -> DENIED.

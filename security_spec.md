# Security Specification — Apex Bankroll Firestore Rules

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document under `/users/{userId}` and its subcollections (`bets`, `treasury`, `freebets`, `free_spins`) belongs strictly to `userId` (`request.auth.uid == userId` and `data.userId == request.auth.uid`).
2. **Email Verification**: Every authenticated write requires `request.auth.token.email_verified == true`.
3. **Master Gate**: Subcollection single-document reads/writes (`bets`, `treasury`, `freebets`, `free_spins`) verify parent `/users/{userId}` exists (`exists(...)`), while `allow list` strictly evaluates `resource.data.userId == request.auth.uid` without DB lookups.
4. **Immutable Ownership & Timestamps**: `uid` / `userId` and `createdAt` cannot change after creation; `createdAt` and `updatedAt` must equal `request.time`.
5. **Strict Schema & Bounds**: Every string enforces `is string` and `.size() <= MAX`; every enum enforces `in [...]`; shadow/ghost keys are blocked via `hasOnly(...)` and `affectedKeys().hasOnly(...)`.

## 2. Dirty Dozen Adversarial Payloads
1. **Unauthenticated read/write**: `{ userId: "userA" }` with `auth = null` -> `PERMISSION_DENIED`.
2. **Unverified email write**: `auth.token.email_verified = false` -> `PERMISSION_DENIED`.
3. **Cross-user read (`users/{otherUid}`)**: `auth.uid = "userA"`, target `users/userB` -> `PERMISSION_DENIED`.
4. **Cross-user bet write (`users/{otherUid}/bets/b1`)**: `auth.uid = "userA"` -> `PERMISSION_DENIED`.
5. **Identity spoofing on create**: `auth.uid = "userA"`, `users/userA/bets/b1` payload has `userId: "userB"` -> `PERMISSION_DENIED`.
6. **Shadow/Ghost key injection on create**: `users/userA` with `{ ..., isAdmin: true }` -> `PERMISSION_DENIED`.
7. **Shadow/Ghost key injection on update**: `users/userA/bets/b1` update with `affectedKeys` containing `userId` or `hacked: true` -> `PERMISSION_DENIED`.
8. **Path ID poisoning**: `betId` length > 128 or containing `$` / `.` -> `PERMISSION_DENIED`.
9. **String length exhaustion (Denial of Wallet)**: `event` > 200 chars -> `PERMISSION_DENIED`.
10. **Invalid enum value**: `status: "HACKED"` or `type: "INVALID"` -> `PERMISSION_DENIED`.
11. **Client-spoofed timestamp**: `createdAt: "2020-01-01T00:00:00Z"` instead of server `request.time` -> `PERMISSION_DENIED`.
12. **Mutation of immutable `createdAt` or `userId`**: update changing `createdAt` or `userId` -> `PERMISSION_DENIED`.

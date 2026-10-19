# Architecture & Technical Decisions — Jungle Gaming Backend

## 1. Stack & ORM Choice
- **MikroORM:** Selected for its explicit Unit of Work, Identity Map, and native support for fine-grained transaction boundaries (`em.transactional`) and strict row locking modes (`LockMode.PESSIMISTIC_WRITE`).
- **Domain vs Persistence Separation:** Pure domain models (`Wallet`, `WagerTransaction`) are strictly decoupled from ORM persistence entities (`WalletEntity`, `WagerTransactionEntity`) to prevent metadata leaking and domain model pollution.

## 2. Concurrency & Hot Wallet Protection
- **Pessimistic Locking (`FOR UPDATE`):** To prevent race conditions, lost updates, and double-spending on hot wallets, the system acquires an explicit pessimistic write lock (`LockMode.PESSIMISTIC_WRITE`) during transaction execution.
- **Why not `SKIP LOCKED`?** `SKIP LOCKED` is reserved for task queues. For financial wallets, concurrent requests must wait in line sequentially to ensure correct balance validation and sequencing.

## 3. Financial Accuracy & Invariants
- **No Floats:** Monetary amounts are handled strictly using a domain-safe `Money` value object backed by string representations with a fixed scale of 2 decimal places to prevent floating-point rounding errors.
- **Database Constraints:** Invariants such as balance non-negativity, uniqueness constraints on player currency pairs, and immutable ledger entries are enforced at the PostgreSQL schema level via check constraints and unique indexes.

## 4. Idempotency & Message Delivery
- **Persistent Inbox/Outbox Pattern:** Inbox tables prevent duplicate message processing from SQS, while Outbox tables ensure that database commits and event dispatches are transactional. Events are never published before the underlying database transaction commits.
- **Payload Hashing:** Idempotency keys are validated alongside a canonical payload hash. Identical keys with conflicting payloads are explicitly rejected as conflicts rather than replayed.

## 5. Authentication Strategy
- Authentication is structured around an external Identity Provider boundary port (OIDC/Bearer token validation). For the challenge scope, transport channels like SQS are treated as trusted internal conduits while message-level provider validation remains enforced by domain rules.
# Jungle Gaming Distributed Wagering Processor

A distributed financial transaction processing service built with NestJS, Bun, PostgreSQL, and MikroORM, implementing Clean Architecture and Domain-Driven Design (DDD).

## Prerequisites

- [Bun](https://bun.sh/) (v1.x)
- [Docker & Docker Compose](https://www.docker.com/) (for PostgreSQL)

## Environment Variables

Copy the example environment file and configure your local settings if needed:

\`\`\`bash
cp .env.example .env
\`\`\`

Example `.env` configuration used for testing and local development:
\`\`\`env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=jungle_gaming_test
\`\`\`

## Getting Started

1. **Start the Database via Docker Compose:**
   \`\`\`bash
   docker compose up -d
   \`\`\`

2. **Install Dependencies:**
   \`\`\`bun
   bun install
   \`\`\`

3. **Run the Test Suite (Unit, Integration, and Concurrency):**
   \`\`\`bash
   bun test --preload ./src/test-setup.ts
   \`\`\`

4. **Run the Application:**
   \`\`\`bash
   bun run start:dev
   \`\`\`
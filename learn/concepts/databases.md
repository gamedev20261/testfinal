# Databases, SQL, Prisma and Docker

## 1. What a relational database is

A **database** stores data so it survives restarts and can be searched quickly.
A *relational* database like **PostgreSQL** stores data in **tables**, like spreadsheets
with strict rules.

`users` table:

| id (primary key) | name | email (unique) | passwordHash | role | createdAt |
|---|---|---|---|---|---|
| `8dbd9b2a-…` | Administrator | admin@example.com | `$2b$12$F6Wq…` | ADMIN | 2026-09-29 04:30 |
| `51c0e7f3-…` | Sara Khan | sara@example.com | `$2b$12$Kd9x…` | ANNOTATOR | 2026-09-30 09:12 |

- A **table** holds one kind of thing (users, projects, labels…).
- A **row** is one thing (one user).
- A **column** is one property, with a fixed **type**: text, number, date, true/false…
- The **primary key** (`id`) uniquely identifies each row. We use **UUIDs**: random
  36-character ids like `8dbd9b2a-2b52-4eb3-a45e-05c1cadba126`. Unlike 1, 2, 3, they
  can't be guessed, and they can be created anywhere without asking the database.
- A **unique** column (`email`) can't contain the same value twice.
- An **enum** column (`role`) only accepts values from a fixed list.

Later, tables point at each other. A project row will store its owner's user `id`:
that is a **foreign key**, and it's what makes the database *relational*.

## 2. SQL: the database's language

Databases understand **SQL** (Structured Query Language):

```sql
SELECT id, name, role FROM users WHERE email = 'admin@example.com';
INSERT INTO users (id, name, email, "passwordHash", role) VALUES ('…', 'Sara', 'sara@example.com', '…', 'ANNOTATOR');
UPDATE users SET name = 'Sara K.' WHERE id = '…';
DELETE FROM users WHERE id = '…';
```

Those four verbs (read, create, change, remove) match the HTTP methods
`GET`, `POST`, `PATCH`, `DELETE`. This pattern is called **CRUD**
(Create, Read, Update, Delete), and most of our app is CRUD.

## 3. Prisma: SQL from TypeScript

Writing SQL strings by hand inside TypeScript is error-prone: a typo in a column name is
only found when the query runs. An **ORM** (Object-Relational Mapper) lets you query the
database with normal, *typed* code. We use **Prisma**:

```ts
// SQL: SELECT * FROM users WHERE email = 'admin@example.com' LIMIT 1
const user = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });

user.name;   // ✅ string
user.nmae;   // ❌ underlined by TypeScript: no such column
```

Prisma has three parts:

```mermaid
flowchart LR
    S["schema.prisma<br/>(you write it)"] -- "prisma migrate dev" --> M["migrations/*.sql<br/>(SQL that changes the database)"] --> DB[(PostgreSQL)]
    S -- "prisma generate" --> C["src/generated/prisma<br/>(typed client code)"] --> App["our code:<br/>prisma.user.findUnique(...)"]
    App --> DB
```

1. **The schema** (`prisma/schema.prisma`): you describe your tables once, in a readable format.
2. **Migrations**: Prisma compares the schema with the database and writes the SQL to
   bring the database up to date (`CREATE TABLE …`, `ALTER TABLE …`). Each change becomes
   a numbered folder in `prisma/migrations/` and is committed to git, so every computer
   builds the exact same database, step by step.
3. **The client**: Prisma generates TypeScript code from the schema, with a function for
   every table and a type for every row. That generated code is what gives you
   autocomplete and type errors.

### Prisma Studio

`npm run db:studio` opens a web page (http://localhost:5555) where you can browse and
edit every table. Use it constantly while learning: after every action in the app, look
at what changed in the database.

## 4. Docker: a database without installing one

Installing PostgreSQL by hand differs on every operating system. **Docker** runs programs
inside **containers**: small, isolated boxes that already contain the program and
everything it needs.

- An **image** is the recipe (`postgres:16-alpine` = PostgreSQL 16 on a tiny Linux).
- A **container** is a running copy of an image.
- A **volume** is storage that outlives the container, so your data survives
  `docker compose down`.
- **Port mapping** `5432:5432` connects port 5432 on your computer to port 5432 inside the
  container, so our backend reaches the database at `localhost:5432`.

`docker-compose.yml` describes the containers; `docker compose up -d` starts them.

## 5. The connection string

The backend finds the database through one URL in `.env`:

```
postgresql://geo:geo_dev_password@localhost:5432/geoannotator
└───┬────┘   └┬┘ └──────┬───────┘ └───┬───┘ └┬─┘ └────┬─────┘
  driver     user    password        host   port   database
```

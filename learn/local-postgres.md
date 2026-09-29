# Run the database without Docker (PostgreSQL + pgAdmin)

Use this guide if PostgreSQL is **installed on your computer** (you open it with pgAdmin 4)
instead of running in Docker. Only **one file** changes: `backend/.env`. You don't need
`docker-compose.yml` at all.

## 1. Know your PostgreSQL password

When you installed PostgreSQL, the installer asked you to choose a password for the
**`postgres`** user (the database's built-in administrator). It's the same password pgAdmin
asks for when you open *Servers → PostgreSQL*. You'll put it in `.env`.

Also check the **port** (almost always `5432`): in pgAdmin, right-click your server →
*Properties* → *Connection* tab → *Port*.

## 2. Create `backend/.env`

`backend/.env` is your personal settings file. It is **not** in git (see `.gitignore`),
so after cloning you have to create it from the template:

- **In VS Code** (easiest): in the Explorer, right-click `backend/.env.example` → *Copy*,
  right-click the `backend` folder → *Paste*, then rename the copy to exactly `.env`.
- **Or in a terminal** inside `backend/`:
  - PowerShell / Git Bash / macOS / Linux: `cp .env.example .env`
  - Windows `cmd`: `copy .env.example .env`

> ⚠️ Don't create it with Windows Notepad: it may silently save it as `.env.txt`, and the
> backend won't find it. In VS Code the name at the top of the tab must be exactly `.env`.

## 3. Change one line: `DATABASE_URL`

Open `backend/.env` and replace the `DATABASE_URL` line with:

```
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/geoannotator
```

Replace `YOUR_POSTGRES_PASSWORD` with your password from step 1. Piece by piece:

```
postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/geoannotator
             └──┬───┘ └─────────┬──────────┘ └───┬───┘ └┬─┘ └────┬─────┘
              user          password            host   port   database name
```

- `geoannotator` is the database our app uses. **It doesn't have to exist yet**: the next
  step creates it.
- If your port isn't 5432, change it here.

Save the file. Leave every other line as it is.

### Passwords with symbols

A URL uses some symbols for itself (`@` separates the password from the host, `#` starts a
comment…). If your password contains any of these, write the code instead:

| Symbol | Write | Example: password `Pak@12#3` becomes |
|---|---|---|
| `@` | `%40` | `Pak%4012%233` |
| `#` | `%23` | |
| `:` | `%3A` | |
| `/` | `%2F` | |
| `?` | `%3F` | |
| `%` | `%25` | |

Letters and digits need nothing. Or ask Node:
`node -e "console.log(encodeURIComponent('Pak@12#3'))"`.

## 4. Create the tables and the admin, then start

In a terminal inside `backend/`:

```bash
npm install          # packages (once, and after pulling new patches)
npm run db:migrate   # creates the "geoannotator" database and its tables
npm run db:seed      # creates the admin: "Created admin admin@example.com"
npm run dev          # starts the API
```

`npm run db:migrate` prints `PostgreSQL database geoannotator created at localhost:5432`
the first time. The terminal of `npm run dev` should show **both** lines:

```
INFO: API ready on http://localhost:3001
INFO: Database connected: postgres@localhost:5432/geoannotator
```

Check http://localhost:3001/api/health → `{"status":"ok","database":"ok",…}`.

## 5. See the data in pgAdmin

*Servers → PostgreSQL → Databases* → right-click → *Refresh*. Then open
*geoannotator → Schemas → public → Tables*. Right-click **users** →
*View/Edit Data → All Rows*: your admin, with a `passwordHash` starting with `$2b$12$`.

The table `_prisma_migrations` is Prisma's record of which migrations already ran.
Don't edit it.

(`npm run db:studio` shows the same data in the browser, if you prefer.)

## Optional: a separate database user

Using the `postgres` administrator for an app works, but real projects give each app its
own user with fewer rights. To do that, open pgAdmin → select your server → *Tools* →
*Query Tool*, and run:

```sql
CREATE ROLE geo WITH LOGIN CREATEDB PASSWORD 'geo_dev_password';
```

Then the `DATABASE_URL` from `.env.example` works unchanged:
`postgresql://geo:geo_dev_password@localhost:5432/geoannotator`.
(`CREATEDB` is needed because `npm run db:migrate` creates the database, plus a temporary
*shadow database* it uses to check migrations.)

## Troubleshooting

The backend prints what went wrong when it starts. Find the message here:

| You see | Cause | Fix |
|---|---|---|
| `backend/.env was not found` | No `.env` in the `backend` folder (or it's called `.env.txt`) | Step 2 |
| `JWT_SECRET: must be at least 32 characters` or `DATABASE_URL: Invalid input` | A line in `.env` is missing or mistyped | Compare with `.env.example` |
| `password authentication failed for user "postgres"` | Wrong password (or user) in `DATABASE_URL` | Use the password you type in pgAdmin |
| `P1000: Authentication failed …` (from `db:migrate`) | Same as above | Same as above |
| `database "geoannotator" does not exist` | The database wasn't created yet | `npm run db:migrate` |
| `Can't reach database server at 127.0.0.1:5432` | PostgreSQL isn't running, or uses another port | Windows: press `Win+R`, type `services.msc`, find *postgresql-x64-…* → *Start*. Check the port (step 1). |
| `Cannot connect to the database postgres@12:5432` (a strange host) | A symbol in the password broke the URL | Encode it (step 3) |
| `P3014 … could not create the shadow database` | The database user may not create databases | Use `postgres`, or give your user `CREATEDB` (see above) |
| `listen EADDRINUSE … :3001` | A backend is already running in another terminal | Stop it with `Ctrl+C` |

Still stuck? Copy the **whole** terminal output and ask. (The backend doesn't print your password, but check before sharing anything.)

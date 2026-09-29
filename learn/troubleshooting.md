# Troubleshooting: getting the app running on your computer

## Step 1: run the setup check

In a terminal, inside the `backend` folder:

```bash
npm install
npm run doctor
```

It checks everything the app needs, in order, and stops at the first problem with the fix:

```
GeoAnnotator setup check

[ OK ] Node.js v22.12.0
[ OK ] Backend packages installed
[ OK ] backend/.env found
[ OK ] Settings in backend/.env are valid
[FAIL] Cannot connect to the database postgres@localhost:5432/geoannotator
       Reason: password authentication failed for user "postgres"
       Fix: The user or password in DATABASE_URL (backend/.env) is wrong. Use the password you type in pgAdmin (learn/local-postgres.md).

Fix the [FAIL] line above, then run "npm run doctor" again.
```

Repeat *fix → `npm run doctor`* until it ends with **All good!**. Then start the app:

```bash
# Terminal 1 (backend folder)        # Terminal 2 (frontend folder)
npm run dev                          npm install
                                     npm run dev
```

Open the address the frontend prints (normally http://localhost:5173) and log in with
`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`.

If you're still stuck, copy the **whole** output of `npm run doctor` and ask.

## Step 2: if a command itself fails

Problems that happen before the checker can even run:

| You see | Cause | Fix |
|---|---|---|
| `npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system` | Windows PowerShell blocks scripts by default | Run once in PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and answer `Y`. Or use **Command Prompt** (cmd) instead of PowerShell. |
| `'npm' is not recognized…` / `node: command not found` | Node.js isn't installed, or the terminal was opened before installing it | Install Node.js 22 LTS from https://nodejs.org, then **close and reopen** the terminal (and VS Code) |
| `npm warn EBADENGINE Unsupported engine` or `Node.js … is required, but this is v18…` or `Vite requires Node.js version 20.19+ or 22.12+` | Node.js is too old | Install Node.js 22 LTS, reopen the terminal, run `npm install` again |
| `'tsx' is not recognized…` / `'vite' is not recognized…` / `'prisma' is not recognized…` | Packages aren't installed in this folder | `npm install` in that folder (`backend` and `frontend` each have their own) |
| `npm error enoent Could not read package.json` | The terminal is in the wrong folder | `cd backend` or `cd frontend` first. `dir` (Windows) or `ls` shows the files: you should see `package.json`. |
| `git pull` says *Your local changes to the following files would be overwritten* | You edited a file that is in git (often `backend/.env.example`) | Keep your settings in `backend/.env` instead. Then undo the edit: `git checkout -- backend/.env.example` (or `git stash`), and `git pull` again. |
| `Error: listen EADDRINUSE: address already in use :::3001` | The backend is already running in another terminal | Use that one, or stop it with `Ctrl+C` |
| `Port 5173 is in use, trying another one…` | Another frontend is running | Fine: open the address Vite prints (e.g. http://localhost:5174) |

## Step 3: if the app runs but doesn't work

| You see | Cause | Fix |
|---|---|---|
| The page says *The server could not be reached* | The backend isn't running | Start it: `npm run dev` in `backend` (a second terminal) |
| The login says *The server is not responding* | Same | Same |
| The frontend terminal shows `http proxy error: /api/… ECONNREFUSED` | Same: Vite can't forward `/api` requests to port 3001 | Same |
| *Invalid email or password* with the right password | The admin was created with other values, or never created | `npm run doctor` shows the admin's email. Forgot the password? Delete the user in pgAdmin (`users` table), set `ADMIN_PASSWORD` in `.env`, run `npm run db:seed` again. |
| *Too many failed logins* | 20 wrong passwords in 15 minutes | Wait, or restart the backend (the counter resets) |
| A blank white page | A JavaScript error in the browser | Press F12 → *Console*, and copy the red error |

## After pulling new patches

New patches can add packages, settings and tables. After every `git pull`:

```bash
cd backend
npm install
npm run db:migrate    # applies new migrations, if any
npm run doctor        # also tells you if backend/.env needs a new setting

cd ../frontend
npm install
```

Database problems (password, PostgreSQL not running, special characters) are explained in
detail in [local-postgres.md](local-postgres.md#troubleshooting).

# Setup: install the tools once

You need five tools. Install them in this order, then run the checks at the bottom.

| Tool | What it is for | Download |
|---|---|---|
| **Git** | Downloads the code and moves between patches | https://git-scm.com/downloads |
| **Node.js 22 (LTS)** | Runs JavaScript/TypeScript outside the browser: our backend, and the tools that build the frontend. Comes with **npm**, the package installer. | https://nodejs.org (choose version 22 LTS) |
| **Docker Desktop** *or* **PostgreSQL** | The database, from patch 02. Either Docker runs PostgreSQL in a container for you, **or** you install PostgreSQL (with pgAdmin) directly: then follow [local-postgres.md](local-postgres.md). | https://www.docker.com/products/docker-desktop · https://www.postgresql.org/download/ |
| **VS Code** | Code editor | https://code.visualstudio.com |
| **Postman** | Sends requests to the API so you can see exactly what it returns | https://www.postman.com/downloads |

### VS Code extensions (recommended)

Open VS Code → Extensions (`Ctrl+Shift+X`) and install:
- **Prisma**: colours and checks the database schema file (from patch 02)
- **Tailwind CSS IntelliSense**: suggests CSS class names (from patch 04)
- **Markdown Preview Mermaid Support**: shows the diagrams in these guides
- **Error Lens** (optional): shows errors next to the line that has them

### Windows notes

- During the Git installer, keep the defaults.
- Docker Desktop asks to enable **WSL 2**. Accept and restart when asked.
- Use the **Git Bash** or **PowerShell** terminal. Commands in these guides work in both,
  except `cp`, which is `copy` in the old `cmd.exe`.

## Check that everything works

Open a new terminal (so it sees the new programs) and run:

```bash
git --version        # git version 2.x
node -v              # v22.x.x
npm -v               # 10.x
docker --version     # Docker version 2x.x (only if you use Docker for the database)
```

If a command says "not found", close and reopen the terminal. If it still fails,
reinstall that tool.

## Get the code

```bash
git clone https://github.com/gamedev20261/testfinal.git
cd testfinal
git checkout claude/cool-goldberg-m6plmm
```

Then open the folder in VS Code: `code .` (or File → Open Folder).

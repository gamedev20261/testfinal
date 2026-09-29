# The `learn/` folder

This folder is the **teacher**. The real app lives in `backend/` and `frontend/` and only
has short comments. Everything that needs a longer explanation is here, so the code stays clean.

```
learn/
├── README.md        ← you are here
├── setup.md         ← install the tools (do this once)
├── postman.md       ← how to use Postman with this project
├── local-postgres.md ← database installed on your computer (pgAdmin) instead of Docker
├── concepts/        ← general web knowledge, explained from zero
├── patches/         ← one guide per patch: what it adds, reading order, how to run and test it
└── files/           ← one explanation per code file, at the SAME path as the code
```

## The `files/` mirror

Every code file has an explanation at the same path inside `learn/files/`, with `.md` added:

| Code file | Its explanation |
|---|---|
| `backend/src/app.ts` | `learn/files/backend/src/app.ts.md` |
| `frontend/src/features/auth/LoginPage.tsx` | `learn/files/frontend/src/features/auth/LoginPage.tsx.md` |

When a later patch changes a file, its explanation is updated too, and the patch guide
tells you what changed.

## How to study one patch

1. **Pull the new code**: `git pull`
2. **Open the patch guide** in `learn/patches/` (for example `01-backend-first-server.md`).
   Read the "New concepts" section first. It links to `concepts/` when an idea is new.
3. **Read the files in the order the guide lists them.** Tip: in VS Code, open the code file,
   then right-click the explanation → *Open to the Side*, and press `Ctrl+Shift+V`
   (`Cmd+Shift+V` on Mac) on it to see the formatted preview.
4. **Run it** with the commands in the guide.
5. **Test it** with Postman (`postman.md` explains how) and in the browser.
6. **Do the "Check yourself" questions** at the end of the guide.

## Moving between patches with git

Every patch is one commit whose message starts with `Patch NN:`. Git can find a commit by
its message with the `:/` syntax (`':/^Patch 03:'` means "the commit whose message starts
with *Patch 03:*"):

```bash
git log --oneline                              # list the patches (newest first)
git show --stat ':/^Patch 03:'                 # which files patch 03 changed
git diff ':/^Patch 02:' ':/^Patch 03:'         # exactly what patch 03 added
git checkout ':/^Patch 02:'                    # look at the project as it was after patch 02
git checkout claude/cool-goldberg-m6plmm       # come back to the latest version
```

You can also use the short commit id that `git log --oneline` prints, e.g. `git show --stat 24ed442`.
To read one file as it was in a commit, write `id:path`:

```bash
git show a06d240:frontend/src/App.tsx          # App.tsx as it was in patch 04
```

## Seeing the diagrams

The guides contain diagrams written in *Mermaid*. GitHub shows them automatically.
In VS Code, install the extension **Markdown Preview Mermaid Support** to see them in the preview.

# `docker-compose.yml`

> Added in **patch 02** · [View the file](../../docker-compose.yml) · Background: [Databases and Docker](../concepts/databases.md#4-docker-a-database-without-installing-one)

## What it is for

Describes the **containers** our project needs. For now there is one: PostgreSQL.
With it, anyone can start the exact same database with one command, on any computer:

```bash
docker compose up -d     # start (-d = in the background, so the terminal stays free)
docker compose ps        # check: STATUS should say "healthy"
docker compose logs db   # see what the database printed
docker compose down      # stop (data is kept)
```

## Piece by piece

The file is **YAML**: nested settings written with indentation (2 spaces; no tabs).

```yaml
services:
  db:
```
A *service* is one container we want running. We call it `db`.

```yaml
    image: postgres:16-alpine
```
Which image to download and run: PostgreSQL version 16, built on Alpine (a tiny Linux).
Docker downloads it the first time (about 100 MB).

```yaml
    container_name: geoannotator-db
    restart: unless-stopped
```
A readable name for the container, and "restart it automatically (e.g. after a reboot)
unless I stopped it myself".

```yaml
    environment:
      POSTGRES_USER: geo
      POSTGRES_PASSWORD: geo_dev_password
      POSTGRES_DB: geoannotator
```
Settings passed into the container. The official Postgres image reads these **on the very
first start** to create a user, its password and an empty database.
They must match `DATABASE_URL` in `backend/.env`.

```yaml
    ports:
      - "5432:5432"
```
`"computer-port:container-port"`. The database listens on 5432 inside its box; this makes
it reachable at `localhost:5432` from our backend. If you already have PostgreSQL
installed and using 5432, change the left side to `"5433:5432"` and use port 5433 in
`DATABASE_URL`.

```yaml
    volumes:
      - pgdata:/var/lib/postgresql/data
...
volumes:
  pgdata:
```
Postgres stores its files in `/var/lib/postgresql/data` inside the container. We attach a
named **volume** there, so the data survives when the container is removed.
To really wipe the database: `docker compose down -v` (`-v` also deletes volumes).

```yaml
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U geo -d geoannotator"]
```
Every 5 seconds Docker runs `pg_isready` inside the container. When it succeeds, the
container is marked **healthy**, which is how you know the database accepts connections.

## Why passwords are written here

These credentials only protect a database on your own computer that is not reachable from
the internet. In production (the last module), real secrets come from environment settings,
never from a committed file.

# Using Postman with this project

Postman lets you talk to the backend directly, without the website. You choose a URL and a
method, press **Send**, and see exactly what the server answers. This is the best way to
understand what each API endpoint does *before* you see how the screen uses it.

## 1. Import the files (once)

1. Open Postman → **Import** (top left) → drag in both files from the `postman/` folder:
   - `GeoAnnotator.postman_collection.json`: all the requests, one folder per patch
   - `Local.postman_environment.json`: variables such as `baseUrl`
2. Top right, in the environment dropdown, choose **GeoAnnotator – Local**.

When a later patch adds requests, import the collection again and choose **Replace**.

## 2. Anatomy of a request in Postman

```
 ┌────────┬──────────────────────────────────────────┐
 │  GET ▾ │ {{baseUrl}}/health                       │  [Send]
 └────────┴──────────────────────────────────────────┘
   Params | Authorization | Headers | Body | Scripts | …
```

- **Method** (`GET`, `POST`, …) and **URL**. `{{baseUrl}}` is replaced by the environment
  value `http://localhost:3001/api`, so if the port ever changes you edit it in one place.
- **Body**: the data you send, for `POST`/`PATCH` requests. We always use *raw → JSON*.
- **Scripts → Post-response**: small tests that run after the answer arrives.
  Our tests check the status code and the shape of the answer.
- **Docs** (the 📄 icon on the right): each request says what it returns,
  who may call it, and which screen uses it.

## 3. Reading the answer

- **Status** (top right of the response): `200 OK`, `404 Not Found`, …
- **Body**: the JSON the server sent back.
- **Headers**: extra information, like `Content-Type: application/json`.
- **Cookies**: from patch 03, the login cookie appears here.
- **Test Results**: green = the checks passed.

## 4. Run a whole folder

Right-click a folder → **Run folder** runs every request in it, top to bottom,
and shows which tests passed. Requests are ordered so that each one prepares the next
(for example, *Login* runs before *Who am I?*).

## 5. Cookies (from patch 03)

When you log in, the server sends a cookie. Postman stores it (see **Cookies** under the
Send button) and sends it back automatically with every later request to `localhost:3001`,
just like a browser does. To "log out" in Postman, run the *Logout* request or delete the
cookie in that Cookies window.

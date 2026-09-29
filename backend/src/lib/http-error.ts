// An error that carries an HTTP status code. Anywhere in a route or service:
//   throw new HttpError(404, 'Project not found');
// The error handler (middleware/error-handler.ts) turns it into a JSON response.
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// An error that carries the HTTP status to respond with.
// Its message is shown to the user, so it is written in Hebrew.
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

module.exports = HttpError;

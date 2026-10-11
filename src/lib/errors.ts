export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public uncertain = false) {
    super(message);
    this.name = "AppError";
  }
}

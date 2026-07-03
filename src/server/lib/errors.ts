export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AvoidanceViolationError extends AppError {
  constructor(public readonly ingredients: string[]) {
    super(
      `回避対象の食材が献立に含まれています: ${ingredients.join(", ")}`,
      "AVOIDANCE_VIOLATION",
    );
    this.name = "AvoidanceViolationError";
  }
}

export class InvalidDaysError extends AppError {
  constructor(days: number) {
    super(
      `日数は 1〜7 の範囲で指定してください（指定値: ${days}）`,
      "INVALID_DAYS",
    );
    this.name = "InvalidDaysError";
  }
}

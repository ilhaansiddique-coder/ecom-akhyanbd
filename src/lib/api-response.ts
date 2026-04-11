import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, errors?: Record<string, string[]>) {
  return NextResponse.json({ message, ...(errors ? { errors } : {}) }, { status });
}

export function validationError(errors: Record<string, string[]>) {
  const firstMessage = Object.values(errors)[0]?.[0] || "Validation failed";
  return NextResponse.json({ message: firstMessage, errors }, { status: 422 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ message }, { status: 404 });
}

export function unauthorized(message = "Unauthenticated.") {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = "Forbidden.") {
  return NextResponse.json({ message }, { status: 403 });
}

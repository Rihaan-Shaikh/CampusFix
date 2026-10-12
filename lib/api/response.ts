import { NextResponse } from "next/server";

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorDetail;
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  meta?: PaginationMeta
): NextResponse<ApiSuccessEnvelope<T>> {
  const body: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(body, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorEnvelope> {
  const body: ApiErrorEnvelope = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

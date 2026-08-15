import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Handle Prisma unique constraint violation (code P2002)
  if (err?.code === 'P2002') {
    const target = err?.meta?.target;
    let field = 'record';
    if (Array.isArray(target)) {
      field = target.join(', ');
    } else if (typeof target === 'string') {
      field = target;
    }
    console.error(`[Unique Constraint Violation] ${req.method} ${req.url} - Field(s): ${field}`);
    return res.status(400).json({
      success: false,
      message: `A duplicate entry was detected for ${field}. Value must be unique.`,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  console.error(`[Error] ${req.method} ${req.url} - ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

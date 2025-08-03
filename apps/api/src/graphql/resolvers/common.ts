import type { Request } from 'express';

export interface Context {
  req: Request;
}

export const verifyApiKey = (req: Request) => {
  const apiKey =
    req.header('admin_api_key') ??
    req.header('admin-api-key') ??
    req.header('x-api-key');
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    throw new Error('Unauthorized');
  }
};

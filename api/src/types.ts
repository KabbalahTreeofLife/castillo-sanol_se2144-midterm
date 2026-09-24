export interface AuthTokenPayload {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      ownerEmail?: string;
    }
  }
}

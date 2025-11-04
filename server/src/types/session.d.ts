import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    session: import('express-session').Session & Partial<import('express-session').SessionData>;
  }
}
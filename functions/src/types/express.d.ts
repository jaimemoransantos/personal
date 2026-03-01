import { DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      /** Set by loadOrganization middleware after authenticate */
      organizationId?: string;
    }
  }
}

export {};

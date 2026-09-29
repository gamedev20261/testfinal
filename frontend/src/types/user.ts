// The logged-in user, as the backend sends it (PublicUser in auth.service.ts)
export type Role = 'ADMIN' | 'ANNOTATOR' | 'AUDITOR';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

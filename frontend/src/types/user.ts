// The logged-in user, as the backend sends it (PublicUser in auth.service.ts)
export type Role = 'ADMIN' | 'ANNOTATOR' | 'AUDITOR';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// A user in the admin portal's directory
export type DirectoryUser = User & {
  groupId: string | null;
  groupName: string | null;
  createdAt: string;
};

export type UserGroup = { id: string; name: string; userCount: number };

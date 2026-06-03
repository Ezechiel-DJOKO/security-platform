import { RoleUtilisateur } from '@prisma/client';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: RoleUtilisateur;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: RoleUtilisateur;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: RoleUtilisateur;
  }
}
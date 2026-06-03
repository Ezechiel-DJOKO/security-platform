import { describe, test, expect, vi, beforeEach } from 'vitest';
import { authOptions } from '../auth';
import crypto from 'crypto';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';

// Types pour les mocks
type MockUtilisateur = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: string;
  actif: boolean;
  motDePasseHashe: string;
};

type MockPrisma = {
  utilisateur: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

type MockAudit = {
  logAuditEvent: ReturnType<typeof vi.fn>;
};

// Type pour les credentials
type Credentials = {
  email: string;
  password: string;
};

// Type pour la requête authorize
type AuthorizeReq = {
  headers?: Record<string, string | string[] | undefined>;
};

// Type du retour authorize
type AuthorizeResult = {
  id: string;
  email: string;
  name: string;
  role: string;
};

// Mocks
vi.mock('crypto', () => ({
  default: {
    timingSafeEqual: vi.fn(),
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('hashedpassword'),
    })),
    randomBytes: vi.fn(),
  },
}));

vi.mock('../prisma', () => ({
  prisma: {
    utilisateur: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock('../audit', () => ({
  logAuditEvent: vi.fn(),
}));

describe('Authentication Module (auth.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('authOptions devrait être défini correctement', () => {
    expect(authOptions).toBeDefined();
    expect(authOptions.session?.strategy).toBe('jwt');
    expect(authOptions.pages?.signIn).toBe('/auth/login');
    expect(authOptions.providers).toHaveLength(1);
  });

  test('CredentialsProvider devrait être configuré', () => {
    const provider = authOptions.providers![0];
    expect(provider.options?.name).toBe('credentials');
  });

  describe('authorize() function', () => {
    // Récupération sécurisée de la fonction authorize
    const getAuthorize = () => {
      const provider = authOptions.providers![0];
      return provider.options?.authorize as (
        credentials: Credentials | undefined,
        req: AuthorizeReq | undefined
      ) => Promise<AuthorizeResult | null>;
    };

    test('devrait retourner null si email ou password manquant', async () => {
      const authorize = getAuthorize();
      const result = await authorize({}, {});
      expect(result).toBeNull();
    });

    test('devrait retourner null si utilisateur non trouvé', async () => {
      const { prisma } = await import('../prisma') as unknown as { prisma: MockPrisma };
      prisma.utilisateur.findUnique.mockResolvedValue(null);

      const authorize = getAuthorize();
      const result = await authorize(
        { email: 'test@test.com', password: '123' },
        {}
      );
      expect(result).toBeNull();
    });

    test('devrait retourner null si utilisateur inactif', async () => {
      const { prisma } = await import('../prisma') as unknown as { prisma: MockPrisma };
      prisma.utilisateur.findUnique.mockResolvedValue({ actif: false });

      const authorize = getAuthorize();
      const result = await authorize(
        { email: 'test@test.com', password: '123' },
        {}
      );
      expect(result).toBeNull();
    });

    test('devrait retourner null si mot de passe invalide', async () => {
      const { prisma } = await import('../prisma') as unknown as { prisma: MockPrisma };
      prisma.utilisateur.findUnique.mockResolvedValue({
        id: '1',
        actif: true,
        motDePasseHashe: 'hashed',
      });
      (crypto.timingSafeEqual as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const authorize = getAuthorize();
      const result = await authorize(
        { email: 'test@test.com', password: 'wrong' },
        {}
      );
      expect(result).toBeNull();
    });

    test('devrait réussir la connexion avec un utilisateur valide', async () => {
      const { prisma } = await import('../prisma') as unknown as { prisma: MockPrisma };
      const { logAuditEvent } = await import('../audit') as unknown as MockAudit;

      const mockUser: MockUtilisateur = {
        id: 'user-123',
        email: 'admin@exemple.com',
        prenom: 'Jean',
        nom: 'Dupont',
        role: 'ADMIN',
        actif: true,
        motDePasseHashe: 'hashedpassword'
      };

      prisma.utilisateur.findUnique.mockResolvedValue(mockUser);
      (crypto.timingSafeEqual as ReturnType<typeof vi.fn>).mockReturnValue(true);
      logAuditEvent.mockResolvedValue(undefined);

      const authorize = getAuthorize();
      const result = await authorize(
        { email: 'admin@exemple.com', password: 'password123' },
        { headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'Mozilla/5.0' } }
      );

      expect(result).toMatchObject({
        id: 'user-123',
        email: 'admin@exemple.com',
        name: 'Jean Dupont',
        role: 'ADMIN'
      });
    });
  });

  describe('Callbacks', () => {
    test('jwt callback devrait ajouter id et role', async () => {
      const jwtCallback = authOptions.callbacks?.jwt as (
        params: { token: JWT; user?: { id: string; role: string } }
      ) => Promise<JWT>;
      
      const result = await jwtCallback({
        token: {} as JWT,
        user: { id: '123', role: 'AUDITEUR' }
      });

      expect(result.id).toBe('123');
      expect(result.role).toBe('AUDITEUR');
    });

    test('session callback devrait enrichir la session', async () => {
      const sessionCallback = authOptions.callbacks?.session as (
        params: { session: Session; token: JWT }
      ) => Promise<Session>;
      
      const session = { 
        user: {} 
      } as Session & { user: { id?: string; role?: string } };
      
      const token = { 
        id: '456', 
        role: 'SUPERVISEUR' 
      } as unknown as JWT;

      const result = await sessionCallback({ session, token });

      expect(result.user.id).toBe('456');
      expect(result.user.role).toBe('SUPERVISEUR');
    });
  });

  describe('Gestion des erreurs et cas limites', () => {
    const getAuthorize = () => {
      const provider = authOptions.providers![0];
      return provider.options?.authorize as (
        credentials: Credentials | undefined,
        req: AuthorizeReq | undefined
      ) => Promise<AuthorizeResult | null>;
    };

    test('devrait capturer les erreurs du log audit sans bloquer la connexion', async () => {
      const { prisma } = await import('../prisma') as unknown as { prisma: MockPrisma };
      const { logAuditEvent } = await import('../audit') as unknown as MockAudit;

      const mockUser: MockUtilisateur = {
        id: 'user-error',
        email: 'error@test.com',
        prenom: 'Error',
        nom: 'Test',
        role: 'ADMIN',
        actif: true,
        motDePasseHashe: 'hash123'
      };

      prisma.utilisateur.findUnique.mockResolvedValue(mockUser);
      (crypto.timingSafeEqual as ReturnType<typeof vi.fn>).mockReturnValue(true);
      
      // Simule une erreur dans le log audit
      logAuditEvent.mockRejectedValue(new Error('Audit service down'));

      const authorize = getAuthorize();
      const result = await authorize(
        { email: 'error@test.com', password: '123' },
        { headers: { 'x-forwarded-for': '1.2.3.4' } }
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-error');
      expect(logAuditEvent).toHaveBeenCalled();
    });

    test('devrait capturer les erreurs générales dans authorize()', async () => {
      const { prisma } = await import('../prisma') as unknown as { prisma: MockPrisma };

      // Simule une erreur complète (ex: prisma en panne)
      prisma.utilisateur.findUnique.mockRejectedValue(new Error('Prisma connection error'));

      const authorize = getAuthorize();
      const result = await authorize(
        { email: 'test@test.com', password: '123' },
        {}
      );
      
      expect(result).toBeNull();
    });
  });

  describe('Branches restantes', () => {
    const getAuthorize = () => {
      const provider = authOptions.providers![0];
      return provider.options?.authorize as (
        credentials: Credentials | undefined,
        req: AuthorizeReq | undefined
      ) => Promise<AuthorizeResult | null>;
    };

    test('devrait capturer les erreurs générales dans authorize()', async () => {
    const { prisma } = await import('../prisma') as unknown as { prisma: MockPrisma };
    
      const mockUser: MockUtilisateur = {
        id: 'user-777',
        email: 'test@test.com',
        prenom: 'Test',
        nom: '',
        role: 'USER',
        actif: true,
        motDePasseHashe: 'hash'
      };

      prisma.utilisateur.findUnique.mockResolvedValue(mockUser);
      (crypto.timingSafeEqual as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const authorize = getAuthorize();
      const result = await authorize(
        { email: 'test@test.com', password: '123' },
        undefined as unknown as AuthorizeReq
      );

      expect(result).toBeDefined();
      expect(result!.name).toBe('Test');
    });
  });
});
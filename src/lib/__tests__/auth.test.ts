import { describe, test, expect, vi, beforeEach } from 'vitest';
import { authOptions } from '../auth';
import bcrypt from 'bcryptjs';

// Mocks
vi.mock('bcryptjs');
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
    const provider = authOptions.providers![0] as any;
    expect(provider.options.name).toBe('credentials');
  });

  describe('authorize() function', () => {
    const authorize = (authOptions.providers![0] as any).options.authorize;

    test('devrait retourner null si email ou password manquant', async () => {
      const result = await authorize({}, {});
      expect(result).toBeNull();
    });

    test('devrait retourner null si utilisateur non trouvé', async () => {
      const { prisma } = await import('../prisma');
      (prisma.utilisateur.findUnique as any).mockResolvedValue(null);

      const result = await authorize({ email: 'test@test.com', password: '123' }, {});
      expect(result).toBeNull();
    });

    test('devrait retourner null si utilisateur inactif', async () => {
      const { prisma } = await import('../prisma');
      (prisma.utilisateur.findUnique as any).mockResolvedValue({ actif: false });

      const result = await authorize({ email: 'test@test.com', password: '123' }, {});
      expect(result).toBeNull();
    });

    test('devrait retourner null si mot de passe invalide', async () => {
      const { prisma } = await import('../prisma');
      (prisma.utilisateur.findUnique as any).mockResolvedValue({
        id: '1',
        actif: true,
        motDePasseHashe: 'hashed',
      });
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await authorize({ email: 'test@test.com', password: 'wrong' }, {});
      expect(result).toBeNull();
    });

    test('devrait réussir la connexion avec un utilisateur valide', async () => {
      const { prisma } = await import('../prisma');
      const { logAuditEvent } = await import('../audit');

      const mockUser = {
        id: 'user-123',
        email: 'admin@exemple.com',
        prenom: 'Jean',
        nom: 'Dupont',
        role: 'ADMIN',
        actif: true,
        motDePasseHashe: 'hashedpassword'
      };

      (prisma.utilisateur.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (logAuditEvent as any).mockResolvedValue(undefined);

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
      const jwtCallback = (authOptions.callbacks as any).jwt;
      
      const result = await jwtCallback({
        token: {},
        user: { id: '123', role: 'AUDITEUR' }
      });

      expect(result.id).toBe('123');
      expect(result.role).toBe('AUDITEUR');
    });

    test('session callback devrait enrichir la session', async () => {
      const sessionCallback = (authOptions.callbacks as any).session;
      
      const session = { user: {} as any };
      const token = { id: '456', role: 'SUPERVISEUR' };

      const result = await sessionCallback({ session, token });

      expect(result.user.id).toBe('456');
      expect(result.user.role).toBe('SUPERVISEUR');
    });
  });
});

  describe('Gestion des erreurs et cas limites', () => {
    const authorize = (authOptions.providers![0] as any).options.authorize;

    test('devrait capturer les erreurs du log audit sans bloquer la connexion', async () => {
      const { prisma } = await import('../prisma');
      const { logAuditEvent } = await import('../audit');

      const mockUser = {
        id: 'user-error',
        email: 'error@test.com',
        prenom: 'Error',
        nom: 'Test',
        role: 'ADMIN',
        actif: true,
        motDePasseHashe: 'hash123'
      };

      (prisma.utilisateur.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      
      // Simule une erreur dans le log audit
      (logAuditEvent as any).mockRejectedValue(new Error('Audit service down'));

      const result = await authorize(
        { email: 'error@test.com', password: '123' },
        { headers: { 'x-forwarded-for': '1.2.3.4' } }
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-error');
      expect(logAuditEvent).toHaveBeenCalled();
    });

    test('devrait capturer les erreurs générales dans authorize()', async () => {
      const { prisma } = await import('../prisma');

      // Simule une erreur complète (ex: prisma en panne)
      (prisma.utilisateur.findUnique as any).mockRejectedValue(new Error('Prisma connection error'));

      const result = await authorize({ email: 'test@test.com', password: '123' }, {});
      
      expect(result).toBeNull();
    });
  });

    describe('Branches restantes', () => {
    const authorize = (authOptions.providers![0] as any).options.authorize;

    test('devrait gérer le cas où req est undefined', async () => {
      const { prisma } = await import('../prisma');
      const { logAuditEvent } = await import('../audit');

      const mockUser = {
        id: 'user-777',
        email: 'test@test.com',
        prenom: 'Test',
        nom: '',
        role: 'USER',
        actif: true,
        motDePasseHashe: 'hash'
      };

      (prisma.utilisateur.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await authorize(
        { email: 'test@test.com', password: '123' },
        undefined as any   // req undefined
      );

      expect(result).toBeDefined();
      expect(result!.name).toBe('Test');
    });
  });
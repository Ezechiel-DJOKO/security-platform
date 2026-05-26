import { describe, test, expect, vi, beforeEach } from 'vitest';
import { 
  hasRole, 
  isAdmin, 
  isSuperviseurOrAbove, 
  requireRole,
  ROLES_HIERARCHY 
} from '../rbac';
import { RoleUtilisateur } from '@prisma/client';

// Mocks
const getServerSessionMock = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock('./auth', () => ({
  authOptions: {},
}));

describe('RBAC Module (rbac.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ROLES_HIERARCHY devrait être correctement défini', () => {
    expect(ROLES_HIERARCHY).toBeDefined();
    expect(ROLES_HIERARCHY[RoleUtilisateur.ADMIN]).toBe(3);
    expect(ROLES_HIERARCHY[RoleUtilisateur.SUPERVISEUR]).toBe(2);
    expect(ROLES_HIERARCHY[RoleUtilisateur.AUDITEUR]).toBe(1);
  });

  describe('hasRole()', () => {
    test('devrait autoriser un rôle supérieur ou égal', () => {
      expect(hasRole(RoleUtilisateur.ADMIN, RoleUtilisateur.AUDITEUR)).toBe(true);
      expect(hasRole(RoleUtilisateur.ADMIN, RoleUtilisateur.SUPERVISEUR)).toBe(true);
      expect(hasRole(RoleUtilisateur.ADMIN, RoleUtilisateur.ADMIN)).toBe(true);
      expect(hasRole(RoleUtilisateur.SUPERVISEUR, RoleUtilisateur.AUDITEUR)).toBe(true);
      expect(hasRole(RoleUtilisateur.SUPERVISEUR, RoleUtilisateur.SUPERVISEUR)).toBe(true);
    });

    test('devrait refuser un rôle inférieur', () => {
      expect(hasRole(RoleUtilisateur.AUDITEUR, RoleUtilisateur.SUPERVISEUR)).toBe(false);
      expect(hasRole(RoleUtilisateur.AUDITEUR, RoleUtilisateur.ADMIN)).toBe(false);
      expect(hasRole(RoleUtilisateur.SUPERVISEUR, RoleUtilisateur.ADMIN)).toBe(false);
    });
  });

  describe('isAdmin()', () => {
    test('devrait retourner true seulement pour ADMIN', () => {
      expect(isAdmin(RoleUtilisateur.ADMIN)).toBe(true);
      expect(isAdmin(RoleUtilisateur.SUPERVISEUR)).toBe(false);
      expect(isAdmin(RoleUtilisateur.AUDITEUR)).toBe(false);
    });
  });

  describe('isSuperviseurOrAbove()', () => {
    test('devrait retourner true pour SUPERVISEUR et ADMIN', () => {
      expect(isSuperviseurOrAbove(RoleUtilisateur.ADMIN)).toBe(true);
      expect(isSuperviseurOrAbove(RoleUtilisateur.SUPERVISEUR)).toBe(true);
      expect(isSuperviseurOrAbove(RoleUtilisateur.AUDITEUR)).toBe(false);
    });
  });

  describe('requireRole()', () => {
    test('devrait retourner la session si l’utilisateur a le rôle requis', async () => {
      const mockSession = {
        user: {
          id: '123',
          role: RoleUtilisateur.ADMIN,
          email: 'admin@test.com'
        }
      };

      getServerSessionMock.mockResolvedValue(mockSession);

      const session = await requireRole(RoleUtilisateur.ADMIN);
      expect(session).toEqual(mockSession);
    });

    test('devrait lancer une erreur si pas de session', async () => {
      getServerSessionMock.mockResolvedValue(null);

      await expect(requireRole(RoleUtilisateur.ADMIN)).rejects.toThrow('Unauthorized');
    });

    test('devrait lancer une erreur si rôle insuffisant', async () => {
      const mockSession = {
        user: {
          id: '456',
          role: RoleUtilisateur.AUDITEUR
        }
      };

      getServerSessionMock.mockResolvedValue(mockSession);

      await expect(requireRole(RoleUtilisateur.SUPERVISEUR)).rejects.toThrow('Unauthorized');
    });
  });
});
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { UserRepo, logAudit } from './db-repo';
import { getRolePermissions, getRoleNameAr, getRoleColor, PERMISSION_KEYS } from './permissions';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      roleNameAr: string;
      roleColor: string;
      permissions: string[];
      status: string;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    roleNameAr: string;
    roleColor: string;
    permissions: string[];
    status: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
    roleNameAr: string;
    roleColor: string;
    permissions: string[];
    status: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await UserRepo.findByEmail(email);

        if (!user) {
          throw new Error('بيانات الدخول غير صحيحة');
        }

        if (!user.isActive) {
          throw new Error('الحساب موقوف — تواصل مع المدير');
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error('بيانات الدخول غير صحيحة');
        }

        // Touch login timestamp
        await UserRepo.touchLogin(user.id);

        // Compute permissions from role catalog (filter to known keys)
        const perms = getRolePermissions(user.role).filter((p) => PERMISSION_KEYS.includes(p));

        // Audit log
        const ip =
          (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0] ||
          (req?.headers?.['x-real-ip'] as string) ||
          null;
        const ua = req?.headers?.['user-agent'] || null;
        await logAudit({
          userId: user.id,
          action: 'auth.login',
          entityType: 'User',
          entityId: user.id,
          changes: { email: user.email, role: user.role },
          ipAddress: ip,
          userAgent: ua,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.nameAr,
          role: user.role,
          roleNameAr: getRoleNameAr(user.role),
          roleColor: getRoleColor(user.role),
          permissions: perms,
          status: user.isActive ? 'active' : 'suspended',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/', // we handle login inline on the home page
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.roleNameAr = user.roleNameAr;
        token.roleColor = user.roleColor;
        token.permissions = user.permissions;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.roleNameAr = token.roleNameAr;
        session.user.roleColor = token.roleColor;
        session.user.permissions = token.permissions || [];
        session.user.status = token.status;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-please-12345',
};

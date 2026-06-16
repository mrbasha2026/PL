import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { PERMISSION_KEYS } from './permissions';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      roleId: string;
      roleName: string;
      roleNameAr: string;
      roleColor: string;
      permissions: string[];
      avatarUrl?: string | null;
      status: string;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    roleId: string;
    roleName: string;
    roleNameAr: string;
    roleColor: string;
    permissions: string[];
    avatarUrl?: string | null;
    status: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    roleId: string;
    roleName: string;
    roleNameAr: string;
    roleColor: string;
    permissions: string[];
    avatarUrl?: string | null;
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { role: true },
        });

        if (!user) {
          throw new Error('بيانات الدخول غير صحيحة');
        }

        if (user.status !== 'active') {
          throw new Error('الحساب موقوف — تواصل مع المدير');
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error('بيانات الدخول غير صحيحة');
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Validate permissions (filter to known keys)
        let perms: string[] = [];
        try {
          perms = JSON.parse(user.role.permissionsJson || '[]');
          perms = perms.filter((p) => PERMISSION_KEYS.includes(p));
        } catch {
          perms = [];
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.role.id,
          roleName: user.role.name,
          roleNameAr: user.role.nameAr,
          roleColor: user.role.color,
          permissions: perms,
          avatarUrl: user.avatarUrl,
          status: user.status,
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
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.roleNameAr = user.roleNameAr;
        token.roleColor = user.roleColor;
        token.permissions = user.permissions;
        token.avatarUrl = user.avatarUrl;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.roleId = token.roleId;
        session.user.roleName = token.roleName;
        session.user.roleNameAr = token.roleNameAr;
        session.user.roleColor = token.roleColor;
        session.user.permissions = token.permissions || [];
        session.user.avatarUrl = token.avatarUrl;
        session.user.status = token.status;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-please-12345',
};

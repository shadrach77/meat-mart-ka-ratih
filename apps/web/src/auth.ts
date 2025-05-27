import NextAuth, { User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { login, registerSocialUser } from './helper/auth/auth';
import { jwtDecode } from 'jwt-decode';
import { InvalidAuthError } from './interface/user/auth.error';

export interface ISocialUserData {
  email: string;
  fullName?: string;
  image?: string;
  provider: string;
  provider_id: string;
  role: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        domain: process.env.AUTH_DOMAIN as string,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      },
    },
  },
  secret: process.env.AUTH_SECRET as string,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 20,
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          const { access_token, refresh_token } = await login(credentials);

          const decoded = jwtDecode(access_token) as any;

          return {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            provider: decoded.provider,
            is_verified: decoded.is_verified,
            access_token: access_token,
            refresh_token: refresh_token,
            first_name: decoded.first_name,
            last_name: decoded.last_name,
            image_url: decoded.image_url,
          };
        } catch (error: any) {
          let errorMessage = 'Authentication failed';
          try {
            const errorData = JSON.parse(error.message);
            errorMessage = errorData.message;
          } catch {
            errorMessage = error.message;
          }

          //to fix login error that occurs sometimes
          // throw new Error(errorMessage);
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
          // redirect_uri: process.env.NEXTAUTH_URL + '/api/auth/callback/google',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        try {
          const { user, accessToken, refreshToken } = await registerSocialUser({
            email: profile?.email as string,
            fullName: profile?.name as string,
            image: profile?.picture as string,
            provider: account.provider,
            provider_id: profile?.sub as string,
          });

          if (account) {
            (account as any).customUser = {
              ...user,
              access_token: accessToken,
              refresh_token: refreshToken,
            };
          }

          return true;
        } catch (error) {
          console.error('Google registration error:', error);
          return `/login?error=${encodeURIComponent('Google login failed')}`;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Credential login
        token.access_token = user.access_token;
        token.refresh_token = user.refresh_token;
        token.provider = user.provider;
        token.role = user.role;
        token.id = user.id;
      }

      // Social login
      if (account?.provider === 'google' && (account as any).customUser) {
        const social = (account as any).customUser;
        token.access_token = social.access_token;
        token.refresh_token = social.refresh_token;
        token.provider = social.provider;
        token.role = social.role;
        token.id = social.id;
        token.email = social.email;
        token.is_verified = social.is_verified;
        token.first_name = social.first_name;
        token.last_name = social.last_name;
        token.image_url = social.image_url;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        image_url: token.image_url,
        first_name: token.first_name,
        last_name: token.last_name,
        role: token.role,
        access_token: token.access_token,
        is_verified: token.is_verified,
        provider: token.provider,
      };

      console.log(session);

      return session;
    },
  },
});

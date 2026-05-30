import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { getAuthRepository } from './data/authRepository'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = credentials.email as string
        const password = credentials.password as string

        if (!email || !password) return null

        const result = await getAuthRepository().login(email, password)

        if (result.status !== 'success') return null

        return {
          id: result.userId,
          email,
        }
      },
    }),
  ],
  pages: {
    signIn: '/', // 使用模态框而非独立登录页
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
      }

      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string
      }

      return session
    },
  },
})

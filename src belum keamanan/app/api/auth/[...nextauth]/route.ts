import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/sb_admin";
import bcrypt from "bcryptjs";
import { SupabaseRateLimiter } from "@/lib/sb_limiter";
import { NextRequest } from "next/server";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { User } from "next-auth";

// rate limiter allow 5 requests per IP per minute
const loginRateLimiter = new SupabaseRateLimiter({
  prefix: "ratelimit:login",
  ...SupabaseRateLimiter.slidingWindow(5, "1 m"),
  analytics: true
});

// auth logger stores login attempts and outcomes
const logAuthEvent = async (event: {
  type: string;
  email: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  message?: string;
}) => {
  try {
    // supabase auth_logs table
    await supabaseAdmin.from("auth_logs").insert([
      {
        event_type: event.type,
        email: event.email,
        ip_address: event.ip || "unknown",
        user_agent: event.userAgent || "unknown",
        success: event.success,
        message: event.message || "",
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error("Failed to log auth event:", error);
  }
};

async function getClientInfo(req: NextRequest | Request | undefined) {
  if (!req) {
    return { ip: 'unknown', userAgent: 'unknown' };
  }

  let ip = 'unknown';
  let userAgent = 'unknown';

  // cek req.headers is a Headers object (NextRequest/fetch API style)
  if (req.headers instanceof Headers) {
    ip = req.headers.get('x-forwarded-for')?.split(',').shift()?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
    userAgent = req.headers.get('user-agent') || 'unknown';
  } 
  // cek req.headers is a standard Node.js headers
  else if (typeof req.headers === 'object') {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const forwardedFor = headers['x-forwarded-for'];
    ip = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor?.[0]) || 
         (headers['x-real-ip'] as string) || 
         'unknown';
    userAgent = (headers['user-agent'] as string) || 'unknown';
  }

  return { ip, userAgent };
}

// Define a type user
interface ExtendedUser extends User {
  role?: string;
}

// Define a type extended JWT
interface ExtendedJWT extends JWT {
  role?: string;
  lastVerified?: number;
}

// Define a type extended session
interface ExtendedSession extends Session {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  lastVerified?: number;
}

// Define user from database
interface DBUser {
  id: string;
  email: string;
  password: string;
  role: string;
  username?: string;
}

const handler = NextAuth({
  providers: [
    // credentials provider:
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email atau Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        try {
          // Get client info for rate limiting and logging
          const clientInfo = await getClientInfo(req as unknown as Request)
            .catch(() => ({ ip: 'unknown', userAgent: 'unknown' }));

          const { ip, userAgent } = clientInfo;

          // Apply rate limiting
          const { success, limit, reset } = await loginRateLimiter.limit(ip);

          if (!success) {
            // Rate limit exceeded
            await logAuthEvent({
              type: "login_ratelimited",
              email: credentials.identifier,
              ip,
              userAgent,
              success: false,
              message: `Rate limit exceeded: ${limit} requests allowed per minute. Resets at ${new Date(reset).toISOString()}`,
            });

            throw new Error(`TOO_MANY_REQUESTS:${reset}`);
          }

          // Convert identifier to lowercase for case-insensitive comparison
          const lowercaseIdentifier = credentials.identifier.toLowerCase();

          // Find user by email (case-insensitive)
          const { data: user, error: emailError } = await supabaseAdmin
            .from("users")
            .select("*")
            .ilike("email", lowercaseIdentifier)
            .maybeSingle();

          // If not found by email, try username (case-insensitive)
          if (emailError || !user) {
            const { data: userByUsername, error: usernameError } = await supabaseAdmin
              .from("users")
              .select("*")
              .ilike("username", credentials.identifier)
              .maybeSingle();

            if (usernameError || !userByUsername) {
              await logAuthEvent({
                type: "login_failed",
                email: credentials.identifier,
                ip,
                userAgent,
                success: false,
                message: "User not found by email or username",
              });
              return null;
            }

            const dbUser = userByUsername as DBUser;
            // Check password
            const passwordMatch = await bcrypt.compare(
              credentials.password,
              dbUser.password
            );

            if (!passwordMatch) {
              await logAuthEvent({
                type: "login_failed",
                email: dbUser.email,
                ip,
                userAgent,
                success: false,
                message: "Invalid password",
              });
              return null;
            }

            // Login success
            await logAuthEvent({
              type: "login_success",
              email: dbUser.email,
              ip,
              userAgent,
              success: true,
            });

            // Return user object
            return {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.email,
              role: dbUser.role,
            } as ExtendedUser;
          }

          const dbUser = user as DBUser;
          // Check password
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            dbUser.password
          );

          if (!passwordMatch) {
            await logAuthEvent({
              type: "login_failed",
              email: dbUser.email,
              ip,
              userAgent,
              success: false,
              message: "Invalid password",
            });
            return null;
          }

          // Login success
          await logAuthEvent({
            type: "login_success",
            email: dbUser.email,
            ip,
            userAgent,
            success: true,
          });

          // Return user object
          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.email,
            role: dbUser.role,
          } as ExtendedUser;
        } catch (error) {
          // Errors request
          if (error instanceof Error && error.message.startsWith("TOO_MANY_REQUESTS")) {
            throw error;
          }

          // Log errors
          console.error("Authentication error:", error);

          try {
            const clientInfo = await getClientInfo(req as unknown as Request)
              .catch(() => ({ ip: 'unknown', userAgent: 'unknown' }));

            await logAuthEvent({
              type: "login_error",
              email: credentials?.identifier || "unknown",
              ip: clientInfo.ip,
              userAgent: clientInfo.userAgent,
              success: false,
              message: `System error: ${error instanceof Error ? error.message : String(error)}`,
            });
          } catch (logError) {
            console.error("Failed to log auth error:", logError);
          }

          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/wall-e",
    error: "/wall-e",
  },
  callbacks: {
    async jwt({ token, user }) {
      const extendedToken = token as ExtendedJWT;

      if (user) {
        const extendedUser = user as ExtendedUser;
        extendedToken.id = extendedUser.id;
        extendedToken.role = extendedUser.role;
        extendedToken.email = extendedUser.email;
        // set waktu token
        extendedToken.iat = Math.floor(Date.now() / 1000);
        extendedToken.lastVerified = Date.now();
      } else {
        extendedToken.lastVerified = Date.now();
      }
      return extendedToken;
    },
    async session({ session, token }) {
      const extendedSession = session as ExtendedSession;
      const extendedToken = token as ExtendedJWT;

      if (extendedToken && extendedSession.user) {
        extendedSession.user.id = extendedToken.id as string;
        extendedSession.user.role = extendedToken.role;
        extendedSession.user.email = extendedToken.email || "";
        //last verifikasi
        extendedSession.lastVerified = extendedToken.lastVerified;
      }
      return extendedSession;
    },
    async redirect({ url, baseUrl }) {
      // absolute URLs use
      if (url.startsWith("http")) return url;

      // relative URLs
      if (url.startsWith("/")) {
        if (url === "/wali" || url.startsWith("/wali/")) {
          return `${baseUrl}/wali`;
        }
        return `${baseUrl}${url}`;
      }

      // default: goto dashboard
      return `${baseUrl}/wali`;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 jam
  },
  secret: process.env.NEXTAUTH_SECRET,
  // debug mode melihat errors lebih rinci
  debug: process.env.NODE_ENV === "development",
  events: {
    signOut: async function(params) {
      const { token } = params;
      if (token?.email) {
        try {
          await logAuthEvent({
            type: "logout",
            email: token.email,
            ip: "unknown",
            userAgent: "unknown",
            success: true,
          });
        } catch (error) {
          console.error("Failed to log signOut event:", error);
        }
      }
    },
  },
});
export { handler as GET, handler as POST };
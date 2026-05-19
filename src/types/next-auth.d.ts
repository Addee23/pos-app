import type { Role } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      storeId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    storeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    storeId: string | null;
  }
}

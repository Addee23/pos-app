import type { Role } from "@/generated/prisma/client";
import { AppNav } from "@/components/layout/AppNav";

type BottomNavProps = {
  role: Role;
};

export function BottomNav({ role }: BottomNavProps) {
  return <AppNav role={role} variant="mobile" />;
}

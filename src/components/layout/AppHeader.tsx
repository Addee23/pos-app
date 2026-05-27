import type { Role } from "@/generated/prisma/client";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  userName?: string | null;
  role: Role;
};

export function AppHeader({ title, subtitle, userName, role }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[#f7f8fb]/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold text-zinc-950">
              {title}
            </h1>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              {role === "ADMIN" ? "Admin" : "Personal"}
            </span>
          </div>
          {subtitle ? (
            <p className="truncate text-xs text-zinc-500">{subtitle}</p>
          ) : null}
          {userName ? (
            <p className="truncate text-[11px] text-zinc-400">{userName}</p>
          ) : null}
        </div>
        <ProfileMenu
          userName={userName}
          roleLabel={role === "ADMIN" ? "Admin" : "Personal"}
          role={role}
        />
      </div>
    </header>
  );
}

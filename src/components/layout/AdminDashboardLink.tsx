import Link from "next/link";

export function AdminDashboardLink() {
  return (
    <Link
      href="/admin/dashboard"
      className="w-fit cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
    >
      Till dashboard
    </Link>
  );
}

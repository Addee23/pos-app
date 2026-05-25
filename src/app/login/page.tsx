import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top_left,#e0e7ff_0,#f8fafc_30rem,#f6f7f9_60rem)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground shadow-sm shadow-blue-200">
            POS
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            POS & Lager
          </p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">Logga in</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Använd ditt konto för att komma åt kassa eller admin.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-zinc-500">Laddar...</p>}>
          <LoginForm callbackUrl={callbackUrl ?? "/"} />
        </Suspense>
        <DemoAccountsHint />
      </div>
    </div>
  );
}

function DemoAccountsHint() {
  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white/90 p-4 text-xs text-zinc-500 shadow-sm">
      <p className="font-semibold text-zinc-700">Testkonton (efter seed):</p>
      <p className="mt-2">Admin: admin@butik.se / admin123</p>
      <p>Personal: personal@butik.se / personal123</p>
    </div>
  );
}

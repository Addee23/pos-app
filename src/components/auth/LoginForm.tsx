"use client";

import { InputField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/ToastProvider";
import { useActionState, useEffect } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

type LoginFormProps = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl = "/" }: LoginFormProps) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error, toast]);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <InputField
        label="E-post"
        id="email"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="admin@butik.se"
        hint="Din e-postadress för inloggning."
        inputClassName="rounded-lg"
      />
      <InputField
        label="Lösenord"
        id="password"
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
        hint="Minst 8 tecken. Personal kan byta lösenord i profilen efter inloggning."
        inputClassName="rounded-lg"
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full cursor-pointer rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-blue-200 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Loggar in..." : "Logga in"}
      </button>
    </form>
  );
}

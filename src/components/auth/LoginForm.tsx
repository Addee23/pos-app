"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

type LoginFormProps = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl = "/" }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <FormField label="E-post" id="email" type="email" name="email" required autoComplete="email" />
      <FormField
        label="Lösenord"
        id="password"
        type="password"
        name="password"
        required
        autoComplete="current-password"
      />

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full cursor-pointer rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Loggar in..." : "Logga in"}
      </button>
    </form>
  );
}

function FormField(props: React.ComponentProps<"input"> & { label: string }) {
  const { label, id, ...inputProps } = props;
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      <input
        id={id}
        {...inputProps}
        className="min-h-12 cursor-text rounded-lg border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none ring-zinc-900/10 transition focus:border-zinc-400 focus:ring-2"
      />
    </label>
  );
}

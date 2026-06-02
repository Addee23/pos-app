"use client";

import { useId, type ChangeEvent, type ReactNode } from "react";

const inputClassName =
  "min-h-12 w-full cursor-text rounded-2xl border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10";

const textareaClassName =
  "min-h-24 w-full cursor-text resize-y rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10";

const selectClassName =
  "min-h-12 w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white px-3 text-base font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10";

type FieldLabelProps = {
  label: string;
  hint?: string;
  htmlFor: string;
  hintId?: string;
  children: ReactNode;
  className?: string;
};

function FieldLabel({
  label,
  hint,
  htmlFor,
  hintId,
  children,
  className = "",
}: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`flex flex-col gap-1 text-sm font-semibold text-zinc-700 ${className}`}
    >
      {label}
      {children}
      {hint ? (
        <span id={hintId} className="text-xs font-normal leading-5 text-zinc-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

type InputFieldProps = Omit<
  React.ComponentProps<"input">,
  "className" | "id"
> & {
  label: string;
  hint?: string;
  inputClassName?: string;
  labelClassName?: string;
  id?: string;
};

export function InputField({
  label,
  hint,
  name,
  id,
  placeholder,
  inputClassName: extraInputClassName,
  labelClassName,
  ...inputProps
}: InputFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `${name ?? "field"}-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <FieldLabel
      label={label}
      hint={hint}
      htmlFor={inputId}
      hintId={hintId}
      className={labelClassName}
    >
      <input
        id={inputId}
        name={name}
        placeholder={placeholder}
        aria-describedby={hintId}
        className={`${inputClassName} ${extraInputClassName ?? ""}`}
        {...inputProps}
      />
    </FieldLabel>
  );
}

type TextareaFieldProps = Omit<
  React.ComponentProps<"textarea">,
  "className" | "id"
> & {
  label: string;
  hint?: string;
  id?: string;
  labelClassName?: string;
};

export function TextareaField({
  label,
  hint,
  name,
  id,
  placeholder,
  labelClassName,
  ...textareaProps
}: TextareaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `${name ?? "field"}-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <FieldLabel
      label={label}
      hint={hint}
      htmlFor={inputId}
      hintId={hintId}
      className={labelClassName}
    >
      <textarea
        id={inputId}
        name={name}
        placeholder={placeholder}
        aria-describedby={hintId}
        className={textareaClassName}
        {...textareaProps}
      />
    </FieldLabel>
  );
}

type SelectFieldProps = {
  label: string;
  hint?: string;
  name: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  labelClassName?: string;
  required?: boolean;
};

export function SelectField({
  label,
  hint,
  name,
  id,
  defaultValue,
  value,
  onChange,
  children,
  labelClassName,
  required,
}: SelectFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const controlledProps =
    value !== undefined ? { value, onChange } : { defaultValue };

  return (
    <FieldLabel
      label={label}
      hint={hint}
      htmlFor={inputId}
      hintId={hintId}
      className={labelClassName}
    >
      <select
        id={inputId}
        name={name}
        required={required}
        aria-describedby={hintId}
        className={selectClassName}
        {...controlledProps}
      >
        {children}
      </select>
    </FieldLabel>
  );
}

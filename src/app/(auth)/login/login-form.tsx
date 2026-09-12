"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LogIn } from "lucide-react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const [state, setState] = useState<LoginState>({});
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setState({});
    startTransition(async () => setState(await login(values)));
  });

  return (
    <form method="post" onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">Email address</span>
        <Input {...register("email")} type="email" inputMode="email" autoComplete="username" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} placeholder="name@startek.lk" />
        {errors.email ? <span id="email-error" className="block text-sm font-semibold text-rose-700">{errors.email.message}</span> : null}
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">Password</span>
        <Input {...register("password")} type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} placeholder="Enter your password" />
        {errors.password ? <span id="password-error" className="block text-sm font-semibold text-rose-700">{errors.password.message}</span> : null}
      </label>
      {state.error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      <Button className="w-full" size="lg" disabled={pending}>
        <LogIn className="size-5" /> {pending ? "Signing in…" : "Sign in securely"}
      </Button>
    </form>
  );
}

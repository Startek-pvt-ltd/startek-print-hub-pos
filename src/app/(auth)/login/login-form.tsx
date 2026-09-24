"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const [state, setState] = useState<LoginState>({});
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", keepSignedIn: false },
  });

  const onSubmit = handleSubmit((values) => {
    setState({});
    startTransition(async () => setState(await login(values)));
  });

  return (
    <form method="post" onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">Username</span>
        <Input {...register("username")} type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? "username-error" : undefined} placeholder="Enter your username" />
        {errors.username ? <span id="username-error" className="block text-sm font-semibold text-rose-700">{errors.username.message}</span> : null}
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">Password</span>
        <span className="relative block"><Input {...register("password")} className="pr-14" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} placeholder="Enter your password" /><button type="button" className="absolute inset-y-0 right-0 grid min-h-12 min-w-12 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></span>
        {errors.password ? <span id="password-error" className="block text-sm font-semibold text-rose-700">{errors.password.message}</span> : null}
      </label>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"><input {...register("keepSignedIn")} type="checkbox" className="size-5 rounded border-slate-300" /><span>Keep me signed in on this device</span></label>
      {state.error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      <Button className="w-full" size="lg" disabled={pending}>
        <LogIn className="size-5" /> {pending ? "Signing in…" : "SIGN IN"}
      </Button>
    </form>
  );
}

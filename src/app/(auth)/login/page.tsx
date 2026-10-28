import Link from "next/link";
import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Log in</h1>

      {params.registered && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Account created. Check your email to confirm, then log in.
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form action={login} className="space-y-4">
        {params.next && <input type="hidden" name="next" value={params.next} />}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Log in
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-600">
        No account?{" "}
        <Link href="/register" className="font-medium text-neutral-900 underline">
          Register
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  // Quick login buttons for demo
  const quickLogin = async (demoEmail: string) => {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: demoEmail,
      password: "password123",
      redirect: false,
    });
    if (result?.error) {
      setError("Demo login failed. Run `npm run db:seed` first.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--muted)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Zap className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">EnergyLTC</CardTitle>
          <CardDescription>Lead-to-Contract Management</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Demo quick login */}
          <div className="mt-6 border-t pt-4">
            <p className="text-sm text-center text-[var(--muted-foreground)] mb-3">
              Quick demo login
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickLogin("admin@energy.com")}
                disabled={loading}
              >
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickLogin("manager@energy.com")}
                disabled={loading}
              >
                Manager
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickLogin("rep1@energy.com")}
                disabled={loading}
              >
                Sales Rep
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <Card className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">PM 콘솔</h1>
          <p className="mt-1 text-sm text-text-secondary">패스코드를 입력해주세요.</p>
        </div>
        <Input
          type="password"
          placeholder="패스코드"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} disabled={loading || !passcode}>
          {loading ? "확인 중..." : "입장하기"}
        </Button>
      </Card>
    </div>
  );
}

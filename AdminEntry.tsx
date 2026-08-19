"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export default function AdminEntry() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdminPage =
    typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (isAdminPage) return null;

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        setError(result?.error || result?.message || "密码不正确，请再试一次");
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError("暂时无法连接，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="打开管理员入口"
        title="管理员入口"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        style={styles.entry}
      >
        <span aria-hidden="true" style={styles.keyIcon}>钥</span>
        <span>管理</span>
      </button>

      {open && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
          style={styles.backdrop}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-entry-title"
            style={styles.dialog}
          >
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setOpen(false)}
              style={styles.close}
            >
              ×
            </button>
            <div style={styles.badge}>ADMIN</div>
            <h2 id="admin-entry-title" style={styles.title}>管理员入口</h2>
            <p style={styles.description}>仅活动发布者可进入，普通用户无需操作。</p>

            <form onSubmit={login}>
              <label htmlFor="admin-password" style={styles.label}>管理员密码</label>
              <input
                ref={inputRef}
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入管理员密码"
                style={styles.input}
              />
              {error && <p role="alert" style={styles.error}>{error}</p>}
              <button
                type="submit"
                disabled={!password.trim() || loading}
                style={{
                  ...styles.submit,
                  opacity: !password.trim() || loading ? 0.55 : 1,
                }}
              >
                {loading ? "正在验证…" : "进入管理后台"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  entry: {
    position: "fixed",
    right: 16,
    bottom: "calc(88px + env(safe-area-inset-bottom))",
    zIndex: 80,
    display: "flex",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    padding: "7px 12px 7px 8px",
    border: "2px solid #19171f",
    borderRadius: 999,
    background: "#fff",
    color: "#19171f",
    boxShadow: "3px 3px 0 #19171f",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  keyIcon: {
    display: "grid",
    placeItems: "center",
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#caff00",
    fontSize: 11,
    fontWeight: 900,
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    display: "grid",
    placeItems: "center",
    padding: 22,
    background: "rgba(25, 23, 31, 0.62)",
    backdropFilter: "blur(4px)",
  },
  dialog: {
    position: "relative",
    width: "min(100%, 390px)",
    padding: "28px 24px 24px",
    border: "3px solid #19171f",
    borderRadius: 24,
    background: "#fbfaf6",
    color: "#19171f",
    boxShadow: "8px 8px 0 #6f4ee8",
  },
  close: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 34,
    height: 34,
    border: 0,
    background: "transparent",
    color: "#19171f",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
  },
  badge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#caff00",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.5,
  },
  title: { margin: "14px 0 6px", fontSize: 28, lineHeight: 1.15 },
  description: { margin: "0 0 20px", color: "#696672", fontSize: 14, lineHeight: 1.6 },
  label: { display: "block", marginBottom: 7, fontSize: 14, fontWeight: 700 },
  input: {
    width: "100%",
    height: 50,
    boxSizing: "border-box",
    padding: "0 14px",
    border: "2px solid #19171f",
    borderRadius: 13,
    background: "#fff",
    color: "#19171f",
    fontSize: 16,
    outline: "none",
  },
  error: { margin: "9px 2px 0", color: "#d52e44", fontSize: 13, fontWeight: 700 },
  submit: {
    width: "100%",
    height: 50,
    marginTop: 14,
    border: "2px solid #19171f",
    borderRadius: 13,
    background: "#caff00",
    color: "#19171f",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
  },
};

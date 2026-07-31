import { isAdminSessionConfigured, hasValidAdminSession } from "../admin-auth";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = isAdminSessionConfigured();
  const authorized = configured && await hasValidAdminSession();
  const { error } = await searchParams;

  if (!authorized) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <span className="brand-eye"><i /></span>
          <small>TOILET PROPHET ADMIN</small>
          <h1>发布管理</h1>
          <p>这里不接待围观群众。</p>
          {!configured ? (
            <div className="login-warning">管理员密码尚未配置，后台已安全锁定。</div>
          ) : (
            <form action="/api/admin/login" method="post">
              <label htmlFor="password">管理员密码</label>
              <input id="password" name="password" type="password" autoComplete="current-password" placeholder="请输入管理员密码" required autoFocus />
              {error === "invalid" && <span className="login-error">密码不对，先知拒绝开门。</span>}
              <button type="submit">进入后台</button>
            </form>
          )}
          <a href="/">← 返回今日竞猜</a>
        </section>
      </main>
    );
  }

  return <AdminDashboard adminName="唯一管理员" />;
}

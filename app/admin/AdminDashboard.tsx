"use client";

import { FormEvent, useEffect, useState } from "react";

type Tab = "overview" | "publish" | "rounds" | "prizes" | "users";
type Round = { id: string; episode_no: number; title: string; status: string };
type Prize = { id: string; name: string; rarity: string; stock: number; weight: number };
type User = { id: string; nickname: string; points: number; status: string; vote_count: number; award_count: number };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? "操作失败");
  return response.json() as Promise<T>;
}

export function AdminDashboard({ adminName }: { adminName: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notice, setNotice] = useState("");

  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 1800); }
  async function load() {
    try {
      const [roundData, prizeData, userData] = await Promise.all([
        request<{ rounds: Round[] }>("/api/admin/rounds"), request<{ prizes: Prize[] }>("/api/admin/prizes"), request<{ users: User[] }>("/api/admin/users"),
      ]);
      setRounds(roundData.rounds); setPrizes(prizeData.prizes); setUsers(userData.users);
    } catch (error) { flash(error instanceof Error ? error.message : "数据读取失败"); }
  }
  useEffect(() => { void load(); }, []);
  const active = rounds.find((round) => round.status === "voting");
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await request("/api/admin/rounds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), clue: form.get("clue"), correctDoor: Number(form.get("door")), votingEndsAt: form.get("endsAt") }) }); flash("新一期已发布"); setTab("overview"); await load(); } catch (error) { flash(error instanceof Error ? error.message : "发布失败"); }
  }
  async function reveal() { if (!active) return; try { await request("/api/admin/rounds/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roundId: active.id }) }); flash("已揭晓并结算积分"); await load(); } catch (error) { flash(error instanceof Error ? error.message : "揭晓失败"); } }
  async function addPrize(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await request("/api/admin/prizes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), rarity: form.get("rarity"), stock: Number(form.get("stock")), weight: Number(form.get("weight")) }) }); event.currentTarget.reset(); flash("奖品已创建"); await load(); } catch (error) { flash(error instanceof Error ? error.message : "保存失败"); } }
  async function toggleUser(user: User) { try { await request("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, status: user.status === "active" ? "disabled" : "active" }) }); flash(user.status === "active" ? "用户已禁用" : "用户已恢复"); await load(); } catch (error) { flash(error instanceof Error ? error.message : "操作失败"); } }
  return <main className="admin-shell">{notice && <div className="toast">{notice}</div>}<header className="admin-top"><div><span className="brand-eye"><i /></span><b>厕所先知<small>发布后台</small></b></div><div className="admin-account"><span>{adminName}</span><form action="/api/admin/logout" method="post"><button type="submit">退出</button></form></div></header><nav className="admin-nav">{([['overview','今日概览'],['publish','发布新一期'],['rounds','竞猜管理'],['prizes','奖品库'],['users','用户管理']] as const).map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === "overview" && <div className="admin-content"><header className="admin-title"><div><small>CONTROL ROOM</small><h1>{active ? `EP.${active.episode_no} 投票中` : "暂无进行中竞猜"}</h1><p>{active?.title ?? "从发布新一期开始"}</p></div><button onClick={() => setTab("publish")}>＋ 发布新一期</button></header><section className="overview-stats"><article><small>注册用户</small><b>{users.length}</b></article><article><small>本期参与</small><b>—</b></article><article><small>奖品库存</small><b>{prizes.reduce((sum, prize) => sum + prize.stock, 0)}</b></article><article><small>已结束期数</small><b>{rounds.filter((round) => round.status === "revealed").length}</b></article></section><section className="admin-card"><h2>快捷操作</h2><div className="quick-actions"><button onClick={() => setTab("publish")}>发布新一期</button><button className="danger" disabled={!active} onClick={() => void reveal()}>立即揭晓</button></div></section></div>}
    {tab === "publish" && <form className="admin-content publish-flow" onSubmit={publish}><header className="admin-title"><div><small>NEW ROUND</small><h1>发布新一期</h1><p>选项固定为 1、2、3 号门</p></div></header><section className="admin-card form-card"><label>竞猜标题<input name="title" required /></label><label>一句话说明<textarea name="clue" /></label><div className="fixed-options"><span>1号门</span><span>2号门</span><span>3号门</span></div><label>正确答案<select name="door" defaultValue="2"><option value="1">1号门</option><option value="2">2号门</option><option value="3">3号门</option></select></label><label>投票截止<input name="endsAt" type="datetime-local" required /></label><button className="next" type="submit">确认发布</button></section></form>}
    {tab === "rounds" && <div className="admin-content"><header className="admin-title"><div><small>ROUNDS</small><h1>竞猜管理</h1><p>真实期数与状态</p></div></header><section className="round-table">{rounds.map((round) => <article key={round.id}><span>EP.{round.episode_no}</span><div><b>{round.title}</b><small>状态：{round.status}</small></div><strong className={round.status === "voting" ? "live" : ""}>{round.status}</strong></article>)}{!rounds.length && <p>暂无期数</p>}</section></div>}
    {tab === "prizes" && <div className="admin-content"><header className="admin-title"><div><small>PRIZE LIBRARY</small><h1>奖品库</h1><p>库存与权重由后台统一管理</p></div></header><section className="prize-admin-list">{prizes.map((prize) => <article key={prize.id}><span>{prize.rarity.slice(0,1)}</span><div><b>{prize.name}</b><small>{prize.rarity} · 库存 {prize.stock} · 权重 {prize.weight}</small></div></article>)}{!prizes.length && <p>暂无奖品</p>}</section><form className="inline-editor" onSubmit={addPrize}><h2>新建奖品</h2><label>奖品名称<input name="name" required /></label><div className="two-fields"><label>稀有度<select name="rarity"><option value="common">常见</option><option value="rare">稀有</option><option value="legendary">传说</option></select></label><label>库存<input name="stock" type="number" min="0" defaultValue="10" /></label></div><label>抽取权重<input name="weight" type="number" min="1" defaultValue="10" /></label><div><button className="save" type="submit">保存奖品</button></div></form></div>}
    {tab === "users" && <div className="admin-content"><header className="admin-title"><div><small>USERS</small><h1>用户管理</h1><p>真实注册用户、积分和参与数据</p></div></header><section className="round-table">{users.map((user) => <article key={user.id}><span>{user.nickname.slice(0,1)}</span><div><b>{user.nickname}</b><small>{user.points} 分 · 参与 {user.vote_count} 次 · 获奖 {user.award_count} 次</small></div><button onClick={() => void toggleUser(user)}>{user.status === "active" ? "禁用" : "恢复"}</button></article>)}{!users.length && <p>暂无注册用户</p>}</section></div>}
  </main>;
}

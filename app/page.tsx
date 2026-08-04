"use client";

import { FormEvent, useEffect, useState } from "react";

type Tab = "today" | "rank" | "history" | "prizes" | "mine";
type Phase = "voting" | "waiting" | "revealed";
type LiveRound = { id: string; episode_no: number; title: string; clue: string; voting_ends_at: string; status: string; correct_door?: number | null };
type StoredUser = { id: string; nickname: string; avatarUrl?: string };
type UserDetail = { user: { nickname: string; avatar_url: string; points: number; streak: number }; votes: Array<{ episode_no: number; door: number; result: string }>; awards: Array<{ name: string; rarity: string; status: string }> };

const ranks = [
  ["鱼", "不愿透露姓名的鱼", "286"],
  ["蹲", "蹲得久想得远", "271"],
  ["厕", "厕所诸葛亮", "253"],
  ["马", "马桶沉思哲学家", "241"],
  ["直", "别问问就是直觉", "226"],
];

const histories = [
  { ep: 17, mine: 3, answer: 3, state: "猜中、已抽奖", score: "+10" },
  { ep: 16, mine: 2, answer: 1, state: "猜错", score: "+1" },
  { ep: 15, mine: 2, answer: 2, state: "猜中、已抽奖", score: "+10" },
  { ep: 14, mine: null, answer: 1, state: "未参与", score: "—" },
];

const ownedPrizes = [
  { name: "合法带薪拉屎资格证", meta: "第17期获得", mark: "证", rare: false },
  { name: "厕所先知签名照", meta: "第15期获得", mark: "签", rare: false },
  { name: "一周「厕所诸葛亮」", meta: "剩余 3 天", mark: "稀", rare: true },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("today");
  const [selected, setSelected] = useState<number | null>(null);
  const [voted, setVoted] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("voting");
  const [drawn, setDrawn] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [liveRound, setLiveRound] = useState<LiveRound | null>(null);
  const [distribution, setDistribution] = useState([0, 0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [liveRanks, setLiveRanks] = useState<Array<{ nickname: string; points: number }>>([]);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("default");

  useEffect(() => {
    const vote = localStorage.getItem("tp-vote");
    const status = localStorage.getItem("tp-round-status") as Phase | null;
    const didDraw = localStorage.getItem("tp-drawn");
    if (vote) { setVoted(Number(vote)); setSelected(Number(vote)); }
    if (status) setPhase(status);
    if (didDraw) setDrawn(true);

    const sync = () => {
      const nextStatus = localStorage.getItem("tp-round-status") as Phase | null;
      if (nextStatus) setPhase(nextStatus);
    };
    window.addEventListener("storage", sync);
    fetch("/api/rounds/current").then((response) => response.json()).then((payload) => { setLiveRound(payload.round ?? null); setDistribution(payload.distribution ?? [0, 0, 0]); setTotalVotes(payload.totalVotes ?? 0); if (payload.round?.status === "revealed") setPhase("revealed"); }).catch(() => undefined);
    fetch("/api/leaderboard").then((response) => response.json()).then((payload) => setLiveRanks(payload.users ?? [])).catch(() => undefined);
    try {
      const user = JSON.parse(localStorage.getItem("tp-web-user") ?? "null") as StoredUser | null;
      if (user) fetch(`/api/users/${user.id}`).then((response) => response.ok ? response.json() : null).then((payload) => setUserDetail(payload)).catch(() => undefined);
    } catch { /* Ignore malformed device-local identity. */ }
    return () => window.removeEventListener("storage", sync);
  }, []);

  const isCorrect = liveRound?.correct_door != null && voted === liveRound.correct_door;
  const displayRanks = liveRanks.map((user) => [user.nickname.slice(0, 1), user.nickname, String(user.points)]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 1700);
  }

  function chooseAvatar(): Promise<string> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve("default");
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "default");
        reader.onerror = () => resolve("default");
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  async function changeAvatar() {
    const user = JSON.parse(localStorage.getItem("tp-web-user") ?? "null") as StoredUser | null;
    if (!user) return flash("请先注册");
    const nextAvatar = await chooseAvatar();
    if (nextAvatar === "default") return;
    const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: nextAvatar }) });
    if (!response.ok) return flash("头像更新失败");
    localStorage.setItem("tp-web-user", JSON.stringify({ ...user, avatarUrl: nextAvatar }));
    setUserDetail((current) => current ? { ...current, user: { ...current.user, avatar_url: nextAvatar } } : current);
    flash("头像已更新");
  }

  async function confirmVote() {
    if (!selected) return;
    if (!liveRound) { flash("当前没有可投票的期数"); return; }
    let user: StoredUser | null = null;
    try { user = JSON.parse(localStorage.getItem("tp-web-user") ?? "null") as StoredUser | null; } catch { user = null; }
    if (!user) {
      const nickname = window.prompt("请输入你的昵称，加入厕所先知");
      if (!nickname?.trim()) return;
      const pickedAvatar = await chooseAvatar();
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: nickname.trim(), avatarUrl: pickedAvatar }) });
      if (!response.ok) { flash("注册失败，请稍后重试"); return; }
      user = await response.json() as StoredUser;
      localStorage.setItem("tp-web-user", JSON.stringify(user));
      setUserDetail({ votes: [], awards: [] });
    }
    const response = await fetch("/api/votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, roundId: liveRound.id, door: selected }) });
    if (!response.ok) { const payload = await response.json(); flash(payload.error ?? "投票失败"); return; }
    setVoted(selected);
    setPhase("waiting");
    flash("已封盘，不接受任何反悔");
  }

  async function openBox() {
    let user: StoredUser | null = null;
    try { user = JSON.parse(localStorage.getItem("tp-web-user") ?? "null") as StoredUser | null; } catch { user = null; }
    if (!user || !liveRound) { flash("请先完成本期竞猜"); return; }
    const response = await fetch("/api/draw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, roundId: liveRound.id }) });
    const payload = await response.json();
    if (!response.ok) { flash(payload.error ?? "抽奖失败"); return; }
    setDrawOpen(false);
    setPrizeOpen(true);
    setDrawn(true);
    flash(`抽到了：${payload.prize.name}`);
  }

  async function share(text: string) {
    if (navigator.share) await navigator.share({ title: "厕所先知", text, url: location.href });
    else { await navigator.clipboard.writeText(location.href); flash("链接已复制"); }
  }

  return (
    <main className="app-shell clean-app">
      {toast && <div className="toast">{toast}</div>}

      <header className="topbar clean-topbar">
        <button className="brand" onClick={() => setTab("today")}>
          <span className="brand-eye"><i /></span>
          <span><b>厕所先知</b><small>TOILET PROPHET</small></span>
        </button>
        <span className="streak-chip">连续参与 4 天</span>
      </header>

      {tab === "today" && (
        <div className="screen today-screen">
          <div className="episode-row"><span>{liveRound ? `EP.${String(liveRound.episode_no).padStart(3, "0")}` : "尚未发布"}</span><i>{phase === "voting" ? "投票中" : phase === "waiting" ? "等待揭晓" : "已揭晓"}</i></div>

          {phase === "voting" && (
            <>
              <section className="question-block">
                <small>今日竞猜</small>
                <h1>{liveRound?.title ?? "先知暂未出门"}</h1>
                <p>{liveRound?.clue ?? "管理员发布新一期后，三扇门会在这里出现。"}</p>
              </section>
              <section className="number-doors">
                {[1, 2, 3].map((door) => (
                  <button key={door} className={selected === door ? "selected" : ""} onClick={() => setSelected(door)}>
                    <span>0{door}</span>
                    <div><b>{door}</b><i /></div>
                    <strong>{door}号门</strong>
                  </button>
                ))}
              </section>
              <section className="confirm-panel">
                <div><span>截止时间</span><b>今天 20:30</b></div>
                <button disabled={!selected} onClick={confirmVote}>{selected ? `确认选择 ${selected}号门` : "先选择一扇门"}</button>
                <p>每人每期只能选择一次，确认后不可修改</p>
              </section>
            </>
          )}

          {phase === "waiting" && (
            <section className="waiting-card state-card">
              <small>你的选择</small>
              <div className="big-choice"><span>0{voted ?? 2}</span><b>{voted ?? 2}号门</b></div>
              <h1>已封盘，不接受任何反悔</h1>
              <div className="countdown"><small>距离揭晓</small><strong>02:18:36</strong></div>
              <button onClick={() => share(`我在厕所先知押了${voted}号门，你敢来吗？`)}>分享给朋友 <span>↗</span></button>
            </section>
          )}

          {phase === "revealed" && (
            <section className="revealed-state">
              <div className="answer-card state-card">
                <span className="answer-stamp">答案公开</span>
                <small>正确答案</small>
                <div className="big-choice"><span>{liveRound?.correct_door ? `0${liveRound.correct_door}` : "—"}</span><b>{liveRound?.correct_door ? `${liveRound.correct_door}号门` : "答案待公布"}</b></div>
                <div className={`verdict ${isCorrect ? "correct" : ""}`}>
                  <span>{isCorrect ? "✓" : "×"}</span>
                  <div><h1>{isCorrect ? "猜中了！" : "猜错了"}</h1><p>{isCorrect ? "积分 +10 · 获得一次抽奖机会" : "参与积分 +1 · 明天继续"}</p></div>
                </div>
                {isCorrect && (
                  <button className="draw-cta" disabled={drawn} onClick={() => setDrawOpen(true)}>
                    {drawn ? "本期已抽奖" : "去抽奖"}
                  </button>
                )}
              </div>

              <section className="vote-result">
                <div className="simple-heading"><b>最终投票比例</b><span>{totalVotes ? `${totalVotes} 人参与` : "暂无投票数据"}</span></div>
                {[1, 2, 3].map((door, index) => (
                  <div className={liveRound?.correct_door === door ? "answer" : ""} key={door}>
                    <span><b>{door}号门</b><i>{distribution[index]}%</i></span>
                    <em><strong style={{ width: `${distribution[index]}%` }} /></em>
                  </div>
                ))}
              </section>
            </section>
          )}
        </div>
      )}

      {tab === "rank" && (
        <div className="screen">
          <header className="plain-header"><small>LEADERBOARD</small><h1>先知排行榜</h1></header>
          <div className="period-tabs"><button className="active">本周榜</button><button>本月榜</button><button>总榜</button></div>
          <section className="podium">
            <article><span>2</span><i>蹲</i><b>蹲得久想得远</b><strong>271</strong></article>
            <article className="first"><span>1</span><i>鱼</i><b>不愿透露姓名的鱼</b><strong>286</strong></article>
            <article><span>3</span><i>厕</i><b>厕所诸葛亮</b><strong>253</strong></article>
          </section>
          <section className="simple-list rank-list">
            {displayRanks.slice(3).map((person, index) => (
              <article key={person[1]}><strong>{index + 4}</strong><i>{person[0]}</i><b>{person[1]}</b><em>{person[2]}<small>分</small></em></article>
            ))}
          </section>
          <div className="fixed-mine"><span>我的排名 <b>第 28 名</b></span><strong>148<small>分</small></strong></div>
        </div>
      )}

      {tab === "history" && (
        <div className="screen">
          <header className="plain-header"><small>MY RECORD</small><h1>竞猜记录</h1></header>
          <section className="record-stats">
            <span><b>12</b><small>参与次数</small></span><span><b>7</b><small>猜中次数</small></span>
            <span><b>58%</b><small>命中率</small></span><span><b>3</b><small>最高连中</small></span>
          </section>
          <section className="history-list">
            {(userDetail?.votes.length ? userDetail.votes.map((item) => ({ ep: item.episode_no, mine: item.door, answer: null, state: item.result === "correct" ? "猜中" : item.result === "wrong" ? "猜错" : "等待揭晓", score: item.result === "correct" ? "+10" : item.result === "wrong" ? "+1" : "—" })) : histories).map((item) => (
              <article key={item.ep}>
                <span>EP.{item.ep}</span>
                <div><b>{item.state}</b><small>{item.mine ? `你选 ${item.mine}号门${item.answer ? ` · 答案 ${item.answer}号门` : ""}` : `答案 ${item.answer}号门`}</small></div>
                <strong className={item.state.includes("猜中") ? "hit" : ""}>{item.score}</strong>
                <i>›</i>
              </article>
            ))}
          </section>
        </div>
      )}

      {tab === "prizes" && (
        <div className="screen">
          <header className="plain-header prize-page-head"><small>MY COLLECTION</small><h1>我的电子废物</h1><p>已经收集 3 件没什么用的东西</p></header>
          <section className="owned-list">
            {(userDetail?.awards.length ? userDetail.awards.map((item) => ({ name: item.name, meta: item.rarity, mark: item.rarity === "legendary" ? "传" : "奖", rare: item.rarity !== "common" })) : ownedPrizes).map((prize) => (
              <button key={prize.name} onClick={() => setPrizeOpen(true)}>
                <span className={prize.rare ? "rare" : ""}>{prize.mark}</span>
                <div><b>{prize.name}</b><small>{prize.meta}</small></div>
                <i>›</i>
              </button>
            ))}
          </section>
        </div>
      )}

      {tab === "mine" && (
        <div className="screen mine-screen">
          <header className="plain-header"><small>MY PROFILE</small><h1>我的</h1></header>
          <section className="mine-card">
            <button className="mine-avatar" onClick={() => void changeAvatar()} aria-label="更换头像">{userDetail?.user.avatar_url && userDetail.user.avatar_url !== "default" ? <img src={userDetail.user.avatar_url} alt="头像" /> : userDetail ? "我" : "?"}</button>
            <div><h2>{userDetail ? "厕所先知用户" : "还没有注册"}</h2><p>{userDetail ? "你的竞猜数据已同步" : "注册后才能投票、参与抽奖和进入排行榜"}</p></div>
          </section>
          <section className="mine-stats">
            <span><b>{userDetail?.votes.length ?? 0}</b><small>参与次数</small></span>
            <span><b>{userDetail?.votes.filter((vote) => vote.result === "correct").length ?? 0}</b><small>猜中次数</small></span>
            <span><b>{userDetail?.awards.length ?? 0}</b><small>我的奖品</small></span>
          </section>
          {!userDetail && <button className="primary-button mine-register" onClick={() => setTab("today")}>去参加第一期竞猜</button>}
          <p className="mine-tip">昵称和头像只用于显示排名，不会公开其他个人信息。</p>
        </div>
      )}

      <nav className="bottom-nav five-nav">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><span>◉</span>今日</button>
        <button className={tab === "rank" ? "active" : ""} onClick={() => setTab("rank")}><span>♛</span>排行</button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><span>▤</span>记录</button>
        <button className={tab === "prizes" ? "active" : ""} onClick={() => setTab("prizes")}><span>▣</span>奖品</button>
        <button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}><span>●</span>我的</button>
      </nav>

      {drawOpen && (
        <div className="modal-layer prize-layer">
          <div className="draw-box">
            <button className="modal-x" onClick={() => setDrawOpen(false)}>×</button>
            <div className="mystery-box"><span>?</span></div>
            <h2>你有一次开盒机会</h2>
            <p>打开之后概不退换，没用也请收好。</p>
            <button className="primary-button" onClick={openBox}>一次开盒</button>
          </div>
        </div>
      )}

      {prizeOpen && (
        <div className="modal-layer prize-layer">
          <div className="certificate-modal">
            <button className="modal-x" onClick={() => setPrizeOpen(false)}>×</button>
            <small>TOILET PROPHET CERTIFICATE</small>
            <div className="certificate-seal">准</div>
            <h2>合法带薪拉屎<br />资格证</h2>
            <p>兹证明该同志今日具备<br />在合理时间内安心蹲坑的合法资格</p>
            <div className="certificate-meta"><span>编号 TP-018-02847</span><span>厕所先知认证</span></div>
            <button className="primary-button" onClick={() => flash("奖品已保存到奖品柜")}>保存奖品</button>
            <button className="share-result" onClick={() => share("我抽到了《合法带薪拉屎资格证》")}>分享结果 ↗</button>
          </div>
        </div>
      )}
    </main>
  );
}

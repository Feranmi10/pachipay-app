import { useState, useEffect, createContext, useContext } from "react"
import {
  useAccount, useConnect, useDisconnect, useSwitchChain,
  useReadContract, useWriteContract, useWaitForTransactionReceipt
} from "wagmi"
import { base } from "wagmi/chains"
import { formatUnits, parseUnits } from "viem"
import { CONTRACTS } from "./lib/wagmi.js"

// ─── Theme Context ────────────────────────────────────────────────────────────
const ThemeCtx = createContext({ dark: true, toggle: () => {} })
const useTheme = () => useContext(ThemeCtx)

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const USDC_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
]
const PACHI_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
]
const STAKING_ABI = [
  { name: "getStake", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "amount", type: "uint256" }, { name: "stakedAt", type: "uint256" }, { name: "pending", type: "uint256" }] },
  { name: "stake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "unstake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "claimReward", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
]
const GOVERNANCE_ABI = [
  { name: "proposalCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "createProposal", type: "function", stateMutability: "nonpayable", inputs: [{ name: "title", type: "string" }, { name: "description", type: "string" }], outputs: [{ type: "uint256" }] },
]
const MARKETPLACE_ABI = [
  { name: "jobCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "postJob", type: "function", stateMutability: "nonpayable", inputs: [{ name: "title", type: "string" }, { name: "description", type: "string" }, { name: "budget", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "applyForJob", type: "function", stateMutability: "nonpayable", inputs: [{ name: "jobId", type: "uint256" }], outputs: [] },
]
const PACHIPAY_ABI = [
  { name: "getProfile", type: "function", stateMutability: "view", inputs: [{ name: "freelancer", type: "address" }], outputs: [{ type: "tuple", components: [{ name: "totalEarned", type: "uint256" }, { name: "invoicesPaid", type: "uint256" }, { name: "reputationScore", type: "uint256" }, { name: "onTimePayments", type: "uint256" }, { name: "verified", type: "bool" }] }] },
  { name: "createInvoice", type: "function", stateMutability: "nonpayable", inputs: [{ name: "client_", type: "address" }, { name: "amount_", type: "uint256" }, { name: "dueDate_", type: "uint256" }, { name: "metadataURI_", type: "string" }], outputs: [{ name: "invoiceId", type: "uint256" }] },
]

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = (v, d = 18) => v ? parseFloat(formatUnits(v, d)).toFixed(2) : "0.00"
const short = a => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ""

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Syne', sans-serif; transition: background 0.3s, color 0.3s; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 10px; }

  [data-theme="dark"] {
    --bg: #080B12;
    --bg2: #0E1420;
    --bg3: #141B2D;
    --border: rgba(255,255,255,0.07);
    --text: #EEF0F4;
    --muted: rgba(238,240,244,0.45);
    --accent: #3B82F6;
    --accent2: #10B981;
    --gold: #F59E0B;
    --red: #EF4444;
    --purple: #8B5CF6;
    --orange: #F97316;
    --card: rgba(255,255,255,0.03);
    --card-hover: rgba(255,255,255,0.06);
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
    --glow: 0 0 40px rgba(59,130,246,0.15);
  }
  [data-theme="light"] {
    --bg: #F8FAFF;
    --bg2: #FFFFFF;
    --bg3: #EFF2F9;
    --border: rgba(0,0,0,0.08);
    --text: #0F1723;
    --muted: rgba(15,23,35,0.5);
    --accent: #2563EB;
    --accent2: #059669;
    --gold: #D97706;
    --red: #DC2626;
    --purple: #7C3AED;
    --orange: #EA580C;
    --card: rgba(255,255,255,0.9);
    --card-hover: #FFFFFF;
    --shadow: 0 2px 16px rgba(0,0,0,0.08);
    --glow: 0 0 40px rgba(37,99,235,0.08);
  }

  .mono { font-family: 'JetBrains Mono', monospace; }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: background 0.2s, box-shadow 0.2s;
  }
  .card:hover { background: var(--card-hover); box-shadow: var(--shadow); }

  input, textarea, select {
    background: var(--bg3);
    border: 1.5px solid var(--border);
    color: var(--text);
    padding: 12px 16px;
    width: 100%;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    outline: none;
    border-radius: 8px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
  input::placeholder, textarea::placeholder { color: var(--muted); }
  select option { background: var(--bg2); color: var(--text); }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes slideIn { from { transform: translateX(-20px); opacity:0; } to { transform: translateX(0); opacity:1; } }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
  .fade-in { animation: fadeIn 0.3s ease forwards; }

  .btn-primary {
    background: var(--accent);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.35); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .btn-outline {
    background: transparent;
    color: var(--accent);
    border: 1.5px solid var(--accent);
    padding: 11px 22px;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-outline:hover { background: var(--accent); color: white; }
  .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
    padding: 8px 16px;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--text); }

  .nav-tab {
    padding: 8px 16px;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
    background: transparent;
    color: var(--muted);
  }
  .nav-tab:hover { color: var(--text); background: var(--bg3); }
  .nav-tab.active { color: var(--accent); background: rgba(59,130,246,0.1); font-weight: 500; }

  .stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
  }
  .stat-card:hover { box-shadow: var(--glow); border-color: var(--accent); }

  .contract-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-radius: 10px;
    background: var(--bg3);
    border: 1px solid var(--border);
    transition: all 0.15s;
    margin-bottom: 8px;
  }
  .contract-row:hover { border-color: var(--accent); }

  .badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 20px;
    font-weight: 500;
  }

  .success-banner {
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.3);
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 20px;
    animation: fadeIn 0.3s ease;
  }

  .section-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
    margin-bottom: 6px;
  }
  .section-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 28px;
    letter-spacing: 0.03em;
  }

  .form-group { margin-bottom: 18px; }
  .form-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }

  .spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
  }

  .dot-live {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent2);
    animation: pulse 2s ease infinite;
    display: inline-block;
  }

  @media(max-width:768px){
    .grid-2,.grid-3,.grid-4{grid-template-columns:1fr;}
    .hide-mobile{display:none!important;}
  }
`

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button onClick={toggle} className="btn-ghost" style={{ padding: "8px 12px", fontSize: 16 }} title="Toggle theme">
      {dark ? "☀️" : "🌙"}
    </button>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spin() { return <div className="spinner" /> }

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, color = "var(--accent)" }) {
  return (
    <span className="badge" style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}>
      {children}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "var(--accent)", delay = 0 }) {
  return (
    <div className="stat-card fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
    </div>
  )
}

// ─── Success Banner ───────────────────────────────────────────────────────────
function Success({ hash, message = "Transaction confirmed!" }) {
  return (
    <div className="success-banner">
      <div className="mono" style={{ fontSize: 12, color: "var(--accent2)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>✓</span><span>{message}</span>
      </div>
      {hash && (
        <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer"
          className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginTop: 4, textDecoration: "none" }}>
          View on Basescan: {hash.slice(0, 28)}... ↗
        </a>
      )}
    </div>
  )
}

// ─── Connect Screen ───────────────────────────────────────────────────────────
function ConnectScreen({ connectors, connect }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ textAlign: "center", maxWidth: 460, width: "100%" }} className="fade-up">

        {/* Logo */}
        <div style={{ width: 80, height: 80, background: "linear-gradient(135deg, var(--accent), var(--purple))", borderRadius: 20, display: "grid", placeItems: "center", margin: "0 auto 32px", boxShadow: "var(--glow)" }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: "white" }}>P</span>
        </div>

        <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text)", marginBottom: 8, lineHeight: 1 }}>PachiPay</h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.15em", marginBottom: 6 }}>ONCHAIN FREELANCE ECOSYSTEM</p>
        <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 48, lineHeight: 1.8 }}>
          6 contracts · Base Mainnet · USDC + PACHI
        </p>

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 48 }}>
          {[["6", "Contracts"], ["10%", "APY"], ["USDC", "Payments"], ["Base", "Mainnet"]].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{v}</div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Connectors */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {connectors.map((c, i) => (
            <button key={c.uid} onClick={() => connect({ connector: c })} className="btn-primary"
              style={{ width: "100%", padding: "15px 24px", fontSize: 13, justifyContent: "space-between", background: i === 0 ? "var(--accent)" : "var(--bg3)", color: i === 0 ? "white" : "var(--text)", border: i === 0 ? "none" : "1px solid var(--border)" }}>
              <span>{c.name}</span><span>→</span>
            </button>
          ))}
        </div>

        <p className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 24, lineHeight: 1.8 }}>
          Connect to Base Mainnet to access invoicing,<br />staking, marketplace, and governance
        </p>
      </div>
    </div>
  )
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Nav({ tab, setTab, address, disconnect, isBase, switchToBase }) {
  const tabs = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "invoice", icon: "↗", label: "Invoice" },
    { id: "staking", icon: "◎", label: "Staking" },
    { id: "marketplace", icon: "⊡", label: "Jobs" },
    { id: "governance", icon: "◈", label: "Govern" },
  ]

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(12px)" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, var(--accent), var(--purple))", borderRadius: 8, display: "grid", placeItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>P</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>PachiPay</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
          <span className="dot-live" />
          <span className="mono badge" style={{ fontSize: 9, color: "var(--accent2)", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>Base Mainnet</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2 }} className="hide-mobile">
        {tabs.map(t => (
          <button key={t.id} className={`nav-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {!isBase && (
          <button className="btn-outline" style={{ padding: "6px 14px", fontSize: 10, color: "var(--red)", borderColor: "var(--red)" }} onClick={switchToBase}>
            Switch Network
          </button>
        )}
        <ThemeToggle />
        <div className="mono" style={{ fontSize: 11, color: "var(--accent2)", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "6px 12px", borderRadius: 8 }}>
          {short(address)}
        </div>
        <button className="btn-ghost" onClick={disconnect} style={{ padding: "7px 10px" }}>×</button>
      </div>
    </nav>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ address, usdcBal, pachiBal, stakeData, profile, jobCount, propCount }) {
  const contracts = [
    { name: "PachiPay", addr: CONTRACTS.pachiPay, desc: "Invoice & payment engine", color: "var(--accent)", icon: "📄" },
    { name: "ReputationBadge", addr: CONTRACTS.reputationBadge, desc: "Soulbound NFT credentials", color: "var(--purple)", icon: "🏅" },
    { name: "PACHI Token", addr: CONTRACTS.pachiToken, desc: "ERC-20 · 1,000,000 supply", color: "var(--gold)", icon: "🪙" },
    { name: "PachiStaking", addr: CONTRACTS.pachiStaking, desc: "Stake PACHI · 10% APY", color: "var(--accent2)", icon: "💰" },
    { name: "PachiGovernance", addr: CONTRACTS.pachiGovernance, desc: "Vote · 3-day proposals", color: "var(--purple)", icon: "🗳" },
    { name: "PachiMarketplace", addr: CONTRACTS.pachiMarketplace, desc: "Post jobs · Hire talent", color: "var(--orange)", icon: "🛒" },
  ]

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 className="section-title">Welcome back, <span style={{ color: "var(--accent)" }}>{short(address)}</span></h2>
        <p className="section-sub">Your onchain freelance hub · All systems live on Base Mainnet</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard icon="💵" label="USDC Balance" value={`$${fmt(usdcBal, 6)}`} sub="Base Mainnet" color="var(--accent2)" delay={0} />
        <StatCard icon="🪙" label="PACHI Balance" value={fmt(pachiBal)} sub="Reward Token" color="var(--gold)" delay={80} />
        <StatCard icon="🔒" label="PACHI Staked" value={fmt(stakeData?.[0])} sub={`+${fmt(stakeData?.[2])} pending`} color="var(--purple)" delay={160} />
        <StatCard icon="⭐" label="Rep Score" value={`${Number(profile?.reputationScore || 0)}/1000`} sub={`${Number(profile?.invoicesPaid || 0)} invoices paid`} color="var(--accent)" delay={240} />
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <StatCard icon="🛒" label="Jobs on Marketplace" value={jobCount?.toString() || "0"} sub="Open on Base" color="var(--orange)" delay={320} />
        <StatCard icon="🗳" label="Governance Proposals" value={propCount?.toString() || "0"} sub="Vote with PACHI" color="var(--purple)" delay={400} />
      </div>

      {/* Contracts */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Live Contracts</h3>
        <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 18 }}>6 contracts deployed on Base Mainnet · Click to view on Basescan</p>
      </div>

      {contracts.map(({ name, addr, desc, color, icon }) => (
        <div key={name} className="contract-row fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, display: "grid", placeItems: "center", fontSize: 18 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{name}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{desc}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "flex", gap: 8 }} >
              <span style={{ display: "block", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="hide-mobile">{addr}</span>
            </div>
            <a href={`https://basescan.org/address/${addr}`} target="_blank" rel="noreferrer"
              className="btn-ghost" style={{ fontSize: 11, textDecoration: "none", color }}>
              ↗ View
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Invoice Tab ──────────────────────────────────────────────────────────────
function InvoiceTab({ address, refetchUsdc }) {
  const [form, setForm] = useState({ client: "", amount: "", dueDate: "", service: "", notes: "" })
  const [hash, setHash] = useState(null)
  const { writeContractAsync, isPending } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const submit = async () => {
    try {
      const h = await writeContractAsync({
        address: CONTRACTS.pachiPay, abi: PACHIPAY_ABI, functionName: "createInvoice",
        args: [
          form.client || "0x0000000000000000000000000000000000000000",
          parseUnits(form.amount || "0", 6),
          form.dueDate ? BigInt(Math.floor(new Date(form.dueDate).getTime() / 1000)) : 0n,
          `data:application/json;base64,${btoa(JSON.stringify({ service: form.service, notes: form.notes, createdAt: new Date().toISOString() }))}`,
        ],
      })
      setHash(h)
      setForm({ client: "", amount: "", dueDate: "", service: "", notes: "" })
      refetchUsdc?.()
    } catch (e) { console.error(e) }
  }

  return (
    <div style={{ maxWidth: 660 }}>
      <h2 className="section-title">Create Invoice</h2>
      <p className="section-sub">Send USDC invoices · Stored permanently onchain · Instant settlement</p>

      {isSuccess && <Success hash={hash} message="Invoice created onchain!" />}

      <div className="card" style={{ padding: 28 }}>
        <div className="form-group">
          <label className="form-label">Client Wallet Address <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional — leave empty for pay-by-link)</span></label>
          <input placeholder="0x... or leave empty" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Service Description</label>
          <input placeholder="Brand Identity Design · Website Development · etc." value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Amount (USDC)</label>
            <input type="number" placeholder="1500" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            {form.amount && (
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6, lineHeight: 1.8 }}>
                ≈ ₦{(parseFloat(form.amount) * 1580).toLocaleString()} NGN<br />
                ≈ KSh{(parseFloat(form.amount) * 129).toLocaleString()} KES
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea rows={3} placeholder="Payment terms, revisions policy, etc." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
        </div>

        <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--accent2)" }}>
            ✓ Payment credited to {short(address)} · Base Mainnet · USDC · 0.5% fee
          </p>
        </div>

        <button className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 13, justifyContent: "center" }}
          onClick={submit} disabled={isPending || !form.amount || !form.service}>
          {isPending ? <><Spin /> Confirm in wallet...</> : "Create Invoice Onchain →"}
        </button>
      </div>
    </div>
  )
}

// ─── Staking Tab ──────────────────────────────────────────────────────────────
function StakingTab({ pachiBal, stakeData, refetchPachi, refetchStake }) {
  const [amount, setAmount] = useState("")
  const [hash, setHash] = useState(null)
  const { writeContractAsync, isPending } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const doStake = async () => {
    try {
      const amt = parseUnits(amount, 18)
      await writeContractAsync({ address: CONTRACTS.pachiToken, abi: PACHI_ABI, functionName: "approve", args: [CONTRACTS.pachiStaking, amt] })
      const h = await writeContractAsync({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "stake", args: [amt] })
      setHash(h); setAmount(""); refetchPachi?.(); refetchStake?.()
    } catch (e) { console.error(e) }
  }
  const doUnstake = async () => {
    try {
      const h = await writeContractAsync({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "unstake", args: [stakeData?.[0]] })
      setHash(h); refetchPachi?.(); refetchStake?.()
    } catch (e) { console.error(e) }
  }
  const doClaim = async () => {
    try {
      const h = await writeContractAsync({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "claimReward", args: [] })
      setHash(h); refetchPachi?.(); refetchStake?.()
    } catch (e) { console.error(e) }
  }

  const apy = 10
  const dailyEarnings = stakeData?.[0] ? parseFloat(formatUnits(stakeData[0], 18)) * apy / 365 : 0

  return (
    <div style={{ maxWidth: 680 }}>
      <h2 className="section-title">Stake PACHI</h2>
      <p className="section-sub">Earn 10% APY · Rewards calculated per second · No lock-up period</p>

      {isSuccess && <Success hash={hash} message="Transaction confirmed!" />}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <StatCard icon="🪙" label="PACHI Balance" value={fmt(pachiBal)} sub="Available to stake" color="var(--gold)" />
        <StatCard icon="🔒" label="Currently Staked" value={fmt(stakeData?.[0])} sub="Earning 10% APY" color="var(--purple)" />
        <StatCard icon="✨" label="Pending Rewards" value={fmt(stakeData?.[2])} sub={`~${dailyEarnings.toFixed(4)} PACHI/day`} color="var(--accent2)" />
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 16 }}>
        <label className="form-label">Amount to Stake (PACHI)</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input type="number" placeholder="Enter PACHI amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <button className="btn-primary" style={{ whiteSpace: "nowrap" }} onClick={doStake} disabled={isPending || !amount}>
            {isPending ? <Spin /> : "Stake →"}
          </button>
        </div>
        {amount && (
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.8 }}>
            Estimated daily: ~{(parseFloat(amount) * apy / 365 / 100).toFixed(4)} PACHI/day
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button className="btn-outline" style={{ width: "100%", padding: 14, justifyContent: "center", color: "var(--accent2)", borderColor: "var(--accent2)" }}
          onClick={doClaim} disabled={isPending || !stakeData?.[2]}>
          {isPending ? <Spin /> : `Claim ${fmt(stakeData?.[2])} PACHI`}
        </button>
        <button className="btn-outline" style={{ width: "100%", padding: 14, justifyContent: "center", color: "var(--red)", borderColor: "var(--red)" }}
          onClick={doUnstake} disabled={isPending || !stakeData?.[0]}>
          {isPending ? <Spin /> : "Unstake All"}
        </button>
      </div>

      <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 10, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
        <p className="mono" style={{ fontSize: 11, color: "var(--purple)", lineHeight: 1.9 }}>
          📊 APY: 10% · Rewards accrue per second · Compounding every claim<br />
          🔓 No lock period · Unstake anytime · PACHI minted directly to wallet
        </p>
      </div>
    </div>
  )
}

// ─── Marketplace Tab ──────────────────────────────────────────────────────────
function MarketplaceTab({ address, jobCount, refetchUsdc }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", budget: "" })
  const [hash, setHash] = useState(null)
  const { writeContractAsync, isPending } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const postJob = async () => {
    try {
      const budget = parseUnits(form.budget, 6)
      const fee = budget * 50n / 10000n
      await writeContractAsync({ address: CONTRACTS.usdc, abi: USDC_ABI, functionName: "approve", args: [CONTRACTS.pachiMarketplace, budget + fee] })
      const h = await writeContractAsync({ address: CONTRACTS.pachiMarketplace, abi: MARKETPLACE_ABI, functionName: "postJob", args: [form.title, form.description, budget] })
      setHash(h); setShowForm(false); setForm({ title: "", description: "", budget: "" }); refetchUsdc?.()
    } catch (e) { console.error(e) }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 className="section-title">Job Marketplace</h2>
          <p className="section-sub">{jobCount?.toString() || "0"} jobs posted · Paid in USDC · PACHI rewards on completion</p>
        </div>
        <button className="btn-primary" style={{ background: "var(--orange)", flexShrink: 0 }} onClick={() => setShowForm(!showForm)}>
          + Post a Job
        </button>
      </div>

      {isSuccess && <Success hash={hash} message="Job posted onchain!" />}

      {showForm && (
        <div className="card fade-in" style={{ padding: 28, marginBottom: 24, borderColor: "var(--orange)", borderWidth: 1.5 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 20, color: "var(--text)" }}>New Job Posting</h3>
          <div className="form-group">
            <label className="form-label">Job Title</label>
            <input placeholder="Design landing page for Web3 startup" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={3} placeholder="Describe the scope, deliverables, and timeline..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
          </div>
          <div className="form-group">
            <label className="form-label">Budget (USDC)</label>
            <input type="number" placeholder="500" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>0.5% platform fee · Budget locked in contract until job completion</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" style={{ background: "var(--orange)" }} onClick={postJob} disabled={isPending || !form.title || !form.budget}>
              {isPending ? <><Spin /> Posting...</> : "Post Job Onchain →"}
            </button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🛒</div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
          {Number(jobCount || 0) === 0 ? "No jobs posted yet" : `${jobCount?.toString()} Jobs on Base`}
        </h3>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 2, maxWidth: 400, margin: "0 auto" }}>
          Clients lock USDC in the contract · Freelancers apply · Payment released on completion · PACHI rewards for both parties
        </p>
      </div>
    </div>
  )
}

// ─── Governance Tab ───────────────────────────────────────────────────────────
function GovernanceTab({ propCount }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "" })
  const [hash, setHash] = useState(null)
  const { writeContractAsync, isPending } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const create = async () => {
    try {
      const h = await writeContractAsync({ address: CONTRACTS.pachiGovernance, abi: GOVERNANCE_ABI, functionName: "createProposal", args: [form.title, form.description] })
      setHash(h); setShowForm(false); setForm({ title: "", description: "" })
    } catch (e) { console.error(e) }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 className="section-title">Governance</h2>
          <p className="section-sub">{propCount?.toString() || "0"} proposals · Vote with PACHI · 3-day voting period</p>
        </div>
        <button className="btn-primary" style={{ background: "var(--purple)", flexShrink: 0 }} onClick={() => setShowForm(!showForm)}>
          + New Proposal
        </button>
      </div>

      {isSuccess && <Success hash={hash} message="Proposal created onchain!" />}

      {showForm && (
        <div className="card fade-in" style={{ padding: 28, marginBottom: 24, borderColor: "var(--purple)", borderWidth: 1.5 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 20, color: "var(--text)" }}>New Proposal</h3>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input placeholder="Reduce platform fee from 0.5% to 0.3%" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={5} placeholder="Describe your proposal in detail — what changes, why, and expected impact..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
          </div>
          <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 18 }}>
            <p className="mono" style={{ fontSize: 11, color: "var(--purple)", lineHeight: 1.9 }}>
              ⚡ Requires PACHI balance · Voting lasts 3 days · Passes with majority YES votes and 1,000+ PACHI total
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" style={{ background: "var(--purple)" }} onClick={create} disabled={isPending || !form.title}>
              {isPending ? <><Spin /> Creating...</> : "Submit Proposal →"}
            </button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🗳</div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
          {Number(propCount || 0) === 0 ? "No proposals yet" : `${propCount?.toString()} Proposals`}
        </h3>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 2, maxWidth: 400, margin: "0 auto" }}>
          PACHI holders vote on platform decisions · Fully onchain · Decentralized governance for the PachiPay ecosystem
        </p>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true)
  const [tab, setTab] = useState("dashboard")
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const isBase = chainId === base.id

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
    document.body.style.background = dark ? "#080B12" : "#F8FAFF"
    document.body.style.color = dark ? "#EEF0F4" : "#0F1723"
  }, [dark])

  const { data: usdcBal, refetch: ru } = useReadContract({ address: CONTRACTS.usdc, abi: USDC_ABI, functionName: "balanceOf", args: [address], query: { enabled: !!address } })
  const { data: pachiBal, refetch: rp } = useReadContract({ address: CONTRACTS.pachiToken, abi: PACHI_ABI, functionName: "balanceOf", args: [address], query: { enabled: !!address } })
  const { data: stakeData, refetch: rs } = useReadContract({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "getStake", args: [address], query: { enabled: !!address } })
  const { data: profile } = useReadContract({ address: CONTRACTS.pachiPay, abi: PACHIPAY_ABI, functionName: "getProfile", args: [address], query: { enabled: !!address } })
  const { data: jobCount } = useReadContract({ address: CONTRACTS.pachiMarketplace, abi: MARKETPLACE_ABI, functionName: "jobCount" })
  const { data: propCount } = useReadContract({ address: CONTRACTS.pachiGovernance, abi: GOVERNANCE_ABI, functionName: "proposalCount" })

  if (!isConnected) return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      <div data-theme={dark ? "dark" : "light"}>
        <style>{GLOBAL_CSS}</style>
        <ConnectScreen connectors={connectors} connect={connect} />
      </div>
    </ThemeCtx.Provider>
  )

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      <div data-theme={dark ? "dark" : "light"} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
        <style>{GLOBAL_CSS}</style>

        <Nav tab={tab} setTab={setTab} address={address} disconnect={disconnect} isBase={isBase} switchToBase={() => switchChain({ chainId: base.id })} />

        {!isBase && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "none", borderBottom: "1px solid rgba(239,68,68,0.2)", padding: "10px 28px", textAlign: "center" }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--red)" }}>⚠ You're on the wrong network. Switch to Base Mainnet to use all features.</span>
          </div>
        )}

        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "36px 28px 80px" }}>
          {tab === "dashboard" && <Dashboard address={address} usdcBal={usdcBal} pachiBal={pachiBal} stakeData={stakeData} profile={profile} jobCount={jobCount} propCount={propCount} />}
          {tab === "invoice" && <InvoiceTab address={address} refetchUsdc={ru} />}
          {tab === "staking" && <StakingTab pachiBal={pachiBal} stakeData={stakeData} refetchPachi={rp} refetchStake={rs} />}
          {tab === "marketplace" && <MarketplaceTab address={address} jobCount={jobCount} refetchUsdc={ru} />}
          {tab === "governance" && <GovernanceTab propCount={propCount} />}
        </div>
      </div>
    </ThemeCtx.Provider>
  )
}

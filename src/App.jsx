import { useState } from "react"
import {
  useAccount, useConnect, useDisconnect, useSwitchChain,
  useReadContract, useWriteContract, useWaitForTransactionReceipt
} from "wagmi"
import { base } from "wagmi/chains"
import { formatUnits, parseUnits } from "viem"
import { CONTRACTS } from "./lib/wagmi.js"

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
  { name: "vote", type: "function", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "bool" }], outputs: [] },
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

const fmt = (v, d = 18) => v ? parseFloat(formatUnits(v, d)).toFixed(2) : "0.00"
const short = (a) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ""

const GOLD = "#F5C842"; const GREEN = "#4ADE80"; const PURPLE = "#A78BFA"; const ORANGE = "#FB923C"; const BLUE = "#60A5FA"; const RED = "#F87171"
const BG = "#0A0A0F"; const CARD = "rgba(255,255,255,0.03)"; const BORDER = "rgba(255,255,255,0.08)"; const TEXT = "#F1F0EC"; const MUTED = "rgba(241,240,236,0.45)"
const MONO = "'IBM Plex Mono', monospace"; const SERIF = "'DM Serif Display', Georgia, serif"

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(245,200,66,0.3);}
input,textarea,select{background:rgba(255,255,255,0.04);border:1px solid ${BORDER};color:${TEXT};padding:10px 14px;width:100%;font-family:${MONO};font-size:12px;outline:none;border-radius:4px;}
input:focus,textarea:focus{border-color:${GOLD};}
input::placeholder,textarea::placeholder{color:rgba(241,240,236,0.2);}
select option{background:#1A1A2E;}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{to{transform:rotate(360deg);}}
.fade{animation:fadeUp 0.35s ease forwards;}
`

const btn = (col = GOLD, outline = false) => ({ background: outline ? "transparent" : col, color: outline ? col : "#0A0A0F", border: `1px solid ${col}`, padding: "10px 18px", fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", borderRadius: 4, fontWeight: 500 })
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 22 }
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 7 }

function Spin() { return <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> }
function Tag({ children, color = GOLD }) { return <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color, background: `${color}18`, border: `1px solid ${color}33`, padding: "3px 8px", borderRadius: 3 }}>{children}</span> }
function Stat({ label: l, value, sub, color = GOLD }) {
  return <div style={card}><div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>{l}</div><div style={{ fontFamily: SERIF, fontSize: 26, color, marginBottom: 3 }}>{value}</div>{sub && <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{sub}</div>}</div>
}

const TABS = [{ id: "dashboard", label: "◈ Overview" }, { id: "invoice", label: "📄 Invoice" }, { id: "staking", label: "💰 Staking" }, { id: "marketplace", label: "🛒 Jobs" }, { id: "governance", label: "🗳 Govern" }]

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [tab, setTab] = useState("dashboard")
  const isBase = chainId === base.id

  const { data: usdcBal, refetch: ru } = useReadContract({ address: CONTRACTS.usdc, abi: USDC_ABI, functionName: "balanceOf", args: [address], query: { enabled: !!address } })
  const { data: pachiBal, refetch: rp } = useReadContract({ address: CONTRACTS.pachiToken, abi: PACHI_ABI, functionName: "balanceOf", args: [address], query: { enabled: !!address } })
  const { data: stakeData, refetch: rs } = useReadContract({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "getStake", args: [address], query: { enabled: !!address } })
  const { data: profile } = useReadContract({ address: CONTRACTS.pachiPay, abi: PACHIPAY_ABI, functionName: "getProfile", args: [address], query: { enabled: !!address } })
  const { data: jobCount } = useReadContract({ address: CONTRACTS.pachiMarketplace, abi: MARKETPLACE_ABI, functionName: "jobCount" })
  const { data: propCount } = useReadContract({ address: CONTRACTS.pachiGovernance, abi: GOVERNANCE_ABI, functionName: "proposalCount" })

  if (!isConnected) return (
    <div style={{ fontFamily: SERIF, background: BG, minHeight: "100vh", color: TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", maxWidth: 440, padding: 40 }} className="fade">
        <div style={{ width: 72, height: 72, background: GOLD, display: "grid", placeItems: "center", borderRadius: 16, margin: "0 auto 28px" }}>
          <span style={{ fontFamily: MONO, fontSize: 30, color: "#0A0A0F", fontWeight: 700 }}>P</span>
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>PachiPay</h1>
        <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, letterSpacing: "0.12em", marginBottom: 8 }}>ONCHAIN FREELANCE ECOSYSTEM</p>
        <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginBottom: 40 }}>6 contracts · Base Mainnet · USDC payments</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
          {connectors.map(c => (
            <button key={c.uid} onClick={() => connect({ connector: c })} style={{ ...btn(GOLD), width: "100%", padding: "14px 24px", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{c.name}</span><span>→</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          {[["6", "Contracts"], ["Base", "Mainnet"], ["USDC", "Payments"], ["10%", "APY"]].map(([v, l]) => (
            <div key={l}><div style={{ fontFamily: SERIF, fontSize: 22, color: GOLD }}>{v}</div><div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.15em", textTransform: "uppercase" }}>{l}</div></div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: SERIF, background: BG, minHeight: "100vh", color: TEXT }}>
      <style>{CSS}</style>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "13px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: BG, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: GOLD, display: "grid", placeItems: "center", borderRadius: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: "#0A0A0F", fontWeight: 700 }}>P</span>
          </div>
          <span style={{ fontFamily: SERIF, fontSize: 17 }}>PachiPay</span>
          <Tag color={GREEN}>Base Mainnet</Tag>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...btn(tab === t.id ? GOLD : "transparent", tab !== t.id), padding: "7px 13px", fontSize: 10, color: tab === t.id ? "#0A0A0F" : MUTED, borderColor: tab === t.id ? GOLD : "transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!isBase && <button onClick={() => switchChain({ chainId: base.id })} style={{ ...btn(RED, true), padding: "7px 14px", fontSize: 10 }}>Switch to Base</button>}
          <Tag color={GREEN}>{short(address)}</Tag>
          <button onClick={disconnect} style={{ ...btn("transparent", true), borderColor: BORDER, color: MUTED, padding: "7px 12px" }}>×</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "32px 24px 80px" }} className="fade">

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <h2 style={{ fontSize: 38, fontWeight: 400, marginBottom: 4 }}>Welcome, <em style={{ color: GOLD, fontStyle: "italic" }}>{short(address)}</em></h2>
            <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 32 }}>Your onchain freelance hub · All 6 contracts live on Base</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
              <Stat label="USDC Balance" value={`$${fmt(usdcBal, 6)}`} sub="Base Mainnet" color={GREEN} />
              <Stat label="PACHI Balance" value={fmt(pachiBal)} sub="Reward Token" color={GOLD} />
              <Stat label="PACHI Staked" value={fmt(stakeData?.[0])} sub={`+${fmt(stakeData?.[2])} pending`} color={PURPLE} />
              <Stat label="Rep Score" value={`${Number(profile?.reputationScore || 0)}/1000`} sub={`${Number(profile?.invoicesPaid || 0)} invoices`} color={BLUE} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
              <Stat label="Jobs on Marketplace" value={jobCount?.toString() || "0"} sub="Posted on Base" color={ORANGE} />
              <Stat label="Governance Proposals" value={propCount?.toString() || "0"} sub="Vote with PACHI" color={PURPLE} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 400, marginBottom: 16 }}>6 Live Contracts <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>· Base Mainnet</span></h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { name: "PachiPay", addr: CONTRACTS.pachiPay, desc: "Invoice & payments", color: GOLD },
                { name: "ReputationBadge", addr: CONTRACTS.reputationBadge, desc: "Soulbound NFT credentials", color: BLUE },
                { name: "PACHI Token", addr: CONTRACTS.pachiToken, desc: "ERC-20 reward token · 1M supply", color: GREEN },
                { name: "PachiStaking", addr: CONTRACTS.pachiStaking, desc: "Stake PACHI · Earn 10% APY", color: GOLD },
                { name: "PachiGovernance", addr: CONTRACTS.pachiGovernance, desc: "Vote on platform decisions", color: PURPLE },
                { name: "PachiMarketplace", addr: CONTRACTS.pachiMarketplace, desc: "Post jobs · Hire freelancers", color: ORANGE },
              ].map(({ name, addr, desc, color }) => (
                <div key={name} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color, marginBottom: 3 }}>{name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginBottom: 6 }}>{desc}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addr}</div>
                  </div>
                  <a href={`https://basescan.org/address/${addr}`} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color, textDecoration: "none", marginLeft: 12, flexShrink: 0 }}>↗</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVOICE */}
        {tab === "invoice" && (() => {
          const [form, setForm] = useState({ client: "", amount: "", dueDate: "", service: "" })
          const [hash, setHash] = useState(null)
          const { writeContractAsync, isPending } = useWriteContract()
          const { isSuccess } = useWaitForTransactionReceipt({ hash })

          const submit = async () => {
            try {
              const h = await writeContractAsync({
                address: CONTRACTS.pachiPay, abi: PACHIPAY_ABI, functionName: "createInvoice",
                args: [form.client || "0x0000000000000000000000000000000000000000", parseUnits(form.amount || "0", 6), form.dueDate ? BigInt(Math.floor(new Date(form.dueDate).getTime() / 1000)) : 0n, `data:application/json;base64,${btoa(JSON.stringify({ service: form.service }))}`],
              })
              setHash(h)
              ru()
            } catch (e) { console.error(e) }
          }

          return (
            <div style={{ maxWidth: 600 }}>
              <h2 style={{ fontSize: 38, fontWeight: 400, marginBottom: 4 }}>Create <em style={{ color: GOLD, fontStyle: "italic" }}>Invoice</em></h2>
              <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 32 }}>Send USDC invoices · Onchain · Instant settlement</p>
              {isSuccess && <div style={{ ...card, borderColor: GREEN, background: "rgba(74,222,128,0.05)", marginBottom: 20 }}><p style={{ fontFamily: MONO, fontSize: 12, color: GREEN }}>✓ Invoice created onchain!</p></div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label style={label}>Client Wallet (optional — leave empty for pay-by-link)</label><input placeholder="0x..." value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
                <div><label style={label}>Service Description</label><input placeholder="Brand Design · Website Development · etc." value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={label}>Amount (USDC)</label>
                    <input type="number" placeholder="1500" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    {form.amount && <p style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 6 }}>≈ ₦{(parseFloat(form.amount) * 1580).toLocaleString()} NGN</p>}
                  </div>
                  <div><label style={label}>Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                </div>
                <div style={{ ...card, background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.2)" }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: GREEN }}>Paid to: {short(address)} · Base Mainnet · USDC · 0.5% fee</p>
                </div>
                <button style={{ ...btn(GOLD), padding: 14, fontSize: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={submit} disabled={isPending || !form.amount || !form.service}>
                  {isPending ? <><Spin /> Confirm in wallet...</> : "Create Invoice Onchain →"}
                </button>
              </div>
            </div>
          )
        })()}

        {/* STAKING */}
        {tab === "staking" && (() => {
          const [amount, setAmount] = useState("")
          const [hash, setHash] = useState(null)
          const { writeContractAsync, isPending } = useWriteContract()
          const { isSuccess } = useWaitForTransactionReceipt({ hash })

          const doStake = async () => {
            try {
              const amt = parseUnits(amount, 18)
              await writeContractAsync({ address: CONTRACTS.pachiToken, abi: PACHI_ABI, functionName: "approve", args: [CONTRACTS.pachiStaking, amt] })
              const h = await writeContractAsync({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "stake", args: [amt] })
              setHash(h); rp(); rs()
            } catch (e) { console.error(e) }
          }
          const doUnstake = async () => {
            try { const h = await writeContractAsync({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "unstake", args: [stakeData?.[0]] }); setHash(h); rp(); rs() } catch (e) { console.error(e) }
          }
          const doClaim = async () => {
            try { const h = await writeContractAsync({ address: CONTRACTS.pachiStaking, abi: STAKING_ABI, functionName: "claimReward", args: [] }); setHash(h); rp(); rs() } catch (e) { console.error(e) }
          }

          return (
            <div style={{ maxWidth: 620 }}>
              <h2 style={{ fontSize: 38, fontWeight: 400, marginBottom: 4 }}>Stake <em style={{ color: GOLD, fontStyle: "italic" }}>PACHI</em></h2>
              <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 32 }}>Earn 10% APY · Rewards per second · Unstake anytime</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                <Stat label="PACHI Balance" value={fmt(pachiBal)} sub="Available" color={GOLD} />
                <Stat label="Staked" value={fmt(stakeData?.[0])} sub="Earning 10% APY" color={PURPLE} />
                <Stat label="Pending Rewards" value={fmt(stakeData?.[2])} sub="Claimable now" color={GREEN} />
              </div>
              {isSuccess && <div style={{ ...card, borderColor: GREEN, background: "rgba(74,222,128,0.05)", marginBottom: 16 }}><p style={{ fontFamily: MONO, fontSize: 12, color: GREEN }}>✓ Transaction confirmed!</p></div>}
              <div style={{ ...card, marginBottom: 14 }}>
                <label style={label}>Amount to Stake (PACHI)</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="number" placeholder="1000" value={amount} onChange={e => setAmount(e.target.value)} />
                  <button style={{ ...btn(GOLD), whiteSpace: "nowrap", display: "flex", gap: 8, alignItems: "center" }} onClick={doStake} disabled={isPending || !amount}>
                    {isPending ? <Spin /> : "Stake →"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...btn(GREEN, true), flex: 1 }} onClick={doClaim} disabled={isPending}>Claim {fmt(stakeData?.[2])} PACHI</button>
                <button style={{ ...btn(RED, true), flex: 1 }} onClick={doUnstake} disabled={isPending}>Unstake All</button>
              </div>
            </div>
          )
        })()}

        {/* MARKETPLACE */}
        {tab === "marketplace" && (() => {
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
              setHash(h); setShowForm(false); ru()
            } catch (e) { console.error(e) }
          }

          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 38, fontWeight: 400, marginBottom: 4 }}>Job <em style={{ color: ORANGE, fontStyle: "italic" }}>Marketplace</em></h2>
                  <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{jobCount?.toString() || "0"} jobs · Paid in USDC · PACHI rewards</p>
                </div>
                <button style={btn(ORANGE)} onClick={() => setShowForm(!showForm)}>+ Post Job</button>
              </div>
              {isSuccess && <div style={{ ...card, borderColor: GREEN, background: "rgba(74,222,128,0.05)", marginBottom: 20 }}><p style={{ fontFamily: MONO, fontSize: 12, color: GREEN }}>✓ Job posted onchain!</p></div>}
              {showForm && (
                <div style={{ ...card, borderColor: `${ORANGE}44`, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 18 }}>New Job</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div><label style={label}>Title</label><input placeholder="Design landing page for Web3 startup" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                    <div><label style={label}>Description</label><textarea rows={3} placeholder="Describe requirements..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} /></div>
                    <div><label style={label}>Budget (USDC)</label><input type="number" placeholder="500" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                    <button style={{ ...btn(ORANGE), display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }} onClick={postJob} disabled={isPending || !form.title || !form.budget}>
                      {isPending ? <><Spin /> Posting...</> : "Post Job Onchain →"}
                    </button>
                  </div>
                </div>
              )}
              <div style={{ ...card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
                <p style={{ fontFamily: MONO, fontSize: 12, color: MUTED, lineHeight: 1.9 }}>
                  {Number(jobCount || 0) === 0 ? "No jobs yet. Post the first job!" : `${jobCount?.toString()} jobs posted on Base.`}<br />
                  Clients lock USDC · Freelancers apply · Payment released on completion
                </p>
              </div>
            </div>
          )
        })()}

        {/* GOVERNANCE */}
        {tab === "governance" && (() => {
          const [showForm, setShowForm] = useState(false)
          const [form, setForm] = useState({ title: "", description: "" })
          const [hash, setHash] = useState(null)
          const { writeContractAsync, isPending } = useWriteContract()
          const { isSuccess } = useWaitForTransactionReceipt({ hash })

          const create = async () => {
            try {
              const h = await writeContractAsync({ address: CONTRACTS.pachiGovernance, abi: GOVERNANCE_ABI, functionName: "createProposal", args: [form.title, form.description] })
              setHash(h); setShowForm(false)
            } catch (e) { console.error(e) }
          }

          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 38, fontWeight: 400, marginBottom: 4 }}>Pachi <em style={{ color: PURPLE, fontStyle: "italic" }}>Governance</em></h2>
                  <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{propCount?.toString() || "0"} proposals · Vote with PACHI · 3-day period</p>
                </div>
                <button style={btn(PURPLE)} onClick={() => setShowForm(!showForm)}>+ New Proposal</button>
              </div>
              {isSuccess && <div style={{ ...card, borderColor: GREEN, background: "rgba(74,222,128,0.05)", marginBottom: 20 }}><p style={{ fontFamily: MONO, fontSize: 12, color: GREEN }}>✓ Proposal created!</p></div>}
              {showForm && (
                <div style={{ ...card, borderColor: `${PURPLE}44`, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 18 }}>New Proposal</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div><label style={label}>Title</label><input placeholder="Reduce platform fee to 0.3%" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                    <div><label style={label}>Description</label><textarea rows={4} placeholder="Detailed explanation..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} /></div>
                    <div style={{ ...card, background: `${PURPLE}08`, borderColor: `${PURPLE}33` }}><p style={{ fontFamily: MONO, fontSize: 10, color: PURPLE, lineHeight: 1.8 }}>Requires PACHI balance to create · Voting lasts 3 days · Passes if YES votes &gt; NO votes with 1000+ PACHI total</p></div>
                    <button style={{ ...btn(PURPLE), display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }} onClick={create} disabled={isPending || !form.title}>
                      {isPending ? <><Spin /> Creating...</> : "Submit Proposal →"}
                    </button>
                  </div>
                </div>
              )}
              <div style={{ ...card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🗳</div>
                <p style={{ fontFamily: MONO, fontSize: 12, color: MUTED, lineHeight: 1.9 }}>
                  {Number(propCount || 0) === 0 ? "No proposals yet. Create the first one!" : `${propCount?.toString()} proposals on Base.`}<br />
                  PACHI holders vote · Decentralized governance · All decisions onchain
                </p>
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}

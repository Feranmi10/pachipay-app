import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract } from "wagmi"
import { base } from "wagmi/chains"
import { formatUnits } from "viem"
import { CONTRACTS } from "./lib/wagmi.js"

const USDC_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }]

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const ok = chainId === base.id

  const { data: bal } = useReadContract({
    address: CONTRACTS.usdc,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  })

  return (
    <div style={{ background:"#0F0E0A", minHeight:"100vh", color:"#F5EED8", padding:40, fontFamily:"Georgia,serif" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:48 }}>
          <div style={{ width:32, height:32, background:"#E8B86D", display:"grid", placeItems:"center" }}>
            <span style={{ fontFamily:"monospace", color:"#0F0E0A", fontWeight:"bold" }}>P</span>
          </div>
          <span style={{ fontSize:20, fontWeight:300 }}>PachiPay</span>
          <span style={{ fontFamily:"monospace", fontSize:10, color:"#7EC8A4", marginLeft:"auto" }}>LIVE ON BASE MAINNET</span>
        </div>

        {!isConnected ? (
          <div>
            <h2 style={{ fontSize:40, fontWeight:300, marginBottom:32 }}>Connect your <em style={{ color:"#E8B86D" }}>wallet</em></h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {connectors.map(c => (
                <button key={c.uid} onClick={() => connect({ connector: c })}
                  style={{ background:"rgba(245,238,216,0.05)", border:"1px solid rgba(245,238,216,0.15)", color:"#F5EED8", padding:"16px 24px", cursor:"pointer", textAlign:"left", fontSize:15, display:"flex", justifyContent:"space-between" }}>
                  {c.name} <span>→</span>
                </button>
              ))}
            </div>
          </div>
        ) : !ok ? (
          <div style={{ background:"rgba(232,100,100,0.1)", border:"1px solid rgba(232,100,100,0.3)", padding:24 }}>
            <p style={{ color:"#E87D6D", fontFamily:"monospace", marginBottom:16 }}>Wrong network — switch to Base Mainnet</p>
            <button onClick={() => switchChain({ chainId: base.id })}
              style={{ background:"#E8B86D", color:"#0F0E0A", border:"none", padding:"12px 24px", cursor:"pointer", fontFamily:"monospace" }}>
              SWITCH TO BASE MAINNET
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background:"rgba(126,200,164,0.06)", border:"1px solid rgba(126,200,164,0.2)", padding:20, marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ fontFamily:"monospace", fontSize:10, color:"rgba(126,200,164,0.7)", marginBottom:4 }}>CONNECTED - BASE MAINNET</p>
                <p style={{ fontFamily:"monospace", color:"#7EC8A4" }}>{address?.slice(0,6)}...{address?.slice(-4)}</p>
              </div>
              <button onClick={disconnect} style={{ background:"none", border:"1px solid rgba(245,238,216,0.15)", color:"rgba(245,238,216,0.4)", padding:"8px 16px", cursor:"pointer", fontFamily:"monospace", fontSize:11 }}>DISCONNECT</button>
            </div>
            <div style={{ background:"rgba(232,184,109,0.08)", border:"1px solid rgba(232,184,109,0.25)", padding:24, marginBottom:24 }}>
              <p style={{ fontFamily:"monospace", fontSize:10, color:"rgba(232,184,109,0.6)", marginBottom:8 }}>USDC BALANCE</p>
              <p style={{ fontSize:40, fontWeight:300, color:"#E8B86D", margin:0 }}>
                {bal ? parseFloat(formatUnits(bal, 6)).toFixed(2) : "0.00"}
                <span style={{ fontFamily:"monospace", fontSize:14, color:"rgba(232,184,109,0.5)" }}> USDC</span>
              </p>
            </div>
            <div style={{ border:"1px solid rgba(245,238,216,0.08)", padding:20 }}>
              <p style={{ fontFamily:"monospace", fontSize:10, color:"rgba(245,238,216,0.3)", marginBottom:8 }}>LIVE CONTRACT - BASE MAINNET</p>
              <p style={{ fontFamily:"monospace", fontSize:11, color:"rgba(232,184,109,0.6)", wordBreak:"break-all" }}>{CONTRACTS.pachiPay}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { http, createConfig } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { injected, coinbaseWallet } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({ appName: "PachiPay" }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
})

export const CONTRACTS = {
  pachiPay: "0xF5F89866997eA666B3FAa4a8F6Fca76CF66b0e54",
  badge:    "0xD7116FDe599b06E4A2ca24BF88B8338677591C5a",
  usdc:     "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

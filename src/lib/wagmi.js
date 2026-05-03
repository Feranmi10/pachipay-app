import { http, createConfig } from "wagmi"
import { base } from "wagmi/chains"
import { injected, coinbaseWallet } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: "PachiPay" }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
})

export const CONTRACTS = {
  pachiPay: "0xF5F89866997eA666B3FAa4a8F6Fca76CF66b0e54",
  badge:    "0xD7116FDe599b06E4A2ca24BF88B8338677591C5a",
  usdc:     "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
}

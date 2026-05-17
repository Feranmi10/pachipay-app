import { http, createConfig } from "wagmi"
import { base } from "wagmi/chains"
import { injected, coinbaseWallet } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [coinbaseWallet({ appName: "PachiPay" }), injected({ shimDisconnect: true })],
  transports: { [base.id]: http("https://mainnet.base.org") },
})

export const CONTRACTS = {
  pachiPay:         "0xF5F89866997eA666B3FAa4a8F6Fca76CF66b0e54",
  reputationBadge:  "0xD7116FDe599b06E4A2ca24BF88B8338677591C5a",
  pachiToken:       "0xAcb3Bd9286330049c6e195e6527f3365E9c3030C",
  pachiStaking:     "0x3De4A1Deb042189ff299221d3546Ea1a4aa06109",
  pachiGovernance:  "0x7EE984447380857e22C2bc9beFa4D53f9B118ea3",
  pachiMarketplace: "0xF0EC740FFe498463B3836Afa67Ce2b66AC7b6fDD",
  usdc:             "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
}

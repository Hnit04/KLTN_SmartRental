import type { SystemConfigResponse } from "@/api/configApi";

export type BlockchainRuntimeConfig = {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

const DEFAULT_CHAIN_ID = 11155111;
const DEFAULT_CHAIN_HEX = "0xaa36a7";
const DEFAULT_CHAIN_NAME = "Sepolia Testnet";
const DEFAULT_RPC = "https://rpc.sepolia.org";
const DEFAULT_EXPLORER = "https://sepolia.etherscan.io";

function parseChainId(chainIdHex?: string, chainIdDec?: number): number {
  if (typeof chainIdDec === "number" && Number.isFinite(chainIdDec)) return chainIdDec;
  if (typeof chainIdHex === "string" && chainIdHex.startsWith("0x")) {
    const parsed = Number.parseInt(chainIdHex, 16);
    if (Number.isFinite(parsed)) return parsed;
  }
  return DEFAULT_CHAIN_ID;
}

export function getBlockchainRuntimeConfig(
  config?: Partial<SystemConfigResponse>
): BlockchainRuntimeConfig {
  const chainId = parseChainId(config?.chainIdHex, config?.chainId);
  const chainIdHex = config?.chainIdHex || `0x${chainId.toString(16)}`;
  const chainName =
    config?.networkName ||
    import.meta.env.VITE_BLOCKCHAIN_CHAIN_NAME ||
    DEFAULT_CHAIN_NAME;
  const rpcUrl =
    config?.rpcUrl ||
    import.meta.env.VITE_BLOCKCHAIN_RPC_URL ||
    DEFAULT_RPC;
  const explorerUrl =
    config?.explorerUrl ||
    import.meta.env.VITE_BLOCKCHAIN_EXPLORER_URL ||
    DEFAULT_EXPLORER;

  const nativeCurrency =
    chainId === 11155111
      ? { name: "SepoliaETH", symbol: "SEP", decimals: 18 }
      : chainId === 80002
        ? { name: "POL", symbol: "POL", decimals: 18 }
        : { name: "ETH", symbol: "ETH", decimals: 18 };

  return {
    chainId,
    chainIdHex: chainIdHex || DEFAULT_CHAIN_HEX,
    chainName,
    rpcUrl,
    explorerUrl,
    nativeCurrency,
  };
}

export function isWalletOnExpectedChain(
  walletChainHex: string | undefined,
  runtimeConfig: BlockchainRuntimeConfig
) {
  if (!walletChainHex) return false;
  return walletChainHex.toLowerCase() === runtimeConfig.chainIdHex.toLowerCase();
}

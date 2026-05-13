import axiosClient from "./axiosClient";

export interface SystemConfigResponse {
  vndEthRate: number;
  networkName: string;
  chainId?: number;
  chainIdHex?: string;
  rpcUrl?: string;
  explorerUrl?: string;
}

const configApi = {
  getExchangeRate: () => {
    return axiosClient.get<SystemConfigResponse>("/configs/exchange-rate");
  },
  getBlockchainConfig: () => {
    return axiosClient.get<SystemConfigResponse>("/configs/blockchain");
  },
};

export default configApi;

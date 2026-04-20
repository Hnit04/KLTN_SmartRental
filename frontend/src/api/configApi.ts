import axiosClient from "./axiosClient";

export interface SystemConfigResponse {
  vndEthRate: number;
  networkName: string;
}

const configApi = {
  getExchangeRate: () => {
    return axiosClient.get<SystemConfigResponse>("/configs/exchange-rate");
  },
};

export default configApi;

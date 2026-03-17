import axiosClient from "./axiosClient";
import type { TenantPreference } from "../types";

export const tenantPreferenceApi = {
  getPreference: () => {
    return axiosClient.get<TenantPreference>("/tenant-preferences");
  },
  updatePreference: (data: Partial<TenantPreference>) => {
    return axiosClient.put<TenantPreference>("/tenant-preferences", data);
  },
};

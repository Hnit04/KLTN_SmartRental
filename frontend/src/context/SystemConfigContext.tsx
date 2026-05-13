import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import configApi, { type SystemConfigResponse } from '../api/configApi';

interface SystemConfigContextType {
  config: SystemConfigResponse;
  isLoading: boolean;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export const SystemConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SystemConfigResponse>({
    vndEthRate: 80000000, // Default fallback
    networkName: 'Sepolia Testnet',
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await configApi.getBlockchainConfig();
        if (response.data) {
          setConfig(response.data);
        }
      } catch (error: any) {
        try {
          const fallbackRes = await configApi.getExchangeRate();
          if (fallbackRes.data) {
            setConfig((prev) => ({ ...prev, ...fallbackRes.data }));
          }
        } catch (fallbackError: any) {
          if (fallbackError.response?.status !== 403) {
            console.error('Failed to fetch system config:', fallbackError);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <SystemConfigContext.Provider value={{ config, isLoading }}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (context === undefined) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
};

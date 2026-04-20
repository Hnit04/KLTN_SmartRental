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
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await configApi.getExchangeRate();
        if (response.data) {
          setConfig(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch system config:', error);
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

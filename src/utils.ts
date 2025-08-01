import { BitcoinNetworkType, Network } from './types/types';

export const transformNetworkToSatsConnect = (
  network: Network,
): BitcoinNetworkType => {
  switch (network) {
    case 'mainnet':
      return BitcoinNetworkType.Mainnet;
    case 'testnet':
      return BitcoinNetworkType.Testnet;
    case 'testnet4':
      return BitcoinNetworkType.Testnet4;
    default:
      throw new Error('Unsupported network');
  }
};

export const base64ToHex = (base64: string): string => {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.toString('hex');
};

export const hexToBase64 = (hex: string): string => {
  const buffer = Buffer.from(hex, 'hex');
  return buffer.toString('base64');
};

import { BitcoinNetworkType, Network } from './types';

export function transformNetworkToSatsConnect(
  network: Network,
): BitcoinNetworkType {
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
}

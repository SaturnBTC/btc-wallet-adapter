import type { WalletError } from './types/types';

export class WalletException extends Error {
  static Messages: Record<WalletError, string> = {
    user_cancelled: 'Operation cancelled by user',
    wallet_not_installed: 'Selected wallet is not installed',
    wallet_not_supported: 'Selected wallet is not supported',
    wallet_not_in_same_network: 'Selected wallet is not in the right network',
    invalid_network: 'Selected network is invalid',
    wallet_not_connected: 'Wallet is not connected',
    wallet_busy: 'Wallet is busy',
    rpc_error: 'RPC error occured',
  };
  code: WalletError;

  constructor(error: WalletError) {
    super(WalletException.Messages[error]);
    this.name = 'WalletException';
    this.code = error;
  }
}

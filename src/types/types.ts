import { Address, InputToSign } from '@sats-connect/core';

// Re-export SatsConnect types that SatSwap uses
export type {
  Address,
  WalletType,
  BitcoinProvider,
  MessageSigningProtocols,
  RpcErrorCode,
} from '@sats-connect/core';

export {
  AddressPurpose,
  AddressType,
  BitcoinNetworkType,
} from '@sats-connect/core';

// Re-export PSBT types
export type { Network } from '@saturnbtcio/psbt';

export type WalletName = 'xverse' | 'leather' | 'unisat' | 'magic-eden';

export type WalletError =
  | 'user_cancelled'
  | 'wallet_not_installed'
  | 'wallet_not_supported'
  | 'wallet_not_in_same_network'
  | 'invalid_network'
  | 'wallet_not_connected'
  | 'wallet_busy';

// TODO: Check if needed
export interface UnsignedPsbt {
  psbt64: string;
  inputsToSign: InputToSign[];
}

// TODO: Check if needed
export interface IConnectResponse {
  addresses: Array<Address>;
  runeAddress: Address;
}

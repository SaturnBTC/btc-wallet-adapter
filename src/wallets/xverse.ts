import { Network } from '@saturnbtcio/psbt';
import { BitcoinWallet } from '../adapter';
import {
  WalletName,
  UnsignedPsbt,
  Address,
  BitcoinProvider,
  WalletType,
  AddressPurpose,
  BitcoinNetworkType,
} from '../types/types';
import { transformNetworkToSatsConnect } from '../utils';
import {
  MessageSigningProtocols,
  request,
  RpcErrorCode,
} from '@sats-connect/core';
import { WalletException } from '../errors';

export class XverseWallet extends BitcoinWallet {
  override walletName: WalletName = 'xverse';
  private readonly provider: BitcoinProvider;
  // TODO: Check if needed
  private readonly internalNetwork: BitcoinNetworkType;

  constructor(
    network: Network,
    addresses: Address[],
    provider: BitcoinProvider,
    walletType: WalletType,
  ) {
    const runeAddress =
      addresses.find(
        (address) => address.purpose === AddressPurpose.Ordinals,
      ) || addresses[0];

    super(network, runeAddress!, addresses, walletType);
    this.provider = provider;
    this.internalNetwork = transformNetworkToSatsConnect(network);
  }

  override async initialize(network: Network): Promise<XverseWallet> {
    try {
      const response = await request('wallet_connect', {
        addresses: [AddressPurpose.Ordinals, AddressPurpose.Payment],
      });
      if (response.status === 'success') {
        return new XverseWallet(
          network,
          response.result.addresses,
          this.provider,
          response.result.walletType,
        );
      } else {
        if (response.error.code === RpcErrorCode.USER_REJECTION) {
          throw new WalletException('user_cancelled');
        } else {
          throw new Error('Unknown wallet error');
        }
      }
    } catch (error) {
      throw error;
    }
  }

  override async signPsbt(
    unsignedPsbt64: UnsignedPsbt,
    broadcast: boolean,
  ): Promise<string> {
    const signInputs = unsignedPsbt64.inputsToSign.reduce(
      (collector, its) => {
        if (!collector[its.address]) {
          collector[its.address] = [];
        }

        collector[its.address]!.push(...its.signingIndexes);
        return collector;
      },
      {} as Record<string, number[]>,
    );

    const response = await request('signPsbt', {
      psbt: unsignedPsbt64.psbt64,
      signInputs,
      broadcast,
    });

    if (response.status === 'success') {
      return response.result.psbt;
    } else {
      if (response.error.code === RpcErrorCode.USER_REJECTION) {
        throw new WalletException('user_cancelled');
      } else {
        throw Error(`${response.error.code}: ${response.error.message}`);
      }
    }
  }

  override async signPsbts(
    unsignedPsbts64: UnsignedPsbt[],
    broadcast: boolean,
    callback?: (i: number) => void,
  ): Promise<string[]> {
    const signedTxs: string[] = [];
    let i = 0;
    for (const tx of unsignedPsbts64) {
      const signedTx = await this.signPsbt(tx, broadcast);
      if (signedTx === undefined) {
        throw new WalletException('user_cancelled');
      }

      signedTxs.push(signedTx);
      if (callback) {
        callback(i);
      }
      i++;
    }

    return signedTxs;
  }

  override async signMessage(
    msg: string,
    type?: 'ecdsa' | 'bip322-simple',
  ): Promise<string> {
    const addressToSignWith = this.runeAddress;
    const response = await request('signMessage', {
      address: addressToSignWith.address,
      message: msg,
      protocol:
        type === 'ecdsa'
          ? MessageSigningProtocols.ECDSA
          : MessageSigningProtocols.BIP322,
    });

    if (response.status === 'success') {
      return response.result.signature;
    } else {
      if (response.error.code === RpcErrorCode.USER_REJECTION) {
        throw new WalletException('user_cancelled');
      } else {
        throw Error(`${response.error.code}: ${response.error.message}`);
      }
    }
  }
}

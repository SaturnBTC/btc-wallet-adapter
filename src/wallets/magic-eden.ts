import {
  request,
  MessageSigningProtocols,
  signMessage,
  SignMessageOptions,
  signTransaction,
  SignTransactionOptions,
  SignTransactionPayload,
  SignTransactionResponse,
  RpcErrorCode,
} from '@sats-connect/core';
import { Network } from '@saturnbtcio/psbt';
import { BitcoinWallet } from '../adapter';
import { WalletException } from '../errors';
import {
  Address,
  AddressPurpose,
  BitcoinNetworkType,
  BitcoinProvider,
  UnsignedPsbt,
  WalletName,
} from '../types/types';
import { transformNetworkToSatsConnect } from '../utils';

export class MagicEdenWallet extends BitcoinWallet {
  readonly walletName: WalletName = 'magic-eden';
  private provider: BitcoinProvider;
  private internalNetwork: BitcoinNetworkType;

  constructor(
    network: Network,
    addresses: Address[],
    provider: BitcoinProvider,
  ) {
    const runeAddress =
      addresses.find(
        (address) => address.purpose === AddressPurpose.Ordinals,
      ) || addresses[0];

    // TODO: Check if runeAddress is valid
    super(network, runeAddress!, addresses, 'software');
    this.provider = provider;
    this.internalNetwork = transformNetworkToSatsConnect(network);
  }

  static async initialize(
    provider: BitcoinProvider,
    network: Network,
  ): Promise<MagicEdenWallet> {
    try {
      const response = await request('getAddresses', {
        purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
        message: 'Address for receiving Ordinals and payments',
      });
      if (response.status === 'success') {
        return new MagicEdenWallet(
          network,
          response.result.addresses,
          provider,
        );
      } else {
        if (response.error.code === RpcErrorCode.USER_REJECTION) {
          throw new WalletException('user_cancelled');
        } else {
          console.error(response.error);
          throw new WalletException('rpc_error');
        }
      }
    } catch {
      console.error('Wallet not installed');
      throw new WalletException('wallet_not_installed');
    }
  }

  override signPsbt(
    unsignedPsbt64: UnsignedPsbt,
    broadcast: boolean,
  ): Promise<string> {
    const payload: SignTransactionPayload = {
      network: {
        type: this.internalNetwork,
      },
      psbtBase64: unsignedPsbt64.psbt64,
      broadcast: broadcast,
      message: '',
      inputsToSign: unsignedPsbt64.inputsToSign.map((input) => ({
        address: input.address,
        signingIndexes: input.signingIndexes,
        sigHash: input.sigHash,
      })),
    };

    return new Promise(async (resolve, reject) => {
      try {
        const signTransactionOptions: SignTransactionOptions = {
          payload,
          getProvider: async () => this.provider,
          onFinish: (response: SignTransactionResponse) => {
            resolve(response.psbtBase64 as string);
          },
          onCancel: () => {
            console.warn('User cancelled');
            reject(new WalletException('user_cancelled'));
          },
        };

        await signTransaction(signTransactionOptions);
      } catch {
        console.error('Wallet not installed');
        reject(new WalletException('wallet_not_installed'));
      }
    });
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

  override signMessage(
    msg: string,
    type?: 'ecdsa' | 'bip322-simple',
  ): Promise<string> {
    const addressToSignWith = this.runeAddress;
    return new Promise(async (resolve, reject) => {
      const signMessageOptions: SignMessageOptions = {
        payload: {
          message: msg,
          address: addressToSignWith.address,
          network: {
            type: this.internalNetwork,
          },
          protocol:
            type === 'ecdsa'
              ? MessageSigningProtocols.ECDSA
              : MessageSigningProtocols.BIP322,
        },
        getProvider: async () => this.provider,
        onFinish: (response) => resolve(response),
        onCancel: () => reject(new WalletException('user_cancelled')),
      };

      await signMessage(signMessageOptions);
    });
  }
}

import {
  getAddress,
  GetAddressOptions,
  GetAddressResponse,
  MessageSigningProtocols,
  signMessage,
  SignMessageOptions,
  signTransaction,
  SignTransactionOptions,
  SignTransactionPayload,
  SignTransactionResponse,
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

  override async initialize(network: Network): Promise<MagicEdenWallet> {
    const addresses = await new Promise<Array<Address>>(
      async (resolve, reject) => {
        try {
          const getAddressOptions: GetAddressOptions = {
            payload: {
              purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
              message: 'Address for receiving Ordinals and payments',
              network: {
                type: this.internalNetwork,
              },
            },
            getProvider: async () => this.provider,
            onFinish: (response: GetAddressResponse) => {
              resolve(response.addresses);
            },
            onCancel: () => {
              console.warn('User cancelled');
              reject(new WalletException('user_cancelled'));
            },
          };

          await getAddress(getAddressOptions);
        } catch {
          console.error('Wallet not installed');
          reject(new WalletException('wallet_not_installed'));
        }
      },
    );

    return new MagicEdenWallet(network, addresses, this.provider);
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

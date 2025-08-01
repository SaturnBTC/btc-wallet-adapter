import { Network } from '@saturnbtcio/psbt';
import { BitcoinWallet } from '../adapter';
import * as Unisat from '../types/unisat';
import {
  Address,
  AddressPurpose,
  UnsignedPsbt,
  WalletName,
} from '../types/types';
import { WalletException } from '../errors';
import { getAddressInfo } from 'bitcoin-address-validation';
import { base64ToHex, hexToBase64 } from '../utils';

export class UnisatWallet extends BitcoinWallet {
  readonly walletName: WalletName = 'unisat';
  // TODO: Check if needed
  private internalChain: Unisat.Chain;

  constructor(network: Network, addresses: Address[]) {
    const runeAddress =
      addresses.find(
        (address) => address.purpose === AddressPurpose.Ordinals,
      ) || addresses[0];

    super(network, runeAddress!, addresses, 'software');
    this.internalChain = transformNetworkName(network);
  }

  override async initialize(network: Network): Promise<UnisatWallet> {
    if (window.unisat === undefined) {
      throw new WalletException('wallet_not_installed');
    }

    const chain = await window.unisat.getChain();
    if (chain.enum !== transformNetworkName(network)) {
      await window.unisat.switchChain(transformNetworkName(network));
    }

    const unisatAddresses = await window.unisat.requestAccounts();

    if (unisatAddresses === undefined) {
      throw new WalletException('user_cancelled');
    }

    const publicKey = await window.unisat.getPublicKey();

    const addresses = unisatAddresses.map((address) => ({
      address,
      publicKey,
      purpose: AddressPurpose.Ordinals,
      addressType: getAddressInfo(address).type,
      walletType: 'software',
    })) satisfies Address[];

    return new UnisatWallet(network, addresses);
  }
  override async signPsbt(
    unsignedPsbt64: UnsignedPsbt,
    broadcast: boolean,
  ): Promise<string> {
    if (window.unisat === undefined) {
      throw new WalletException('wallet_not_installed');
    }

    try {
      const signedTx = await window.unisat.signPsbt(
        base64ToHex(unsignedPsbt64.psbt64),
        {
          autoFinalized: broadcast,
          toSignInputs: unsignedPsbt64.inputsToSign.map((input) => {
            const disableTweakSigner = false;
            return {
              address: input.address,
              index: input.signingIndexes[0]!,
              sighashTypes: input.sigHash ? [input.sigHash] : undefined,
              disableTweakSigner: disableTweakSigner,
            };
          }),
        },
      );

      return hexToBase64(signedTx);
    } catch (err) {
      throw new WalletException('user_cancelled');
    }
  }

  override async signPsbts(
    unsignedPsbts64: UnsignedPsbt[],
    broadcast: boolean,
    callback?: (i: number) => void,
  ): Promise<string[]> {
    if (window.unisat === undefined) {
      throw new WalletException('wallet_not_installed');
    }

    if (unsignedPsbts64.length === 1) {
      return [await this.signPsbt(unsignedPsbts64[0]!, broadcast)];
    }

    const unsignedPsbtHexs: Array<string> = [];
    const options: Unisat.SignPsbtOptions[] = [];

    for (const unsignedPsbt of unsignedPsbts64) {
      unsignedPsbtHexs.push(base64ToHex(unsignedPsbt.psbt64));
      options.push({
        autoFinalized: broadcast,
        toSignInputs: unsignedPsbt.inputsToSign.map((input) => {
          const disableTweakSigner = false;
          return {
            address: input.address,
            index: input.signingIndexes[0]!,
            sighashTypes: input.sigHash ? [input.sigHash] : undefined,
            disableTweakSigner: disableTweakSigner,
          };
        }),
      });
    }

    try {
      const signedTxs = await window.unisat.signPsbts(
        unsignedPsbtHexs,
        options,
      );
      if (callback) {
        callback(signedTxs.length - 1);
      }
      return signedTxs.map((signedTx: string) => hexToBase64(signedTx));
    } catch {
      console.log('User cancelled');
      throw new WalletException('user_cancelled');
    }
  }

  override async signMessage(
    msg: string,
    type?: 'ecdsa' | 'bip322-simple',
  ): Promise<string> {
    if (window.unisat === undefined) {
      throw new WalletException('wallet_not_installed');
    }

    return await window.unisat.signMessage(msg, type);
  }
}

function transformNetworkName(network: Network): Unisat.Chain {
  switch (network) {
    case 'mainnet':
      return Unisat.Chain.BITCOIN_MAINNET;
    case 'testnet':
      return Unisat.Chain.BITCOIN_TESTNET;
    case 'testnet4':
      return Unisat.Chain.BITCOIN_TESTNET4;
    case 'regtest':
    default:
      throw new Error('Invalid network');
  }
}

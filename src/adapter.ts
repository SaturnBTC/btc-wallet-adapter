import {
  AddressPurpose,
  AddressType,
  type Address,
  type Network,
  type UnsignedPsbt,
  type WalletName,
  type WalletType,
} from './types.js';

export interface BitcoinWalletProps {
  readonly walletName: WalletName;
  readonly network: Network;
  readonly runeAddress: Address;
  readonly addresses: Address[];
  readonly walletType: WalletType;
  readonly paymentAddress: Address | undefined;

  getSignerAddress(): Address;
  checkIsAddressTypeP2tr(): boolean;
  initialize(network: Network): Promise<BitcoinWallet>;
  signPsbt(unsignedPsbt64: UnsignedPsbt, broadcast: boolean): Promise<string>;
  signPsbts(
    unsignedPsbts64: UnsignedPsbt[],
    broadcast: boolean,
  ): Promise<string[]>;
}

export abstract class BitcoinWallet implements BitcoinWalletProps {
  public paymentAddress: Address | undefined;
  abstract readonly walletName: WalletName;

  constructor(
    readonly network: Network,
    public runeAddress: Address,
    public addresses: Address[],
    public walletType: WalletType,
  ) {
    this.network = network;
    this.runeAddress = runeAddress;
    this.addresses = addresses;
    this.paymentAddress = addresses.find(
      (a) => a.purpose === AddressPurpose.Payment,
    );
    this.walletType = walletType;
  }

  getSignerAddress(): Address {
    return this.runeAddress;
  }

  checkIsAddressTypeP2tr(): boolean {
    return this.runeAddress.addressType === AddressType.p2tr;
  }

  abstract initialize(network: Network): Promise<BitcoinWallet>;

  abstract signPsbt(
    unsignedPsbt64: UnsignedPsbt,
    broadcast: boolean,
  ): Promise<string>;

  abstract signPsbts(
    unsignedPsbts64: UnsignedPsbt[],
    broadcast: boolean,
    callback?: (i: number) => void,
  ): Promise<string[]>;

  abstract signMessage(
    msg: string,
    type?: 'ecdsa' | 'bip322-simple',
  ): Promise<string>;
}

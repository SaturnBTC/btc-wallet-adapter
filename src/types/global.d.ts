export {};

declare global {
  interface Window {
    /**
     * Unisat global object. If undefined it means the extension is not installed.
     */
    unisat?: {
      requestAccounts: () => Promise<Array<string>>;
      getAccounts: () => Promise<Array<string>>;
      getNetwork: () => Promise<'livenet' | 'testnet'>;
      getChain: () => Promise<{
        enum: string;
        name: string;
        network: 'livenet' | 'testnet';
      }>;
      switchNetwork: (network: 'livenet' | 'testnet') => Promise<void>;
      switchChain: (chain: string) => Promise<{
        enum: string;
        name: string;
        network: 'livenet' | 'testnet';
      }>;
      getPublicKey: () => Promise<string>;
      getBalance: () => Promise<{
        confimed: number;
        unconfirmed: number;
        total: number;
      }>;
      getInscriptions: (cursor: number, size: number) => Promise<any>;
      sendBitcoin: (
        toAddress: string,
        satoshis: number,
        options: { feeRate: number },
      ) => Promise<string>;
      sendInscription: (
        address: string,
        inscriptionId: string,
        options: { feeRate: number },
      ) => Promise<{ txid: string }>;
      signMessage: (
        msg: string,
        type?: 'ecdsa' | 'bip322-simple',
      ) => Promise<string>;
      pushTx: (options: { rawtx: string }) => Promise<string>;
      signPsbt: (psbtHex: string, options?: any) => Promise<string>;
      signPsbts: (
        psbtHexs: Array<string>,
        options: Array<any>,
      ) => Promise<Array<string>>;
      pushPsbt: (psbtHex: string) => Promise<string>;
      on: (event: 'accountsChanged' | 'networkChanged', handler: any) => void;
      removeListener: (
        event: 'accountsChanged' | 'networkChanged',
        handler: any,
      ) => void;
    };
  }
}

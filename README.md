# Bitcoin Wallet Adapter

A modular TypeScript wallet adapter system for Bitcoin applications, providing a unified interface for multiple Bitcoin wallets including Unisat, Xverse, and Magic Eden.

## Features

- **Multi-Wallet Support**: Unisat, Xverse, Magic Eden, and more
- **Type Safety**: Full TypeScript support with strict typing
- **Unified API**: Consistent interface across all supported wallets
- **Error Handling**: Comprehensive error management with specific error types
- **Framework Agnostic**: Core logic works with any UI framework
- **PSBT Support**: Full support for Partially Signed Bitcoin Transactions
- **Message Signing**: Support for ECDSA and BIP322 message signing

## Installation

```bash
npm install @bitcoin-wallet-adapter/core
# or
yarn add @bitcoin-wallet-adapter/core
# or
pnpm add @bitcoin-wallet-adapter/core
```

## Quick Start

### Basic Usage

```typescript
import {
  BitcoinWallet,
  UnisatWallet,
  XverseWallet,
  WalletException,
  WalletName,
} from '@bitcoin-wallet-adapter/core';
import { Network } from '@saturnbtcio/psbt';

// Initialize a wallet
const connectWallet = async (walletName: WalletName, network: Network) => {
  try {
    let wallet: BitcoinWallet;

    switch (walletName) {
      case 'unisat':
        wallet = await UnisatWallet.initialize(network);
        break;
      case 'xverse':
        wallet = await XverseWallet.initialize(network);
        break;
      default:
        throw new Error('Unsupported wallet');
    }

    console.log('Connected to:', wallet.walletName);
    console.log('Rune Address:', wallet.runeAddress.address);
    console.log('Payment Address:', wallet.paymentAddress?.address);

    return wallet;
  } catch (error) {
    if (error instanceof WalletException) {
      console.error('Wallet error:', error.message);
    } else {
      console.error('Connection error:', error);
    }
    throw error;
  }
};
```

### Signing PSBTs

```typescript
import { UnsignedPsbt } from '@bitcoin-wallet-adapter/core';

const signTransaction = async (
  wallet: BitcoinWallet,
  unsignedPsbt: UnsignedPsbt,
) => {
  try {
    // Sign a single PSBT
    const signedPsbt = await wallet.signPsbt(unsignedPsbt, true); // true = broadcast
    console.log('Transaction signed:', signedPsbt);
    return signedPsbt;
  } catch (error) {
    if (error instanceof WalletException) {
      switch (error.code) {
        case 'user_cancelled':
          console.log('User cancelled the transaction');
          break;
        case 'wallet_not_connected':
          console.log('Wallet not connected');
          break;
        default:
          console.error('Wallet error:', error.message);
      }
    }
    throw error;
  }
};

// Sign multiple PSBTs
const signMultipleTransactions = async (
  wallet: BitcoinWallet,
  unsignedPsbts: UnsignedPsbt[],
) => {
  try {
    const signedPsbts = await wallet.signPsbts(
      unsignedPsbts,
      true, // broadcast
      (index) => {
        console.log(`Signed transaction ${index + 1}/${unsignedPsbts.length}`);
      },
    );
    return signedPsbts;
  } catch (error) {
    console.error('Error signing transactions:', error);
    throw error;
  }
};
```

### Message Signing

```typescript
const signMessage = async (wallet: BitcoinWallet, message: string) => {
  try {
    // Sign with ECDSA (default)
    const signature = await wallet.signMessage(message, 'ecdsa');
    console.log('Message signed:', signature);

    // Sign with BIP322
    const bip322Signature = await wallet.signMessage(message, 'bip322-simple');
    console.log('BIP322 signature:', bip322Signature);

    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
};
```

## React Hook Integration

Here's how to create a React hook similar to the SatSwap implementation:

```typescript
import { useState, useCallback } from 'react';
import {
  BitcoinWallet,
  WalletName,
  WalletException,
  UnsignedPsbt,
} from '@bitcoin-wallet-adapter/core';
import { Network } from '@saturnbtcio/psbt';

export const useWallet = () => {
  const [wallet, setWallet] = useState<BitcoinWallet | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [connected, setConnected] = useState(false);

  const connect = useCallback(
    async (walletName: WalletName, network: Network) => {
      setStatus('loading');
      try {
        let walletInstance: BitcoinWallet;

        switch (walletName) {
          case 'unisat':
            walletInstance = await UnisatWallet.initialize(network);
            break;
          case 'xverse':
            walletInstance = await XverseWallet.initialize(network);
            break;
          case 'magic-eden':
            walletInstance = await MagicEdenWallet.initialize(network);
            break;
          default:
            throw new Error('Unsupported wallet');
        }

        setWallet(walletInstance);
        setConnected(true);
        return walletInstance;
      } catch (error) {
        if (error instanceof WalletException) {
          console.error('Wallet error:', error.message);
        }
        throw error;
      } finally {
        setStatus('idle');
      }
    },
    [],
  );

  const signPsbt = useCallback(
    async (
      unsignedPsbt: UnsignedPsbt,
      broadcast: boolean,
      handlers?: {
        onSuccess?: () => void;
        onError?: (error: WalletException | Error) => void;
      },
    ) => {
      if (!wallet) {
        throw new WalletException('wallet_not_connected');
      }

      setStatus('loading');
      try {
        const signedPsbt = await wallet.signPsbt(unsignedPsbt, broadcast);
        handlers?.onSuccess?.();
        return signedPsbt;
      } catch (error) {
        handlers?.onError?.(error as WalletException | Error);
        throw error;
      } finally {
        setStatus('idle');
      }
    },
    [wallet],
  );

  const disconnect = useCallback(() => {
    setWallet(null);
    setConnected(false);
  }, []);

  return {
    wallet,
    connected,
    status,
    connect,
    signPsbt,
    disconnect,
    runeAddress: wallet?.runeAddress || null,
    paymentAddress: wallet?.paymentAddress || null,
    addresses: wallet?.addresses || [],
  };
};
```

## API Reference

### Core Classes

#### `BitcoinWallet` (Abstract Base Class)

The base class that all wallet implementations extend.

```typescript
abstract class BitcoinWallet {
  readonly walletName: WalletName;
  readonly network: Network;
  readonly runeAddress: Address;
  readonly addresses: Address[];
  readonly paymentAddress: Address | undefined;
  readonly walletType: WalletType;

  constructor(
    network: Network,
    runeAddress: Address,
    addresses: Address[],
    walletType: WalletType,
  );

  abstract initialize(network: Network): Promise<BitcoinWallet>;
  abstract signPsbt(
    unsignedPsbt: UnsignedPsbt,
    broadcast: boolean,
  ): Promise<string>;
  abstract signPsbts(
    unsignedPsbts: UnsignedPsbt[],
    broadcast: boolean,
    callback?: (i: number) => void,
  ): Promise<string[]>;
  abstract signMessage(
    msg: string,
    type?: 'ecdsa' | 'bip322-simple',
  ): Promise<string>;
}
```

#### `UnisatWallet`

Unisat wallet implementation.

```typescript
class UnisatWallet extends BitcoinWallet {
  static initialize(network: Network): Promise<UnisatWallet>;
  signPsbt(unsignedPsbt: UnsignedPsbt, broadcast: boolean): Promise<string>;
  signPsbts(
    unsignedPsbts: UnsignedPsbt[],
    broadcast: boolean,
    callback?: (i: number) => void,
  ): Promise<string[]>;
  signMessage(msg: string, type?: 'ecdsa' | 'bip322-simple'): Promise<string>;
}
```

#### `XverseWallet`

Xverse wallet implementation.

```typescript
class XverseWallet extends BitcoinWallet {
  static initialize(network: Network): Promise<XverseWallet>;
  signPsbt(unsignedPsbt: UnsignedPsbt, broadcast: boolean): Promise<string>;
  signPsbts(
    unsignedPsbts: UnsignedPsbt[],
    broadcast: boolean,
    callback?: (i: number) => void,
  ): Promise<string[]>;
  signMessage(msg: string, type?: 'ecdsa' | 'bip322-simple'): Promise<string>;
}
```

### Types

#### `WalletName`

```typescript
type WalletName = 'unisat' | 'xverse' | 'magic-eden';
```

#### `UnsignedPsbt`

```typescript
interface UnsignedPsbt {
  psbt64: string;
  inputsToSign: InputToSign[];
}
```

#### `WalletException`

```typescript
class WalletException extends Error {
  code: WalletError;
  constructor(error: WalletError);
}

type WalletError =
  | 'user_cancelled'
  | 'wallet_not_installed'
  | 'wallet_not_supported'
  | 'wallet_not_in_same_network'
  | 'invalid_network'
  | 'wallet_not_connected'
  | 'wallet_busy';
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
try {
  const wallet = await UnisatWallet.initialize('mainnet');
  const signedPsbt = await wallet.signPsbt(unsignedPsbt, true);
} catch (error) {
  if (error instanceof WalletException) {
    switch (error.code) {
      case 'user_cancelled':
        // User cancelled the operation
        break;
      case 'wallet_not_installed':
        // Wallet extension not installed
        break;
      case 'wallet_not_connected':
        // Wallet not connected
        break;
      case 'wallet_busy':
        // Wallet is busy with another operation
        break;
      default:
      // Handle other wallet errors
    }
  } else {
    // Handle other errors
  }
}
```

## Supported Networks

- `mainnet` - Bitcoin mainnet
- `testnet` - Bitcoin testnet
- `testnet4` - Bitcoin testnet4
- `regtest` - Bitcoin regtest

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Start development mode with watch
pnpm dev

# Lint code
pnpm lint

# Format code
pnpm format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT

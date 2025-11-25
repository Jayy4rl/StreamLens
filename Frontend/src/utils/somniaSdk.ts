/**
 * Somnia SDK Utility
 * 
 * Wrapper for Somnia Data Streams SDK operations
 */

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, http, type WalletClient, type Hex } from 'viem';
import { somniaTestnet } from './walletConnect';

export interface RegisterSchemaParams {
  schemaName: string;
  schema: string;
  parentSchemaId?: Hex;
}

export interface RegisterSchemaResult {
  success: boolean;
  transactionHash?: Hex;
  error?: string;
}

/**
 * Initialize Somnia Streams SDK with wallet
 */
export async function initializeSomniaSDK(
  walletClient: WalletClient
): Promise<SDK | null> {
  try {
    // Create public client for reading
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(),
    });

    // Initialize SDK with both clients
    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    return sdk;
  } catch (error) {
    console.error('Failed to initialize Somnia SDK:', error);
    return null;
  }
}

/**
 * Register a new data schema on Somnia
 */
export async function registerSchema(
  sdk: SDK,
  params: RegisterSchemaParams
): Promise<RegisterSchemaResult> {
  try {
    const { schemaName, schema, parentSchemaId } = params;

    // Prepare registration data
    const registration = {
      schemaName,
      schema,
      ...(parentSchemaId && { parentSchemaId }),
    };

    console.log('Registering schema:', registration);

    // Call SDK method
    const result = await sdk.streams.registerDataSchemas([registration], false);

    // Check if result is an error
    if (result instanceof Error) {
      return {
        success: false,
        error: result.message,
      };
    }

    return {
      success: true,
      transactionHash: result as Hex,
    };
  } catch (error) {
    console.error('Schema registration failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to register schema';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a schema is already registered
 */
export async function isSchemaRegistered(
  sdk: SDK,
  schemaId: Hex
): Promise<boolean> {
  try {
    const result = await sdk.streams.isDataSchemaRegistered(schemaId);
    if (result instanceof Error) {
      console.error('Error checking schema:', result);
      return false;
    }
    return result;
  } catch (error) {
    console.error('Error checking schema registration:', error);
    return false;
  }
}

/**
 * Compute schema ID from schema string
 */
export async function computeSchemaId(
  sdk: SDK,
  schema: string
): Promise<Hex | null> {
  try {
    const result = await sdk.streams.computeSchemaId(schema);
    if (result instanceof Error) {
      console.error('Error computing schema ID:', result);
      return null;
    }
    return result;
  } catch (error) {
    console.error('Error computing schema ID:', error);
    return null;
  }
}

/**
 * Get all registered schemas
 */
export async function getAllSchemas(sdk: SDK): Promise<string[] | null> {
  try {
    const result = await sdk.streams.getAllSchemas();
    if (result instanceof Error) {
      console.error('Error fetching schemas:', result);
      return null;
    }
    return result;
  } catch (error) {
    console.error('Error fetching schemas:', error);
    return null;
  }
}

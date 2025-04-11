import sodium from 'libsodium-wrappers';
import { KeyPair, EncryptedMessage } from '@/types';

/**
 * Initialize libsodium before using encryption functions
 */
export async function initSodium(): Promise<void> {
  await sodium.ready;
}

/**
 * Generate a new key pair for asymmetric encryption
 */
export function generateKeyPair(): KeyPair {
  const keyPair = sodium.crypto_box_keypair();
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}

/**
 * Convert a private key from hex string to Uint8Array
 */
export function privateKeyFromHex(hexKey: string): Uint8Array {
  return sodium.from_hex(hexKey);
}

/**
 * Convert a public key from hex string to Uint8Array
 */
export function publicKeyFromHex(hexKey: string): Uint8Array {
  return sodium.from_hex(hexKey);
}

/**
 * Convert a key to hex string for storage
 */
export function keyToHex(key: Uint8Array): string {
  return sodium.to_hex(key);
}

/**
 * Generate a shared key for a conversation
 * Combines the local private key with the recipient's public key
 */
export function generateSharedKey(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  return sodium.crypto_box_beforenm(publicKey, privateKey);
}

/**
 * Encrypt a message using a shared key
 * Returns the encrypted message and the nonce (initialization vector)
 */
export function encryptMessage(message: string, sharedKey: Uint8Array): EncryptedMessage {
  // Generate a random nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  
  // Convert message to Uint8Array
  const messageBytes = sodium.from_string(message);
  
  // Encrypt the message
  const encryptedBytes = sodium.crypto_secretbox_easy(messageBytes, nonce, sharedKey);
  
  // Convert to Base64 for transmission
  return {
    encryptedContent: sodium.to_base64(encryptedBytes),
    iv: sodium.to_base64(nonce)
  };
}

/**
 * Decrypt a message using a shared key
 * Takes the encrypted message and the nonce (initialization vector)
 */
export function decryptMessage(
  encryptedContentBase64: string,
  ivBase64: string,
  sharedKey: Uint8Array
): string {
  try {
    // Convert from Base64 to Uint8Array
    const encryptedBytes = sodium.from_base64(encryptedContentBase64);
    const nonce = sodium.from_base64(ivBase64);
    
    // Decrypt the message
    const decryptedBytes = sodium.crypto_secretbox_open_easy(encryptedBytes, nonce, sharedKey);
    
    // Convert back to string
    return sodium.to_string(decryptedBytes);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    return '[Encrypted message]';
  }
}

/**
 * Derive a key pair from wallet signature
 * This allows consistent key generation when the user reconnects their wallet
 */
export function deriveKeyPairFromSignature(signature: Uint8Array): KeyPair {
  // Use the signature as a seed to derive a key pair
  const seed = sodium.crypto_generichash(sodium.crypto_box_SEEDBYTES, signature);
  const keyPair = sodium.crypto_box_seed_keypair(seed);
  
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}

/**
 * Generate a signature message for wallet signing
 */
export function getSignatureMessage(): string {
  return 'Sign this message to secure your CryptoChat encryption keys. This will not trigger any blockchain transaction or cost any gas fees.';
}

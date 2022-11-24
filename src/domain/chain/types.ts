export type Chain = 'aurora';

// export function isChain(value: string): value is Chain {
// if (value !== 'polygon' && value !== 'BNB') return false;
// return true;
// }

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  iconFileExtension?: string;
  logoURI?: string;
}
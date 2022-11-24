import Decimal from 'decimal.js';
import { BigNumber } from 'ethers';

function getBigNumberWithDecimals(
  amount: string | number,
  decimals: number | undefined,
): BigNumber {
  if (!decimals) {
    return BigNumber.from(0);
  }
  return BigNumber.from(new Decimal(amount).mul(new Decimal(10).pow(decimals)).toHex());
}

export default getBigNumberWithDecimals;

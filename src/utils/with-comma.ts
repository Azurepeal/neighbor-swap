import Decimal from 'decimal.js';

// 첫번째 .를 제외한 나머지 .를 지운다.
export function removeDotExceptFirstOne(value: string) {
  const output = value.split('.');
  return output.shift() + (output.length ? '.' + output.join('') : '');
}

// 숫자와 .를 제외한 나머지 문자를 지운다.
export function filterDecimal(value: string) {
  return value.replace(/[^\d\.]/g, '');
}

// 이제 fixNumber 만큼 유효 숫자를 표시함. value 끝에 .가 있는 경우 .를 남겨둔다. (폼에서 . 입력을 허용하기 위함)
function withComma(value?: number | string, fixNumber?: number): string {
  if (value === undefined || value === '') return '';
  if (typeof value === 'number' && isNaN(value)) return '';

  try {
    if (value === undefined || value === '') return '';
    if (typeof value === 'number' && isNaN(value)) return '';

    const input =
      typeof value === 'string' ? removeDotExceptFirstOne(filterDecimal(value)) : value.toString();
    const hasDot = input.includes('.');

    const fractionPart = hasDot ? input.split('.')[1] : '';

    const decimal = new Decimal(input);

    // 0보다 작은 경우 유효숫자의 개수가 fixNumber만큼 노출되도록 수정
    // 대신, 유효숫자의 갯수가 소수부의 길이보다 크면, 소수부의 최대 길이만큼 노출
    // ex) expect(withComma('0.123', 5)).notToBe('0.12300').toBe('0.123')
    const fixed = (() => {
      if (fixNumber === undefined) return undefined;
      if (fixNumber && decimal.e < 0)
        return Math.min(fixNumber - decimal.e - 1, fractionPart.length + 2); // 소수 자리에 '.', '0' 두 글자가 더 들어가야 하므로.. +2
      return Math.min(fixNumber, fractionPart.length);
    })();

    // 정수부
    const intPart = +new Decimal(decimal).trunc();
    // 소수부
    const fixedFractionPart = fixed
      ? new Decimal(`0.${fractionPart}`).toFixed(fixed)
      : `0.${fractionPart}`;

    // console.log({ input, intPart, fixed, fixedFractionPart, decimal, e: decimal.e, hasDot })
    const result = Number(intPart).toLocaleString() + (hasDot ? fixedFractionPart.slice(1) : '');

    return result;
  } catch (e) {
    return '';
  }
}

export default withComma;

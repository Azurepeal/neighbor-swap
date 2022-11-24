import withComma from './with-comma';
import { removeDotExceptFirstOne, filterDecimal } from './with-comma';

test('remove dot except first dot', () => {
  expect(removeDotExceptFirstOne('1,123,211.0.')).toBe('1,123,211.0');
});

test('remove except . and dot', () => {
  expect(filterDecimal('1,231.123')).toBe('1231.123');
});

test('put comma per k', () => {
  expect(withComma('1231.01')).toBe('1,231.01');
  expect(withComma('1231')).toBe('1,231');
  expect(withComma('1230')).toBe('1,230');
  expect(withComma('1,230')).toBe('1,230');
});

test('유효자리수가 잘 작동하는 가', () => {
  expect(withComma('0.123123123', 3)).toBe('0.123');
  expect(withComma('0.00123', 3)).toBe('0.00123');
  expect(withComma('1.123123123', 3)).toBe('1.123');
  expect(withComma('123', 3)).toBe('123');
  expect(withComma('1234.154', 5)).toBe('1,234.154');
});

test('편집 중에도 잘 작동하는 가', () => {
  expect(withComma('112.')).toBe('112.');
  expect(withComma('112.0', 3)).toBe('112.0');
  expect(withComma('112.00')).toBe('112.00');
  expect(withComma('112.0')).toBe('112.0');
});

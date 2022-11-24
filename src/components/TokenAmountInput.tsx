import React, { ChangeEvent } from 'react';

import { TriangleDownIcon } from '@chakra-ui/icons';
import {
  useDisclosure,
  Button,
  Avatar,
  InputGroup,
  Input,
  Text,
  Box,
  Heading,
  Stack,
  FormControl,
  FormErrorMessage,
  HStack,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';

import { Chain, Token } from 'src/domain/chain/types';
import { balanceAtom, useCurrency } from 'src/domain/swap/atom';
import withComma from 'src/utils/with-comma';

import TokenSelectDialog from './TokenSelectDialog';

interface Props {
  tokenAddress: string | undefined;
  amount: number | string | undefined;
  handleChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onTokenSelect?: (token: Token) => void;
  onBalanceClick?: (amount: string) => void;
  isReadOnly?: boolean;
  modalHeaderTitle: string;
  label: string;
  isInvalid?: boolean;
  showBalance?: boolean;
  tokenList: Token[];
  chain: Chain;
  decimals: number;
}

const BASE_URL = 'https://static.eisenfinance.com/tokens';

const TokenAmountInput = ({
  amount,
  tokenAddress,
  onTokenSelect,
  handleChange,
  onBalanceClick,
  modalHeaderTitle,
  label,
  isReadOnly,
  isInvalid,
  showBalance,
  tokenList,
  chain,
  decimals,
}: Props) => {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const { currency, priceInCurrency } = useCurrency(chain, tokenAddress);

  const selectedToken = tokenList.find(x => x.address === tokenAddress);

  const balance = useAtomValue(loadable(balanceAtom));

  const handleBalanceClick = () => {
    if (balance.state === 'hasData' && onBalanceClick) {
      onBalanceClick(ethers.utils.formatUnits(balance.data, decimals));
    }
  };

  const tokenPriceInCurrency = tokenAddress ? priceInCurrency : undefined;

  const amountInCurrency = tokenPriceInCurrency
    ? withComma(tokenPriceInCurrency * Number(amount), 2)
    : undefined;

  const displayValue = withComma(amount, isReadOnly ? 3 : undefined);

  return (
    <>
      <TokenSelectDialog
        headerTitle={modalHeaderTitle}
        isOpen={isOpen}
        onClose={onClose}
        tokenList={tokenList.filter(x => x.address !== tokenAddress)}
        onSelectItem={token => {
          if (onTokenSelect) onTokenSelect(token);
        }}
      />

      <Heading as="h3" size="md">
        <HStack justifyContent={showBalance ? 'space-between' : 'flex-start'}>
          <Text>{label}</Text>
          {showBalance && (
            <Button size="sm" onClick={() => handleBalanceClick()}>
              max
            </Button>
          )}
        </HStack>
      </Heading>
      <Stack
        marginTop={4}
        direction={['column', 'column', 'column', 'row']}
        spacing={[4, 4, 4, 12]}>
        <Button
          onClick={onOpen}
          size="lg"
          minWidth="160px"
          colorScheme="blueGray"
          variant="outline"
          leftIcon={
            <Avatar
              w={8}
              h={8}
              src={
                selectedToken?.iconFileExtension
                  ? `${BASE_URL}/${selectedToken?.address}/icon.${selectedToken.iconFileExtension}`
                  : selectedToken?.logoURI
              }
            />
          }
          rightIcon={<TriangleDownIcon />}>
          {selectedToken?.symbol}
        </Button>

        <FormControl isInvalid={isInvalid}>
          <InputGroup size="lg" minWidth="160px">
            <Input
              value={displayValue}
              onChange={handleChange}
              isReadOnly={isReadOnly}
              readOnly={isReadOnly}
              id="amount"
              // type="number"
              placeholder="0"
              // inputMode="numeric"
              maxLength={29}
              focusBorderColor="secondary.200"
              onWheel={e => (e.target as HTMLInputElement).blur()}
            />
            {/* <InputRightElement paddingRight={4} backgroundColor="blueGray">
              <Box paddingX={4}>
                <Text textAlign="center" fontSize={['sm', 'md', 'md', 'md']}>
                  {selectedToken?.symbol}
                </Text>
              </Box>
            </InputRightElement> */}
          </InputGroup>
          {isInvalid ? (
            <FormErrorMessage fontSize={['sm', 'md', 'md', 'md']}>
              Amount of token is unavailable to swap
            </FormErrorMessage>
          ) : null}
        </FormControl>
      </Stack>
      <Box h={1} />
      {amountInCurrency !== 'NaN' && amountInCurrency !== 'Infinity' && (
        <HStack justifyContent={showBalance ? 'space-between' : 'flex-end'}>
          {showBalance && (
            <Text
              color="blueGray.200"
              onClick={() => {
                handleBalanceClick();
              }}>
              Balance:{' '}
              {balance.state === 'hasData'
                ? withComma(ethers.utils.formatUnits(balance.data, decimals), 3)
                : '0'}
            </Text>
          )}
          {amountInCurrency && (
            <Text color="blueGray.200">
              {amountInCurrency} {currency.toUpperCase()}
            </Text>
          )}
        </HStack>
      )}
    </>
  );
};

export default TokenAmountInput;

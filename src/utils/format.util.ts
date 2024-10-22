import { Row } from 'read-excel-file';
import { LoadedUser } from '../types/local-storage';
import { CsvFormattedKeyEnums } from '../enums/key.enum';

export const formatArrayOfKeys = (value = '', separator = ',') => {
  return value.split(separator).map((item) => item.trim());
};

export const fromTxtToUsers = (lines: string[]) => {
  const users: LoadedUser[] = [];

  for (let i = 0; i < lines.length; i++) {
    const formattedUser = formatArrayOfKeys(lines[i]);

    users.push({
      privateKey: formattedUser[0],
      starkPrivateKey: formattedUser[1],
      tokenAddress: formattedUser[2],
      tokenId: formattedUser[3],
      walletName: formattedUser[4],
    });
  }

  return users;
};

export const fromCsvToUsers = (rows: Row[]): LoadedUser[] => {
  const [headerRow, ...contentRows] = rows;

  let walletPKColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.WALLET_PRIVATE_KEY,
  );
  let starkPKColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.STARK_PRIVATE_KEY,
  );
  let collectionAddressColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.COLLECTION_ADDRESS,
  );
  let collectionAddressColIndex2 = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.COLLECTION_ADDRESS2,
  );
  let tokenIdColIndex = headerRow.findIndex((label) => label === CsvFormattedKeyEnums.TOKEN_ID);
  let tokenId2ColIndex = headerRow.findIndex((label) => label === CsvFormattedKeyEnums.TOKEN_ID2);
  let walletNameColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.WALLET_NAME,
  );
  let targetwalletIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.TARGET_WALLET,
  );

  if (walletPKColIndex < 0) {
    walletPKColIndex = 0;
  }

  if (starkPKColIndex < 0) {
    starkPKColIndex = 1;
  }

  if (collectionAddressColIndex < 0) {
    collectionAddressColIndex = 2;
  }

  if (collectionAddressColIndex2 < 0) {
    collectionAddressColIndex2 = 3;
  }

  if (tokenIdColIndex < 0) {
    tokenIdColIndex = 3;
  }

  if (tokenId2ColIndex < 0) {
    tokenId2ColIndex = 3;
  }

  if (walletNameColIndex < 0) {
    walletNameColIndex = 4;
  }

  if (targetwalletIndex < 0) {
    targetwalletIndex = 5;
  }

  return contentRows.map((row) => ({
    privateKey: row[walletPKColIndex].toString(),
    starkPrivateKey: row[starkPKColIndex].toString(),
    tokenAddress: row[collectionAddressColIndex]?.toString(),
    tokenAddress2: row[collectionAddressColIndex2]?.toString(),
    tokenId: row[tokenIdColIndex]?.toString(),
    tokenId2: row[tokenId2ColIndex]?.toString(),
    walletName: row[walletNameColIndex]?.toString(),
    targetWallet: row[targetwalletIndex]?.toString(),
  }));
};

export const fromCsvToUsersCustom = (rows: Row[]): LoadedUser[] => {
  const [headerRow, ...contentRows] = rows;

  let walletPKColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.WALLET_PRIVATE_KEY,
  );
  let starkPKColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.STARK_PRIVATE_KEY,
  );
  let collectionAddressColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.COLLECTION_ADDRESS,
  );
  let tokenIdColIndex = headerRow.findIndex((label) => label === CsvFormattedKeyEnums.TOKEN_ID);
  let walletNameColIndex = headerRow.findIndex(
    (label) => label === CsvFormattedKeyEnums.WALLET_NAME,
  );
  let targetwalletIndex = headerRow.findIndex((label) => label === CsvFormattedKeyEnums.ADDRESS);

  if (walletPKColIndex < 0) {
    walletPKColIndex = 0;
  }

  if (starkPKColIndex < 0) {
    starkPKColIndex = 1;
  }

  if (collectionAddressColIndex < 0) {
    collectionAddressColIndex = 2;
  }

  if (tokenIdColIndex < 0) {
    tokenIdColIndex = 3;
  }

  if (walletNameColIndex < 0) {
    walletNameColIndex = 4;
  }

  if (targetwalletIndex < 0) {
    targetwalletIndex = 5;
  }

  return contentRows.map((row) => ({
    privateKey: row[walletPKColIndex].toString(),
    starkPrivateKey: row[starkPKColIndex].toString(),
    tokenAddress: row[collectionAddressColIndex]?.toString(),
    tokenId: row[tokenIdColIndex]?.toString(),
    walletName: row[walletNameColIndex]?.toString(),
    targetWallet: row[targetwalletIndex]?.toString(),
  }));
};

export const toIMXAmount = (usdAmount: number, imxPrice: number) => {
  const imxAmount = usdAmount / imxPrice;
  return Math.round(imxAmount * 100) / 100;
};

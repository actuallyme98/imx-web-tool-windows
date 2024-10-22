import React, { useEffect, useMemo, useState, useCallback } from 'react';
import clsx from 'clsx';

import readXlsxFile from 'read-excel-file';
import { parseUnits } from 'ethers';

// components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import SubmitButton from '../../components/SubmitButton';

import { useSelector } from 'react-redux';
import { sSelectedNetwork } from '../../redux/selectors/app.selector';

// services
import { ImmutableService } from '../../services';

// utils
import { fromCsvToUsers } from '../../utils/format.util';
import { delay } from '../../utils/system';

// types
import { TradingService, TradingServiceV3 } from '../../types/local-storage';

// consts
import { IMX_ADDRESS } from '../../constants/imx';

// styles
import useStyles from './styles';

type CustomLog = {
  title: string;
  type?: 'error' | 'info' | 'warning' | 'success';
};

type Logs = {
  fileName: string;
  logs: CustomLog[];
};

const TradingV2Page: React.FC = () => {
  const styles = useStyles();
  const [files, setFiles] = useState<File[]>([]);
  const [fileAndClients, setFileAndClients] = useState<TradingServiceV3[]>([]);
  const [logs, setLogs] = useState<Logs[]>([]);
  const [sellAmount, setSellAmount] = useState('');
  const [isTradeSubmitting, setIsTradeSubmitting] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  const [maxFeePerGas, setMaxFeePerGas] = useState('50');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState('25');
  const [gasLimit, setGasLimit] = useState('300000');

  const [smaxFeePerGas, setSMaxFeePerGas] = useState('50');
  const [smaxPriorityFeePerGas, setSMaxPriorityFeePerGas] = useState('25');
  const [sgasLimit, setSGasLimit] = useState('300000');

  const selectedNetwork = useSelector(sSelectedNetwork);

  const onChangeSellAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSellAmount(value);
  };

  const onChangeMaxFeePerGas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMaxFeePerGas(value);
  };

  const onChangeMaxPriorityFeePerGas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMaxPriorityFeePerGas(value);
  };

  const onChangeGasLimit = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setGasLimit(value);
  };

  const onChangeSMaxFeePerGas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSMaxFeePerGas(value);
  };

  const onChangeSMaxPriorityFeePerGas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSMaxPriorityFeePerGas(value);
  };

  const onChangeSGasLimit = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSGasLimit(value);
  };

  const onChangeFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const importedFiles = event.target.files || [];
    const newFiles = Array.from(importedFiles);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  }, []);

  const onDeleteFile = useCallback((fileIndex: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== fileIndex));
  }, []);

  const pushLog = (fileName: string, item: CustomLog) => {
    setLogs((prevLogs) => {
      const existedLogIndex = prevLogs.findIndex((p) => p.fileName === fileName);
      if (existedLogIndex !== -1) {
        const updatedLogs = [...prevLogs];
        updatedLogs[existedLogIndex] = {
          ...updatedLogs[existedLogIndex],
          logs: [...updatedLogs[existedLogIndex].logs, item],
        };
        return updatedLogs;
      } else {
        return [...prevLogs, { fileName, logs: [item] }];
      }
    });
  };

  const onClearLogs = () => {
    setLogs([]);
  };

  const etherToWei = (amount: string) => {
    return parseUnits(amount, 'ether').toString();
  };

  const onLoadWallets = async () => {
    setIsLoadingWallets(true);
    const updatedClients = await Promise.all(
      files.map(async (file) => {
        const rows = await readXlsxFile(file);
        const formattedUsers = fromCsvToUsers(rows);

        return {
          fileName: file.name,
          clients: formattedUsers.map((user) => {
            const service = new ImmutableService(
              selectedNetwork,
              user.privateKey,
              user.starkPrivateKey,
            );
            return {
              ...user,
              service,
            };
          }),
        };
      }),
    );

    const updatedStateFileAndClient: TradingServiceV3[] = [];

    for (const client of updatedClients) {
      const fullFillClients = await onPreCreateOrders(client);

      updatedStateFileAndClient.push({
        fileName: client.fileName,
        clients: fullFillClients,
      });
    }

    setFileAndClients(updatedStateFileAndClient);
    setIsLoadingWallets(false);
  };

  const onPreCreateOrders = async (selectedClient: TradingServiceV3) => {
    const { fileName, clients } = selectedClient;
    const updatedClients: TradingService[] = [];

    pushLog(fileName, {
      title: `---------- ${fileName} is processing! ----------`,
    });

    for (const client of clients) {
      try {
        const { service, tokenAddress, tokenId } = client;

        const ethAddress = service.getAddress();

        pushLog(fileName, {
          title: `Selected Address: ${ethAddress}`,
        });

        if (!tokenAddress || !tokenId) {
          pushLog(fileName, {
            title: 'Skip this address because TokenAddress or TokenId are empty',
          });
          continue;
        }

        pushLog(fileName, {
          title: 'Fetching orders...',
        });

        const getOrdersResponse = await service.getOrders(ethAddress);
        const listedOrders = getOrdersResponse.result || [];

        pushLog(fileName, {
          title: `Found ${listedOrders.length} orders!`,
        });

        if (listedOrders.length > 0) {
          for (const listedOrder of listedOrders) {
            const { order_id, id } = listedOrder as any;
            const orderId = order_id || id;
            pushLog(fileName, {
              title: `Cancelling order id: ${orderId}`,
            });
            await service.cancelOrder(orderId);
          }
        }

        pushLog(fileName, {
          title: `Creating Order ...`,
        });

        const gasOptions = {
          maxPriorityFeePerGas: smaxPriorityFeePerGas
            ? parseFloat(smaxPriorityFeePerGas) * 1e9
            : 25e9,
          maxFeePerGas: smaxFeePerGas ? parseFloat(smaxFeePerGas) * 1e9 : 50e9,
          gasLimit: sgasLimit ? parseFloat(sgasLimit) : 300000,
        };

        const createdOrderResponse = await service.sell(
          {
            request: {
              buy: {
                amount: etherToWei(sellAmount),
                type: 'ERC20',
                tokenAddress: IMX_ADDRESS,
              },
              sell: {
                tokenAddress,
                tokenId,
                type: 'ERC721',
              },
            },
          },
          gasOptions,
        );

        pushLog(fileName, {
          title: `Created order success with order id ${createdOrderResponse.order_id}`,
          type: 'success',
        });

        updatedClients.push({
          ...client,
          orderId: String(createdOrderResponse.order_id),
        });
      } catch (error: any) {
        pushLog(fileName, {
          title: error.message,
          type: 'error',
        });
        continue;
      }
    }

    return updatedClients;
  };

  const retryGetBalance = async (service: ImmutableService, retryCount = 50, fileName: string) => {
    let retryAttempts = 0;

    while (retryAttempts < retryCount) {
      try {
        const balanceResponse = await service.getBalance();
        return parseFloat(balanceResponse?.balance || '0');
      } catch (error: any) {
        retryAttempts++;
        pushLog(fileName, {
          title: error.message,
          type: 'error',
        });
        pushLog(fileName, {
          title: `Error fetching balance. Retry attempt ${retryAttempts} out of ${retryCount}`,
          type: 'warning',
        });
        if (retryAttempts >= retryCount) {
          pushLog(fileName, {
            title: `Maximum retry attempts (${retryCount}) reached. Unable to fetch balance.`,
            type: 'error',
          });
          return 0;
        }
        await delay(1000); // Wait for 1 seconds
      }
    }

    return 0;
  };

  const triggerBuy = async (
    rootUser: TradingService,
    orderId: number | string,
    ownerClient: TradingService,
    retryCount = 50,
    fileName: string,
  ) => {
    const { service } = rootUser;
    const ethAddress = service.getAddress();

    pushLog(fileName, {
      title: `An order ID ---${orderId}--- has been detected`,
    });

    pushLog(fileName, {
      title: `Selected Address: ${ethAddress}`,
    });

    let currentBalance = await retryGetBalance(service, retryCount, fileName);
    const minRequiredBalance = parseFloat(sellAmount);

    pushLog(fileName, {
      title: `${ethAddress} has balanceOf ${currentBalance} IMX`,
      type: 'info',
    });

    let retryAttempts = 0;

    const gasOptions = {
      maxPriorityFeePerGas: maxPriorityFeePerGas ? parseFloat(maxPriorityFeePerGas) * 1e9 : 25e9,
      maxFeePerGas: maxFeePerGas ? parseFloat(maxFeePerGas) * 1e9 : 50e9,
      gasLimit: gasLimit ? parseFloat(gasLimit) : 300000,
    };

    while (currentBalance < minRequiredBalance && retryAttempts < retryCount) {
      pushLog(fileName, {
        title: 'Insufficient balance on account, waiting for 1s before retrying...',
        type: 'error',
      });
      await delay(1000); // Wait for 1 seconds
      currentBalance = await retryGetBalance(service, retryCount, fileName);
      retryAttempts++;
    }

    while (retryAttempts < retryCount) {
      try {
        await service.buy(
          {
            request: {
              order_id: orderId as any,
              user: ethAddress,
            },
          },
          gasOptions,
        );

        pushLog(fileName, {
          title: `Trade success order ${orderId}`,
          type: 'success',
        });
        return;
      } catch (error: any) {
        pushLog(fileName, {
          title: error.message,
          type: 'error',
        });

        if (error.message?.includes('not found')) {
          pushLog(fileName, {
            title: 'Creating order again ...',
            type: 'warning',
          });

          await triggerLastTx(ownerClient, rootUser, fileName);
        } else {
          retryAttempts++;
          pushLog(fileName, {
            title: `Retry attempt ${retryAttempts} out of ${retryCount}, waiting for 1s before retrying...`,
            type: 'warning',
          });
          await delay(1000); // Wait for 2 seconds
        }
      }
    }

    pushLog(fileName, {
      title: `Maximum retry attempts (${retryCount}) reached. Unable to complete trade.`,
      type: 'error',
    });
  };

  const triggerLastTx = async (
    rootClient: TradingService,
    rootWallet: TradingService,
    fileName: string,
  ) => {
    const { service, tokenAddress, tokenId, orderId } = rootClient;
    const ethAddress = service.getAddress();
    pushLog(fileName, {
      title: `Selected Address: ${ethAddress}`,
    });
    if (!tokenAddress || !tokenId || !orderId) {
      pushLog(fileName, {
        title: 'Skip this address because TokenAddress or TokenId or orderId are empty',
      });
      return;
    }

    pushLog(fileName, {
      title: `Created order success with order id ${orderId}`,
      type: 'success',
    });

    await triggerBuy(rootWallet, orderId, rootClient, 50, fileName);
  };

  const tradingv2 = async (fileAndClient: TradingServiceV3) => {
    const { fileName, clients } = fileAndClient;

    pushLog(fileName, {
      title: `---------- ${fileName} is processing! ----------`,
    });

    if (!clients.length) {
      pushLog(fileName, {
        title: `---- ${fileName} is empty! ----`,
        type: 'error',
      });
      return;
    }

    const [rootClient, ...restClients] = clients;

    let rootWallet: TradingService = rootClient;

    for (const selectedClient of restClients) {
      try {
        const { service, tokenAddress, tokenId, orderId } = selectedClient;
        const ethAddress = service.getAddress();
        pushLog(fileName, {
          title: `Selected Address: ${ethAddress}`,
        });
        if (!tokenAddress || !tokenId || !orderId) {
          pushLog(fileName, {
            title: 'Skip this address because TokenAddress or TokenId or orderId are empty',
          });
          continue;
        }

        await triggerBuy(rootWallet, orderId, selectedClient, 50, fileName);
        rootWallet = selectedClient;
      } catch (error: any) {
        pushLog(fileName, {
          title: error.message,
          type: 'error',
        });
        return;
      }
    }

    pushLog(fileName, {
      title: 'Finished all addresses',
      type: 'success',
    });

    pushLog(fileName, {
      title: 'Turn to execute first address',
      type: 'success',
    });

    await triggerLastTx(rootClient, rootWallet, fileName);
  };

  const onStartTrade = async () => {
    const start = Date.now();
    setIsTradeSubmitting(true);

    try {
      const promises: Promise<void>[] = [];

      for (const fileAndClient of fileAndClients) {
        // const now = Date.now();
        // if (now - start > 40000) {
        //   const remainingPoints = await getRemainingRewardPoints(selectedNetwork);
        //   if (remainingPoints <= 0) {
        //     return;
        //   }
        // }

        promises.push(tradingv2(fileAndClient));
      }

      await Promise.allSettled(promises);
    } catch (error: any) {
      pushLog('[onStartTrade]', {
        title: error.message,
        type: 'error',
      });
    } finally {
      setIsTradeSubmitting(false);
      const end = Date.now();
      pushLog('[onStartTrade]', {
        title: `Execution time: ${end - start} ms`,
        type: 'success',
      });
    }
  };

  const renderFiles = useMemo(
    () =>
      files.map((file, index) => (
        <Alert key={index} onClose={() => onDeleteFile(index)}>
          {file.name}
        </Alert>
      )),
    [files],
  );

  const renderLogs = useMemo(() => {
    return logs.map((l, lid) => (
      <div key={lid}>
        {l.logs?.map((item, index) => (
          <code
            key={index}
            className={clsx(styles.logLine, {
              [styles.logLineError]: item.type === 'error',
              [styles.logLineSuccess]: item.type === 'success',
              [styles.logLineWarning]: item.type === 'warning',
            })}
          >
            {`[${index}]:`} {item.title}
          </code>
        ))}
      </div>
    ));
  }, [logs]);

  useEffect(() => {
    setFileAndClients(
      fileAndClients.map((client) => ({
        ...client,
        clients: client.clients.map((c) => ({
          ...c,
          service: new ImmutableService(selectedNetwork, c.privateKey, c.starkPrivateKey),
        })),
      })),
    );
  }, [selectedNetwork]);

  return (
    <Box className={styles.root}>
      <Box width="100%">
        <Typography variant="h2" textAlign="center" mb={4}>
          Trading v2
        </Typography>

        <Box mb={4}>
          <input type="file" onChange={onChangeFile} accept=".csv, .xlsx" multiple />
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={4}>
            {files.length > 0 && (
              <Box mb={4}>
                <Box mt={2} mb={2}>
                  Gas options (Trade - Sell)
                </Box>
                <Box mb={1}>
                  <TextField
                    size="small"
                    label="maxFeePerGas"
                    type="number"
                    className={styles.gasOptionInput}
                    value={maxFeePerGas}
                    onChange={onChangeMaxFeePerGas}
                    autoComplete="off"
                  />
                  <TextField
                    size="small"
                    label="maxFeePerGas"
                    type="number"
                    className={styles.gasOptionInput}
                    value={smaxFeePerGas}
                    onChange={onChangeSMaxFeePerGas}
                    autoComplete="off"
                  />
                </Box>

                <Box mb={1}>
                  <TextField
                    size="small"
                    label="maxPriorityFeePerGas"
                    type="number"
                    className={styles.gasOptionInput}
                    value={maxPriorityFeePerGas}
                    onChange={onChangeMaxPriorityFeePerGas}
                    autoComplete="off"
                  />
                  <TextField
                    size="small"
                    label="maxPriorityFeePerGas"
                    type="number"
                    className={styles.gasOptionInput}
                    value={smaxPriorityFeePerGas}
                    onChange={onChangeSMaxPriorityFeePerGas}
                    autoComplete="off"
                  />
                </Box>

                <Box>
                  <TextField
                    size="small"
                    label="gasLimit"
                    type="number"
                    className={styles.gasOptionInput}
                    value={gasLimit}
                    onChange={onChangeGasLimit}
                    autoComplete="off"
                  />
                  <TextField
                    size="small"
                    label="gasLimit"
                    type="number"
                    className={styles.gasOptionInput}
                    value={sgasLimit}
                    onChange={onChangeSGasLimit}
                    autoComplete="off"
                  />
                </Box>

                <SubmitButton onClick={onLoadWallets} isLoading={isLoadingWallets}>
                  Load wallets
                </SubmitButton>
              </Box>
            )}
            <Stack spacing={2}>{renderFiles}</Stack>
          </Grid>

          <Grid item xs={8}>
            <Box>
              <TextField
                size="small"
                label="Enter IMX amount"
                type="number"
                className={styles.amountInput}
                value={sellAmount}
                onChange={onChangeSellAmount}
                autoComplete="off"
              />

              <SubmitButton
                variant="contained"
                onClick={onStartTrade}
                isLoading={isTradeSubmitting}
                disabled={isTradeSubmitting || !sellAmount || isNaN(parseFloat(sellAmount))}
              >
                Start trade
              </SubmitButton>

              <SubmitButton
                style={{
                  marginLeft: 16,
                }}
                onClick={onClearLogs}
              >
                Clear Logs
              </SubmitButton>
            </Box>

            <Box className={styles.logsContainer}>{renderLogs}</Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default TradingV2Page;

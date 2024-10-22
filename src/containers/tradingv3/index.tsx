import React, { useEffect, useMemo, useState, useCallback } from 'react';
import clsx from 'clsx';

import readXlsxFile from 'read-excel-file';
import { parseUnits } from 'ethers';
import moment from 'moment';

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
import { getRemainingRewardPoints } from '../../utils/api.util';

// types
import { TradingService, TradingServiceV3 } from '../../types/local-storage';

// consts
import { IMX_ADDRESS } from '../../constants/imx';
import { DEFAULT_FORMAT_HOUR_AND_MINUTE } from '../../constants/system';

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

const TradingV3Page: React.FC = () => {
  const styles = useStyles();
  const [files, setFiles] = useState<File[]>([]);
  const [fileAndClients, setFileAndClients] = useState<TradingServiceV3[]>([]);
  const [logs, setLogs] = useState<Logs[]>([]);
  const [sellAmount, setSellAmount] = useState('');
  const [tradingTime, setTradingTime] = useState('');
  const [isTradeSubmitting, setIsTradeSubmitting] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  const selectedNetwork = useSelector(sSelectedNetwork);

  const onChangeSellAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSellAmount(value);
  };

  const onChangeTradingTimeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTradingTime(value);
  };

  const onResetTradingTime = () => {
    setTradingTime('');
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

  const onLoadWallets = useCallback(async () => {
    setIsLoadingWallets(true);
    await delay(500);
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
    setFileAndClients(updatedClients);
    setIsLoadingWallets(false);
  }, [files, selectedNetwork]);

  // const onPreCreateOrders = async (selectedClient: TradingServiceV3) => {
  //   const { fileName, clients } = selectedClient;
  //   const updatedClients: TradingService[] = [];

  //   pushLog({
  //     title: `---------- ${fileName} is processing! ----------`,
  //   });

  //   for (const client of clients) {
  //     try {
  //       const { service, tokenAddress, tokenId } = client;

  //       const ethAddress = service.getAddress();

  //       pushLog({
  //         title: `Selected Address: ${ethAddress}`,
  //       });

  //       if (!tokenAddress || !tokenId) {
  //         pushLog({
  //           title: 'Skip this address because TokenAddress or TokenId are empty',
  //         });
  //         continue;
  //       }

  //       pushLog({
  //         title: `Creating Order ...`,
  //       });

  //       const createdOrderResponse = await service.sell({
  //         request: {
  //           buy: {
  //             amount: etherToWei(sellAmount),
  //             type: 'ERC20',
  //             tokenAddress: IMX_ADDRESS,
  //           },
  //           sell: {
  //             tokenAddress,
  //             tokenId,
  //             type: 'ERC721',
  //           },
  //         },
  //       });

  //       pushLog({
  //         title: `Created order success with order id ${createdOrderResponse.order_id}`,
  //         type: 'success',
  //       });

  //       updatedClients.push({
  //         ...client,
  //         orderId: String(createdOrderResponse.order_id),
  //       });
  //     } catch (error: any) {
  //       pushLog({
  //         title: error.message,
  //         type: 'error',
  //       });
  //       continue;
  //     }
  //   }

  //   return updatedClients;
  // };

  // const retryGetBalance = async (service: ImmutableService, retryCount = 50, fileName: string) => {
  //   let retryAttempts = 0;

  //   while (retryAttempts < retryCount) {
  //     try {
  //       const balanceResponse = await service.getBalance();
  //       return parseFloat(balanceResponse?.balance || '0');
  //     } catch (error) {
  //       retryAttempts++;
  //       pushLog(fileName, {
  //         title: `Error fetching balance. Retry attempt ${retryAttempts} out of ${retryCount}`,
  //         type: 'warning',
  //       });
  //       if (retryAttempts >= retryCount) {
  //         pushLog(fileName, {
  //           title: `Maximum retry attempts (${retryCount}) reached. Unable to fetch balance.`,
  //           type: 'error',
  //         });
  //         return 0;
  //       }
  //       await delay(1000); // Wait for 1 seconds
  //     }
  //   }

  //   return 0;
  // };

  const triggerBuy = async (
    rootUser: TradingService,
    orderId: number | string,
    ownerClient: TradingService,
    retryCount = 20,
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

    let retryAttempts = 0;

    while (retryAttempts < retryCount) {
      try {
        await service.buy({
          request: {
            order_id: orderId as any,
            user: ethAddress,
          },
        });

        pushLog(fileName, {
          title: `Trade success order ${orderId}`,
          type: 'success',
        });
        break;
      } catch (error: any) {
        pushLog(fileName, {
          title: error.message,
          type: 'error',
        });

        // if (error.message?.includes('not found')) {
        //   pushLog(fileName, {
        //     title: 'Creating order again ...',
        //     type: 'warning',
        //   });

        //   await triggerLastTx(ownerClient, rootUser, fileName);
        // } else {
        retryAttempts++;
        pushLog(fileName, {
          title: `Retry attempt ${retryAttempts} out of ${retryCount}, waiting for 1s before retrying...`,
          type: 'warning',
        });
        await delay(1000); // Wait for 2 seconds
        // }
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
    const { service, tokenAddress, tokenId } = rootClient;
    const ethAddress = service.getAddress();
    pushLog(fileName, {
      title: `Selected Address: ${ethAddress}`,
    });
    if (!tokenAddress || !tokenId) {
      pushLog(fileName, {
        title: 'Skip this address because TokenAddress or TokenId are empty',
      });
      return;
    }
    const createdOrderResponse = await service.sell({
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
    });

    pushLog(fileName, {
      title: `Created order success with order id ${createdOrderResponse.order_id}`,
      type: 'success',
    });

    await triggerBuy(rootWallet, createdOrderResponse.order_id, rootClient, 10, fileName);
  };

  const tradingv3 = async (fileAndClient: TradingServiceV3) => {
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
      const MAX_RETRIES = 10;
      let retryCount = 0;

      while (retryCount < MAX_RETRIES) {
        try {
          const { service, tokenAddress, tokenId } = selectedClient;
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
          const createdOrderResponse = await service.sell({
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
          });

          pushLog(fileName, {
            title: `Created order success with order id ${createdOrderResponse.order_id}`,
            type: 'success',
          });

          await triggerBuy(rootWallet, createdOrderResponse.order_id, selectedClient, 20, fileName);
          rootWallet = selectedClient;

          break;
        } catch (error: any) {
          retryCount++;
          if (retryCount === MAX_RETRIES) {
            pushLog(fileName, {
              title: `Max retries reached. Error: ${error.message}`,
              type: 'error',
            });
          } else {
            pushLog(fileName, {
              title: `Error occurred. Retrying (${retryCount}/${MAX_RETRIES}). Error: ${error.message}`,
              type: 'error',
            });
          }
        }
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
    setIsTradeSubmitting(true);

    if (tradingTime) {
      const now = moment();
      const tradingMoment = moment(tradingTime, DEFAULT_FORMAT_HOUR_AND_MINUTE);

      const diffTime = moment(tradingMoment).diff(now);

      if (diffTime > 0) {
        await delay(diffTime);
      }
    }

    const start = Date.now();

    try {
      const promises: Promise<void>[] = [];

      for (const fileAndClient of fileAndClients) {
        promises.push(tradingv3(fileAndClient));
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
          Trading v3
        </Typography>

        <Box mb={4}>
          <input type="file" onChange={onChangeFile} accept=".csv, .xlsx" multiple />
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={4}>
            {files.length > 0 && (
              <Box mb={4}>
                <SubmitButton onClick={onLoadWallets} isLoading={isLoadingWallets}>
                  Load wallets
                </SubmitButton>
              </Box>
            )}
            <Stack spacing={2}>{renderFiles}</Stack>
          </Grid>

          {fileAndClients.length > 0 && (
            <Grid item xs={8}>
              <Box mb={2}>
                <input
                  type="time"
                  value={tradingTime}
                  step={1}
                  onChange={onChangeTradingTimeInput}
                />

                <SubmitButton
                  style={{
                    marginLeft: 16,
                  }}
                  onClick={onResetTradingTime}
                >
                  Reset Time
                </SubmitButton>
              </Box>

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
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default TradingV3Page;

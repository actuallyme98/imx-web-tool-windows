import React, { useState, useContext, useMemo } from 'react';
import { Order } from '@imtbl/core-sdk';
import * as ethers from 'ethers';

// components
import { ToastContainer, toast } from 'react-toastify';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import TextField from '../../../../components/TextField';
import SubmitButton from '../../../../components/SubmitButton';

// contexts
import { ExplorerContext } from '../../contexts';

// styles
import useStyles from './styles';

const GetOrdersTab: React.FC = () => {
  const [address, setAddress] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = useStyles();

  const { selectedClient } = useContext(ExplorerContext);

  const onChangeAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAddress(value);
  };

  const onSubmit = async () => {
    const addressTrimmed = address.trim();
    if (!selectedClient) return;
    try {
      setIsSubmitting(true);
      const { service } = selectedClient;

      const response = await service.getOrders(addressTrimmed);

      setOrders(response.result);
    } catch (error: any) {
      toast(error.message, {
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteOrder = async (orderId: number) => {
    try {
      if (!selectedClient) return;

      const answer = confirm('Are you sure to cancel this order?');

      if (!answer) return;
      setIsSubmitting(true);
      const { service } = selectedClient;
      await service.cancelOrder(orderId);

      await onSubmit();
    } catch (error: any) {
      toast(error?.response?.data?.message || error.message, {
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOrders = useMemo(() => {
    if (orders.length === 0) return null;

    return (
      <Grid item xs={12}>
        <Divider />
        <Box my={2}>
          <label className={styles.label}>Active Orders (Output)</label>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order Id</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => {
                const { sell, buy, order_id, id } = order;
                const sellData = sell.data || sell[0] || {};
                const buyData = buy.data || buy[0] || {};
                const orderId = order_id || id;

                return (
                  <TableRow key={orderId}>
                    <TableCell>{orderId}</TableCell>
                    <TableCell>
                      {sellData.properties ? (
                        <Box className={styles.assetItem}>
                          <Box>
                            <img
                              className={styles.assetImg}
                              src={sellData.properties?.image_url || ''}
                              alt=""
                            />
                          </Box>
                          <Box>
                            <div className={styles.assetCollectionName}>
                              {sellData.properties?.collection?.name}
                            </div>
                            <div className={styles.assetName}>{sellData.properties?.name}</div>
                            <div className={styles.assetId}>#{sellData.token_id}</div>
                          </Box>
                        </Box>
                      ) : (
                        <div>#{sellData.tokenId}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {ethers.formatEther(buyData.quantity || buyData.amount)} IMX
                    </TableCell>

                    <TableCell>
                      <IconButton onClick={() => onDeleteOrder(orderId)}>
                        <ClearIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Divider />
      </Grid>
    );
  }, [orders]);

  return (
    <Box>
      <ToastContainer />
      <Typography mb={2}>Get Orders</Typography>
      <Divider />
      <Grid container spacing={2} mt={0}>
        <Grid item xs={12}>
          <label className={styles.label}>Address (optional)</label>
          <TextField value={address} onChange={onChangeAddress} />
        </Grid>

        <Grid item xs={12}>
          <SubmitButton
            disabled={isSubmitting || !selectedClient}
            isLoading={isSubmitting}
            onClick={onSubmit}
          >
            Submit
          </SubmitButton>
        </Grid>

        {renderOrders}
      </Grid>
    </Box>
  );
};

export default GetOrdersTab;

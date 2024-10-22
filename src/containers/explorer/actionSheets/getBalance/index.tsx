import React, { useContext, useState } from 'react';

// components
import { ToastContainer, toast } from 'react-toastify';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import SubmitButton from '../../../../components/SubmitButton';
import TextField from '../../../../components/TextField';

// contexts
import { ExplorerContext } from '../../contexts';

// styles
import useStyles from './styles';

const GetBalanceTab: React.FC = () => {
  const [balance, setBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = useStyles();

  const { selectedClient } = useContext(ExplorerContext);

  const onSubmit = async () => {
    if (!selectedClient) return;

    try {
      setIsSubmitting(true);
      const { service } = selectedClient;

      const response = await service.getBalance();

      setBalance(response.balance);
    } catch (error: any) {
      toast(error?.response?.data?.message || error.message, {
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <ToastContainer />
      <Typography mb={2}>Get Balance</Typography>
      <Divider />
      <Grid container spacing={2} mt={0}>
        <Grid item xs={12}>
          <SubmitButton
            onClick={onSubmit}
            disabled={!selectedClient || isSubmitting}
            isLoading={isSubmitting}
          >
            Submit
          </SubmitButton>
        </Grid>

        {balance && (
          <Grid item xs={12}>
            <Divider />
            <Box my={2}>
              <label className={styles.label}>Immutable X (Output)</label>
              <TextField value={balance} />
            </Box>
            <Divider />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default GetBalanceTab;

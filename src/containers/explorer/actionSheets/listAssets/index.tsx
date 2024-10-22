import React, { useContext, useMemo, useState } from 'react';
import { AssetWithOrders } from '@imtbl/core-sdk';

// components
import { ToastContainer, toast } from 'react-toastify';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import SendIcon from '@mui/icons-material/Send';
import SubmitButton from '../../../../components/SubmitButton';
import TextField from '../../../../components/TextField';
import TransferNFTDialog from './transferNFTDialog';

// contexts
import { ExplorerContext } from '../../contexts';

// utils
import { compareAddresses } from '../../../../utils/string';

// styles
import useStyles from './styles';

const ListAssetsTab: React.FC = () => {
  const [address, setAddress] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNFT, setOpenSelectedNFT] = useState<any>({});
  const styles = useStyles();

  const { selectedClient } = useContext(ExplorerContext);

  const onSubmit = async () => {
    if (!selectedClient) return;

    try {
      setIsSubmitting(true);
      const { service } = selectedClient;

      const response = await service.getAssets(address.trim());

      setAssets(response.result);
    } catch (error: any) {
      toast(error?.response?.data?.message || error.message, {
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangeAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAddress(value);
  };

  const onOpenTransferNFTDialog = (asset: AssetWithOrders) => {
    setOpenSelectedNFT(asset);
  };

  const onCloseTransferNFTDialog = () => {
    setOpenSelectedNFT(undefined);
  };

  const onSubmitTransferNFT = async (receiver: string) => {
    if (!selectedClient || !selectedNFT) return;

    try {
      const { service } = selectedClient;
      const { token_address, token_id, contract_address } = selectedNFT;

      const gasOptions = {
        maxPriorityFeePerGas: 10e9,
        maxFeePerGas: 15e9,
        gasLimit: 100000,
      };

      await service.transfer(
        {
          request: {
            type: 'ERC721',
            tokenAddress: token_address || contract_address,
            tokenId: token_id,
            receiver,
          },
        },
        gasOptions,
      );

      const response = await service.getAssets(address.trim());

      setAssets(response.result);
    } catch (error: any) {
      toast(error?.response?.data?.message || error.message, {
        type: 'error',
      });
    } finally {
      onCloseTransferNFTDialog();
    }
  };

  const renderAssets = useMemo(() => {
    const ownerAddress = selectedClient?.service?.getAddress() || '';

    return assets.map((item, index) => (
      <Box key={index} className={styles.assetItem}>
        <Box>
          <img className={styles.assetImg} src={item.image_url || item.image || ''} alt="" />
        </Box>

        <Box>
          <div className={styles.assetCollectionName}>{item.collection?.name}</div>
          <div className={styles.assetName}>{item.name}</div>
          <div className={styles.assetId}>#{item.token_id}</div>
        </Box>

        {/* {compareAddresses(ownerAddress, item.user || address) && ( */}
        <div
          className={styles.transferLayerContainer}
          onClick={() => onOpenTransferNFTDialog(item)}
        >
          <SendIcon />
        </div>
        {/* )} */}
      </Box>
    ));
  }, [assets, selectedClient, address]);

  return (
    <Box>
      <ToastContainer />
      {selectedNFT && (
        <TransferNFTDialog
          open
          onClose={onCloseTransferNFTDialog}
          onSubmit={onSubmitTransferNFT}
          asset={selectedNFT}
        />
      )}
      <Typography mb={2}>List Assets</Typography>
      <Divider />
      <Grid container spacing={2} mt={0}>
        <Grid item xs={12}>
          <label className={styles.label}>
            Owner <span className={styles.labelNote}>(optional)</span>
          </label>
          <TextField value={address} onChange={onChangeAddress} />
        </Grid>

        <Grid item xs={12}>
          <SubmitButton
            onClick={onSubmit}
            disabled={isSubmitting || !selectedClient}
            isLoading={isSubmitting}
          >
            Submit
          </SubmitButton>
        </Grid>

        <Grid item xs={12}>
          <Box className={styles.assetContainer}>{renderAssets}</Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ListAssetsTab;

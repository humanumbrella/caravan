import React from "react";
import PropTypes from "prop-types";
import {
  PENDING,
  UNSUPPORTED,
  SignMultisigTransaction,
  ACTIVE,
} from "unchained-wallets";
import {
  Grid,
  Box,
  TextField,
  Button,
  FormHelperText,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormGroup,
} from "@material-ui/core";
import { HermitReader, HermitDisplayer } from "../Hermit";
import InteractionMessages from "../InteractionMessages";
import { satoshisToBitcoins } from "unchained-bitcoin";

class IndirectSignatureImporter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bip32PathError: "",
      signatureError: "",
      status: this.interaction().isSupported() ? PENDING : UNSUPPORTED,
    };
  }

  interaction = () => {
    const { signatureImporter, network, inputs, outputs } = this.props;
    const keystore = signatureImporter.method;
    const bip32Paths = inputs.map((input) => {
      if (typeof input.bip32Path === "undefined")
        return signatureImporter.bip32Path; // pubkey path
      return `${signatureImporter.bip32Path}${input.bip32Path.slice(1)}`; // xpub/pubkey slice away the m, keep /
    });

    return SignMultisigTransaction({
      keystore,
      network,
      inputs,
      outputs,
      bip32Paths,
    });
  };

  renderDeviceConfirmInfo = () => {
    const { fee, inputsTotalSats } = this.props;
    return (
      <Box>
        <p>Your device will ask you to verify the following information:</p>
        <Table>
          <TableHead>
            <TableRow hover>
              <TableCell />
              <TableCell>Amount (BTC)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {this.renderTargets()}
            <TableRow hover>
              <TableCell>Fee</TableCell>
              <TableCell>{fee}</TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell>Total</TableCell>
              <TableCell>
                {satoshisToBitcoins(inputsTotalSats).toString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    );
  };

  renderTargets = () => {
    const { outputs } = this.props;
    return outputs.map((output) => {
      return (
        <TableRow hover key={output.address}>
          <TableCell>
            Address <code>{output.address}</code>
          </TableCell>
          <TableCell>{output.amount}</TableCell>
        </TableRow>
      );
    });
  };

  renderHermitSigning = () => {
    const { disableChangeMethod } = this.props;
    const { status } = this.state;
    const interaction = this.interaction();
    return (
      <div>
        <Grid container justify="center">
          <Grid item>
            <HermitDisplayer width={400} string={interaction.request()} />
          </Grid>
        </Grid>
        <HermitReader
          startText="Scan Signature QR Code"
          interaction={interaction}
          onStart={disableChangeMethod}
          onSuccess={this.import}
          onClear={this.clear}
        />

        <InteractionMessages
          messages={interaction.messagesFor({ state: status })}
          excludeCodes={["hermit.signature_request", "hermit.command"]}
        />
      </div>
    );
  };

  renderTextSigning = () => {
    const { signatureImporter, resetBIP32Path } = this.props;
    const { bip32PathError, status } = this.state;
    return (
      <>
        <Grid container>
          <Grid item md={10}>
            <TextField
              name="bip32Path"
              value={signatureImporter.bip32Path}
              onChange={this.handleBIP32PathChange}
              disabled={status !== PENDING}
              error={this.hasBIP32PathError()}
              helperText={bip32PathError}
            />
          </Grid>

          <Grid item md={2}>
            {!this.bip32PathIsDefault() && (
              <Button
                type="button"
                variant="contained"
                size="small"
                onClick={resetBIP32Path}
                disabled={status !== PENDING}
              >
                Default
              </Button>
            )}
          </Grid>
        </Grid>

        <FormHelperText>
          Use the default value if you don&rsquo;t understand BIP32 paths.
        </FormHelperText>
      </>
    );
  };

  render = () => {
    const {
      disableChangeMethod,
      extendedPublicKeyImporter,
      Signer,
    } = this.props;
    const { signatureError, status } = this.state;
    const interaction = this.interaction();
    if (status === UNSUPPORTED) {
      return (
        <InteractionMessages
          messages={interaction.messagesFor({ state: status })}
          excludeCodes={["hermit.signature_request", "hermit.command"]}
        />
      );
    }
    return (
      <Box mt={2}>
        {(extendedPublicKeyImporter === null ||
          typeof extendedPublicKeyImporter === "undefined" ||
          extendedPublicKeyImporter.method === "text") &&
          this.renderTextSigning()}

        <Box mt={2}>
          {this.renderDeviceConfirmInfo()}
          <FormGroup>
            <Signer
              setError={this.setError}
              hasError={this.hasBIP32PathError()}
              onReceive={this.onReceive}
              onReceivePSBT={this.onReceivePSBT}
              interaction={this.interaction()}
              setActive={this.setActive}
              disableChangeMethod={disableChangeMethod}
              extendedPublicKeyImporter={extendedPublicKeyImporter}
            />

            <FormHelperText error>{signatureError}</FormHelperText>

            <InteractionMessages
              messages={interaction.messagesFor({ state: status })}
            />
          </FormGroup>
        </Box>
      </Box>
    );
  };

  setActive = () => {
    this.setState({ status: ACTIVE });
  };

  onReceive = (signature) => {
    const { validateAndSetSignature, enableChangeMethod } = this.props;
    this.setState({ signatureError: "" });
    if (enableChangeMethod) {
      enableChangeMethod();
    }
    validateAndSetSignature(signature, (signatureError) => {
      this.setState({ signatureError });
    });
  };

  onReceivePSBT = (data) => {
    const { validateAndSetSignature } = this.props;
    try {
      // signatureData is one or more sets of signatures that are keyed
      // based on which pubkey the signatures are signing.
      const signatureData = this.interaction().parse(data);
      const signatureSetsKeys = Object.keys(signatureData);
      const signatures = [];

      // We have a slight problem for a n-ly signed PSBT here
      // because there is no order to the pubkey: [sigs] mapping
      // returned from unchained-wallets (and that's okay)
      // but if we are just blindly creating an array of signatures then
      // we might have them out of order, causing a problem down the line
      // in validation.

      // e.g. have doubly signed 3 input psbt, 6 signatures come back for 3 pubkeys.
      // the logic for adding signatures expects the first three signatures in the array
      // to be all for the same input set, e.g.
      // [siga1, siga2, siga3, sigb1, sigb2, sigb3]
      // ... if the pubkey array that comes back from unchained-wallets is
      // [siga1, sigb2, siga3, sigb3, siga2, sigb1] then you will get invalid signature
      // for input2.

      // what to do?
      // a) don't modify the data structure that comes back and make the signature validator smarter
      // b) modify this properly but need to know the mapping between pubkeys:inputs
      // c) other
      signatureSetsKeys.forEach((pubkey) => {
        signatures.push(...signatureData[pubkey]);
      });

      this.setState({ signatureError: "" });
      validateAndSetSignature(signatures, (signatureError) => {
        this.setState({ signatureError });
      });
    } catch (e) {
      e.errorType = "Coldcard Signing Error";
      this.setState({ signatureError: e.message });
    }
  };

  setError = (value) => {
    this.setState({ signatureError: value });
  };

  clear = () => {
    const { resetBIP32Path, enableChangeMethod } = this.props;
    resetBIP32Path();
    this.setState({ signatureError: "" });
    enableChangeMethod();
  };

  hasBIP32PathError = () => {
    const { bip32PathError } = this.state;
    return bip32PathError !== "";
  };

  handleBIP32PathChange = (event) => {
    const { validateAndSetBIP32Path } = this.props;
    const bip32Path = event.target.value;
    validateAndSetBIP32Path(
      bip32Path,
      () => {},
      (bip32PathError) => {
        this.setState({ bip32PathError });
      }
    );
  };

  bip32PathIsDefault = () => {
    const { signatureImporter, defaultBIP32Path } = this.props;
    return signatureImporter.bip32Path === defaultBIP32Path;
  };
}

IndirectSignatureImporter.propTypes = {
  network: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  signatureImporter: PropTypes.shape({
    bip32Path: PropTypes.string,
    method: PropTypes.string,
  }).isRequired,
  resetBIP32Path: PropTypes.func,
  defaultBIP32Path: PropTypes.string,
  validateAndSetBIP32Path: PropTypes.func,
  validateAndSetSignature: PropTypes.func.isRequired,
  enableChangeMethod: PropTypes.func,
  disableChangeMethod: PropTypes.func,
  extendedPublicKeyImporter: PropTypes.shape({
    method: PropTypes.string,
  }),
  Signer: PropTypes.shape({}),
  fee: PropTypes.number,
  inputsTotalSats: PropTypes.number,
};

export default IndirectSignatureImporter;

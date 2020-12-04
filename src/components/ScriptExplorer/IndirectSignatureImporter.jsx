import React from "react";
import PropTypes from "prop-types";
import {
  PENDING,
  UNSUPPORTED,
  SignMultisigTransaction,
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
import { HermitReader } from "../Hermit";
import { HermitDisplayer } from "../Hermit";
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
  }).isRequired,
  resetBIP32Path: PropTypes.func,
  defaultBIP32Path: PropTypes.string,
  validateAndSetBIP32Path: PropTypes.func,
  validateAndSetSignature: PropTypes.func.isRequired,
  enableChangeMethod: PropTypes.func,
  disableChangeMethod: PropTypes.func,
};

export default IndirectSignatureImporter;

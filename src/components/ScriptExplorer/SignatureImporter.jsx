import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  validateHex,
  validateMultisigSignature,
  multisigBIP32Path,
  multisigBIP32Root,
  validateBIP32Path,
} from "unchained-bitcoin";
import { TREZOR, LEDGER, HERMIT, COLDCARD } from "unchained-wallets";
import {
  Card,
  CardHeader,
  CardContent,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Box,
  FormControl,
} from "@material-ui/core";
import Copyable from "../Copyable";
import TextSignatureImporter from "./TextSignatureImporter";
import DirectSignatureImporter from "./DirectSignatureImporter";
import EditableName from "../EditableName";
import {
  setSignatureImporterName,
  setSignatureImporterMethod,
  setSignatureImporterBIP32Path,
  setSignatureImporterPublicKeys,
  setSignatureImporterSignature,
  setSignatureImporterFinalized,
  setSignatureImporterComplete,
} from "../../actions/signatureImporterActions";
import "react-table/react-table.css";
import { setSigningKey as setSigningKeyAction } from "../../actions/transactionActions";
import HermitSignatureImporter from "../Hermit/HermitSignatureImporter";
import ColdcardSignatureImporter from "../Coldcard/ColdcardSignatureImporter";

const TEXT = "text";
const UNKNOWN = "unknown";

class SignatureImporter extends React.Component {
  titleRef = React.createRef();

  constructor(props) {
    super(props);
    this.state = {
      disableChangeMethod: false,
    };
  }

  componentDidMount = () => {
    this.resetBIP32Path();
    this.scrollToTitle();
  };

  componentDidUpdate = () => {
    this.scrollToTitle();
  };

  getCurrent() {
    const { signatureImporters } = this.props;
    return Object.keys(signatureImporters).reduce((o, k) => {
      return o + (signatureImporters[k].finalized ? 1 : 0);
    }, 1);
  }

  title = () => {
    const { number, signatureImporter, setName } = this.props;
    return (
      <EditableName
        number={number}
        name={signatureImporter.name}
        setName={setName}
      />
    );
  };

  scrollToTitle = () => {
    const { number } = this.props;
    if (number === this.getCurrent()) {
      this.titleRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  renderImport = () => {
    const { signatureImporter, number } = this.props;
    const currentNumber = this.getCurrent();
    const notMyTurn = number > currentNumber;
    const { disableChangeMethod } = this.state;
    const labelId = `signature-${number}-importer-select-label`;
    if (notMyTurn) {
      return (
        <p>
          Once you have imported the signature above, you will be able to import
          another signature here.
        </p>
      );
    }

    return (
      <form>
        <FormControl fullWidth>
          <InputLabel id={labelId}>Select Method</InputLabel>

          <Select
            labelId={labelId}
            id={`signature-${number}-importer-select`}
            disabled={disableChangeMethod}
            value={signatureImporter.method}
            onChange={this.handleMethodChange}
          >
            <MenuItem value={UNKNOWN}>{"< Select method >"}</MenuItem>
            <MenuItem value={TREZOR}>Trezor</MenuItem>
            <MenuItem value={LEDGER}>Ledger</MenuItem>
            <MenuItem value={COLDCARD}>Coldcard</MenuItem>
            <MenuItem value={HERMIT}>Hermit</MenuItem>
            <MenuItem value={TEXT}>Enter as text</MenuItem>
          </Select>
        </FormControl>

        {this.renderImportByMethod()}
      </form>
    );
  };

  renderImportByMethod = () => {
    const {
      network,
      signatureImporter,
      signatureImporters,
      inputs,
      inputsTotalSats,
      outputs,
      fee,
      isWallet,
      extendedPublicKeyImporter,
    } = this.props;
    const { method } = signatureImporter;

    if (method === TREZOR || method === LEDGER) {
      return (
        <DirectSignatureImporter
          network={network}
          signatureImporter={signatureImporter}
          signatureImporters={signatureImporters}
          inputs={inputs}
          outputs={outputs}
          inputsTotalSats={inputsTotalSats}
          fee={fee}
          isWallet={isWallet}
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetBIP32Path={this.validateAndSetBIP32Path}
          resetBIP32Path={this.resetBIP32Path}
          defaultBIP32Path={this.defaultBIP32Path()}
          validateAndSetSignature={this.validateAndSetSignature}
          enableChangeMethod={this.enableChangeMethod}
          disableChangeMethod={this.disableChangeMethod}
        />
      );
    }
    if (method === HERMIT) {
      return (
        <HermitSignatureImporter
          network={network}
          signatureImporter={signatureImporter}
          inputs={inputs}
          outputs={outputs}
          inputsTotalSats={inputsTotalSats}
          fee={fee}
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetBIP32Path={this.validateAndSetBIP32Path}
          resetBIP32Path={this.resetBIP32Path}
          defaultBIP32Path={this.defaultBIP32Path()}
          validateAndSetSignature={this.validateAndSetSignature}
          enableChangeMethod={this.enableChangeMethod}
          disableChangeMethod={this.disableChangeMethod}
        />
      );
    }
    if (method === COLDCARD) {
      return (
        <ColdcardSignatureImporter
          network={network}
          signatureImporter={signatureImporter}
          inputs={inputs}
          outputs={outputs}
          inputsTotalSats={inputsTotalSats}
          fee={fee}
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetSignature={this.validateAndSetSignature}
        />
      );
    }
    if (method === TEXT) {
      return (
        <TextSignatureImporter
          signatureImporter={signatureImporter}
          validateAndSetSignature={this.validateAndSetSignature}
        />
      );
    }
    return null;
  };

  //
  // Method
  //

  handleMethodChange = (event) => {
    const { number, setMethod } = this.props;
    setMethod(number, event.target.value);
    this.reset();
  };

  disableChangeMethod = () => {
    this.setState({ disableChangeMethod: true });
  };

  enableChangeMethod = () => {
    this.setState({ disableChangeMethod: false });
  };

  //
  // State
  //

  reset = () => {
    const { number, setSignature, setPublicKeys, setFinalized } = this.props;
    setSignature(number, "");
    setPublicKeys(number, []);
    setFinalized(number, false);
  };

  //
  // BIP32 Path
  //

  defaultBIP32Path = () => {
    const { addressType, network, isWallet } = this.props;
    return isWallet
      ? multisigBIP32Root(addressType, network)
      : multisigBIP32Path(addressType, network);
  };

  resetBIP32Path = () => {
    const { number, setBIP32Path, isWallet } = this.props;
    if (isWallet) {
      const { extendedPublicKeyImporter } = this.props;
      if (extendedPublicKeyImporter.method !== "text") return;
    }
    setBIP32Path(number, this.defaultBIP32Path());
  };

  validateAndSetBIP32Path = (bip32Path, callback, errback, options) => {
    const { number, setBIP32Path } = this.props;
    const error = validateBIP32Path(bip32Path, options);
    setBIP32Path(number, bip32Path);
    if (error) {
      errback(error);
    } else {
      errback("");
      callback();
    }
  };

  //
  // Signature
  //

  renderSignature = () => {
    const { signatureImporter, txid } = this.props;
    const signatureJSON = JSON.stringify(signatureImporter.signature);
    return (
      <div>
        <p>The following signature was imported:</p>
        <Box>
          <Copyable text={signatureJSON} showIcon code />
        </Box>
        <Box mt={2}>
          <Button
            variant="contained"
            color="secondary"
            disabled={txid !== ""}
            size="small"
            onClick={this.reset}
          >
            Remove Signature
          </Button>
        </Box>
      </div>
    );
  };

  validateAndSetSignature = (inputsSignatures, errback) => {
    const {
      number,
      inputs,
      signatureImporters,
      setComplete,
      network,
      outputs,
      // setMethod,
      // setSigningKey,
    } = this.props;
    if (!Array.isArray(inputsSignatures)) {
      errback("Signature is not an array of strings.");
      return;
    }

    if (inputsSignatures.length < inputs.length) {
      errback("Not enough signatures (must be exactly one for each input).");
      return;
    }

    if (inputsSignatures.length % inputs.length !== 0) {
      errback(
        "Not the right number of signatures (must be exactly one for each input)."
      );
    }

    const numSignatureSets = inputsSignatures.length / inputs.length;

    const publicKeys = [];
    if (numSignatureSets === 1) {
      const finalizedSignatureImporters = Object.values(
        signatureImporters
      ).filter((signatureImporter) => signatureImporter.finalized);
      for (
        let inputIndex = 0;
        inputIndex < inputsSignatures.length;
        inputIndex += 1
      ) {
        const inputNumber = inputIndex + 1;
        const inputSignature = inputsSignatures[inputIndex];
        if (validateHex(inputSignature) !== "") {
          errback(`Signature for input ${inputNumber} is not valid hex.`);
          return;
        }

        let publicKey;
        try {
          publicKey = validateMultisigSignature(
            network,
            inputs,
            outputs,
            inputIndex,
            inputSignature
          );
        } catch (e) {
          errback(`Signature for input ${inputNumber} is invalid.`);
          return;
        }
        if (publicKey) {
          for (
            let finalizedSignatureImporterNum = 0;
            finalizedSignatureImporterNum < finalizedSignatureImporters.length;
            finalizedSignatureImporterNum += 1
          ) {
            const finalizedSignatureImporter =
              finalizedSignatureImporters[finalizedSignatureImporterNum];

            if (
              finalizedSignatureImporter.signature[inputIndex] ===
                inputSignature ||
              finalizedSignatureImporter.publicKeys[inputIndex] === publicKey
            ) {
              errback(
                `Signature for input ${inputNumber} is a duplicate of a previously provided signature.`
              );
              return;
            }
          }
          publicKeys.push(publicKey);
        } else {
          errback(`Signature for input ${inputNumber} is invalid.`);
          return;
        }
      }
      setComplete(number, {
        signature: inputsSignatures,
        publicKeys,
        finalized: true,
      });
    } else {
      // We land here if a PSBT has been uploaded with multiple signature sets.
      // In case we already have some signatures, filter those out.
      let signaturesToCheck = this.filterKnownSignatures(inputsSignatures);
      let sigNumber = number; // so we can iterate, number is a const from props.
      // At this point, either we have a multiple for sets of signatures for this
      // transaction or we have filtered the signatures down to potentially a
      // single set of signatures.
      while (
        sigNumber <= Object.keys(signatureImporters).length &&
        signaturesToCheck.length > 0
      ) {
        // setSigningKey(sigNumber, sigNumber - 1);
        // setMethod(sigNumber, COLDCARD);
        let sigsToCheckThisRound = [];
        // Loop over inputs and check sigs to see if you can find public keys.
        // NOTE - signaturesToCheck.length could be much larger than inputs.length
        // which is why the loop is over inputs.length
        for (let inputIndex = 0; inputIndex < inputs.length; inputIndex += 1) {
          const inputNumber = inputIndex + 1;
          const inputSignature = signaturesToCheck[inputIndex];
          sigsToCheckThisRound.push(inputSignature);
          if (validateHex(inputSignature) !== "") {
            errback(`Signature for input ${inputNumber} is not valid hex.`);
            return;
          }

          let publicKey;
          try {
            publicKey = validateMultisigSignature(
              network,
              inputs,
              outputs,
              inputIndex,
              inputSignature
            );
          } catch (e) {
            console.error(e);
            errback(`Signature for input ${inputNumber} is invalid.`);
            return;
          }
          if (publicKey) {
            publicKeys.push(publicKey);
          } else {
            errback(`Signature for input ${inputNumber} is invalid.`);
            return;
          }
        }
        // Set the number we're on (probably 1) to Complete and include pubkeys/signatures
        setComplete(sigNumber, {
          signature: sigsToCheckThisRound,
          publicKeys,
          finalized: true,
        });
        // Send signatures to this method again, since now some of them are marked
        // as finalized, and they will be filtered out.
        signaturesToCheck = this.filterKnownSignatures(inputsSignatures);
        // increment which signature number we're working on next.
        sigNumber += 1;
      }
    }
  };

  filterKnownSignatures = (inputsSignatures) => {
    const { inputs, signatureImporters } = this.props;
    const finalizedSignatureImporters = Object.values(
      signatureImporters
    ).filter((signatureImporter) => signatureImporter.finalized);
    const knownSignatures = [];
    for (let inputIndex = 0; inputIndex < inputs.length; inputIndex += 1) {
      for (
        let finalizedSignatureImporterNum = 0;
        finalizedSignatureImporterNum < finalizedSignatureImporters.length;
        finalizedSignatureImporterNum += 1
      ) {
        const finalizedSignatureImporter =
          finalizedSignatureImporters[finalizedSignatureImporterNum];

        knownSignatures.push(finalizedSignatureImporter.signature[inputIndex]);
      }
    }
    // diff out any signature we've seen before
    return inputsSignatures.filter((x) => !knownSignatures.includes(x));
  };

  render() {
    const { signatureImporter } = this.props;
    return (
      <Card>
        <CardHeader title={this.title()} ref={this.titleRef} />
        <CardContent>
          {signatureImporter.finalized
            ? this.renderSignature()
            : this.renderImport()}
        </CardContent>
      </Card>
    );
  }
}

SignatureImporter.propTypes = {
  addressType: PropTypes.string.isRequired,
  extendedPublicKeyImporter: PropTypes.shape({
    method: PropTypes.string,
  }).isRequired,
  fee: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  isWallet: PropTypes.bool.isRequired,
  network: PropTypes.string.isRequired,
  number: PropTypes.number.isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  setName: PropTypes.func.isRequired,
  setMethod: PropTypes.func.isRequired,
  setBIP32Path: PropTypes.func.isRequired,
  setSignature: PropTypes.func.isRequired,
  setPublicKeys: PropTypes.func.isRequired,
  setFinalized: PropTypes.func.isRequired,
  setComplete: PropTypes.func.isRequired,
  signatureImporter: PropTypes.shape({
    finalized: PropTypes.bool,
    name: PropTypes.string,
    method: PropTypes.string,
    signature: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
  }).isRequired,
  signatureImporters: PropTypes.shape({}).isRequired,
  txid: PropTypes.string.isRequired,
  unsignedTransaction: PropTypes.shape({}).isRequired,
};

function mapStateToProps(state, ownProps) {
  return {
    ...{
      signatureImporters: state.spend.signatureImporters,
      signatureImporter: state.spend.signatureImporters[ownProps.number],
      fee: state.spend.transaction.fee,
      txid: state.spend.transaction.txid,
    },
    ...state.spend.transaction,
  };
}

const mapDispatchToProps = {
  setName: setSignatureImporterName,
  setMethod: setSignatureImporterMethod,
  setBIP32Path: setSignatureImporterBIP32Path,
  setPublicKeys: setSignatureImporterPublicKeys,
  setSignature: setSignatureImporterSignature,
  setFinalized: setSignatureImporterFinalized,
  setComplete: setSignatureImporterComplete,
  setSigningKey: setSigningKeyAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(SignatureImporter);

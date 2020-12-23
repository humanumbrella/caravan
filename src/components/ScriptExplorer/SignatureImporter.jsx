import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  validateHex,
  validateMultisigSignature,
  multisigBIP32Path,
  multisigBIP32Root,
  validateBIP32Path,
  toHexString,
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
import HermitSignatureImporter from "../Hermit/HermitSignatureImporter";
import ColdcardSignatureImporter from "../Coldcard/ColdcardSignatureImporter";
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

const TEXT = "text";
const UNKNOWN = "unknown";

class SignatureImporter extends React.Component {
  titleRef = React.createRef();

  constructor(props) {
    super(props);
    this.state = {
      disableChangeMethod: false,
      signatureOrder: [],
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
    const { signatureImporter, number, isWallet } = this.props;
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
            <MenuItem value={COLDCARD} disabled={!isWallet}>
              Coldcard
            </MenuItem>
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
      if (
        extendedPublicKeyImporter &&
        extendedPublicKeyImporter.method !== "text"
      )
        return;
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
        <p>The following signature set was imported:</p>
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
            Remove Signature Set
          </Button>
        </Box>
      </div>
    );
  };

  // The signatures are all from the same root fingerprint, but are not guaranteed to be in the right order.
  // NOTE: whereas `validateSignatureSet` only modifies the set of publicKeys - this one modifies the signatureSet as well
  // because the signature set should be ordered the same as the publicKeys.
  validateUnorderedSignatureSet = (
    inputsSignatures,
    publicKeys,
    signaturesArray,
    errback
  ) => {
    const { inputs, network, outputs } = this.props;
    const { signatureOrder } = this.state;

    const remainingSignatures = [...inputsSignatures];
    const signatureInProperOrder = new Array(inputs.length);
    const foundInputs = [];
    while (remainingSignatures.length) {
      // Grab the first signature
      const inputSignature = remainingSignatures[0];
      if (validateHex(inputSignature) !== "") {
        errback(`Signature is not valid hex.`);
        return;
      }
      let publicKey = "";
      let foundPubkey = false;
      if (
        signatureOrder.length &&
        signatureOrder.length === inputsSignatures.length
      ) {
        let sigIndex;
        // we've already been through this ... re-use that same order
        for (let j = 0; j < inputs.length; j += 1) {
          sigIndex = signatureOrder.indexOf(j);
          try {
            publicKey = validateMultisigSignature(
              network,
              inputs,
              outputs,
              j,
              inputsSignatures[sigIndex]
            );
          } catch (e) {
            errback(`Error processing signature for input ${j + 1}.`);
            return;
          }
          if (publicKey) {
            publicKeys.push(publicKey);
            signatureInProperOrder[j] = inputsSignatures[sigIndex];
          }
        }
        signatureInProperOrder.forEach((sig) => signaturesArray.push(sig));
        return;
      }
      // Find which input it's for ...
      for (let j = 0; j < inputs.length; j += 1) {
        if (!foundInputs.includes(j)) {
          try {
            publicKey = validateMultisigSignature(
              network,
              inputs,
              outputs,
              j,
              inputSignature
            );
          } catch (e) {
            errback(`Error processing signature for input ${j + 1}.`);
            return;
          }
          if (publicKey) {
            publicKeys.push(publicKey);
            signatureInProperOrder[j] = inputSignature;
            foundInputs.push(j);
            foundPubkey = true;
            const indexToRemove = remainingSignatures.indexOf(inputSignature);
            remainingSignatures.splice(indexToRemove, 1);
            break;
          }
        }
      }
      if (!foundPubkey) {
        errback(`PSBT signature for input is invalid.`);
        return;
      }
    }
    // We found that the signatures were in another order, so set the array and
    // save the order.
    if (signatureInProperOrder !== inputsSignatures) {
      signatureInProperOrder.forEach((sig) => signaturesArray.push(sig));
      this.setState({ signatureOrder: [...foundInputs] });
    }
  };

  validateSignatureSet = (
    finalizedSignatureImporters,
    inputsSignatures,
    publicKeys,
    signaturesArray,
    errback,
    fromPSBT
  ) => {
    const { inputs, network, outputs } = this.props;

    // The signatures are all from the same root fingerprint, but are not guaranteed to be in the right order.
    if (fromPSBT) {
      this.validateUnorderedSignatureSet(
        inputsSignatures,
        publicKeys,
        signaturesArray,
        errback
      );
    } else {
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
          errback(`Error processing signature for input ${inputNumber}.`);
          return;
        }
        if (publicKey) {
          for (let j = 0; j < finalizedSignatureImporters.length; j += 1) {
            const finalizedSignatureImporter = finalizedSignatureImporters[j];

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
    }
  };

  validateAndSetSignature = (
    inputsSignatures,
    errback,
    psbtSignatureObject
  ) => {
    const { number, inputs, signatureImporters, setComplete } = this.props;
    if (!Array.isArray(inputsSignatures)) {
      errback("Signature is not an array of strings.");
      return;
    }

    if (inputsSignatures.length < inputs.length) {
      errback(
        "Not enough signatures (must be at least one signature for each input)."
      );
      return;
    }

    if (inputsSignatures.length % inputs.length !== 0) {
      errback("Number of signatures must be a multiple of number of inputs.");
      return;
    }

    const numSignatureSets = inputsSignatures.length / inputs.length;

    if (numSignatureSets > Object.values(signatureImporters).length) {
      errback(
        "Too many signatures. Max one set of signatures per required signer."
      );
      return;
    }
    let publicKeyArray = [];
    let signaturesArray = [];
    let finSigImporters = Object.values(signatureImporters).filter(
      (signatureImporter) => signatureImporter.finalized
    );
    if (numSignatureSets === 1) {
      this.validateSignatureSet(
        finSigImporters,
        inputsSignatures,
        publicKeyArray,
        signaturesArray,
        errback,
        psbtSignatureObject !== undefined
      );
      if (publicKeyArray.length) {
        setComplete(number, {
          signature: signaturesArray.length
            ? signaturesArray
            : inputsSignatures,
          publicKeys: publicKeyArray,
          finalized: true,
        });
      }
    } else {
      // We land here if a PSBT has been uploaded with multiple signature sets.
      // In case we already have some signatures saved, e.g. first a singly-signed
      // PSBT was uploaded, and now a doubly-signed PSBT was uploaded, filter out
      // the known signatures.
      let signaturesToCheck;
      let signatureSetNumber = number; // so we can iterate, number is a const from props.

      // First let's construct a matrix of fingerprint : [pubkey(s)]
      const matrix = {};
      inputs.forEach((input) =>
        input.multisig.bip32Derivation.forEach((b32d) => {
          const rootFingerprint = toHexString(b32d.masterFingerprint);
          const pubkey = toHexString(b32d.pubkey);
          if (Object.keys(matrix).includes(rootFingerprint)) {
            if (matrix[rootFingerprint].indexOf(pubkey) === -1) {
              matrix[rootFingerprint].push(pubkey);
            }
          } else {
            matrix[rootFingerprint] = [pubkey];
          }
        })
      );

      // Now create an array of fingerprint-ordered signatures (within a fingerprint they, at present (unfortunately),
      // still might not be in the same order as the inputs ... that check will come later)
      const xfpOrderedSignaturesToCheck = [];
      const xfpArray = Object.keys(matrix);
      for (let i = 0; i < xfpArray.length; i += 1) {
        if (matrix[xfpArray[i]].some((pk) => pk in psbtSignatureObject)) {
          matrix[xfpArray[i]].forEach((pk) => {
            return xfpOrderedSignaturesToCheck.push(...psbtSignatureObject[pk]);
          });
        }
      }
      signaturesToCheck = this.filterKnownSignatures([
        ...xfpOrderedSignaturesToCheck,
      ]);

      while (
        signatureSetNumber <= Object.keys(signatureImporters).length &&
        signaturesToCheck.length > 0
      ) {
        publicKeyArray = [];
        signaturesArray = [];
        const signatureSet = signaturesToCheck.slice(0, inputs.length);
        finSigImporters = Object.values(signatureImporters).filter(
          (signatureImporter) => signatureImporter.finalized
        );

        this.validateSignatureSet(
          finSigImporters,
          signatureSet,
          publicKeyArray,
          signaturesArray,
          errback,
          true
        );
        if (publicKeyArray.length) {
          setComplete(signatureSetNumber, {
            signature: signaturesArray.length ? signaturesArray : signatureSet,
            publicKeys: publicKeyArray,
            finalized: true,
          });
          signaturesToCheck = signaturesToCheck.slice(inputs.length);
          signatureSetNumber += 1;
        } else {
          errback("Could not validate signatures.");
          return;
        }
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
  }),
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

SignatureImporter.defaultProps = {
  extendedPublicKeyImporter: {},
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
};

export default connect(mapStateToProps, mapDispatchToProps)(SignatureImporter);

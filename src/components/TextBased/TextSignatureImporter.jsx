import React from "react";
import PropTypes from "prop-types";
import IndirectSignatureImporter from "../ScriptExplorer/IndirectSignatureImporter";
import TextBasedSigner from "./TextBasedSigner";

class TextSignatureImporter extends React.Component {
  render = () => {
    const {
      signatureImporter,
      extendedPublicKeyImporter,
      inputs,
      outputs,
      inputsTotalSats,
      fee,
      validateAndSetSignature,
      network,
    } = this.props;
    return (
      <IndirectSignatureImporter
        network={network}
        signatureImporter={signatureImporter}
        inputs={inputs}
        outputs={outputs}
        inputsTotalSats={inputsTotalSats}
        fee={fee}
        extendedPublicKeyImporter={extendedPublicKeyImporter}
        validateAndSetSignature={validateAndSetSignature}
        Signer={TextBasedSigner}
      />
    );
  };
}

TextSignatureImporter.propTypes = {
  network: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  signatureImporter: PropTypes.shape({
    bip32Path: PropTypes.string,
  }).isRequired,
  validateAndSetSignature: PropTypes.func.isRequired,
};

export default TextSignatureImporter;

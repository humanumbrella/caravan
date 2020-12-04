import React from "react";
import PropTypes from "prop-types";
import { COLDCARD } from "unchained-wallets";
import { FormGroup, FormHelperText } from "@material-ui/core";
import { ColdcardJSONReader } from "../Coldcard";
import { MAINNET } from "unchained-bitcoin";
import IndirectExtendedPublicKeyImporter from "../Wallet/IndirectExtendedPublicKeyImporter";

class ColdcardExtendedPublicKeyImporter extends React.Component {
  constructor(props) {
    super(props);
    const { network } = props;
    const coinPath = network === MAINNET ? "0" : "1";
    this.state = {
      COLDCARD_MULTISIG_BIP32_PATH: `m/45'/${coinPath}/0`,
    };
  }

  componentDidMount = () => {
    const { extendedPublicKeyImporter, validateAndSetBIP32Path } = this.props;
    const { COLDCARD_MULTISIG_BIP32_PATH } = this.state;
    if (extendedPublicKeyImporter.method === COLDCARD) {
      validateAndSetBIP32Path(
        COLDCARD_MULTISIG_BIP32_PATH,
        () => {},
        () => {},
        {}
      );
    }
  };

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { validateAndSetBIP32Path, network } = this.props;
    const coinPath = network === MAINNET ? "0" : "1";
    const pathUpdate = `m/45'/${coinPath}/0`;
    if (prevProps.network !== network) {
      this.setState({ COLDCARD_MULTISIG_BIP32_PATH: pathUpdate });
      validateAndSetBIP32Path(
        pathUpdate,
        () => {},
        () => {}
      );
    }
  }

  render = () => {
    const {
      extendedPublicKeyImporter,
      validateAndSetExtendedPublicKey,
      validateAndSetBIP32Path,
      validateAndSetRootFingerprint,
      addressType,
      network,
    } = this.props;
    const { extendedPublicKeyError, COLDCARD_MULTISIG_BIP32_PATH } = this.state;
    return (
      <FormGroup>
        <IndirectExtendedPublicKeyImporter
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetExtendedPublicKey={validateAndSetExtendedPublicKey}
          validateAndSetBIP32Path={validateAndSetBIP32Path}
          validateAndSetRootFingerprint={validateAndSetRootFingerprint}
          addressType={addressType}
          network={network}
          resetBIP32Path={this.resetColdcardBIP32Path}
          defaultBIP32Path={COLDCARD_MULTISIG_BIP32_PATH}
          Reader={ColdcardJSONReader}
        />
        <FormHelperText error>{extendedPublicKeyError}</FormHelperText>
      </FormGroup>
    );
  };

  resetColdcardBIP32Path = () => {
    const { validateAndSetBIP32Path } = this.props;
    const { COLDCARD_MULTISIG_BIP32_PATH } = this.state;
    validateAndSetBIP32Path(
      COLDCARD_MULTISIG_BIP32_PATH,
      () => {},
      () => {}
    );
  };
}

ColdcardExtendedPublicKeyImporter.propTypes = {
  extendedPublicKeyImporter: PropTypes.shape({
    method: PropTypes.string,
    bip32Path: PropTypes.string,
  }).isRequired,
  network: PropTypes.string.isRequired,
  validateAndSetBIP32Path: PropTypes.func.isRequired,
  validateAndSetExtendedPublicKey: PropTypes.func.isRequired,
  validateAndSetRootFingerprint: PropTypes.func.isRequired,
};

export default ColdcardExtendedPublicKeyImporter;

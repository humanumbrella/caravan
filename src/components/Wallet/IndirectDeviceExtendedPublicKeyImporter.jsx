import React from "react";
import PropTypes from "prop-types";
import {
  ERROR,
  ExportExtendedPublicKey,
  COLDCARD,
  HERMIT,
  PENDING,
  UNSUPPORTED,
} from "unchained-wallets";
import {
  Button,
  FormGroup,
  FormHelperText,
  Grid,
  TextField,
} from "@material-ui/core";
import HermitReader from "../Hermit/HermitReader";
import InteractionMessages from "../InteractionMessages";
import { ColdcardJSONReader } from "../Coldcard";
import { MAINNET } from "unchained-bitcoin";

class IndirectDeviceExtendedPublicKeyImporter extends React.Component {
  constructor(props) {
    super(props);
    const { network } = props;
    const coinPath = network === MAINNET ? "0" : "1";
    this.state = {
      extendedPublicKeyError: "",
      bip32PathError: "",
      status: this.interaction().isSupported() ? PENDING : UNSUPPORTED,
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
        this.setBIP32PathError,
        {}
      );
    }
  };

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { validateAndSetBIP32Path, network } = this.props;
    const { status } = this.state;
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
    if (status !== PENDING && this.interaction().isSupported()) {
      this.setState({ status: PENDING });
    }
  }

  interaction = () => {
    const { network, extendedPublicKeyImporter } = this.props;
    return new ExportExtendedPublicKey({
      keystore: extendedPublicKeyImporter.method,
      bip32Path: extendedPublicKeyImporter.bip32Path,
      network,
      includeXFP: true,
    });
  };

  renderColdcardSection = () => {
    const { disableChangeMethod, extendedPublicKeyImporter } = this.props;
    const { status } = this.state;
    const interaction = this.interaction();

    return (
      <Grid container>
        <Grid item md={6}>
          <TextField
            fullWidth
            label="BIP32 Path"
            value={extendedPublicKeyImporter.bip32Path}
            onChange={this.handleBIP32PathChange}
            disabled={status !== PENDING}
            error={this.hasBIP32PathError()}
            helperText={this.bip32PathError()}
          />
        </Grid>
        <Grid item md={6}>
          {!this.bip32PathIsDefault(true) && (
            <Button
              type="button"
              variant="contained"
              size="small"
              onClick={this.resetColdcardBIP32Path}
              disabled={status !== PENDING}
            >
              Default
            </Button>
          )}
        </Grid>
        <FormHelperText>
          Use the default value if you don&rsquo;t understand BIP32 paths.
        </FormHelperText>
        <ColdcardJSONReader
          interaction={interaction}
          onStart={disableChangeMethod}
          onSuccess={this.import}
          setError={this.setError}
          fileType="JSON"
          validFileFormats=".json"
        />
        <InteractionMessages
          messages={interaction.messagesFor({ state: status })}
          excludeCodes={["bip32"]}
        />
      </Grid>
    );
  };

  render = () => {
    const { disableChangeMethod, extendedPublicKeyImporter } = this.props;
    const { extendedPublicKeyError } = this.state;
    const interaction = this.interaction();
    return (
      <FormGroup>
        {extendedPublicKeyImporter.method === HERMIT ? (
          <HermitReader
            startText="Import Extended Public Key"
            interaction={interaction}
            onStart={disableChangeMethod}
            onSuccess={this.import}
            onClear={this.onClear}
          />
        ) : (
          this.renderColdcardSection()
        )}
        <FormHelperText className="text-danger">
          {extendedPublicKeyError}
        </FormHelperText>
      </FormGroup>
    );
  };

  hasBIP32PathError = () => {
    const { bip32PathError, status } = this.state;
    return (
      bip32PathError !== "" ||
      this.interaction().hasMessagesFor({
        state: status,
        level: ERROR,
        code: "bip32",
      })
    );
  };

  bip32PathError = () => {
    const { bip32PathError, status } = this.state;
    if (bip32PathError !== "") {
      return bip32PathError;
    }
    return this.interaction().messageTextFor({
      state: status,
      level: ERROR,
      code: "bip32",
    });
  };

  setBIP32PathError = (value) => {
    this.setState({ bip32PathError: value });
  };

  handleBIP32PathChange = (event) => {
    const { validateAndSetBIP32Path } = this.props;
    const bip32Path = event.target.value;
    validateAndSetBIP32Path(bip32Path, () => {}, this.setBIP32PathError);
  };

  bip32PathIsDefault = (coldcard) => {
    const { extendedPublicKeyImporter, defaultBIP32Path } = this.props;
    const { COLDCARD_MULTISIG_BIP32_PATH } = this.state;
    return coldcard
      ? extendedPublicKeyImporter.bip32Path === COLDCARD_MULTISIG_BIP32_PATH
      : extendedPublicKeyImporter.bip32Path === defaultBIP32Path;
  };

  resetBIP32Path = () => {
    const { resetBIP32Path } = this.props;
    this.setBIP32PathError("");
    resetBIP32Path();
  };

  resetColdcardBIP32Path = () => {
    const { validateAndSetBIP32Path } = this.props;
    const { COLDCARD_MULTISIG_BIP32_PATH } = this.state;
    this.setBIP32PathError("");
    validateAndSetBIP32Path(
      COLDCARD_MULTISIG_BIP32_PATH,
      () => {},
      () => {}
    );
  };

  setError = (value) => {
    this.setState({ extendedPublicKeyError: value });
  };

  import = (data) => {
    const {
      validateAndSetBIP32Path,
      validateAndSetExtendedPublicKey,
      validateAndSetRootFingerprint,
      enableChangeMethod,
    } = this.props;
    enableChangeMethod();
    try {
      const { xpub, bip32Path, rootFingerprint } = this.interaction().parse(
        data
      );
      validateAndSetRootFingerprint(rootFingerprint, this.setError);
      validateAndSetBIP32Path(
        bip32Path,
        () => {
          validateAndSetExtendedPublicKey(xpub, this.setError);
        },
        this.setError
      );
    } catch (e) {
      this.setError(e.message);
    }
  };

  onClear = () => {
    const { reset, enableChangeMethod } = this.props;
    reset(true); // clear BIP32 path
    this.setError("");
    enableChangeMethod();
  };
}

IndirectDeviceExtendedPublicKeyImporter.propTypes = {
  enableChangeMethod: PropTypes.func.isRequired,
  extendedPublicKeyImporter: PropTypes.shape({
    method: PropTypes.string,
    bip32Path: PropTypes.string,
  }).isRequired,
  disableChangeMethod: PropTypes.func.isRequired,
  network: PropTypes.string.isRequired,
  reset: PropTypes.func.isRequired,
  defaultBIP32Path: PropTypes.string.isRequired,
  resetBIP32Path: PropTypes.func.isRequired,
  validateAndSetBIP32Path: PropTypes.func.isRequired,
  validateAndSetExtendedPublicKey: PropTypes.func.isRequired,
  validateAndSetRootFingerprint: PropTypes.func.isRequired,
};

export default IndirectDeviceExtendedPublicKeyImporter;

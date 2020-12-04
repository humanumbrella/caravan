import React from "react";
import PropTypes from "prop-types";
import {
  ERROR,
  ExportExtendedPublicKey,
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
import InteractionMessages from "../InteractionMessages";

class IndirectExtendedPublicKeyImporter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      extendedPublicKeyError: "",
      status: this.interaction().isSupported() ? PENDING : UNSUPPORTED,
    };
  }

  // The extendedPublicKeyImporter has a "default" root multisig bip32path
  // which does not work on Coldcard, so the status will be UNSUPPORTED.
  // this gets updated almost immediately, so just fire off another isSupported()
  // to check if we're good.
  componentDidUpdate(prevProps, prevState, snapshot) {
    const { status } = this.state;
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

  render = () => {
    const {
      Reader,
      disableChangeMethod,
      extendedPublicKeyImporter,
      resetBIP32Path,
    } = this.props;
    const { status, extendedPublicKeyError } = this.state;
    return (
      <FormGroup>
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
                onClick={resetBIP32Path}
                disabled={status !== PENDING}
              >
                Default
              </Button>
            )}
          </Grid>
          <FormHelperText>
            Use the default value if you don&rsquo;t understand BIP32 paths.
          </FormHelperText>
          <Reader
            setError={this.setError}
            hasError={this.hasBIP32PathError()}
            onReceive={this.onReceive}
            interaction={this.interaction()}
            disableChangeMethod={disableChangeMethod}
            extendedPublicKeyImporter={extendedPublicKeyImporter}
          />

          <InteractionMessages
            messages={this.interaction().messagesFor({ state: status })}
          />
        </Grid>
        <FormHelperText error>{extendedPublicKeyError}</FormHelperText>
      </FormGroup>
    );
  };

  hasBIP32PathError = () => {
    const { status } = this.state;
    return this.interaction().hasMessagesFor({
      state: status,
      level: ERROR,
      code: "bip32",
    });
  };

  bip32PathError = () => {
    const { status } = this.state;
    return this.interaction().messageTextFor({
      state: status,
      level: ERROR,
      code: "bip32",
    });
  };

  handleBIP32PathChange = (event) => {
    const { validateAndSetBIP32Path } = this.props;
    const bip32Path = event.target.value;
    validateAndSetBIP32Path(
      bip32Path,
      () => {},
      () => {}
    );
  };

  bip32PathIsDefault = () => {
    const { extendedPublicKeyImporter, defaultBIP32Path } = this.props;
    return extendedPublicKeyImporter.bip32Path === defaultBIP32Path;
  };

  resetBIP32Path = () => {
    const { resetBIP32Path } = this.props;
    resetBIP32Path();
  };

  setError = (value) => {
    this.setState({ extendedPublicKeyError: value });
  };

  onReceive = (data) => {
    const {
      validateAndSetBIP32Path,
      validateAndSetExtendedPublicKey,
      validateAndSetRootFingerprint,
      enableChangeMethod,
    } = this.props;
    if (enableChangeMethod) {
      enableChangeMethod();
    }
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
}

IndirectExtendedPublicKeyImporter.propTypes = {
  enableChangeMethod: PropTypes.func,
  extendedPublicKeyImporter: PropTypes.shape({
    method: PropTypes.string,
    bip32Path: PropTypes.string,
  }).isRequired,
  disableChangeMethod: PropTypes.func,
  network: PropTypes.string.isRequired,
  reset: PropTypes.func,
  defaultBIP32Path: PropTypes.string.isRequired,
  resetBIP32Path: PropTypes.func.isRequired,
  validateAndSetBIP32Path: PropTypes.func.isRequired,
  validateAndSetExtendedPublicKey: PropTypes.func.isRequired,
  validateAndSetRootFingerprint: PropTypes.func.isRequired,
};

export default IndirectExtendedPublicKeyImporter;

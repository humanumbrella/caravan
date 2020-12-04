import React, { Component } from "react";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";
import {
  Grid,
  Box,
  TextField,
  Button,
  FormHelperText,
} from "@material-ui/core";
import { CloudUpload as UploadIcon } from "@material-ui/icons";
import styles from "./ColdcardFileReader.module.scss";

class ColdcardFileReaderBase extends Component {
  static propTypes = {
    onReceive: PropTypes.func,
    onReceivePSBT: PropTypes.func,
    setError: PropTypes.func,
  };

  static defaultProps = {
    maxFileSize: 1048576, // 1MB
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      fileType: props.fileType || "JSON",
      acceptedFiles: [],
      rejectedFiles: [],
    };
  }

  render = () => {
    const {
      maxFileSize,
      validFileFormats,
      extendedPublicKeyImporter,
      handleBIP32PathChange,
      resetBIP32Path,
      bip32PathIsDefault,
      hasError,
      errorMessage,
      isTest,
    } = this.props;
    const { fileType } = this.state;
    return (
      <Grid container direction="column">
        {fileType === "JSON" && !isTest && (
          <Grid container>
            <Grid item md={6}>
              <TextField
                label="BIP32 Path"
                value={extendedPublicKeyImporter.bip32Path}
                onChange={handleBIP32PathChange}
                error={hasError}
                helperText={errorMessage}
              />
            </Grid>
            <Grid item md={6}>
              {!bip32PathIsDefault() && (
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  onClick={resetBIP32Path}
                >
                  Default
                </Button>
              )}
            </Grid>
            <FormHelperText>
              Use the default value if you don&rsquo;t understand BIP32 paths.
            </FormHelperText>
          </Grid>
        )}
        <p>
          When you are ready, upload the {fileType} file from your Coldcard:
        </p>
        <Box>
          <Dropzone
            className={hasError ? styles.dropzoneDull : styles.dropzone}
            onDrop={this.onDrop}
            multiple={false}
            minSize={1}
            maxSize={maxFileSize}
            accept={validFileFormats}
            disableClick={hasError}
          >
            <UploadIcon classes={{ root: styles.uploadIcon }} />
            <p className={styles.instruction}>
              {fileType === "JSON" ? "Upload The XPUB" : "Upload Signed PSBT"}
            </p>
          </Dropzone>
        </Box>
      </Grid>
    );
  };

  singleAcceptedFile = (acceptedFiles, rejectedFiles) => {
    return rejectedFiles.length === 0 && acceptedFiles.length === 1;
  };

  onDrop = (acceptedFiles, rejectedFiles) => {
    const { onReceive, onReceivePSBT, setError, hasError } = this.props;
    const { fileType } = this.state;
    const stateUpdate = { acceptedFiles, rejectedFiles };
    if (hasError) return; // do not continue if the bip32path is invalid
    if (this.singleAcceptedFile(acceptedFiles, rejectedFiles)) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        fileType === "JSON"
          ? onReceive(reader.result)
          : onReceivePSBT(reader.result);
      };
      this.setState(stateUpdate, () => reader.readAsText(file));
    } else {
      if (rejectedFiles.length === 1) {
        setError(
          `The file you attempted to upload was unacceptable. File type must be .${fileType.toLowerCase()}.`
        );
      } else if (rejectedFiles.length > 1) {
        setError(`This dropzone only accepts a single file.`);
      }
      this.setState(stateUpdate);
    }
  };
}

export class ColdcardJSONReader extends ColdcardFileReaderBase {
  static defaultProps = {
    fileType: "JSON",
    validFileFormats: ".json",
  };
}

export class ColdcardPSBTReader extends ColdcardFileReaderBase {
  static defaultProps = {
    fileType: "PSBT",
    validFileFormats: ".psbt",
  };
}

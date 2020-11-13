import React, { Component } from "react";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";
import { PENDING, ACTIVE } from "unchained-wallets";
import { Grid, Button, Box, FormHelperText } from "@material-ui/core";
import { CloudUpload as UploadIcon } from "@material-ui/icons";
import styles from "./ColdcardFileReader.module.scss";

class ColdcardFileReaderBase extends Component {
  static propTypes = {
    onStart: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    interaction: PropTypes.shape({
      messagesFor: PropTypes.func,
      parse: PropTypes.func,
    }).isRequired,
    maxFileSize: PropTypes.number,
    validFileFormats: PropTypes.string.isRequired,
  };

  static defaultProps = {
    maxFileSize: 2097152, // 2MB
  };

  constructor(props) {
    super(props);
    this.state = {
      status: PENDING,
      error: "",
      selectedFile: null,
      fileType: props.fileType || "JSON",
      acceptedFiles: [],
      rejectedFiles: [],
    };
  }

  render = () => {
    const { status, error, fileType, rejectedFiles } = this.state;
    const { maxFileSize, validFileFormats } = this.props;

    if (status === PENDING) {
      return (
        <div>
          <p>When you are ready, upload the JSON file from your Coldcard:</p>
          <Box>
            <Dropzone
              className={styles.dropzone}
              onDrop={this.onDrop}
              multiple={false}
              minSize={1}
              maxSize={maxFileSize}
              accept={validFileFormats}
            >
              <UploadIcon classes={{ root: styles.uploadIcon }} />
              <p className={styles.instruction}>
                {fileType === "JSON" ? "Upload The XPUB" : "Upload Signed PSBT"}
              </p>
            </Dropzone>

            {rejectedFiles.length > 0 && (
              <div className="has-danger invalid-feedback">
                <p>The file you attempted to upload was unacceptable.</p>
              </div>
            )}
          </Box>
        </div>
      );
    }

    if (status === ACTIVE) {
      return (
        <Grid container direction="column">
          <Grid item>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={this.handleStop}
            >
              Cancel
            </Button>
          </Grid>
        </Grid>
      );
    }

    if (status === "error" || status === "success") {
      return (
        <div>
          <FormHelperText error>{error}</FormHelperText>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={this.handleStop}
          >
            Reset
          </Button>
        </div>
      );
    }

    return null;
  };

  singleAcceptedFile = (acceptedFiles, rejectedFiles) => {
    return rejectedFiles.length === 0 && acceptedFiles.length === 1;
  };

  onDrop = (acceptedFiles, rejectedFiles) => {
    const { onSuccess } = this.props;
    const stateUpdate = { acceptedFiles, rejectedFiles };
    if (this.singleAcceptedFile(acceptedFiles, rejectedFiles)) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        onSuccess(reader.result);
      };
      this.setState(stateUpdate, () => reader.readAsText(file));
    } else {
      this.setState(stateUpdate);
    }
  };

  handleError = (error) => {
    const { onClear } = this.props;
    this.setState({ status: "error", error: error.message });
    if (onClear) {
      onClear();
    }
  };

  // handleScan = (data) => {
  //   const { onSuccess, interaction } = this.props;
  //   if (data) {
  //     try {
  //       const result = interaction().parse(data);
  //       onSuccess(result);
  //       this.setState({ status: "success" });
  //     } catch (e) {
  //       this.handleError(e);
  //     }
  //   }
  // };
}

export const ColdcardJSONReader = ColdcardFileReaderBase;
export const ColdcardPSBTReader = ColdcardFileReaderBase;

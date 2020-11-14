import React, {Component} from "react";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";
import {Grid, Box} from "@material-ui/core";
import {CloudUpload as UploadIcon} from "@material-ui/icons";
import styles from "./ColdcardFileReader.module.scss";

class ColdcardFileReaderBase extends Component {
  static propTypes = {
    onSuccess: PropTypes.func.isRequired,
    setError: PropTypes.func.isRequired,
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
      selectedFile: null,
      fileType: props.fileType || "JSON",
      acceptedFiles: [],
      rejectedFiles: [],
    };
  }

  render = () => {
    const {maxFileSize, validFileFormats} = this.props;
    const {fileType} = this.state;

    return (
      <Grid container direction="column">
        <p>When you are ready, upload the {fileType} file from your Coldcard:</p>
        <Box>
          <Dropzone
            className={styles.dropzone}
            onDrop={this.onDrop}
            multiple={false}
            minSize={1}
            maxSize={maxFileSize}
            accept={validFileFormats}>
            <UploadIcon classes={{root: styles.uploadIcon}}/>
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
    const {onSuccess, setError} = this.props;
    const {fileType} = this.state;
    const stateUpdate = {acceptedFiles, rejectedFiles};
    if (this.singleAcceptedFile(acceptedFiles, rejectedFiles)) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        onSuccess(reader.result);
      };
      this.setState(stateUpdate, () => reader.readAsText(file));
    } else {
      if (rejectedFiles.length === 1) {
        setError(`The file you attempted to upload was unacceptable. File type must be .${fileType.toLowerCase()}.`);
      } else if (rejectedFiles.length > 1) {
        setError(`This dropzone only accepts a single file.`);
      }
      this.setState(stateUpdate);
    }
  };
}

export const ColdcardJSONReader = ColdcardFileReaderBase;
export const ColdcardPSBTReader = ColdcardFileReaderBase;

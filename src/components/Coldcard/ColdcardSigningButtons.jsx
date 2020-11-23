import React, {Component} from "react";
import PropTypes from "prop-types";
import {Button} from '@material-ui/core';

export class ColdcardSigningButtons extends Component {
  static propTypes = {
    handlePSBTDownloadClick: PropTypes.func.isRequired,
    handleWalletConfigDownloadClick: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
  }

  render = () => {
    const {handlePSBTDownloadClick, handleWalletConfigDownloadClick} = this.props;
    return (<>
      <Button
      type="button"
      variant="contained"
      color="primary"
      onClick={handlePSBTDownloadClick}
    >
      Download PSBT
    </Button>
    <Button
      type="button"
      variant="contained"
      onClick={handleWalletConfigDownloadClick}
    >
      Download Coldcard Config
    </Button>
      </>
    );
  };

}



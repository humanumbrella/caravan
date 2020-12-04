import React, { Component } from "react";
import { ColdcardSigningButtons } from "./ColdcardSigningButtons";
import { ColdcardPSBTReader } from "./ColdcardFileReader";
import moment from "moment";
import { downloadFile } from "../../utils";
import { COLDCARD, ConfigAdapter } from "unchained-wallets";
import { getWalletDetailsText } from "../../selectors/wallet";
import { connect } from "react-redux";

class ColdcardSigner extends Component {
  handlePSBTDownloadClick = () => {
    const { walletName, interaction, setActive } = this.props;
    let body = interaction.request().toBase64();
    const timestamp = moment().format("HHmm");
    const filename = `${timestamp}-${walletName}.psbt`;
    downloadFile(body, filename);
    setActive();
  };

  handleWalletConfigDownloadClick = () => {
    const { walletDetailsText } = this.props;
    this.reshapeConfig(walletDetailsText);
  };

  // This tries to reshape it to a Coldcard Wallet Config via unchained-wallets
  reshapeConfig = (walletDetails) => {
    const walletConfig = JSON.parse(walletDetails);
    const startingAddressIndex = walletConfig.startingAddressIndex;
    // If this is a config that's been rekeyed, note that in the name.
    walletConfig.name =
      startingAddressIndex === 0
        ? walletConfig.name
        : `${walletConfig.name}_${startingAddressIndex.toString()}`;

    let interaction = ConfigAdapter({
      KEYSTORE: COLDCARD,
      jsonConfig: walletConfig,
    });
    let body = interaction.adapt();
    const filename = `wc-${walletConfig.name}.txt`;
    downloadFile(body, filename);
  };

  render = () => {
    const { onReceivePSBT, setError } = this.props;
    return (
      <div>
        <ColdcardSigningButtons
          handlePSBTDownloadClick={this.handlePSBTDownloadClick}
          handleWalletConfigDownloadClick={this.handleWalletConfigDownloadClick}
        />
        <ColdcardPSBTReader onReceivePSBT={onReceivePSBT} setError={setError} />
      </div>
    );
  };
}

function mapStateToProps(state) {
  return {
    walletName: state.wallet.common.walletName,
    walletDetailsText: getWalletDetailsText(state),
  };
}

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(ColdcardSigner);

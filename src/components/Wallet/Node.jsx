import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { satoshisToBitcoins } from "unchained-bitcoin";

// Components
import { TableRow, TableCell, Checkbox } from "@material-ui/core";
import AddressExpander from "./AddressExpander";

// Actions
import {
  setInputs as setInputsAction,
  setFeeRate as setFeeRateAction,
  updateAutoSpendAction as updateAutoSpendActionImport,
} from "../../actions/transactionActions";
import { WALLET_MODES } from "../../actions/walletActions";

class Node extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      indeterminate: false,
      checked: false,
    };
  }

  componentDidMount = () => {
    this.generate();
  };

  setSpendCheckbox = (value) => {
    console.log(`set checkbox called w ${value}`);
    const { spend } = this.props;
    // const fakeEvent = { target: { checked: value } };
    if (value === "indeterminate") {
      this.setState({ indeterminate: true, checked: false });
    } else if (value === spend) {
      // if value is true - means we clicked all the inputs one by one
      // and maxed (or zeroed) em out - so we should really call handleSpend
      // with a fake Event in either of those cases.\
      this.setState({ indeterminate: false, checked: value });
    } else {
      this.setState({ indeterminate: false, checked: value });
      // this.handleSpend(fakeEvent);
    }
  };

  render = () => {
    const {
      bip32Path,
      spend,
      fetchedUTXOs,
      balanceSats,
      multisig,
      utxos,
      walletMode,
      addressKnown,
    } = this.props;
    const { indeterminate, checked } = this.state;
    const spending = walletMode === WALLET_MODES.SPEND;
    return (
      <TableRow key={bip32Path}>
        {spending && (
          <TableCell>
            <Checkbox
              id={bip32Path}
              name="spend"
              onChange={this.handleSpend}
              checked={checked}
              disabled={!fetchedUTXOs || balanceSats.isEqualTo(0)}
              indeterminate={indeterminate}
            />
          </TableCell>
        )}
        <TableCell>
          <code>{bip32Path.replace("m", "*")}</code>
        </TableCell>
        <TableCell>{utxos.length}</TableCell>
        <TableCell>
          {fetchedUTXOs && addressKnown
            ? satoshisToBitcoins(balanceSats).toFixed()
            : ""}
        </TableCell>
        <TableCell>{this.maxUtxoDate()}</TableCell>

        <TableCell>{multisig ? this.renderAddress() : "..."}</TableCell>
      </TableRow>
    );
  };

  maxUtxoDate = () => {
    const { utxos } = this.props;
    if (!utxos.length) return "";
    const maxtime = Math.max(...utxos.map((utxo) => utxo.time));
    if (Number.isNaN(maxtime)) return "Pending";
    return new Date(1000 * maxtime).toLocaleDateString();
  };

  renderAddress = () => {
    const { braidNode } = this.props;
    return (
      <AddressExpander
        node={braidNode}
        setSpendCheckbox={this.setSpendCheckbox}
      />
    );
  };

  generate = () => {
    const { present, change, bip32Path, addNode } = this.props;
    if (!present) {
      addNode(change, bip32Path);
    }
  };

  handleSpend = (e) => {
    const {
      change,
      bip32Path,
      updateNode,
      inputs,
      utxos,
      multisig,
      setInputs,
      updateAutoSpend,
      setFeeRate,
      feeRate,
    } = this.props;
    let newInputs;
    if (e.target.checked) {
      newInputs = inputs.concat(
        utxos.map((utxo) => ({ ...utxo, multisig, bip32Path }))
      );
    } else {
      newInputs = inputs.filter((input) => {
        const newUtxos = utxos.filter((utxo) => {
          return utxo.txid === input.txid && utxo.index === input.index;
        });
        return newUtxos.length === 0;
      });
    }
    setInputs(newInputs);
    updateNode(change, { spend: e.target.checked, bip32Path });
    updateAutoSpend(false);
    setFeeRate(feeRate);
  };
}

Node.propTypes = {
  addNode: PropTypes.func.isRequired,
  addressKnown: PropTypes.bool.isRequired,
  balanceSats: PropTypes.shape({
    isEqualTo: PropTypes.func,
  }).isRequired,
  bip32Path: PropTypes.string.isRequired,
  braidNode: PropTypes.shape({}).isRequired,
  change: PropTypes.bool.isRequired,
  feeRate: PropTypes.string.isRequired,
  fetchedUTXOs: PropTypes.bool.isRequired,
  inputs: PropTypes.arrayOf(
    PropTypes.shape({
      index: PropTypes.number,
      txid: PropTypes.string,
    })
  ).isRequired,
  multisig: PropTypes.shape({}),
  present: PropTypes.bool,
  setFeeRate: PropTypes.func.isRequired,
  setInputs: PropTypes.func.isRequired,
  spend: PropTypes.bool.isRequired,
  updateAutoSpend: PropTypes.func.isRequired,
  updateNode: PropTypes.func.isRequired,
  utxos: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  walletMode: PropTypes.number.isRequired,
};

Node.defaultProps = {
  multisig: {},
  present: false,
};

function mapStateToProps(state, ownProps) {
  const change = (ownProps.bip32Path || "").split("/")[1] === "1"; // // m, 0, 1
  const braid = state.wallet[change ? "change" : "deposits"];
  return {
    ...state.settings,
    ...{ change },
    ...braid.nodes[ownProps.bip32Path],
    ...state.spend.transaction,
    walletMode: state.wallet.common.walletMode,
    braidNode: braid.nodes[ownProps.bip32Path],
  };
}

const mapDispatchToProps = {
  setInputs: setInputsAction,
  setFeeRate: setFeeRateAction,
  updateAutoSpend: updateAutoSpendActionImport,
};

export default connect(mapStateToProps, mapDispatchToProps)(Node);

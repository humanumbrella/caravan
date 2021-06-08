import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  blockExplorerTransactionURL,
  satoshisToBitcoins,
} from "unchained-bitcoin";
import {
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  Typography,
  Checkbox,
} from "@material-ui/core";
import { OpenInNew } from "@material-ui/icons";
import BigNumber from "bignumber.js";
import { externalLink } from "../../utils";
import Copyable from "../Copyable";

// Actions
import { setInputs as setInputsAction } from "../../actions/transactionActions";

// Assets
import "react-table/react-table.css";
import styles from "./styles.module.scss";

class UTXOSet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputsSatsSelected: props.inputsTotalSats,
      localInputs: props.inputs.map((input) => {
        return {
          ...input,
          checked: props.selectAll,
        };
      }),
      toggleAll: true,
    };
  }

  // eslint-disable-next-line no-unused-vars
  componentDidUpdate(prevProps, prevState, snapshot) {
    const { node, multisig, existingTransactionInputs } = this.props;
    const { localInputs } = this.state;

    // None of this needs to happen on the redeem script interface
    if (multisig) {
      // We need to respond to the node having it's "spend/select" checkbox clicked.
      // In the case where it's empty or full, it's a trivial check and we just toggle everyone
      // E.g. we were spending this thing, and now we're not.

      const prevMyInputsBeingSpent = localInputs.filter((input) => {
        const included = prevProps.existingTransactionInputs.filter((utxo) => {
          return utxo.txid === input.txid && utxo.index === input.index;
        });
        return included.length > 0;
      }).length;

      // --> are all of my inputs in the transaction? Means something upstream clicked 'all' ... so toggle
      const myInputsBeingSpent = localInputs.filter((input) => {
        const included = existingTransactionInputs.filter((utxo) => {
          return utxo.txid === input.txid && utxo.index === input.index;
        });
        return included.length > 0;
      }).length;

      const fullSpend = myInputsBeingSpent === localInputs.length;
      // the parent component has been checked or unchecked so we need to select or deselect all
      // but don't do it on a single utxo selected
      if (
        (prevProps.node.spend !== node.spend ||
          myInputsBeingSpent !== prevMyInputsBeingSpent) &&
        fullSpend
      ) {
        this.toggleAll(node.spend);
      }
    }
  }

  toggleInput = (inputIndex) => {
    const { localInputs } = this.state;
    this.setState({ toggleAll: false });

    localInputs[inputIndex].checked = !localInputs[inputIndex].checked;

    this.setInputsAndUpdateDisplay(localInputs);
  };

  toggleAll = (setTo = null) => {
    const { localInputs, toggleAll } = this.state;
    const toggled = !toggleAll;

    localInputs.forEach((input) => {
      const i = input;
      i.checked = setTo === null ? toggled : setTo;
      return i;
    });

    this.setInputsAndUpdateDisplay(localInputs);
    this.setState({ toggleAll: toggled });
  };

  setInputsAndUpdateDisplay = (incomingInputs) => {
    const {
      setInputs,
      multisig,
      bip32Path,
      existingTransactionInputs,
      setSpendCheckbox,
    } = this.props;
    const { localInputs } = this.state;
    let inputsToSpend = incomingInputs.filter((input) => input.checked);
    if (multisig) {
      inputsToSpend = inputsToSpend.map((utxo) => {
        return { ...utxo, multisig, bip32Path };
      });
    }
    const satsSelected = inputsToSpend.reduce(
      (accumulator, input) => accumulator.plus(input.amountSats),
      new BigNumber(0)
    );
    this.setState({
      inputsSatsSelected: satsSelected,
    });
    let totalInputsToSpend = inputsToSpend;

    if (multisig) {
      // at this point we have 3 sets of inputs:
      //
      // 1. localInputs from this component's state
      // 2. transaction.inputs from the store
      // 3. selectedInputs
      //
      // what we need to do is union selectedInputs + transaction.inputs
      // and then dedupe ... finally calling setInputs on the result.
      const notMyInputs = existingTransactionInputs.filter((input) => {
        const utxoMatch = localInputs.filter((localInput) => {
          return (
            localInput.txid === input.txid && localInput.index === input.index
          );
        });
        return utxoMatch.length === 0;
      });

      if (notMyInputs.length > 0) {
        // we have some inputs already in the store. Givem that,
        // there are two factors to keep in mind:
        // 1 - there are existing inputs in the store from *another* node/address
        // 2 - there are existing inputs in the store from *this* node/address [ignore]

        totalInputsToSpend = inputsToSpend.concat(notMyInputs);
      }

      // lets make sure the root checkbox is displayed correctly
      const numInputsToSpend = localInputs.filter((input) => input.checked)
        .length;

      if (numInputsToSpend === 0) {
        setSpendCheckbox(false);
      } else if (
        numInputsToSpend >= 1 &&
        numInputsToSpend < localInputs.length
      ) {
        setSpendCheckbox("indeterminate");
      } else {
        setSpendCheckbox(true);
      }
    }

    if (totalInputsToSpend.length > 0) {
      setInputs(totalInputsToSpend);
    } else if (multisig) {
      setInputs([]);
    }
  };

  renderInputs = () => {
    const { network, showSelection, finalizedOutputs } = this.props;
    const { localInputs } = this.state;
    return localInputs.map((input, inputIndex) => {
      const confirmedStyle = `${styles.utxoTxid}${
        input.confirmed ? "" : ` ${styles.unconfirmed}`
      }`;
      const confirmedTitle = input.confirmed ? "confirmed" : "unconfirmed";
      return (
        <TableRow hover key={input.txid}>
          {showSelection && (
            <TableCell>
              <Checkbox
                data-testid={`utxo-checkbox-${inputIndex}`}
                checked={input.checked}
                onClick={() => this.toggleInput(inputIndex)}
                color="primary"
                disabled={finalizedOutputs}
              />
            </TableCell>
          )}
          <TableCell>{inputIndex + 1}</TableCell>
          <TableCell className={confirmedStyle}>
            <Copyable text={input.txid} showIcon showText={false}>
              <code title={confirmedTitle}>{input.txid}</code>
            </Copyable>
          </TableCell>
          <TableCell>
            <Copyable text={input.index.toString()} />
          </TableCell>
          <TableCell>
            <Copyable text={satoshisToBitcoins(input.amountSats).toString()} />
          </TableCell>
          <TableCell>
            {externalLink(
              blockExplorerTransactionURL(input.txid, network),
              <OpenInNew />
            )}
          </TableCell>
        </TableRow>
      );
    });
  };

  render() {
    const {
      inputsTotalSats,
      showSelection = true,
      hideSelectAllInHeader,
      finalizedOutputs,
    } = this.props;
    const { inputsSatsSelected, toggleAll, localInputs } = this.state;
    return (
      <>
        <Typography variant="h5">
          {`Available Inputs (${localInputs.length})`}{" "}
        </Typography>
        <p>The following UTXOs will be spent as inputs in a new transaction.</p>
        <Table>
          <TableHead>
            <TableRow hover>
              {showSelection && !hideSelectAllInHeader && (
                <TableCell>
                  <Checkbox
                    data-testid="utxo-check-all"
                    checked={toggleAll}
                    onClick={() => this.toggleAll()}
                    color="primary"
                    disabled={finalizedOutputs}
                  />
                </TableCell>
              )}
              {hideSelectAllInHeader && <TableCell />}
              <TableCell>Number</TableCell>
              <TableCell>TXID</TableCell>
              <TableCell>Index</TableCell>
              <TableCell>Amount (BTC)</TableCell>
              <TableCell>View</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{this.renderInputs()}</TableBody>
          <TableFooter>
            <TableRow hover>
              <TableCell colSpan={3}>TOTAL:</TableCell>
              <TableCell colSpan={2}>
                {inputsSatsSelected
                  ? satoshisToBitcoins(inputsSatsSelected).toString()
                  : satoshisToBitcoins(inputsTotalSats).toString()}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </>
    );
  }
}

UTXOSet.propTypes = {
  network: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  setInputs: PropTypes.func.isRequired,
  multisig: PropTypes.oneOfType([PropTypes.shape({}), PropTypes.bool]),
  bip32Path: PropTypes.string,
  showSelection: PropTypes.bool,
  hideSelectAllInHeader: PropTypes.bool,
  selectAll: PropTypes.bool,
  finalizedOutputs: PropTypes.bool.isRequired,
  node: PropTypes.shape({
    spend: PropTypes.bool,
  }),
  existingTransactionInputs: PropTypes.arrayOf(PropTypes.shape({})),
  setSpendCheckbox: PropTypes.func,
};

UTXOSet.defaultProps = {
  multisig: false,
  bip32Path: "",
  showSelection: true,
  hideSelectAllInHeader: false,
  selectAll: true,
  node: {},
  existingTransactionInputs: [],
  setSpendCheckbox: () => {},
};

function mapStateToProps(state) {
  return {
    ...state.settings,
    finalizedOutputs: state.spend.transaction.finalizedOutputs,
    existingTransactionInputs: state.spend.transaction.inputs,
  };
}

const mapDispatchToProps = {
  setInputs: setInputsAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(UTXOSet);

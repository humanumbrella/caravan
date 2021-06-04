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

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { node } = this.props;
    if (prevProps.node.spend !== node.spend) {
      // the parent component has been checked or unchecked so we need to select or deselect all
      this.toggleAll(node.spend);
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
    const { setInputs, multisig, bip32Path, inputs } = this.props;
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

    // at this point we have inputs from the store
    // as well as selected inputs from this particular node
    // what we need to do is add em together and dedupe
    // then call setInputs on the result.

    // GOTTA BE SMART HERE BC CANT DUPLICATE
    const notMyInputs = inputs.filter((input) => {
      const utxoMatch = localInputs.filter((localInput) => {
        return (
          localInput.txid === input.txid && localInput.index === input.index
        );
      });
      return utxoMatch.length === 0;
    });

    if (notMyInputs.length > 0) {
      // we have some inputs already in the store
      console.log(`existing inputs already in props: ${inputs.length}`);
      // cannot simply concat bc we will get duplicates ...

      // there are two factors to keep in mind:
      // 1 - there are existing inputs in the store from *another* node/address
      // 2 - there are existing inputs in the store from *this* node/address [ignore]

      // return utxo.txid === input.txid && utxo.index === input.index;

      inputsToSpend = inputsToSpend.concat(notMyInputs);
    }

    if (inputsToSpend.length > 0) {
      console.log(
        `going to set transaction inputs to: ${inputsToSpend.length}`
      );
      setInputs(inputsToSpend);
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
      inputs,
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
    addressUsed: PropTypes.bool,
    balanceSats: PropTypes.shape({
      isEqualTo: PropTypes.func,
      isGreaterThan: PropTypes.func,
    }),
    bip32Path: PropTypes.string,
    multisig: PropTypes.shape({
      address: PropTypes.string,
    }),
    spend: PropTypes.bool,
    utxos: PropTypes.arrayOf(PropTypes.shape({})),
  }),
};

UTXOSet.defaultProps = {
  multisig: false,
  bip32Path: "",
  showSelection: true,
  hideSelectAllInHeader: false,
  selectAll: true,
  node: {},
};

function mapStateToProps(state) {
  return {
    ...state.settings,
    finalizedOutputs: state.spend.transaction.finalizedOutputs,
  };
}

const mapDispatchToProps = {
  setInputs: setInputsAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(UTXOSet);

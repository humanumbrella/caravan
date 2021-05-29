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
      inputsSelected: props.inputs.length,
      inputs: props.inputs.map((input) => {
        return {
          ...input,
          checked: true,
        };
      }),
    };
  }

  toggleInput = (inputIndex) => {
    const { setInputs, multisig } = this.props;
    const { inputs, inputsSelected } = this.state;
    if (inputsSelected > 1 || !inputs[inputIndex].checked) {
      inputs[inputIndex].checked = !inputs[inputIndex].checked;
      let inputsToSpend = inputs.filter((input) => input.checked);
      if (multisig) {
        inputsToSpend = inputsToSpend.map((utxo) => {
          return { ...utxo, multisig };
        });
      }
      setInputs(inputsToSpend);
      this.setState({ inputsSelected: inputsToSpend.length });
    } else {
      console.error("have to spend at least one input.");
    }
  };

  renderInputs = () => {
    const { network } = this.props;
    const { inputs } = this.state;
    return inputs.map((input, inputIndex) => {
      const confirmedStyle = `${styles.utxoTxid}${
        input.confirmed ? "" : ` ${styles.unconfirmed}`
      }`;
      const confirmedTitle = input.confirmed ? "confirmed" : "unconfirmed";
      return (
        <TableRow hover key={input.txid}>
          <TableCell>
            <Checkbox
              data-testid={`utxo-checkbox-${inputIndex}`}
              checked={input.checked}
              onClick={() => this.toggleInput(inputIndex)}
              color="primary"
            />
          </TableCell>
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
    const { inputs, inputsTotalSats } = this.props;
    return (
      <>
        <Typography variant="h5">
          {`Available Inputs (${inputs.length})`}{" "}
        </Typography>
        <p>The following UTXOs will be spent as inputs in a new transaction.</p>
        <Table>
          <TableHead>
            <TableRow hover>
              <TableCell>Select</TableCell>
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
                {satoshisToBitcoins(inputsTotalSats).toString()}
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
  multisig: PropTypes.shape({}),
};

UTXOSet.defaultProps = {
  multisig: false,
};

function mapStateToProps(state) {
  return {
    ...state.settings,
  };
}

const mapDispatchToProps = {
  setInputs: setInputsAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(UTXOSet);

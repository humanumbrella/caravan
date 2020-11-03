import React from "react";
import PropTypes from "prop-types";
import Copyable from "../Copyable";

const ColdcardRequest = (props) => {
  const { width, string } = props;
  return (
    <Copyable text={string} newline showText={false}>asdf</Copyable>
  );
};

ColdcardRequest.propTypes = {
  string: PropTypes.string,
  width: PropTypes.number,
};

ColdcardRequest.defaultProps = {
  string: "",
  width: 120,
};

export default ColdcardRequest;

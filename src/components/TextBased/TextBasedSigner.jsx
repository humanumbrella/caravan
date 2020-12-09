import React, { Component } from "react";
import { Button, FormHelperText, Grid, TextField } from "@material-ui/core";

class TextBasedSigner extends Component {
  render = () => {
    const {
      signatureImporter,
      resetBIP32Path,
      onReceive,
      hasError,
      bip32PathIsDefault,
    } = this.props;
    return (
      <>
        <Grid container>
          <Grid item md={10}>
            <TextField
              name="bip32Path"
              value={signatureImporter.bip32Path}
              onChange={onReceive}
              error={hasError}
            />
          </Grid>

          <Grid item md={2}>
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
        </Grid>

        <FormHelperText>
          Use the default value if you don&rsquo;t understand BIP32 paths.
        </FormHelperText>
      </>
    );
  };
}

export default TextBasedSigner;

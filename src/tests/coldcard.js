import { COLDCARD } from "unchained-wallets";

import extendedPublicKeyTests from "./extendedPublicKeys";
import { signingTests } from "./signing";

export default extendedPublicKeyTests(COLDCARD)
  .concat(signingTests(COLDCARD));

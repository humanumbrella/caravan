import { wrappedNumberedActions } from "./utils";
import {ExtendedPublicKey} from 'unchained-bitcoin';

export const SET_EXTENDED_PUBLIC_KEY_IMPORTER_NAME =
  "SET_EXTENDED_PUBLIC_KEY_IMPORTER_NAME";
export const RESET_EXTENDED_PUBLIC_KEY_IMPORTER_BIP32_PATH =
  "RESET_EXTENDED_PUBLIC_KEY_IMPORTER_BIP32_PATH";
export const SET_EXTENDED_PUBLIC_KEY_IMPORTER_BIP32_PATH =
  "SET_EXTENDED_PUBLIC_KEY_IMPORTER_BIP32_PATH";
export const SET_EXTENDED_PUBLIC_KEY_IMPORTER_METHOD =
  "SET_EXTENDED_PUBLIC_KEY_IMPORTER_METHOD";
export const SET_EXTENDED_PUBLIC_KEY_IMPORTER_EXTENDED_PUBLIC_KEY =
  "SET_EXTENDED_PUBLIC_KEY_IMPORTER_EXTENDED_PUBLIC_KEY";
export const SET_EXTENDED_PUBLIC_KEY_IMPORTER_EXTENDED_PUBLIC_KEY_ROOT_XFP =
  "SET_EXTENDED_PUBLIC_KEY_IMPORTER_EXTENDED_PUBLIC_KEY_ROOT_XFP";
export const SET_EXTENDED_PUBLIC_KEY_IMPORTER_FINALIZED =
  "SET_EXTENDED_PUBLIC_KEY_IMPORTER_FINALIZED";
export const SET_EXTENDED_PUBLIC_KEY_IMPORTER_VISIBLE =
  "SET_EXTENDED_PUBLIC_KEY_IMPORTER_VISIBLE";

export const {
  setExtendedPublicKeyImporterName,
  setExtendedPublicKeyImporterBIP32Path,
  resetExtendedPublicKeyImporterBIP32Path,
  setExtendedPublicKeyImporterMethod,
  setExtendedPublicKeyImporterExtendedPublicKey,
  setExtendedPublicKeyImporterExtendedPublicKeyRootXfp,
  setExtendedPublicKeyImporterFinalized,
} = wrappedNumberedActions({
  setExtendedPublicKeyImporterName: SET_EXTENDED_PUBLIC_KEY_IMPORTER_NAME,
  resetExtendedPublicKeyImporterBIP32Path: RESET_EXTENDED_PUBLIC_KEY_IMPORTER_BIP32_PATH,
  setExtendedPublicKeyImporterBIP32Path: SET_EXTENDED_PUBLIC_KEY_IMPORTER_BIP32_PATH,
  setExtendedPublicKeyImporterMethod: SET_EXTENDED_PUBLIC_KEY_IMPORTER_METHOD,
  setExtendedPublicKeyImporterExtendedPublicKey: SET_EXTENDED_PUBLIC_KEY_IMPORTER_EXTENDED_PUBLIC_KEY,
  setExtendedPublicKeyImporterExtendedPublicKeyRootXfp: SET_EXTENDED_PUBLIC_KEY_IMPORTER_EXTENDED_PUBLIC_KEY_ROOT_XFP,
  setExtendedPublicKeyImporterFinalized: SET_EXTENDED_PUBLIC_KEY_IMPORTER_FINALIZED,
});

export function setExtendedPublicKeyImporterVisible(value) {
  return {
    type: SET_EXTENDED_PUBLIC_KEY_IMPORTER_VISIBLE,
    value,
  };
}

export function generateRichExtendedPublicKeys(extendedPublicKeyImporters) {
  return Object.values(extendedPublicKeyImporters).map((importer) => {
    let extendedPublicKey =  ExtendedPublicKey.fromBase58(importer.extendedPublicKey);
    extendedPublicKey.setRootFingerprint(
      importer.rootXfp && importer.rootXfp.toLowerCase() !== 'unknown'
        ? importer.rootXfp
        : '00000000');
    extendedPublicKey.setBip32Path(
      importer.bip32Path && importer.bip32Path.toLowerCase() !== 'unknown'
        ? importer.bip32Path
        : 'm'+'/0'.repeat(extendedPublicKey.depth));
    return extendedPublicKey;
  })
}

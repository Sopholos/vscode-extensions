import { OutputChannel, window } from "vscode";
import {
  getPasswordPaths,
  isEncryptedDocument,
  replaceText,
  showError,
  tryDecrypt,
} from "../util";

export const decrypt = async (output: OutputChannel) => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showInformationMessage("No active text editor to decrypt");
  }

  if (!isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text doesn't seem to be encrypted");
  }

  try {
    const passwordPaths = await getPasswordPaths(activeEditor.document, output);

    const { decryptedContent } = await tryDecrypt(
      passwordPaths,
      activeEditor.document,
      output
    );

    await replaceText(activeEditor, decryptedContent ?? "");

    activeEditor.document.save();
  } catch (err) {
    return showError(err);
  }
};

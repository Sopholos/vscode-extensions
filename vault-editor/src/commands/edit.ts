import { OutputChannel, window, workspace } from "vscode";

import {
  getPasswordPaths,
  isEncryptedDocument,
  replaceText,
  showError,
  tryDecrypt,
} from "../util";

export const edit = async (output: OutputChannel) => {
  const vaultTextEditor = window.activeTextEditor;

  if (!vaultTextEditor) {
    return window.showErrorMessage("No active text editor to edit");
  }

  if (!isEncryptedDocument(vaultTextEditor.document)) {
    return window.showErrorMessage("Text doesn't seem to be encrypted");
  }

  try {
    const vaultDocument = vaultTextEditor.document;
    const passwordPaths = await getPasswordPaths(vaultDocument, output);
    const { decryptedContent, vault } = await tryDecrypt(
      passwordPaths,
      vaultDocument,
      output
    );

    await replaceText(vaultTextEditor, decryptedContent ?? "");

    window.showInformationMessage("Save to encrypt file again");

    const saveListener = workspace.onDidSaveTextDocument(
      async (savedDocument) => {
        const currentEditor = window.activeTextEditor;

        if (savedDocument.fileName === currentEditor?.document.fileName) {
          const encryptedContent = await vault.encrypt(
            savedDocument.getText(),
            ""
          );
          await replaceText(currentEditor, encryptedContent);
          saveListener.dispose();
          await vaultTextEditor.document.save();
        }
      }
    );
  } catch (err) {
    return showError(err);
  }
};

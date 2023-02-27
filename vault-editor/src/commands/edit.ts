import { OutputChannel, window, workspace } from "vscode";

import {
  getPasswordPaths,
  isEncryptedDocument,
  replaceText,
  showError,
  tryDecrypt,
} from "../util";

export const edit = async (output: OutputChannel) => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showErrorMessage("No active text editor to edit");
  }

  if (!isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text doesn't seem to be encrypted");
  }

  try {
    const passwordPaths = await getPasswordPaths(activeEditor.document, output);

    const { decryptedContent, vault } = await tryDecrypt(
      passwordPaths,
      activeEditor.document,
      output
    );

    await replaceText(activeEditor, decryptedContent ?? "");

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
          await activeEditor.document.save();
        }
      }
    );
  } catch (err) {
    return showError(err);
  }
};

import {
  Location,
  OutputChannel,
  Position,
  Range,
  WorkspaceEdit,
  window,
  workspace,
} from "vscode";

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
        if (savedDocument === vaultDocument) {
          const encryptedContent = await vault.encrypt(
            savedDocument.getText(),
            ""
          );

          // Intentionally missing the '-1' to create a range larger than the file
          // which gets fixed by the validate range method call.
          let invalidRange = new Range(0, 0, vaultDocument.lineCount, 0);
          let fullRange = vaultDocument.validateRange(invalidRange);

          // Use a workspace edit instead of text editor of the vault file,
          // since the save can be initiated from another editor or tab (e.g. Save All)
          const encryptVaultEdit = new WorkspaceEdit();
          encryptVaultEdit.replace(
            vaultDocument.uri,
            fullRange,
            encryptedContent
          );
          await workspace.applyEdit(encryptVaultEdit);

          saveListener.dispose();
          await vaultTextEditor.document.save();
        }
      }
    );
  } catch (err) {
    return showError(err);
  }
};

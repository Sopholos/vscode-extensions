import { window, workspace } from "vscode";

import { getVault, isEncryptedDocument, replaceText, showError } from "../util";

export const edit = async () => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showErrorMessage("No active text editor to edit");
  }

  if (!isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text doesn't seem to be encrypted");
  }

  try {
    const editorFileName = activeEditor.document.fileName;

    const vault = getVault(editorFileName);

    const decryptedContent = await vault.decrypt(
      activeEditor.document.getText(),
      ""
    );

    await replaceText(activeEditor, decryptedContent ?? "");

    window.showInformationMessage("Save to encrypt file again");

    const saveListener = workspace.onDidSaveTextDocument(
      async (savedDocument) => {
        if (savedDocument.fileName === activeEditor.document.fileName) {
          const encryptedContent = await vault.encrypt(
            savedDocument.getText(),
            ""
          );

          await replaceText(activeEditor, encryptedContent);
          saveListener.dispose();
          await activeEditor.document.save();
        }
      }
    );
  } catch (err) {
    return showError(err);
  }
};

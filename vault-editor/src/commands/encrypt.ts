import { window } from "vscode";
import { getVault, isEncryptedDocument, replaceText, showError } from "../util";

export const encrypt = async () => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showErrorMessage("No active text editor to encrypt");
  }

  if (isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text seems to already be encrypted");
  }

  try {
    const editorFileName = activeEditor.document.fileName;
    const vault = getVault(editorFileName);

    const encryptedContent = await vault.encrypt(
      activeEditor.document.getText(),
      ""
    );

    await replaceText(activeEditor, encryptedContent);

    await activeEditor.document.save();
  } catch (err) {
    return showError(err);
  }
};

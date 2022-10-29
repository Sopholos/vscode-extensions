import { workspace, window } from "vscode";
import { configurationName } from "../extension";
import { getVault, isEncryptedDocument, replaceText, showError } from "../util";

export const encrypt = async () => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showErrorMessage("No active text editor to encrypt");
  }

  if (isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text seems to already be encrypted");
  }

  const conf = workspace.getConfiguration(configurationName);
  const keysRoot = conf.get<string>("keysRoot") ?? "";

  const editorFileName = activeEditor.document.fileName;

  try {
    const vault = getVault(keysRoot, editorFileName);

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

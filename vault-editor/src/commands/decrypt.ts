import { window, workspace } from "vscode";
import { configurationName } from "../extension";
import { getVault, isEncryptedDocument, replaceText, showError } from "../util";

export const decrypt = async () => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showInformationMessage("No active text editor to decrypt");
  }

  if (!isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text doesn't seem to be encrypted");
  }

  const conf = workspace.getConfiguration(configurationName);
  const keysRoot = conf.get<string>("keysRoot") ?? "";

  const editorFileName = activeEditor.document.fileName;

  try {
    const vault = getVault(keysRoot, editorFileName);

    const decryptedContent = await vault.decrypt(
      activeEditor.document.getText(),
      ""
    );

    await replaceText(activeEditor, decryptedContent ?? "");

    activeEditor.document.save();
  } catch (err) {
    return showError(err);
  }
};

import * as vscode from "vscode";
import { getVault, replaceText, showError } from "../util";

export const encrypt = async () => {
  const activeEditor = vscode.window.activeTextEditor;

  if (!activeEditor) {
    return vscode.window.showInformationMessage("No file to encrypt");
  }

  const conf = vscode.workspace.getConfiguration("vault-editor");

  const editorFileName = activeEditor.document.fileName;

  try {
    const vault = getVault(conf.keysDir, editorFileName);

    const encryptedContent = await vault.encrypt(
      activeEditor.document.getText(),
      ""
    );

    replaceText(activeEditor, encryptedContent);

    await activeEditor.document.save();
  } catch (err) {
    return showError(err);
  }

  return vscode.window.showInformationMessage("Successfully encrypted file");
};

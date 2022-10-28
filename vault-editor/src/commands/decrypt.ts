import { window, workspace } from "vscode";
import { getVault, replaceText, showError } from "../util";

export const decrypt = async () => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showInformationMessage("No file to decrypt");
  }

  const conf = workspace.getConfiguration("vault-editor");

  const editorFileName = activeEditor.document.fileName;

  try {
    const vault = getVault(conf.keysDir, editorFileName);

    const decryptedContent = await vault.decrypt(
      activeEditor.document.getText(),
      ""
    );

    await replaceText(activeEditor, decryptedContent ?? "");

    activeEditor.document.save();
  } catch (err) {
    return showError(err);
  }

  return window.showInformationMessage("Successfully decrypted file");
};

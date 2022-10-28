import { window, workspace } from "vscode";
import { getVault, replaceText, showError } from "../util";

export const edit = async () => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showInformationMessage("No file to edit");
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

    window.showInformationMessage(
      "Successfully decrypted file - save to encrypt it again"
    );

    const saveListener = workspace.onDidSaveTextDocument(
      async (savedDocument) => {
        if (savedDocument.fileName === activeEditor.document.fileName) {
          console.log("HELLO");
          const encryptedContent = await vault.encrypt(
            savedDocument.getText(),
            ""
          );

          await replaceText(activeEditor, encryptedContent);
          saveListener.dispose();
          await activeEditor.document.save();
          window.showInformationMessage("Successfully encrypted file");
        }
      }
    );
  } catch (err) {
    return showError(err);
  }
};

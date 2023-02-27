import { window, commands, Uri, ViewColumn, OutputChannel } from "vscode";
import {
  getTmpPath,
  isEncryptedDocument,
  showError,
  getPasswordPaths,
  tryDecrypt,
} from "../util";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { rm } from "fs/promises";
import { basename } from "path";

export const view = async (output: OutputChannel) => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showInformationMessage("No active text editor to view");
  }

  if (!isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text doesn't seem to be encrypted");
  }

  const editorFilePath = activeEditor.document.fileName;

  try {
    const passwordPaths = await getPasswordPaths(activeEditor.document, output);

    const vaultFileBaseName = basename(editorFilePath);

    const tmpDir = getTmpPath();

    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir);
    }

    const { decryptedContent } = await tryDecrypt(
      passwordPaths,
      activeEditor.document,
      output
    );
    const tmpViewFilePath = `${tmpDir}/${vaultFileBaseName}`;
    writeFileSync(tmpViewFilePath, decryptedContent ?? "");

    await commands.executeCommand(
      "vscode.open",
      Uri.file(tmpViewFilePath),
      { viewColumn: ViewColumn.Beside, preview: true },
      `Vault View: ${vaultFileBaseName}`
    );

    // Clean up after creating temporary file that are needed vscode.open
    await rm(tmpViewFilePath);
  } catch (err) {
    return showError(err);
  }
};

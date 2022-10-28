import { ExtensionContext, window, workspace, commands } from "vscode";
import { decrypt } from "./commands/decrypt";
import { diff } from "./commands/diff";
import { edit } from "./commands/edit";
import { encrypt } from "./commands/encrypt";
import { decryptAndOutput, isEncryptedDocument } from "./util";
import { existsSync } from "fs";

export function activate(context: ExtensionContext) {
  const output = window.createOutputChannel("Vault - Decrypted Output");

  // Decrypt opened files on startup
  workspace.textDocuments.forEach(async (doc) => {
    if (isEncryptedDocument(doc)) {
      await decryptAndOutput(doc, output);
    }
  });

  context.subscriptions.push(
    workspace.onDidOpenTextDocument(async (doc) => {
      if (isEncryptedDocument(doc) && existsSync(doc.fileName)) {
        await decryptAndOutput(doc, output);
      }
    })
  );

  const encryptCommand = commands.registerCommand(
    "encrypted-file-editor.encrypt_file",
    encrypt
  );

  const decryptCommand = commands.registerCommand(
    "encrypted-file-editor.decrypt_file",
    decrypt
  );

  const editCommand = commands.registerCommand(
    "encrypted-file-editor.edit_file",
    edit
  );

  const diffCommand = commands.registerCommand(
    "encrypted-file-editor.diff_file",
    diff
  );

  context.subscriptions.push(
    encryptCommand,
    decryptCommand,
    editCommand,
    diffCommand
  );
}

export function deactivate() {}

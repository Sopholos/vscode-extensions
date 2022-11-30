import { ExtensionContext, window, workspace, commands } from "vscode";
import { decrypt } from "./commands/decrypt";
import { diff } from "./commands/diff";
import { edit } from "./commands/edit";
import {view } from "./commands/view";
import { encrypt } from "./commands/encrypt";
import { decryptAndOutput, isEncryptedDocument } from "./util";
import { existsSync } from "fs";

export const configurationName = "vaultEditor";

export function activate(context: ExtensionContext) {
  const output = window.createOutputChannel("Vault Editor");
  const conf = workspace.getConfiguration(configurationName);
  const decryptOnOpen = conf.get<boolean>("decryptOnOpen");
  const decryptOnStartup = conf.get<boolean>("decryptOnStartup");

  if (decryptOnStartup) {
    workspace.textDocuments.forEach(async (doc) => {
      if (isEncryptedDocument(doc)) {
        await decryptAndOutput(doc, output);
      }
    });
  }

  if (decryptOnOpen) {
    context.subscriptions.push(
      workspace.onDidOpenTextDocument(async (doc) => {
        if (isEncryptedDocument(doc) && existsSync(doc.fileName)) {
          await decryptAndOutput(doc, output);
        }
      })
    );
  }

  const encryptCommand = commands.registerCommand(
    "vault-editor.encrypt_file",
    encrypt
  );

  const decryptCommand = commands.registerCommand(
    "vault-editor.decrypt_file",
    decrypt
  );

  const editCommand = commands.registerCommand("vault-editor.edit_file", edit);

  const diffCommand = commands.registerCommand("vault-editor.diff_file", diff);

  const viewCommand = commands.registerCommand("vault-editor.view_file", view);

  context.subscriptions.push(
    encryptCommand,
    decryptCommand,
    editCommand,
    diffCommand,
    viewCommand
  );
}

export function deactivate() {}

import { ExtensionContext, window, workspace, commands } from "vscode";
import { decrypt } from "./commands/decrypt";
import { diff } from "./commands/diff";
import { edit } from "./commands/edit";
import { view } from "./commands/view";
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
    output.appendLine("decryptOnStartup enabled, will decrypt open files");
    workspace.textDocuments.forEach(async (doc) => {
      if (isEncryptedDocument(doc) && existsSync(doc.fileName)) {
        await decryptAndOutput(doc, output);
      }
    });
  }

  if (decryptOnOpen) {
    output.appendLine(
      "decryptOnOpen enabled, will decrypt files when they are opened"
    );
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
    () => encrypt(output)
  );

  const decryptCommand = commands.registerCommand(
    "vault-editor.decrypt_file",
    () => decrypt(output)
  );

  const editCommand = commands.registerCommand("vault-editor.edit_file", () =>
    edit(output)
  );

  const diffCommand = commands.registerCommand("vault-editor.diff_file", () =>
    diff(output)
  );

  const viewCommand = commands.registerCommand("vault-editor.view_file", () =>
    view(output)
  );

  context.subscriptions.push(
    encryptCommand,
    decryptCommand,
    editCommand,
    diffCommand,
    viewCommand
  );
}

export function deactivate() {}

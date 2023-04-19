import {
  extensions,
  window,
  commands,
  Uri,
  OutputChannel,
  workspace,
} from "vscode";
import { GitExtension } from "../git";
import {
  getTmpPath,
  isEncryptedDocument,
  isEncryptedText,
  showError,
  getPasswordPaths,
  tryDecrypt,
} from "../util";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { rm } from "fs/promises";
import { basename } from "path";
import { configurationName } from "../extension";

export const diff = async (output: OutputChannel) => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showInformationMessage("No active text editor to diff");
  }

  if (!isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text doesn't seem to be encrypted");
  }

  const editorFilePath = activeEditor.document.fileName;

  const gitExtension =
    extensions.getExtension<GitExtension>("vscode.git")?.exports;

  if (!gitExtension) {
    throw new Error("Couldn't find git extension");
  }

  const git = gitExtension.getAPI(1);

  const repo = git.repositories.find((repo) =>
    editorFilePath.includes(repo.rootUri.path)
  );

  if (!repo) {
    throw new Error(`Couldn't find git repo for file ${editorFilePath}`);
  }

  const allBranches = await repo.getBranches({ remote: true });

  try {
    const conf = workspace.getConfiguration(configurationName);
    const passwordPaths = await getPasswordPaths(activeEditor.document, output);

    let pickedBranch = conf.get<string>("diff.branch");

    if (!pickedBranch) {
      pickedBranch = await window.showQuickPick(
        allBranches.map((ref) => ref.name ?? ""),
        { title: "Select branch to compare with" }
      );

      if (!pickedBranch) {
        return window.showInformationMessage(
          "Cannot diff without selecting a branch"
        );
      }
    }

    const originalVault = await repo.show(pickedBranch, editorFilePath);
    const vaultFileBaseName = basename(editorFilePath);

    if (!isEncryptedText(originalVault)) {
      return window.showErrorMessage(
        `${vaultFileBaseName} on branch ${pickedBranch} doesn't seem to be encrypted`
      );
    }

    const tmpDir = getTmpPath();

    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir);
    }

    const { decryptedContent: decryptedModified, vault } = await tryDecrypt(
      passwordPaths,
      activeEditor.document,
      output
    );
    const tmpModifiedPath = `${tmpDir}/${vaultFileBaseName}_${repo.state.HEAD?.name}`;
    writeFileSync(tmpModifiedPath, decryptedModified ?? "");

    const decryptedOriginal = await vault.decrypt(originalVault, "");
    const tmpOriginalPath = `${tmpDir}/${vaultFileBaseName}_${pickedBranch.replace(
      /\//g,
      "_"
    )}`;
    writeFileSync(tmpOriginalPath, decryptedOriginal ?? "");

    await commands.executeCommand(
      "vscode.diff",
      Uri.file(tmpOriginalPath),
      Uri.file(tmpModifiedPath),
      `Vault Diff: ${vaultFileBaseName}`
    );

    // Clean up after creating temporary files that are needed vscode.diff
    await Promise.all([rm(tmpOriginalPath), rm(tmpModifiedPath)]);
  } catch (err) {
    return showError(err);
  }
};

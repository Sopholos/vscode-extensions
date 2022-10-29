import { extensions, workspace, window, commands, Uri } from "vscode";
import { GitExtension } from "../git";
import {
  getVault,
  isEncryptedDocument,
  isEncryptedText,
  showError,
} from "../util";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { rm } from "fs/promises";
import { basename } from "path";
import { configurationName } from "../extension";

export const diff = async () => {
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

  const conf = workspace.getConfiguration(configurationName);
  const keysRoot = conf.get<string>("keysRoot") ?? "";

  try {
    const vault = getVault(keysRoot, editorFilePath);

    let pickedBranch = conf.get<string>("diff.branch");

    if (!pickedBranch) {
      pickedBranch = await window.showQuickPick(
        repo.state.refs.map((ref) => ref.name ?? ""),
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

    const tmpDir = "./tmp";

    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir);
    }

    const decryptedOriginal = await vault.decrypt(originalVault, "");
    const tmpOriginalPath = `${tmpDir}/${vaultFileBaseName}_${pickedBranch}`;
    writeFileSync(tmpOriginalPath, decryptedOriginal ?? "");

    const decryptedModified = await vault.decrypt(
      activeEditor.document.getText(),
      ""
    );
    const tmpModifiedPath = `${tmpDir}/${vaultFileBaseName}_${repo.state.HEAD?.name}`;
    writeFileSync(tmpModifiedPath, decryptedModified ?? "");

    await commands.executeCommand(
      "vscode.diff",
      Uri.file(tmpOriginalPath),
      Uri.file(tmpModifiedPath),
      `Vault Diff: ${vaultFileBaseName}`
    );

    // Clean up after creating temporary files that are needed vscode.diff
    await Promise.all([
      rm(tmpOriginalPath, { recursive: true }),
      rm(tmpModifiedPath, { recursive: true }),
    ]);
  } catch (err) {
    return showError(err);
  }
};

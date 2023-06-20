import { OutputChannel, window } from "vscode";
import {
  isEncryptedDocument,
  replaceText,
  showError,
  getPasswordPaths,
} from "../util";
import { Vault } from "ansible-vault";
import { readFileSync } from "fs";
import { exec } from "child_process";

export const encrypt = async (output: OutputChannel) => {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor) {
    return window.showErrorMessage("No active text editor to encrypt");
  }

  if (isEncryptedDocument(activeEditor.document)) {
    return window.showErrorMessage("Text seems to already be encrypted");
  }

  try {
    const passwordPaths = await getPasswordPaths(activeEditor.document, output);

    const passwordPathToUse = await getPasswordPathToUse(passwordPaths);

    if (!passwordPathToUse) {
      return window.showInformationMessage(
        "Cannot encrypt without a password file"
      );
    }

    output.appendLine(
      `Encrypting ${activeEditor.document.fileName} using ${passwordPathToUse}`
    );

    let password = readFileSync(passwordPathToUse, "utf-8");

    if (password.startsWith("#!/bin/bash")) {
      password = await new Promise((resolve, reject) =>
        exec(passwordPathToUse, (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        })
      );
    }

    const vault = new Vault({ password: password.replace("\n", "") });

    const encryptedContent = await vault.encrypt(
      activeEditor.document.getText(),
      ""
    );

    await replaceText(activeEditor, encryptedContent);

    await activeEditor.document.save();
  } catch (err) {
    return showError(err);
  }
};

const getPasswordPathToUse = async (passwordPaths: string[]) => {
  let passwordToUse: string | undefined;

  if (passwordPaths.length > 1) {
    passwordToUse = await window.showQuickPick(passwordPaths, {
      title: "Select password file to use",
    });

    return passwordToUse;
  }

  return passwordPaths[0];
};

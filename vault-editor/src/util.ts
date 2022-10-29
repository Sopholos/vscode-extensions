import {
  TextDocument,
  TextEditor,
  Range,
  window,
  OutputChannel,
  workspace,
} from "vscode";
import { readFileSync } from "fs";
import { parse, dirname, join } from "path";
import { glob } from "glob";
import { Vault } from "ansible-vault";
import { configurationName } from "./extension";

export const isEncryptedText = (text: string) =>
  text.startsWith("$ANSIBLE_VAULT;");

export const isEncryptedDocument = (doc: TextDocument) =>
  isEncryptedText(doc.lineAt(0).text);

export const replaceText = async (editor: TextEditor, content: string) =>
  editor.edit((builder) => {
    builder.replace(
      new Range(
        editor.document.lineAt(0).range.start,
        editor.document.lineAt(editor.document.lineCount - 1).range.end
      ),
      content
    );
  });

export const showError = (err: any) => {
  window.showErrorMessage(
    typeof err === "string" ? err : err.message ?? "Something went wrong"
  );
};

export const decryptAndOutput = async (
  document: TextDocument,
  output: OutputChannel
) => {
  try {
    const conf = workspace.getConfiguration(configurationName);
    const keysRoot = conf.get<string>("keysRoot") ?? "";

    const editorFileName = document.fileName;
    const vault = getVault(keysRoot, editorFileName);

    const encryptedFileContent = readFileSync(editorFileName, "utf-8");
    const decrypted = await vault.decrypt(encryptedFileContent, undefined);

    output.append(`----- DECRYPTED ${editorFileName} -----\n`);
    output.append(`${decrypted ?? ""}\n`);
    output.show();
  } catch (err: any) {
    return showError(err);
  }
};

export const getVault = (keysRoot: string, encryptedFilePath: string) => {
  const encryptedFileName = parse(encryptedFilePath).name;

  const encryptedFileDirName = dirname(encryptedFilePath).split("/").pop();

  const getVaultKeyInRoot = () => {
    const vaultKeys = glob.sync("*.key", { cwd: keysRoot });

    const pathOfKeyUsedToEncryptFile = vaultKeys.find((vaultKeyFilePath) =>
      encryptedFileName.includes(parse(vaultKeyFilePath).name)
    );

    if (!pathOfKeyUsedToEncryptFile) {
      throw new Error(
        `No vault key file matches ${encryptedFileName}:\n${vaultKeys
          .map((vaultKey) => parse(vaultKey).name)
          .join("\n")}`
      );
    }

    return new Vault({
      password: readFileSync(
        join(keysRoot, pathOfKeyUsedToEncryptFile),
        "utf-8"
      ).replace("\n", ""),
    });
  };

  if (encryptedFileDirName) {
    const vaultKeys = glob.sync("**/*.key", { cwd: keysRoot });

    const pathOfVaultKeyFilesWithMatchingDir = vaultKeys.filter(
      (vaultKeyPath) =>
        dirname(vaultKeyPath).split("/").pop() === encryptedFileDirName
    );

    if (!pathOfVaultKeyFilesWithMatchingDir.length) {
      return getVaultKeyInRoot();
    }

    const pathOfKeyUsedToEncryptFile = pathOfVaultKeyFilesWithMatchingDir.find(
      (vaultKeyFilePath) =>
        encryptedFileName.includes(parse(vaultKeyFilePath).name)
    );

    if (!pathOfKeyUsedToEncryptFile) {
      throw new Error(
        `No vault key file matches ${encryptedFileName} in directory ${keysRoot}`
      );
    }

    return new Vault({
      password: readFileSync(
        join(keysRoot, pathOfKeyUsedToEncryptFile),
        "utf-8"
      ).replace("\n", ""),
    });
  } else {
    return getVaultKeyInRoot();
  }
};

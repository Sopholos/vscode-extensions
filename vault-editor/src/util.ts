import {
  TextDocument,
  TextEditor,
  Range,
  window,
  OutputChannel,
  workspace,
} from "vscode";
import { readFileSync, readdirSync, PathLike } from "fs";
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
    const editorFileName = document.fileName;
    const vault = getVault(editorFileName);

    const encryptedFileContent = readFileSync(editorFileName, "utf-8");
    const decrypted = await vault.decrypt(encryptedFileContent, undefined);

    output.append(`----- DECRYPTED ${editorFileName} -----\n`);
    output.append(`${decrypted ?? ""}\n`);
    output.show();
  } catch (err: any) {
    return showError(err);
  }
};

export const getVault = (encryptedFilePath: string) => {
  const conf = workspace.getConfiguration(configurationName);

  const keysFileExtension = conf.get<string>("keyExtension");
  const keysRoot = getKeysRoot();

  const encryptedFileName = parse(encryptedFilePath).name;
  const encryptedFileDirName = dirname(encryptedFilePath).split("/").pop();

  const vaultKeys = glob.sync(`**/*.${keysFileExtension}`, { cwd: keysRoot });

  const vaultKeysWithMatchingName = vaultKeys.filter((vaultKeyPath) =>
    encryptedFileName.includes(parse(vaultKeyPath).name)
  );

  if (vaultKeysWithMatchingName.length === 0) {
    throw new Error(
      `No vault key filename matches ${encryptedFileName} in directory ${keysRoot}`
    );
  }

  const vaultKeyWithMatchingDir = encryptedFileDirName
    ? vaultKeysWithMatchingName.find(
        (vaultKeyPath) =>
          dirname(vaultKeyPath).split("/").pop() === encryptedFileDirName
      )
    : undefined;

  if (vaultKeyWithMatchingDir) {
    return new Vault({
      password: readFileSync(
        join(keysRoot, vaultKeyWithMatchingDir),
        "utf-8"
      ).replace("\n", ""),
    });
  }

  return new Vault({
    password: readFileSync(
      join(keysRoot, vaultKeysWithMatchingName[0]),
      "utf-8"
    ).replace("\n", ""),
  });
};

export const getKeysRoot = () => {
  const conf = workspace.getConfiguration(configurationName);
  const keysRoot = conf.get<string>("keysRoot");

  if (!keysRoot) {
    throw new Error("No root directory set for encryption keys. Setting: \"keysRoot\"");
  }

  return keysRoot;
};

export const getTmpPath = () => {
  const conf = workspace.getConfiguration(configurationName);

  const tmpPath = conf.get<PathLike>("tmpPath");

  if(!tmpPath) {
    throw new Error("No directory set for temporary files. Setting: \"tmpPath\"");
  }

  return tmpPath;
};

import {
  TextDocument,
  TextEditor,
  Range,
  window,
  OutputChannel,
  workspace,
} from "vscode";
import { readFileSync, PathLike, existsSync } from "fs";
import { parse, dirname, join } from "path";
import { glob } from "glob";
import { Vault } from "ansible-vault";
import { configurationName } from "./extension";
import { homedir } from "os";
import { createInterface } from "readline";
import { exec } from "child_process";

export const isEncryptedText = (text: string) =>
  text.startsWith("$ANSIBLE_VAULT;");

export const isEncryptedDocument = (doc: TextDocument) =>
  isEncryptedText(doc.lineAt(0).text);

export const replaceText = async (editor: TextEditor, content: string) => {
  if (editor.document.isClosed) {
    throw new Error("Can't edit closed document");
  }

  editor.edit((builder) => {
    builder.replace(
      new Range(
        editor.document.lineAt(0).range.start,
        editor.document.lineAt(editor.document.lineCount - 1).range.end
      ),
      content
    );
  });
};

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

    const passwordPaths = await getPasswordPaths(document, output);

    const { decryptedContent } = await tryDecrypt(
      passwordPaths,
      document,
      output
    );

    output.append(`----- DECRYPTED ${editorFileName} -----\n`);
    output.append(`${decryptedContent ?? ""}\n`);
    output.show();
  } catch (err: any) {
    return showError(err);
  }
};

const getPasswordPathFromKeysDir = (
  keysRoot: string,
  encryptedFilePath: string
) => {
  const conf = workspace.getConfiguration(configurationName);

  const keysFileExtension = conf.get<string>("keyExtension");

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
    return join(keysRoot, vaultKeyWithMatchingDir);
  }

  return readFileSync(
    join(keysRoot, vaultKeysWithMatchingName[0]),
    "utf-8"
  ).replace("\n", "");
};

export const getKeysRoot = () => {
  const conf = workspace.getConfiguration(configurationName);
  const keysRoot = conf.get<string>("keysRoot");

  return keysRoot;
};

export const getTmpPath = () => {
  const conf = workspace.getConfiguration(configurationName);

  const tmpPath = conf.get<PathLike>("tmpPath");

  if (!tmpPath) {
    throw new Error('No directory set for temporary files. Setting: "tmpPath"');
  }

  return tmpPath;
};

const getAnsibleCfgPath = () => {
  const conf = workspace.getConfiguration(configurationName);
  const cfgPath = conf.get<string>("ansibleConfig");

  if (cfgPath) {
    return cfgPath;
  }

  const currentWorkspacePath = workspace.workspaceFolders?.[0].uri.fsPath;

  if (
    currentWorkspacePath &&
    existsSync(`${currentWorkspacePath}/ansible.cfg`)
  ) {
    return `${currentWorkspacePath}/ansible.cfg`;
  }

  const homeCfgPath = `${homedir()}/.ansible.cfg`;

  if (existsSync(homeCfgPath)) {
    return homeCfgPath;
  }

  const etcCfgPath = "/etc/ansible/ansible.cfg";

  if (existsSync(etcCfgPath)) {
    return etcCfgPath;
  }

  return undefined;
};

const getPasswordPathsFromAnsibleCfg = (cfgPath: string) => {
  const reader = createInterface({
    input: require("fs").createReadStream(cfgPath),
  });

  let isReadingDefaultsSection = false;
  let passwordFilePaths: string[] | undefined;

  reader.on("line", (line) => {
    const trimmedLine = line.trim();

    if (isReadingDefaultsSection) {
      if (trimmedLine.startsWith("vault_password_file")) {
        passwordFilePaths = [line.substring(line.indexOf("=") + 1).trim()];
        reader.close();
      } else if (line.trim().startsWith("vault_identity_list")) {
        passwordFilePaths = line
          .substring(line.indexOf("=") + 1)
          .trim()
          .split(",")
          .map((path) => path.trim());

        reader.close();
      }
    } else if (trimmedLine === "[defaults]") {
      isReadingDefaultsSection = true;
    } else if (trimmedLine.startsWith("[") && isReadingDefaultsSection) {
      reader.close();
    }
  });

  return new Promise<string[]>((resolve, reject) => {
    reader.on("close", () => {
      if (passwordFilePaths?.length) {
        return resolve(
          passwordFilePaths.map((path) => {
            let fixedPath = path.substring(path.indexOf("@") + 1);

            if (fixedPath.startsWith("~")) {
              return fixedPath.replace("~", homedir());
            }

            return fixedPath;
          })
        );
      }

      reject("Couldn't find any password files.");
    });
  });
};

export const getPasswordPaths = async (
  doc: TextDocument,
  output: OutputChannel
) => {
  const keysRoot = getKeysRoot();

  let passwordPaths: string[] | undefined;

  if (keysRoot) {
    output.appendLine(`Using keysRoot '${keysRoot}' to look for password`);

    passwordPaths = [getPasswordPathFromKeysDir(keysRoot, doc.fileName)];
  } else {
    output.appendLine(`'keysRoot' not set, looking for ansible.cfg file`);
    const cfgPath = getAnsibleCfgPath();

    if (cfgPath) {
      output.appendLine(`Found Ansible config file at ${cfgPath}`);
      passwordPaths = await getPasswordPathsFromAnsibleCfg(cfgPath);
    }
  }

  if (!passwordPaths) {
    throw new Error("Didn't find any password to use");
  }

  return passwordPaths;
};

export const tryDecrypt = async (
  passwordPaths: string[],
  document: TextDocument,
  output: OutputChannel
) => {
  for (const path of passwordPaths) {
    output.appendLine(
      `Attempting to decrypt ${document.fileName} using ${path}`
    );

    let password = readFileSync(path, "utf-8");

    if (password.startsWith("#!/bin/bash")) {
      password = await new Promise((resolve, reject) =>
        exec(path, (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        })
      );
    }

    const vault = new Vault({ password: password.replace("\n", "") });

    try {
      const decryptedContent = await vault.decrypt(document.getText(), "");

      return { decryptedContent, vault };
    } catch (e) {}
  }

  throw new Error(
    `None of the found passwords worked for ${
      document.fileName ?? "unknown file"
    }`
  );
};

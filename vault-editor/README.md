# Vault Editor

Encrypt, decrypt and diff files with Ansible Vault.

## How It Works

The extension will use the path provided in the `vaultEditor.keysRoot` setting to look for your encryption key files. By default, it will look for files ending with `.key`. You can change this with the `vaultEditor.keyExtension` setting.

A `.key` file will only be used if its name (excluding the file extension) is included in the name of the file that you're editing.

If your `vaultEditor.keysRoot` contains subdirectories, you may have multiple `.key` files with a matching name. In this case, it will try to find one whose directory name matches the directory name of the file you're editing. If that fails, it will use the first one it found.

### Example

Let's say you've opened `~/myProject/app1Secrets/developmentVault.yml` and run the `Vault: Decrypt File` command while your `vaultEditor.keysRoot` looks like this:

```
keysRoot
│   development.key
│
└────app1Secrets
│   │   development.key
│
└────app2Secrets
    │   qa.key
```

In this example, it would find both `keysRoot/development.key` and `keysRoot/app1Secrets/development.key` because "development" is included in the name of the opened file, `developmentVault.yml`. But it would use `keysRoot/app1Secrets/development.key` because the opened file also lives within a directory called `app1Secrets`.

## Commands

- `Vault: Edit File`: Decrypt a file and encrypt it again once you save it.

- `Vault: Encrypt File`: Encrypt a file.

- `Vault: Decrypt File`: Decrypt a file.

- `Vault: Diff File`: View the difference between an encrypted file and the corresponding encrypted file on another branch.

- `Vault: View File`: View the decrypted version of the encrypted file.

## Extension Settings

### Required Settings

- `vaultEditor.keysRoot`: Set the root directory of your encryption keys.

### Optional Settings

- `vaultEditor.decryptOnOpen`: Automatically decrypt text editors when they are opened and output the result to the `Vault Editor` output channel. The default is `true`.

- `vaultEditor.decryptOnStartup`: Automatically decrypt text editors that are open when VsCode is started and output the result to the `Vault Editor` output channel. The default is `true`.

- `vaultEditor.keyExtension`: The file extension to use when searching for encryption key files. The default is `key`.

- `vaultEditor.diff.branch`: Automatically use this branch to compare with instead of selecting one when running the `diff` command. The default is `null`.

- `vaultEditor.tmpPath`: Location of where to put the temporary (decrypted) files. The default is `/tmp/vault_editor/`.

## Source Code

[You can find the source code here.](https://gitlab.com/bageren/vscode-extensions/-/tree/master/vault-editor)

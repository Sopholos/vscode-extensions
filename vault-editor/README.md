# Vault Editor

Encrypt, decrypt and diff files with Ansible Vault.

## How It Works

Before using any of the commands, you need to set the root directory of your encryption keys with `vaultEditor.keysRoot`.

By default, it will look for files that end with `.key`. You can change this with the `vaultEditor.keyExtension` setting.

A `.key` file will only be used if its name (excluding the file extension) is included in the name of the file that you're running a command on.

If you split your encryption key directory into subdirectories, it will try to find a directory name that matches the directory name of the file that you're running the command on. In case of a match, it will only look for `.key` files within that directory.

### Example

Let's say you've opened `~/my_project/app1_secrets/development_vault.yml` and run the `Vault: Decrypt File` command while your encryption key directory looks like this:

```
keys_root
│   development.key
│
└────app1_secrets
│   │   development.key
│
│
└────app2_secrets
    │   development.key
```

In this example, it would look for the encryption key inside `keys_root/app1_secrets` and find `development.key` because "development" is included in the name of the opened file, `development_vault.yml`. If the `app1_secrets` directory didn't exists inside `keys_root`, it would use `keys_root/development.key` instead.

## Commands

- `Vault: Edit File`: Decrypt the file in focus and encrypt it again once you save it.

- `Vault: Encrypt File`: Encrypt the file in focus.

- `Vault: Decrypt File`: Decrypt the file in focus.

- `Vault: Diff File`: View the difference between the encrypted file in focus and the same encrypted file on another branch.

## Extension Settings

### Required Settings

- `vaultEditor.keysRoot`: Set the root directory of your encryption keys.

### Optional Settings

- `vaultEditor.decryptOnOpen`: Automatically decrypt text editors when they are opened and output the result to the `Vault Editor` output channel. The default is `true`.

- `vaultEditor.decryptOnStartup`: Automatically decrypt text editors that are open when VsCode is started and output the result to the `Vault Editor` output channel. The default is `true`.

- `vaultEditor.keyExtension`: The file extension to use when searching for encryption key files. The default is `key`.

- `vaultEditor.diff.branch`: Automatically use this branch to compare with instead of selecting one when running the `diff` command. The default is `null`.

## Source Code

[You can find the source code here.](https://gitlab.com/bageren/vscode-extensions/-/tree/master/vault-editor)

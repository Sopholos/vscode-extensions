# 0.0.12

- Change default `tmpPath` to `/tmp/vault_editor/` (was previously `./tmp`)
- Support Ansible config files and make them the default way of finding password files

# 0.0.14

- Fix broken diff command
- Also list remote branches when using diff command

# 0.0.15

- Fixed issue regarding the Edit command sometimes encrypting the wrong file on save

# 0.0.16

- Bug fix: Diff command didn't work if selected branch contained multiple slashes

# 0.0.17

- Strip vault ID's from ansible.cfg paths
- Allow bash script as password file

# 0.0.18

- Bug fix: If a password pointed to a bash script, it would only be executed to get the password when decrypting. Now it also works for encryption.

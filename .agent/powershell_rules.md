# PowerShell Guidelines for SkyJo_refonte

- **NEVER use `&&` to chain commands**. 
- The token `&&` is not a valid separator in this Windows PowerShell environment.
- Use `;` to separate commands (e.g., `cmd1 ; cmd2`) or run them as separate `run_command` calls.
- This is critical for avoiding `InvalidEndOfLine` and `ParserError` errors.

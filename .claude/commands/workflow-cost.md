Analyze token consumption and estimated cost for a Claude Code session.

Auto-detects the current project from git root. Includes parent + all subagent tokens.

## Instructions

1. If user passes `--help` or `-h`, run `workflow-cost --help` and display the output
2. Otherwise, run `workflow-cost` via Bash tool, passing any user-provided `$ARGUMENTS`
3. If no arguments, it analyzes the latest session for the current project
4. Display the output to the user

## Examples

```bash
workflow-cost --help                                      # full help with all modes & examples
workflow-cost                                             # latest session, current project
workflow-cost --scan-all                                  # ALL sessions cost history
workflow-cost --scan-all --last 20                        # last 20 sessions only
workflow-cost --scan-all --csv                            # export ALL sessions to CSV
workflow-cost --scan-all --csv --stats                    # regenerate CSV + stats + summary
workflow-cost --session <id>                              # specific session
workflow-cost --csv --workflow "ecc-dev-story" --story X   # append to tracking CSV
workflow-cost --csv --stats --workflow "dev" --story X     # append + stats + cost notice
workflow-cost --stats                                    # generate stats from CSV only
workflow-cost --report                                    # cumulative CSV summary
workflow-cost --project /path/to/other/project            # different project
```

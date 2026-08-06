# Content-conservation harness

Stored client documents must round-trip the editor unchanged — ProseMirror
silently drops unknown node types and attributes, so a missing extension or a
TipTap upgrade can erase content without any error. This harness pins our
assembly against that.

- `assembly.ts` — headless editor with the exact production extension set
  (plugins active), canonical comparison and the allowed-difference families.
- `../conservation.test.ts` — CI suite over a synthetic corpus.
- `corpus.ts` — that corpus: every node type, mark and degenerate shape seen
  in client content, with no client data (public repository).
A full sweep against real client databases exists outside this repository
(client data and identifiers are private); re-run it on fresh production
dumps before changing anything in the editor schema.

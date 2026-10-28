# Daily Reading — public library migration
The user authorized full migration on 2026-10-21. Migration acceptance is complete;
daily content updates use an isolated migration branch, then the existing main/Actions gates.
Keep the original private application and the verified baseline until acceptance.
Only reviewed original books may be published. Preserve book/chapter IDs and audio bytes.
Audio belongs in one Release per book, never Git or the Pages artifact.
No runtime servers, database dependencies, accounts, secrets or external proxies.
Progress is device-local. All local files and test profiles stay inside the parent project.
Do not delete source data or circumvent blocked cleanup. Retain old books and assets.
Deploy main only after complete migration tests pass.
New original ZIPs must pass the current shared dedup admission before any NotebookLM
submission, recording, attachment or publication. Follow DEDUP.md. Published semantic
coverage remains explicitly limited; a successful catalog read is not remote coordination.

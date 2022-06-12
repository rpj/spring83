> *key*: a public key on the Ed25519 curve, formatted as 64 hex characters.
- https://github.com/robinsloan/spring-83-spec/blob/main/draft-20220609.md?plain=1#L43

OpenSSL versions prior to 3.0 cannot sign with ed25519 key pairs. Nor can node.js' crypto library. I don't think they are (yet) suitable for this use case because support is not yet widely available to create signatures with them.

> `/ed[0-9]{4}$/`
- https://github.com/robinsloan/spring-83-spec/blob/main/draft-20220609.md?plain=1#L74

`/ed20(\d{2})$/`

> The client must verify that the `<signature>` is valid for `<key>` and `<board>` before processing or displaying the board. If the signature is not valid, the client must drop the response and remove the server from its list of trustworthy peers.
>
> (TKTK clients should assist servers with out-of-date boards.)
- https://github.com/robinsloan/spring-83-spec/blob/main/draft-20220609.md?plain=1#L368-L370

There shouldn't - really, can't - be a new, separate client for this. HTTP & HTML already have a client, the most ubiquitous on the planet: the web browser.

The headers can remain so _if_ Spring 83-specific clients are developed they can leverage them, but these must not be a requirement: https://mydomain.com:1783/aKey entered into my browser's address bar must be enough.

To that point: since port 17 is already reserved for QOTD and accordingly will be rejected by most browsers, I'd propose `1783` as the canonical port. It pays homage to the QOTD protocol (17) & the year used in naming inspiration (83), and given that it is outside of the 1-1024 reserved range, it can be served without superuser privilege if desired. Simplicity, right?
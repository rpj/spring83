An implementation of the [Spring 83 protocol](https://github.com/robinsloan/spring-83-spec).

Very much a work-in-progress. This was built in reference to [`draft-20220616.md`@`0f63d3d2`](https://github.com/robinsloan/spring-83-spec/blob/0f63d3d25125106ad23428bcdaeb43b2c7840d53/draft-20220616.md).

## Setup

Requires [node.js](https://nodejs.org/) 16 or greater.

```
$ npm install
```

## Tools

### `findkey`

Randomly generates Ed25519 key pairs until one matching the specified format has been found.

If called with `--strict`, will _only_ return when a key pair is found that is valid _this calendar year_.

Output format is the following four lines:

```
privateKey <private key in hex>
publicKey <public key in hex>
<number of rounds required>
<total runtime in milliseconds>
```

### `putnew`

```
$ putnew host privKeyHex htmlFile
```

Puts a new board with HTML source `htmlFile` to `host` with private key (in hex) `privKeyHex`.

Will insert the required `<meta http-equiv="last-modified" content="...">` tag, with the appropriate `content` value, if it doesn't exist in the document already.

### `serve`

Runs a Spring-83 server on port specified by environment variable `SPRING83_BIND_PORT` (or `1783` by default) & binding to `SPRING83_BIND_HOST` (or `0.0.0.0` by default).

Writes boards into `SPRING83_CONTENT_DIR` (or `./.content` by default).

If Docker is available, can be run simply with `docker compose up --build -d`: `SPRING83_CONTENT_DIR_HOST` must be specified to be the host-side path for which `SPRING83_CONTENT_DIR` will map to internally.

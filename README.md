An implementation of the [Spring 83 protocol](https://github.com/robinsloan/spring-83-spec).

Very much a work-in-progress. This was built in reference to [`draft-20220616.md`@`0f63d3d2`](https://github.com/robinsloan/spring-83-spec/blob/0f63d3d25125106ad23428bcdaeb43b2c7840d53/draft-20220616.md).

## Setup

Requires [node.js](https://nodejs.org/) 16 or greater.

```
$ npm install
```

## Interacting

Robin has a truly impressive client available [online here](https://followersentinel.com/) ([GitHub](https://github.com/robinsloan/the-oakland-follower-sentinel)). It is the ideal way to view and post boards from and to multiple S83 hosts. His host is running at [https://bogbody.biz](https://bogbody.biz).

This implementation is running at [https://0l0.lol](https://0l0.lol) and [https://spring83.rkas.net](https://spring83.rkas.net). If you'd like to be listed here, just send mail to include-my-key@0l0.lol with your hex public key as the subject, or submit a PR with your key added to [`public-boards.json`](/public-boards.json).

### Other known implementations

| Name | Language | Instance |
| -------------------------- | ------------------- | -------------------------|
| [davemenninger/exspring83](https://github.com/davemenninger/exspring83) | elixir | |
| [njbennett/elderflower](https://github.com/njbennett/elderflower) | elixir | |
| [llimllib/springer](https://github.com/llimllib/springer) | golang | |
| [motevets/springboard](https://github.com/motevets/springboard) | golang | https://spring83.kindrobot.ca/ |
| [pteichman/ahoy](https://github.com/pteichman/ahoy) | golang | |
| [royragsdale/s83](https://github.com/royragsdale/s83) | golang | https://may83.club |
| [cellu_cc/so83-gpu (gitlab)](https://gitlab.com/cellu_cc/so83-gpu) | opencl | |
| [michael-lazar/lets-dance](https://github.com/michael-lazar/lets-dance) | python | https://spring83.mozz.us |

## Server

### `serve`

Runs a Spring-83 server on port specified by environment variable `SPRING83_BIND_PORT` (or `1783` by default) & binding to `SPRING83_BIND_HOST` (or `localhost` by default).

Writes boards into `SPRING83_CONTENT_DIR` (or `./.content` by default).

If Docker is available, an image is published to Docker Hub [as <code>0l0lol/serve</code>](https://hub.docker.com/r/0l0lol/serve) or `serve` can be run from this repo directly: `docker compose up --build -d serve`.

#### Usage

See [DEPLOYMENT.md](./DEPLOYMENT.md).

#### Server federation

This implementation supports an early and limited form of server federation per the discussion
on [Issue #6](https://github.com/rpj/spring83/issues/6).

Federation will not work correctly on your instance unless you have:
* specified `SPRING83_FQDN` correctly for your setup and
* added that FQDN to [`constants.federate.knownS83Hosts`](https://github.com/rpj/spring83/blob/main/common/constants.js#L69)

Any incoming `PUT` request with either:
* a `Via` header
* a `<meta name="spring:share" content="false">` tag in the body

will **NOT** be queued for federation. [`putnew`](#putnew) (detailed below) adds this meta tag _by default_, behavior that can be disabled with `--share true`.

The response to a successful `PUT` request that _lacks_ one of the above will include the `spring-federated-to` header, the value of which is a comma-separated list of external hosts
that the board has been _queued_ to be shared with.

#### POST endpoint

This server implements an extension to the (current) protocol: `POST /key`.

Accepting exactly the same body & header set as `PUT /key` (plus an additional optional header, detailed below), this endpoint will minify the board & auto-shorten any HTTP(S) links it finds, returning the resulting document to be re-signed and `PUT` normally by the user in possesion of the private key matching `key`. It does not modify anything server-side, only transforming and returning the original request body.

Either (or both, though what's the point of that) behaviors can be disabled via the `Spring-Shortener-Disable` header, a comma-separated list of behavior to disable. The values for these are: `shorten-links`, and `minify`. Additionally, the value `shorten-board-links` can be included to disable shortening links to other Springboards, ensuring they can render inline as expected in clients such as [the Follower Sentinel](https://followersentinel.com/).

#### QR Code generation

The following endpoints generate a QR code of the specified Spring '83 public key, by default with no adornment.

For `image/png`:
* `GET /key` with `Content-Type: image/png`
or
* `GET /key.png`

For `text/html` with live decode example:
* `GET /qrcode/key`

##### Query parameter options:

* `full` &mdash; presence of this option generates a QR code with the full URL, not just the <i>key</i>.
* `springHost` &mdash; the Spring '83 host to generate a QR code, defaults to this host. Just the hostname (no protocol scheme "http://").

##### Examples

Equivalent:
* `curl https://0l0.lol/f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623.png`
* `curl -H 'Content-type: image/png' https://0l0.lol/f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623`

Different hosts:
* https://0l0.lol/f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623.png?full&springHost=bogbody.biz
* https://0l0.lol/f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623.png?full&springHost=spring83.kindrobot.ca

Live-decode HTML:
* https://0l0.lol/qrcode/f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623?full&springHost=bogbody.biz

## Tools

### `putnew`

```
To put a single board:    putnew host privKeyHex htmlFile
To put a path of boards:  putnew boardPath hostsCommaSeperated

Boards will be minified & have HTTP(S) links shortened by default (except Springboard links).
Pass --no-minify and/or --no-shorten to disable these behaviors.
To also shorten Springboard links, pass --shortenBoardLinks true

By default, boards will be marked to NOT be shared with other federated hosts.
        This adds at least 42 bytes.
To instead mark your board to be shared, pass: --share true
```

Available on [Docker Hub as `0l0lol/putnew`](https://hub.docker.com/r/0l0lol/putnew/tags) to
enable usage without needing `node` locally, like so:

```
$ docker run -it --rm -v $PWD:/home 0l0lol/putnew:latest ...
```

Operates in two modes: single board PUT or multi-board PUT.

#### Single-board

Puts a new board with HTML source `htmlFile` to `host` with private key (in hex) `privKeyHex`.

Will insert the required `<time datetime="...">` tag, with the appropriate `datetime` value, if it doesn't exist in the document already.

An example via the Docker Hub image:

```
$ docker run -it --rm -v $PWD:/home 0l0lol/putnew:latest https://0l0.lol ... f13571200686a9a1bae0952bf2b741e6ad4fb84082ad02cebd32fa8ea83e0623.html
f13571200686a9a1bae0952bf2b741e6ad4fb84082ad02cebd32fa8ea83e0623.html: appended <time>, which added 84 bytes
f13571200686a9a1bae0952bf2b741e6ad4fb84082ad02cebd32fa8ea83e0623.html: minified 4% (5 bytes) -> 107 total
https://0l0.lol PUT https://0l0.lol/f13571200686a9a1bae0952bf2b741e6ad4fb84082ad02cebd32fa8ea83e0623 200
```

#### Multi-board

Expects `boardPath` to be a directory containing board HTML files named with their full hex public key, and keypair files named according to the canonical pattern. So for example, a path named `./my-boards` with the following contents is valid (assuming the keypair files are valid of course):

```
1b30ed15e51e6faa3afb3605212d8cdb80177dfedc30a0d0939d26ec683e1023.html
977b0a43de51225240128101105f0397cb2cde59801a74c40ad99c69183e0423.html
spring-83-keypair-2022-06-19-1b30ed15e51e.txt
spring-83-keypair-2022-06-19-977b0a43de51.txt
```

If `putnew` is then invoked like so:

```
$ putnew ./my-boards https://bogbody.biz,https://0l0.lol
```

it will post both boards to both listed hosts.

An example via the Docker Hub image:

```
$ docker run -it --rm -v $PWD:/home 0l0lol/putnew:latest ./dockerTest/ https://0l0.lol
Posting 1 boards to: https://0l0.lol
f13571200686a9a1bae0952bf2b741e6ad4fb84082ad02cebd32fa8ea83e0623.html: appended <time>, which added 83 bytes
f13571200686a9a1bae0952bf2b741e6ad4fb84082ad02cebd32fa8ea83e0623.html: minified 4% (5 bytes) -> 107 total
https://0l0.lol PUT https://0l0.lol/f13571200686a9a1bae0952bf2b741e6ad4fb84082ad02cebd32fa8ea83e0623 200
```

### `findkey`

**Update**: This script is left in the repo for posterity, but [PT's Go keyfinder](https://github.com/pteichman/ahoy) is <i>much</i> faster and generates canonically-formatted keys as well. It's what I'm using now.

Randomly generates Ed25519 key pairs until one matching the specified format has been found.

If called with `--strict`, will _only_ return when a key pair is found that is valid _this calendar year_.

The output format matches the format that [the client](https://followersentinel.com/) and will be named in the same format.

## Contributing

Contributions are encouraged & welcomed! See [CONTRIBUTING.md](./CONTRIBUTING.md) for process information.

## License

[MIT License](./LICENSE)

Copyright (c) 2022 Ryan Joseph & contributors

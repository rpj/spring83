An implementation of the [Spring 83 protocol](https://github.com/robinsloan/spring-83-spec).

Very much a work-in-progress. This was built in reference to [`draft-20220616.md`@`0f63d3d2`](https://github.com/robinsloan/spring-83-spec/blob/0f63d3d25125106ad23428bcdaeb43b2c7840d53/draft-20220616.md).

## Setup

Requires [node.js](https://nodejs.org/) 16 or greater.

```
$ npm install
```

## Tools

### `putnew`

```
To put a single board: putnew host privKeyHex htmlFile
To put path of boards: putnew boardPath hostsCommaSeperated
```

Operates in two modes: single board PUT or multi-board PUT.

#### Single-board

Puts a new board with HTML source `htmlFile` to `host` with private key (in hex) `privKeyHex`.

Will insert the required `<time datetime="...">` tag, with the appropriate `datetime` value, if it doesn't exist in the document already.

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

### `serve`

Runs a Spring-83 server on port specified by environment variable `SPRING83_BIND_PORT` (or `1783` by default) & binding to `SPRING83_BIND_HOST` (or `0.0.0.0` by default).

Writes boards into `SPRING83_CONTENT_DIR` (or `./.content` by default).

If Docker is available, can be run simply with `docker compose up --build -d`: `SPRING83_CONTENT_DIR_HOST` must be specified to be the host-side path for which `SPRING83_CONTENT_DIR` will map to internally.

Other environment variables you should set:
  * `SPRING83_FQDN`: your fully-qualified domain name (no protocol scheme, e.g. `0l0.lol`)
  * `SPRING83_CONTACT_ADDR`: a contact email address for your site

### `findkey`

**Update**: This script is left in the repo for posterity, but [PT's Go keyfinder](https://github.com/pteichman/ahoy) is <i>much</i> faster and generates canonically-formatted keys as well. It's what I'm using now.

Randomly generates Ed25519 key pairs until one matching the specified format has been found.

If called with `--strict`, will _only_ return when a key pair is found that is valid _this calendar year_.

The output format matches the format that [Robin's client expects](https://github.com/robinsloan/spring-83-spec/tree/main/demo-client) and will be named in the same format.

## Interacting

Robin has a truly impressive client available [online here](https://followersentinel.com/) ([GitHub](https://github.com/robinsloan/the-oakland-follower-sentinel)). It is the ideal way to view and post boards from and to multiple S83 hosts. His host is running at [https://bogbody.biz](https://bogbody.biz).

This implementation is running at [https://0l0.lol](https://0l0.lol) and [https://spring83.rkas.net](https://spring83.rkas.net). If you'd like to be listed here, just send mail to include-me-s83@0l0.lol with your hex public key as the subject, or submit a PR with your key added to [`public-boards.json`](/public-boards.json).

### Other known implementations

| Name | Language | Instance |
| -------------------------- | ------------------- | -------------------------|
| [davemenninger/exspring83](https://github.com/davemenninger/exspring83) | elixir | |
| [llimllib/springer](https://github.com/llimllib/springer) | golang | |
| [motevets/springboard](https://github.com/motevets/springboard) | golang | https://spring83.kindrobot.ca/ |
| [pteichman/ahoy](https://github.com/pteichman/ahoy) | golang | |
| [royragsdale/s83](https://github.com/royragsdale/s83) | golang | |
| [cellu_cc/so83-gpu (gitlab)](https://gitlab.com/cellu_cc/so83-gpu) | opencl | |
| [michael-lazar/lets-dance](https://github.com/michael-lazar/lets-dance) | python | https://spring83.mozz.us |

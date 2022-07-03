## Deploying `serve`

Currently, deploying with Docker _requires_ a Linux host as it utilizies the host networking mode. This will be fixed one day.

### With Docker compose

`SPRING83_CONTENT_DIR_HOST` must be specified to be the host-side path for which `SPRING83_CONTENT_DIR` will map to internally.

Other environment variables you should set:
  * `SPRING83_FQDN`: your fully-qualified domain name (no protocol scheme, e.g. `0l0.lol`)
  * `SPRING83_CONTACT_ADDR`: a contact email address for your site

### With the Docker hub image

```
docker run --env-file <env-file> --network host -v <local-content-path>:/content -d 0l0lol/serve:latest
```

where `<env-file>` should look like this to conform to the above:

```
SPRING83_FQDN=your.fqdn
SPRING83_CONTACT_ADDR=your.add@your.fqdn
```

(`CONTENT_DIR` settings not necesary because...)

`<local-content-path>` is the path where you want content stored on the host.

### Full example (Docker hub)

This example follows the (actual) setup of the author's development instance [lol.0l0.lol](https://lol.0l0.lol).

1. Create a `env` file specifying the required environment variables. This example names it `serve.env` in the user's home directory.
```shell
$ cat serve.env
SPRING83_FQDN=lol.0l0.lol
SPRING83_CONTACT_ADDR=dev@0l0.lol
```
2. Issue the `docker run` command for `0l0lol/serve:latest`. If the image is not already available on your machine, it will be fetched as shown here:
```shell
$ docker run --env-file serve.env --rm --network host -v /home/user/.spring83:/content -d 0l0lol/serve:latest
Unable to find image '0l0lol/serve:latest' locally
latest: Pulling from 0l0lol/serve
8d6f14519815: Pull complete
...
915d0a8f1458: Pull complete
Digest: sha256:86d2165424cd7377ffe4d897488adc30a648711eda067754537908a49c5a2c77
Status: Downloaded newer image for 0l0lol/serve:latest
4969cc439d5221e22277ed6048ea0f5184fdc95d76d94c49529bb5628f498ced
```
The `-v /home/user/.spring83:/content` option is important: it defines the volume binding for the container-internal `/content` directory, where all boards and databases will be written.

Here, it's defining `/home/user/.spring83` as the host-side path for content storage.

Use `docker run --help`/see [here](https://docs.docker.com/engine/reference/run/) for more information on the other command line options.

3. Run `docker ps` to verify the container is now running with the `0l0lol/serve:latest` image:
```shell
$ docker ps
CONTAINER ID   IMAGE                 COMMAND                  CREATED          STATUS         PORTS     NAMES
4969cc439d52   0l0lol/serve:latest   "docker-entrypoint.s…"   26 seconds ago   Up 7 seconds             priceless_bassi
```
4. Now run `docker logs` to view the log stream and ensure correct behavior:
```shell
$ docker logs -f 4969cc439d52
{"level":30,"time":1656223559941,"pid":1,"hostname":"lol.0l0.lol","msg":"ttlKiller awake, expiry=Fri Jun 03 2022 23:05:59 GMT-0700 (Pacific Daylight Time)"}
{"level":30,"time":1656223559942,"pid":1,"hostname":"lol.0l0.lol","msg":"f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623 (2022-06-26T06:04:13.412Z) has 22 days TTL"}
{"level":30,"time":1656223560046,"pid":1,"hostname":"lol.0l0.lol","msg":"Server listening at http://127.0.0.1:1783"}
{"level":30,"time":1656223560068,"pid":1,"hostname":"lol.0l0.lol","msg":"Found 1 pre-existing boards in /content"}
{"level":30,"time":1656223560069,"pid":1,"hostname":"lol.0l0.lol","msg":"Listening on localhost:1783 with FQDN lol.0l0.lol"}
```
5. Lastly, after some boards have been posted, observe the content directory (defined and discussed in step #2 above):
```shell
$ ls -1 ~/.spring83/
f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623.html
f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623.json
shortener.sqlite3
```

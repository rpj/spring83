/* Embeds an 0l0.lol SpringBoard (by default, can be changed via the `springHost` parameter)
   into a containing document.

  @param `pubKey` the board to embed's public key (in hex)
  @param `contEleId` the outter container element to embed the board within
          (the element to which the shadow root will be attached)
  @param `doneCb` a function to be called once the board has been embedded.
          parameters passed will be the HTMLElement representing `contEleId`, and the update Date.
  @param `intContTagType` the internal container element type to be created
  @param `springHost` the host to fetch the board from
*/
async function embedSpringBoard (pubkey, contEleId, doneCb, intContTagType = 'html', springHost = '0l0.lol') { // eslint-disable-line no-unused-vars
  const res = await fetch(`https://${springHost}/${pubkey}`);
  if (res.ok) {
    const body = await res.text();
    const s83 = document.getElementById(contEleId);
    if (!s83.shadowRoot) {
      s83.attachShadow({ mode: 'open' });
    } else {
      while (s83.shadowRoot.firstChild) {
        s83.shadowRoot.removeChild(s83.shadowRoot.firstChild);
      }
    }

    try {
      const cont = document.createElement(intContTagType);
      const parsedDoc = new DOMParser().parseFromString(body, 'text/html'); // eslint-disable-line no-undef
      let targetNode = parsedDoc.firstChild;

      while (!targetNode.firstChild || targetNode.nodeName === '#comment') {
        targetNode = targetNode.nextSibling;
      }

      if (targetNode) {
        cont.appendChild(targetNode);
      } else {
        cont.innerHTML = body;
      }

      s83.shadowRoot.appendChild(cont);
      const upDate = new Date(Date.parse(res.headers.get('last-modified')));
      doneCb?.(s83, upDate);
    } catch (err) {
      console.error(`Unparseable board: ${err}`);
    }
  }
}

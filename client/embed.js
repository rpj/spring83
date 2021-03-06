/* eslint-disable no-undef, no-unused-vars */
'use strict';

const defaultOptions = Object.freeze({
  springHost: window.location.origin,
  intContTagType: 'html',
  embedMode: undefined
});

/* Utility functions that force the host to the one in the function name */
const embed0l0Board = embedBoardForcedHost.bind(null, 'https://0l0.lol');
const embedBogbodyBoard = embedBoardForcedHost.bind(null, 'https://bogbody.biz');
const embedKindrobotBoard = embedBoardForcedHost.bind(null, 'https://spring83.kindrobot.ca');

/* Embeds a SpringBoard into a containing document.

  @param `pubKey` the board to embed's public key (in hex)
  @param `contEleId` the outter container element to embed the board within
          (the element to which the shadow root will be attached)
  @param `options`:
          `intContTagType`: the internal container element type to be created
          `springHost`: the host to fetch the board from, defaults to window.location.origin
          `embedMode`: if set to 'jsonOnly', will not embed the board's HTML into the outer document's
            DOM, and will instead just return any parsed JSON found.
  @returns `Promise<object>` where object is undefined on failure and on success has the properties:
          * `containerElement`: the HTMLElement representing `contEleId`
          * `upDate`: the last-modified Date
          * `embeddedJson`: if any embedded JSON was found in comments and parsed successfully,
            and array of those objects in the order they were found in the document
*/
async function embedSpringBoard (pubkey, contEleId, options = {}) {
  const { springHost, intContTagType, embedMode, boardIdEleId } = { ...defaultOptions, ...options };

  const res = await fetch(`${springHost}/${pubkey}`, {
    headers: {
      'spring-version': 83
    }
  });
  if (res.ok) {
    const body = await res.text();
    const s83 = document.getElementById(contEleId);

    if (embedMode !== 'jsonOnly') {
      if (!s83.shadowRoot) {
        s83.attachShadow({ mode: 'open' });
      } else {
        while (s83.shadowRoot.firstChild) {
          s83.shadowRoot.removeChild(s83.shadowRoot.firstChild);
        }
      }
    }

    try {
      const cont = document.createElement(intContTagType);
      const parsedDoc = new DOMParser().parseFromString(body, 'text/html');

      if (!parsedDoc) {
        return;
      }

      fixupBoardLinks(parsedDoc, contEleId, options);
      const embeddedJson = parseCommentsForJson(parsedDoc);
      const upDate = new Date(Date.parse(res.headers.get('last-modified')));

      if (embedMode !== 'jsonOnly') {
        let targetNode = parsedDoc.firstChild;

        // skips initial comment nodes
        while (targetNode && (!targetNode.firstChild || targetNode.nodeName === '#comment')) {
          targetNode = targetNode.nextSibling;
        }

        if (targetNode) {
          cont.appendChild(targetNode);
        } else {
          cont.innerHTML = body;
        }

        const boardIdEle = document.getElementById(boardIdEleId);
        if (boardIdEle) {
          boardIdEle.textContent = pubkey;
        }

        s83.shadowRoot.appendChild(cont);
      }

      return {
        containerElement: s83,
        upDate,
        embeddedJson
      };
    } catch (err) {
      console.error(`Unparseable board: ${err}`);
    }
  }
}

async function embedBoardForcedHost (springHost, pubkey, contEleId, options = {}) {
  return embedSpringBoard(pubkey, contEleId, { ...options, springHost });
}

const knownS83Hosts = ['bogbody.biz', '0l0.lol', 'spring83.kindrobot.ca', 'spring83.rkas.net', 'spring83.mozz.us', 'lol.0l0.lol'];
const keyMatchRegex = /83e(0[1-9]|1[0-2])(\d\d)$/;

function fixupBoardLinks (parentNode, contEleId, options) {
  for (const child of parentNode.childNodes) {
    if (child.tagName === 'A') {
      let checkUrl;
      try {
        checkUrl = new URL(child.attributes.href.value);
      } catch (err) {
        // invalid URL, so nothing to fixup: skip
        continue;
      }

      if (!knownS83Hosts.includes(checkUrl?.host)) {
        return;
      }

      const s83Key = checkUrl?.pathname.replace(/^\//, '');
      if (s83Key?.length !== 64) {
        return;
      }

      if (!s83Key.match(keyMatchRegex)) {
        return;
      }

      child.addEventListener('click', (e) => {
        e.preventDefault();
        embedSpringBoard(s83Key, contEleId, { ...options, springHost: checkUrl.origin });
        return false;
      });
    }

    if (child.childNodes.length > 0) {
      fixupBoardLinks(child, contEleId, options);
    }
  }
}

function parseCommentsForJson (parentNode, retList = []) {
  for (const child of parentNode.childNodes) {
    if (child.nodeName === '#comment') {
      try {
        retList.push(JSON.parse(child.textContent));
      } catch {}
    } else if (child.childNodes.length > 0) {
      parseCommentsForJson(child, retList);
    }
  }

  return retList;
}

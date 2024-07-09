import rdapValidator from "./rdap-validator.js";

rdapValidator.setXHR(XMLHttpRequest);

rdapValidator.setTestCompleteCallback(function() {
    const testedURL = new URL(rdapValidator.lastTestedURL);
    window.title = "RDAP Validator : " + testedURL.pathname.split("/").pop() + " : " + rdapValidator.lastTestedResponseType + " : " + rdapValidator.lastTestedServerType;

    const url = document.createElement('a');
    url.href = window.location.href;
    url.search =    '?url=' + escape(rdapValidator.lastTestedURL) +
                    '&type=' + escape(rdapValidator.lastTestedResponseType) +
                    '&server-type=' + escape(rdapValidator.lastTestedServerType);

    if (document.getElementById("errors-only").checked) url.search += '&errors-only=1';

    window.history.pushState(null, window.title, url.href);

    document.getElementById("tree").appendChild(jsonToHTML(rdapValidator.lastTestedResponse, "response-$"));
});

function jsonToHTML(value, path, objectIsReallyArray) {
    if (rdapValidator.isObject(value)) {
        const div = document.createElement("div");
        div.classList.add("json-container");
        if (path) div.id = path;

        div.appendChild(document.createTextNode(true === objectIsReallyArray ? '[' : '{'));

        for (var i = 0 ; i < Object.keys(value).length ; i++) {
            const k = Object.keys(value).at(i);

            const details = div.appendChild(document.createElement("details"));
            details.open = true;

            const summary = jsonToHTML(true === objectIsReallyArray ? parseInt(k) : k);
            summary.classList.add("json-key");
            summary.appendChild(document.createTextNode(":"));
            details.appendChild(document.createElement("summary")).appendChild(summary);

            const contentDiv = details.appendChild(document.createElement("div"));
            contentDiv.classList.add("json-value");

            const suffix = (true === objectIsReallyArray ? "[" + k + "]" : "." + k);
            const content = jsonToHTML(value[k], path ? path + suffix : undefined);
            contentDiv.appendChild(content);

            if (i !== Object.keys(value).length-1) {
                content.appendChild(document.createTextNode(","));
            }
        }

        div.appendChild(document.createTextNode(true === objectIsReallyArray ? ']' : '}'));

        return div;

    } else if (rdapValidator.isArray(value)) {
        const obj = {};
        for (var i = 0 ; i < value.length ; i++) {
            obj[i] = value[i];
        }

        return jsonToHTML(obj, path, true);

    } else {
        const pre = document.createElement("pre");
        if (path) pre.id = path;

        pre.appendChild(document.createTextNode(JSON.stringify(value)));
        return pre;
    }
}

/**
 * See https://stackoverflow.com/questions/45408920/plain-javascript-scrollintoview-inside-div
 */
function scrollParentToChild(parent, child) {

  // Where is the parent on page
  var parentRect = parent.getBoundingClientRect();
  // What can you see?
  var parentViewableArea = {
    height: parent.clientHeight,
    width: parent.clientWidth
  };

  // Where is the child
  var childRect = child.getBoundingClientRect();
  // Is the child viewable?
  var isViewable = (childRect.top >= parentRect.top) && (childRect.bottom <= parentRect.top + parentViewableArea.height);

  // if you can't see the child try to scroll parent
  if (!isViewable) {
        // Should we scroll using top or bottom? Find the smaller ABS adjustment
        const scrollTop = childRect.top - parentRect.top;
        const scrollBot = childRect.bottom - parentRect.bottom;
        if (Math.abs(scrollTop) < Math.abs(scrollBot)) {
            // we're near the top of the list
            parent.scrollTop += scrollTop;
        } else {
            // we're near the bottom of the list
            parent.scrollTop += scrollBot;
        }
  }

}

rdapValidator.setResultCallback(function(result, message, path, ref) {

    if (false !== result && document.getElementById("errors-only").checked) return;

    const li = document.getElementById("results").appendChild(document.createElement("li"));
    li.classList.add("list-group-item", "list-group-item-action");
    if (false === result) li.classList.add("list-group-item-danger");

    message = (null === result ? "ℹ️" : (true === result ? "✅" : "❌")) + message;

    const msgspan = document.createElement("span");
    msgspan.appendChild(document.createTextNode(message));
    msgspan.title = path;

    li.appendChild(msgspan);

    if ("$" !== path) {
        li.addEventListener("click", function(event) {
            event.preventDefault();

            const el = document.getElementById("response-" + path) ?? document.getElementById("response-" + JSONPathParent(path));

            console.log("reveal()");
            console.log(el);
            reveal(el);
            expand(el);

            scrollParentToChild(document.getElementById("tree"), el);

            let opacity = 1;
            const func = function() {
                el.style.setProperty("background-color", "rgba(255, 255, 0, " + opacity + ")");
                el.style.setProperty("border-color", "rgba(128, 128, 0, " + opacity + ")");
                if (opacity > 0) {
                    opacity /= 1.25;
                    if (opacity <= .01) opacity = 0;
                    setTimeout(func, 100);
                }
            }
            setTimeout(func, 100);
    
        });
    }

    if (ref) {
        li.appendChild(document.createTextNode(" "));

        const a = li.appendChild(document.createElement("a"));

        a.appendChild(document.createTextNode("📖"));

        a.setAttribute("href", ref);
        a.setAttribute("target", "_blank");
        a.setAttribute("title", "Open link to specification in a new window");

        a.style.setProperty("vertical-align", "super");
        a.style.setProperty("font-size", "small");
    }
});

function JSONPathParent(path) {
    if (0 === path.length) {
        return undefined;
    }

    switch(path.charAt(path.length-1)) {
        case '$':
            return undefined;

        case ']':
            return path.replace(/\[\d+\]$/, '');

        default:
            return path.replace(/\.[^\.]+$/, '');
    }
}

function expand(el) {
    if ("details" == el.localName) {
        el.open = true;
    }
    el.childNodes.forEach(expand);
}

function reveal(el) {
    if (el instanceof HTMLElement) {
        if ("details" == el.localName) {
            el.open = true;

        } else if ("body" === el.localName) {
            return;

        }

        reveal(el.parentNode);
    } else {
        console.log("reveal() got something that wasn't an element");
        console.log(el);
    }
}

const responseTypeSelect = document.getElementById("response-type");

Object.keys(rdapValidator.responseTypes).forEach(function(type) {
    const option = responseTypeSelect.appendChild(document.createElement("option"));
    option.setAttribute("value", type);
    option.appendChild(document.createTextNode(rdapValidator.responseTypes[type]));
});

const serverTypeSelect = document.getElementById("server-type");

Object.keys(rdapValidator.serverTypes).forEach(function(type) {
    const option = serverTypeSelect.appendChild(document.createElement("option"));
    option.setAttribute("value", type);
    option.appendChild(document.createTextNode(rdapValidator.serverTypes[type]));
});

const clickFunction = function() {
    
    document.getElementById("result-container").removeAttribute("hidden");

    const el = document.getElementById("results");

    Array.from(el.childNodes).forEach((e) => e.parentNode.removeChild(e));

    rdapValidator.testURL(
        document.getElementById("url").value,
        document.getElementById("response-type").value,
        document.getElementById("server-type").value
    );
};

document.getElementById("button").addEventListener("click", clickFunction);
document.getElementById("url").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        clickFunction();
    }
});

const params = new URLSearchParams(window.location.search);

let doTest = false;

['url', 'response-type', 'server-type', 'errors-only'].forEach(function(p) {
    if (params.has(p)) {
        if ('errors-only' == p) {
            document.getElementById(p).checked = true;

        } else {
            document.getElementById(p).value = params.get(p);

        }
        doTest = true;
    }
});

if (doTest) document.getElementById("button").click();

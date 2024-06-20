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
});

rdapValidator.setResultCallback(function(result, message, path) {

    if (false !== result && document.getElementById("errors-only").checked) return;

    const card = document.getElementById("results").appendChild(document.createElement("div"));
    card.classList.add('card');

    const title = card.appendChild(document.createElement("div"));
    title.classList.add('card-header');
    title.appendChild(document.createTextNode(
        null === result ? "ℹ️ Information" : (true === result ? "✅ Pass" : "❌ Fail")
    ));

    const div = card.appendChild(document.createElement("div"));
    div.classList.add('card-body');

    div.appendChild(document.createElement("dt"))
        .appendChild(document.createTextNode("Message:"));
    div.appendChild(document.createElement("dd"))
        .appendChild(document.createTextNode(message));

    div.appendChild(document.createElement("dt"))
        .appendChild(document.createTextNode("Path:"));

    div.appendChild(document.createElement("dd"))
        .appendChild(document.createElement("tt")).appendChild(document.createTextNode(path));
});

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

    const el = document.getElementById("results");

    if ("hr" !== el.previousSibling.localName) {
        el.parentNode.insertBefore(
            document.createElement("hr"),
            el
        );
    }

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

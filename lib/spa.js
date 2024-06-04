import rdapValidator from "./rdap-validator.js";

rdapValidator.setXHR(XMLHttpRequest);

rdapValidator.setResultCallback(function(result, message, context) {
    const tr = document.getElementById("results").appendChild(document.createElement("tr"));

    if (true === result && document.getElementById("errors-only").checked) tr.setAttribute("hidden", "");

    tr.appendChild(document.createElement("td")).appendChild(document.createTextNode(true!== result && false !== result ? "ℹ️" : (result ? "✅" : "❌")));
    tr.appendChild(document.createElement("td")).appendChild(document.createTextNode(message));

    if (context !== undefined) {
        tr.appendChild(document.createElement("td"))
            .appendChild(document.createElement("pre"))
            .appendChild(document.createTextNode(JSON.stringify(context, null, 2)));
    }
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

document.getElementById("button").addEventListener("click", function() {

    Array.from(document.getElementById("results").childNodes).forEach((e) => e.parentNode.removeChild(e));

    rdapValidator.testURL(
        document.getElementById("url").value,
        document.getElementById("response-type").value,
        document.getElementById("server-type").value
    );
});

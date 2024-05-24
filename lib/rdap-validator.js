const rdapValidator = {};

export default rdapValidator;

rdapValidator.version = '0.0.1';

rdapValidator.checkType = (v, t)    => v && v.constructor.name == t;
rdapValidator.isString  = (v)       => rdapValidator.checkType(v, "String");
rdapValidator.isArray   = (v)       => rdapValidator.checkType(v, "Array");
rdapValidator.isObject  = (v)       => rdapValidator.checkType(v, "Object");
rdapValidator.isBoolean = (v)       => rdapValidator.checkType(v, "Boolean");
rdapValidator.isInteger = (v)       => rdapValidator.checkType(v, "Number") && Number.isInteger(v);

rdapValidator.values = {
    "domainVariantRelation": [
        "conjoined",
        "open registration",
        "registered",
        "registration restricted",
        "unregistered",
    ],
    "eventAction": [
        "deletion",
        "enum validation expiration",
        "expiration",
        "last changed",
        "last update of RDAP database",
        "locked",
        "registrar expiration",
        "registration",
        "reinstantiation",
        "reregistration",
        "transfer",
        "unlocked",
    ],
    "noticeAndRemarkType": [
        "object redacted due to authorization",
        "object truncated due to authorization",
        "object truncated due to excessive load",
        "object truncated due to unexplainable reasons",
        "result set truncated due to authorization",
        "result set truncated due to excessive load",
        "result set truncated due to unexplainable reasons",
    ],
    "redactedEexpressionLanguage": [
        "jsonpath",
    ],
    "role": [
        "abuse",
        "administrative",
        "billing",
        "noc",
        "notifications",
        "proxy",
        "registrant",
        "registrar",
        "reseller",
        "sponsor",
        "technical",
    ],
    "status": [
        "active",
        "add period",
        "administrative",
        "associated",
        "auto renew period",
        "client delete prohibited",
        "client hold",
        "client renew prohibited",
        "client transfer prohibited",
        "client update prohibited",
        "delete prohibited",
        "inactive",
        "locked",
        "obscured",
        "pending create",
        "pending delete",
        "pending renew",
        "pending restore",
        "pending transfer",
        "pending update",
        "private",
        "proxy",
        "redemption period",
        "removed",
        "renew period",
        "renew prohibited",
        "reserved",
        "server delete prohibited",
        "server hold",
        "server renew prohibited",
        "server transfer prohibited",
        "server update prohibited",
        "transfer period",
        "transfer prohibited",
        "update prohibited",
        "validated",
    ],
};

rdapValidator.extensions = [
    "arin_originas0",
    "artRecord",
    "cidr0",
    "farv1",
    "fred",
    "icann_rdap_response_profile_0",
    "icann_rdap_technical_implementation_guide_0",
    "nro_rdap_profile_0",
    "nro_rdap_profile_asn_flat_0",
    "nro_rdap_profile_asn_hierarchical_0",
    "paging",
    "platformNS",
    "rdap_objectTag",
    "redacted",
    "redirect_with_content",
    "regType",
    "reverse_search",
    "sorting",
    "subsetting",
]

/**
 * This array contains a list of all the permitted values of the
 * "objectClassName" property in RDAP objects.
 */
rdapValidator.objectTypes = [
    "domain",
    "ip network",
    "autnum",
    "nameserver",
    "entity",
];

/**
 * This array contains a list of all the supported RDAP response types.
 */
rdapValidator.responseTypes = {
    "domain": "Domain",
    "ip network": "IP Network",
    "autnum": "AS Number",
    "nameserver": "Nameserver",
    "entity": "Entity",
    "help": "Help",
    "domain-search": "Domain Search",
    "nameserver-search": "Nameserver Search",
    "entity-search": "Entity Search",
    "error": "Error",
};

rdapValidator.options = {
    "vanilla": "Vanilla",
    "thick-gtld-registry": "Thick gTLD registry",
    "thin-gtld-registry": "Thin gTLD registry",
    "gtld-registrar": "gTLD registrar",
    "rir": "RIR",
};

/**
 * Default result callback.
 * @param {bool} result
 * @param {string} message
 * @param {mixed} context
 */
rdapValidator.resultCallback = function(result, message, context) {
    if (result) {
        console.log("✅ " + message);

    } else {
        console.error("❌ " + message);

    }

    if (context !== undefined) {
        console.log("\n  "+JSON.stringify(context, null, 2).trimEnd().replaceAll("\n", "\n  "));
    }

    console.log("\n");
};

/**
 * Specify a callback to invoke when a result has been generated. This callback
 * will receive three arguments: a boolean pass/fail result, a message, and a
 * contextual data structure.
*/
rdapValidator.setResultCallback = function(callback) {
    const prev = rdapValidator.resultCallback;

    rdapValidator.resultCallback = callback;

    return prev;
};

rdapValidator.testCompleteCallback = function() {};

/**
 * Specify a callback to invoke when the test has finished.
*/
rdapValidator.setTestCompleteCallback = function(callback) {
    const prev = rdapValidator.testCompleteCallback;

    rdapValidator.testCompleteCallback = callback;

    return prev;
};

/**
 * Log a result by invoking the resultCallback with the provided arguments.
 * @param {bool} result
 * @param {string} message
 * @param {mixed} context
 */
rdapValidator.addResult = function(result, message, context) {
    if (!result) rdapValidator.errors++;
    rdapValidator.resultCallback(result, message, context);
    return result;
};

/**
 * Initiate a test run.
 * @param {string} url
 * @param {string} type one of the values in rdapValidator.responseTypes
 * @param {string} options one of the values in rdapValidator.options
 */
rdapValidator.testURL = function(url, type, option) {

    rdapValidator.errors = 0;

    if (!rdapValidator.responseTypes.hasOwnProperty(type)) {
        rdapValidator.addResult(false, "Invalid response type '" + type + "'.");
        rdapValidator.testCompleteCallback();
        return;
    }

    if (!rdapValidator.options.hasOwnProperty(option)) {
        rdapValidator.addResult(false, "Invalid option '" + option + "'.");
        rdapValidator.testCompleteCallback();
        return;
    }

    const xhr = new XMLHttpRequest;

    xhr.open('GET', url);

    xhr.setRequestHeader('accept', 'application/rdap+json');
    xhr.timeout = 25000;

    xhr.ontimeout = function() {
        rdapValidator.addResult(false, "Connection to server timed out after " + xhr.timeout + "ms.");
    };

    xhr.onreadystatechange = function() {
        if (4 == xhr.readyState) {
            if (xhr.status < 1) {
                rdapValidator.addResult(false, "Unable to perform request: " + xhr.statusText);

            } else {
                rdapValidator.testResponse(xhr, url, type, option);

            }

            rdapValidator.testCompleteCallback();
        }
    };

    xhr.send();
};

/**
 * invoked when the XHR has completed.
 * @param {XmlHttpRequest} xhr
 * @param {string} url
 * @param {string} type one of the values in rdapValidator.responseTypes
 * @param {string} options one of the values in rdapValidator.options
 */
rdapValidator.testResponse = function(xhr, url, type, option) {
    rdapValidator.addResult(true, "Received a response from the server.");

    if (!rdapValidator.addResult(
        "error" != type && xhr.status < 400,
        "HTTP status is " + xhr.status + "."
    )) return;

    if (!rdapValidator.addResult(
        xhr.getResponseHeader("content-type").toLowerCase().startsWith("application/rdap+json"),
        "Media type is " + xhr.getResponseHeader("content-type") + "."
    )) return;

    var record;
    try {
      record = JSON.parse(xhr.response ?? xhr.responseText);
      rdapValidator.addResult(true, "Response body MUST be valid JSON.");

    } catch (e) {
      rdapValidator.addResult(false, "Response body MUST be valid JSON (error: " + e + ").");

      return;
    }

    if (!rdapValidator.addResult(
        rdapValidator.isObject(record),
        "Response body MUST be a JSON object."
    )) return;

    if (rdapValidator.addResult(
        record.hasOwnProperty("rdapConformance"),
        "Record MUST have the 'rdapConformance' property.",
        {objectClassName:record.rdapConformance}
    )) {
        rdapValidator.addResult(
            rdapValidator.isArray(record.rdapConformance),
            "The 'rdapConformance' property MUST be an array.",
            {objectClassName:record.rdapConformance ?? null}
        );

        rdapValidator.addResult(
            record.rdapConformance.indexOf("rdap_level_0") >= 0,
            "The 'rdapConformance' property MUST contain 'rdap_level_0'.",
            {objectClassName:record.rdapConformance}
        );

        record.rdapConformance.filter((s) => s != "rdap_level_0").forEach(function(s) {
            rdapValidator.addResult(
                rdapValidator.extensions.indexOf(s) >= 0,
                "The '" + s + "' extension MUST be registered with IANA."
            );
        });
    }

    if (record.hasOwnProperty("notices")) {
        rdapValidator.addResult(
            rdapValidator.isArray(record.notices),
            "The 'notices' property MUST be an array.",
        );

        record.notices.forEach((n) => rdapValidator.validateNoticeOrRemark(n));
    }

    if (rdapValidator.objectTypes.indexOf(type) >= 0) {
        // expected response type is an object

        if (!rdapValidator.addResult(
            record.hasOwnProperty("objectClassName"),
            "Record MUST have the 'objectClassName' property.",
            {objectClassName:record.objectClassName}
        )) return;

        if (!rdapValidator.addResult(
            rdapValidator.isString(record.objectClassName),
            "The 'objectClassName' property MUST be a string.",
            {objectClassName:record.objectClassName}
        )) return;

        rdapValidator.addResult(
            type == record.objectClassName,
            "The value of the 'objectClassName' property MUST be '" + type + "'.",
            {objectClassName:record.objectClassName}
        );
    }

    switch (type) {
        case "domain":
            rdapValidator.validateDomain(record, url, option);
            break;

        case "ip network":
            rdapValidator.validateIP(record, url, option);
            break;

        case "autnum":
            rdapValidator.validateASN(record, url, option);
            break;

        case "nameserver":
            rdapValidator.validateNameserver(record, url, option);
            break;

        case "entity":
            rdapValidator.validateEntity(record, url, option);
            break;

        case "help":
            rdapValidator.validateHelp(record, url, option);
            break;

        case "domain-search":
            rdapValidator.validateDomainSearch(record, url, option);
            break;

        case "nameserver-search":
            rdapValidator.validateNameserverSearch(record, url, option);
            break;

        case "entity-search":
            rdapValidator.validateEntitySearch(record, url, option);
            break;

        case "error":
            rdapValidator.validateError(record, url, option);
            break;
    }

    rdapValidator.addResult(
        0 === rdapValidator.errors,
        "RDAP validation completed with " + rdapValidator.errors + " error(s)."
    );
};

rdapValidator.validateDomain = function(domain, url, option) {

    const path = new URL(url).pathname;
    const name = path.substr(1+path.lastIndexOf("/")).toLowerCase();

    rdapValidator.validateCommonObjectProperties(domain);

    if (
        rdapValidator.addResult(
            domain.hasOwnProperty("ldhName"),
            "Domain MUST have the 'ldhName' property.",
            {handle:domain.ldhName}
        )
        &&
        rdapValidator.addResult(
            rdapValidator.isString(domain.ldhName),
            "The 'ldhName' property MUST be a string.",
            {ldhName:domain.ldhName}
        )
    ) {
        rdapValidator.addResult(
            domain.ldhName.toLowerCase() === name,
            "The 'ldhName' property MUST match the domain name in the URL (" + name + ").",
            {name:domain.ldhName}
        );
    }

    if (domain.hasOwnProperty("entities")) {
        if (!rdapValidator.addResult(
            rdapValidator.isArray(domain.entities),
            "The 'entities' property MUST be an array.",
            domain.entities
        )) return;

        domain.entities.forEach((e) => rdapValidator.validateEntity(e));
    }

    if (domain.hasOwnProperty("nameservers")) {
        if (!rdapValidator.addResult(
            rdapValidator.isArray(domain.nameservers),
            "The 'nameservers' property MUST be an array.",
            domain.nameservers
        )) return;

        domain.nameservers.forEach((e) => rdapValidator.validateNameserver(e));
    }

    if (domain.hasOwnProperty("secureDNS")) {
        rdapValidator.validateSecureDNS(domain.secureDNS);
    }

    if (option === "thin-gtld-registry") {
        rdapValidator.validateThinGTLD(domain);

    } else if (["thick-gtld-registry", "gtld-registrar"].indexOf(option) >= 0) {
        rdapValidator.validateThickGTLD(domain);

    }
};

rdapValidator.validateThinGTLD = function(domain) {
    if (!rdapValidator.addResult(
        domain.hasOwnProperty("entities"),
        "The 'entities' property MUST be present."
    )) return;

    if (!rdapValidator.addResult(
        1 == domain.entities.length,
        "Exactly one entity MUST be present."
    )) return;

    rdapValidator.validateGTLDRegistrar(domain.entities[0]);

    rdapValidator.validateCommonGTLD(domain);
};

rdapValidator.validateGTLDRegistrar = function(rar) {
    rdapValidator.addResult(
        rar.roles.indexOf("registrar") >= 0,
        "The entity MUST have the 'registrar' role.",
        rar.roles
    );

    if (!rdapValidator.addResult(
        rar.hasOwnProperty("publicIds"),
        "The registrar entity MUST have the 'publicIds' property."
    )) return;

    const ids = rar.publicIds.filter((id) => "IANA Registrar ID" == id.type);
    if (!rdapValidator.addResult(
        1 === ids.length,
        "The registrar entity MUST have exactly one Public ID object with the 'IANA Registrar ID' type."
    )) return;

    rdapValidator.addResult(
        rdapValidator.isString(ids[0].identifier) && rdapValidator.isInteger(parseInt(ids[0].identifier)),
        "The 'type' property of the Public ID object MUST be a string containing an integer."
    );
};

rdapValidator.validateThickGTLD = function(domain) {
    if (!rdapValidator.addResult(
        domain.hasOwnProperty("entities"),
        "The 'entities' property MUST be present."
    )) return;

    let entities = {};
    domain.entities.forEach(function(e) {
        e.roles.forEach((r) => entities[r] = e);
    });

    rdapValidator.addResult(
        entities.hasOwnProperty("registrant"),
        "At least one entity MUST have the 'registrant' role."
    );

    rdapValidator.validateGTLDRegistrar(entities["registrar"]);

    rdapValidator.validateCommonGTLD(domain);
};

rdapValidator.validateCommonGTLD = function(domain) {
    // TODO
};

rdapValidator.validateSecureDNS = function(secureDNS) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(secureDNS),
        "The 'secureDNS' property MUST be an object."
    )) return;      

    ["zoneSigned", "delegationSigned"].forEach(function (p) {
        if (secureDNS.hasOwnProperty(p)) {
            let o = {};
            o[p] = secureDNS[p];
            rdapValidator.addResult(
                rdapValidator.isBoolean(secureDNS[p]),
                "The '" + p + "' property MUST be an boolean.",
                o
            );
        }
    });

    if (secureDNS.delegationSigned) {
        let count = 0;

        ["dsData", "keyData"].forEach(function (p) {
            if (secureDNS.hasOwnProperty(p)) {
                if (rdapValidator.addResult(
                    rdapValidator.isArray(secureDNS[p]),
                    "The '" + p + "' property MUST be an array.",
                )) {
                    count += secureDNS[p].length;

                    secureDNS[p].forEach(function(v) {
                        switch(p) {
                            case "dsData": return rdapValidator.validateDSData(v);
                            case "keyData": return rdapValidator.validateKeyData(v);
                        }
                    });
                }
            }
        });

        rdapValidator.addResult(
            count > 0,
            "The 'secureDNS' property for a domain where delegationSigned=true MUST contain one or more values in the 'dsData' amd 'keyData' properties."
        );
    }

};

rdapValidator.validateDSData = function(dsData) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(dsData),
        "Values in the 'dsData' property MUST be an object",
        dsData
    )) return;      

    ["keyTag", "algorithm", "digestType", "digest"].forEach(function(p) {
        if (rdapValidator.addResult(
            dsData.hasOwnProperty(p),
            "DS record object MUST have a '" + p + "' property.",
            dsData[p]
        )) {
            rdapValidator.addResult(
                ("digest" === p ? rdapValidator.isString(dsData[p]) : rdapValidator.isInteger(dsData[p])),
                "The '" + p + "' property of DS record object MUST be a " + ("digest" === p ? "string" : "integer"),
                dsData[p]
            );
        }
    });

    if (dsData.hasOwnProperty("events")) {
        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.events),
            "The 'events' property MUST be an array.",
        )) dsData.events.forEach((e) => rdapValidator.validateEvent(e));
    }

    if (dsData.hasOwnProperty("links")) {
        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.links),
            "The 'links' property MUST be an array.",
        )) dsData.events.forEach((l) => rdapValidator.validateLink(l));
    }
};

rdapValidator.validateKeyData = function(keyData) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(keyData),
        "Value in the 'keyData' property is not an object",
        keyData
    )) return;      

    ["flags", "protocol", "algorithm", "publicKey"].forEach(function(p) {
        if (rdapValidator.addResult(
            keyData.hasOwnProperty(p),
            "KeyData record object MUST have a '" + p + "' property.",
            keyData[p]
        )) {
            rdapValidator.addResult(
                ("publicKey" === p ? rdapValidator.isString(keyData[p]) : rdapValidator.isInteger(keyData[p])),
                "The '" + p + "' property of KeyData record object MUST be a " + ("publicKey" === p ? "string" : "integer"),
                keyData[p]
            );
        }
    });

    if (keyData.hasOwnProperty("events")) {
        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.events),
            "The 'events' property MUST be an array.",
        )) keyData.events.forEach((e) => rdapValidator.validateEvent(e));
    }

    if (keyData.hasOwnProperty("links")) {
        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.links),
            "The 'links' property MUST be an array.",
        )) keyData.events.forEach((l) => rdapValidator.validateLink(l));
    }
};

rdapValidator.validateEntity = function(entity) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(entity),
        "Entity MUST be an object."
    )) return;      

    rdapValidator.validateCommonObjectProperties(entity);

    if (
        rdapValidator.addResult(
            entity.hasOwnProperty("roles"),
            "Entity MUST have the 'roles' property.",
            entity.roles
        )
        &&
        rdapValidator.addResult(
            rdapValidator.isArray(entity.roles),
            "The 'roles' property MUST be an array.",
            entity.roles
        )
    ) {
        entity.roles.forEach(function(role) {
            rdapValidator.addResult(
                rdapValidator.values.role.indexOf(role) >= 0,
                "Role '" + role + "' is a valid RDAP value.",
                [role]
            );
        })
    }

    if (
        entity.hasOwnProperty("vcardArray") &&
        rdapValidator.addResult(
            rdapValidator.isArray(entity.vcardArray),
            "The 'vcardArray' property MUST be an array.",
            entity.vcardArray
        )
    ) {
        rdapValidator.addResult(
            "vcard" === entity.vcardArray[0],
            "The first value in the vcardArray array MUST be 'vcard'.",
            entity.vcardArray[0]
        );

        rdapValidator.validateJCard(entity.vcardArray[1]);
    }

    ["asEventActor", "networks", "autnums"].forEach(function(p) {
        if (entity.hasOwnProperty(p)) {
            if (rdapValidator.addResult(
                rdapValidator.isArray(entity[p]),
                "The '" + p + "' property MUST be an array.",
                entity[p]
            )) {
                entity[p].forEach(function(v) {
                    switch (p) {
                        case "asEventActor": return rdapValidator.validateEvent(v);
                        case "networks": return rdapValidator.validateIP(v);
                        case "autnums": return rdapValidator.validateASN(v);
                    }
                });
            }
        }
    });
}

rdapValidator.validateJCard = function (jcard) {
    if (!rdapValidator.addResult(
        rdapValidator.isArray(jcard),
        "jCard MUST be an array."
    )) return;      

    if (!rdapValidator.addResult(
        jcard.length > 0,
        "jCard MUST NOT be empty."
    )) return;      

    jcard.forEach(function(node) {
        if (!rdapValidator.addResult(
            rdapValidator.isArray(node),
            "Node MUST be an array."
        )) return;      

        if (!rdapValidator.addResult(
            node.length == 4,
            "Node MUST contain exactly four (4) elements."
        )) return;      

        rdapValidator.addResult(
            rdapValidator.isString(node[0]),
            "Node item #1 MUST be a string.",
            node[0]
        );

        rdapValidator.addResult(
            rdapValidator.isObject(node[1]),
            "Node item #2 MUST be an object.",
            node[1]
        );

        rdapValidator.addResult(
            rdapValidator.isString(node[2]),
            "Node item #3 MUST be a string.",
            node[2]
        );

        // more logic needed here
    });
};

rdapValidator.validateNameserver = function(nameserver) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(nameserver),
        "Nameserver MUST be an object."
    )) return;      

    rdapValidator.validateCommonObjectProperties(nameserver);

    if (rdapValidator.addResult(
        nameserver.hasOwnProperty("ldhName"),
        "Nameserver MUST have the 'ldhName' property.",
        {handle:nameserver.ldhName}
    )) {
        rdapValidator.addResult(
            rdapValidator.isString(nameserver.ldhName),
            "The 'ldhName' property MUST be a string.",
            {ldhName:nameserver.ldhName}
        );
    }

    if (
        nameserver.hasOwnProperty("ipAddresses") &&
        rdapValidator.addResult(
            rdapValidator.isObject(nameserver.ipAddresses),
            "The 'ipAddresses' property MUST be an object."
        )
    ) {
        ["v4", "v6"].forEach(function(t) {
            if (nameserver.ipAddresses.hasOwnProperty(t)) {
                rdapValidator.addResult(
                    rdapValidator.isArray(nameserver.ipAddresses[t]),
                    "The '" + t + "' property of the 'ipAddresses' property MUST be an array."
                );

                nameserver.ipAddresses[t].forEach(function(addr) {
                    let result;
                    switch (t) {
                        case "v4":
                            result = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr); break;
                        case "v6":
                            result = /^[0-9a-f][0-9a-f:]+$/.test(addr); break;
                    }
                    rdapValidator.addResult(
                        result,
                        "The value '" + addr + "' MUST be a valid IP" + t + " address.",
                        addr
                    );
                });
            }
        });
    }
}

rdapValidator.validateLink = function(link) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(link),
        "Link MUST be an object.",
    )) return;

    ["value", "rel", "href"].forEach(function(k) {
        if (rdapValidator.addResult(
            link.hasOwnProperty(k),
            "Link MUST have the '" + k + "' property.",
            link
        )) {
            rdapValidator.addResult(
                rdapValidator.isString(link[k]),
                "Link '" + k + "' property MUST be a string.",
                link
            );
        }
    });

    ["hreflang", "title", "media", "type"].forEach(function(k) {
        if (link.hasOwnProperty(k)) {
            rdapValidator.addResult(
                rdapValidator.isString(link[k]),
                "Link '" + k + "' property MUST be a string.",
                link
            );
        }
    });
};

rdapValidator.validateNoticeOrRemark = function (noticeOrRemark) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(noticeOrRemark),
        "Notice/remark MUST be an object.",
    )) return;

    if (noticeOrRemark.hasOwnProperty("title")) {
        rdapValidator.addResult(
            rdapValidator.isString(noticeOrRemark.title),
            "The 'title' property MUST be a string.",
            {title:noticeOrRemark.title}
        );
    }

    if (rdapValidator.addResult(
        noticeOrRemark.hasOwnProperty("description"),
        "Notice/remark MUST have the 'description' property.",
        {title:noticeOrRemark.description}
    )) {
        rdapValidator.addResult(
            rdapValidator.isArray(noticeOrRemark.description),
            "The 'description' property MUST be an array.",
            {title:noticeOrRemark.description}
        );

        const uniqueTypes = noticeOrRemark.description
            .map((i) => i.constructor.name)
            .filter((v, i, a) => i === a.indexOf(v));

        rdapValidator.addResult(
            1 == uniqueTypes.length && uniqueTypes[0] == "String",
            "The 'description' property MUST contain only strings.",
        );
    }

    if (noticeOrRemark.hasOwnProperty("type")) {
        rdapValidator.addResult(
            rdapValidator.isString(noticeOrRemark.type),
            "The 'type' property MUST be a string.",
            {title:noticeOrRemark.type}
        );

        rdapValidator.addResult(
            rdapValidator.values.noticeAndRemarkType.indexOf(noticeOrRemark.type) >= 0,
            "The value of the'type' property MUST be a valid JSON value.",
            {title:noticeOrRemark.type}
        );
    }

    if (noticeOrRemark.hasOwnProperty("links")) {
        rdapValidator.commonPropertyValidators.links(noticeOrRemark.links);
    }
};

rdapValidator.validateEvent = function (event) {
    if (!rdapValidator.addResult(
        rdapValidator.isObject(event),
        "Event MUST be an object.",
    )) return;

    ["eventAction", "eventDate"].forEach(function(k) {
        rdapValidator.addResult(
            event.hasOwnProperty(k),
            "Event MUST have the '" + k + "' property.",
            event
        );

        rdapValidator.addResult(
            rdapValidator.isString(event[k]),
            "The '" + k + "' property MUST be a string.",
            event
        );
    });

    rdapValidator.addResult(
        rdapValidator.values.eventAction.indexOf(event.eventAction) >= 0,
        "The 'eventAction' property MUST be a valid JSON value.",
        {eventAction:event.eventAction}
    );

    try {
        new Date(event.eventDate);
        rdapValidator.addResult(
            true,
            "The 'eventDate' property MUST be a valid date/time.",
            {eventDate:event.eventDate}
        );

    } catch (e) {
        rdapValidator.addResult(
            false,
            "The 'eventDate' property MUST be a valid date/time.",
            {eventDate:event.eventDate}
        );
        
    }

    if (event.hasOwnProperty("links")) {
        rdapValidator.commonPropertyValidators.links(event.links);
    }
};

rdapValidator.validatePublicId = function (publicId) {
    rdapValidator.addResult(
        rdapValidator.isObject(publicId),
        "Public ID MUST be an object.",
    );

    ["type", "identifier"].forEach(function(k) {
        rdapValidator.addResult(
            publicId.hasOwnProperty(k),
            "Public ID MUST have the '" + k + "' property.",
            publicId
        );

        rdapValidator.addResult(
            rdapValidator.isString(publicId[k]),
            "The '" + k + "' property MUST be a string.",
            publicId
        );
    });
};

rdapValidator.commonPropertyValidators = {};

rdapValidator.commonPropertyValidators.handle = function(handle) {
    rdapValidator.addResult(
        rdapValidator.isString(handle),
        "The 'handle' property MUST be a string.",
        {handle:handle}
    );
}

rdapValidator.commonPropertyValidators.links = function(links) {
    rdapValidator.addResult(
        rdapValidator.isArray(links),
        "The 'links' property MUST be an array.",
    );

    links.forEach((l) => rdapValidator.validateLink(l));
}

rdapValidator.commonPropertyValidators.remarks = function(remarks) {
    rdapValidator.addResult(
        rdapValidator.isArray(remarks),
        "The 'remarks' property MUST be an array.",
    );

    remarks.forEach((r) => rdapValidator.validateNoticeOrRemark(r));
}

rdapValidator.commonPropertyValidators.lang = function(lang) {
    rdapValidator.addResult(
        rdapValidator.isString(handle),
        "The 'lang' property MUST be a string.",
        {lang:lang}
    );
}

rdapValidator.commonPropertyValidators.events = function(events) {
    rdapValidator.addResult(
        rdapValidator.isArray(events),
        "The 'events' property MUST be an array.",
    );

    events.forEach((e) => rdapValidator.validateEvent(e));
}

rdapValidator.commonPropertyValidators.status = function(status) {
    rdapValidator.addResult(
        rdapValidator.isArray(status),
        "The 'status' property MUST be an array.",
    );

    status.forEach(function(s) {
        rdapValidator.addResult(
            rdapValidator.values.status.indexOf(s) >= 0,
            "Status '" + s + "' MUST be a valid status.",
            s
        );
    });
}

rdapValidator.commonPropertyValidators.port43 = function(port43) {
    rdapValidator.addResult(
        rdapValidator.isString(port43),
        "The 'port43' property MUST be a string.",
        {port43:port43}
    );
}

rdapValidator.commonPropertyValidators.publicIds = function(publicIds) {
    rdapValidator.addResult(
        rdapValidator.isArray(publicIds),
        "The 'publicIds' property MUST be an array.",
    );

    publicIds.forEach((p) => rdapValidator.validatePublicId(p));
}

rdapValidator.validateCommonObjectProperties = function(record) {
    Object.keys(rdapValidator.commonPropertyValidators).forEach(function(name) {
        if (record.hasOwnProperty(name)) {
            rdapValidator.commonPropertyValidators[name](record[name]);
        }
    });
};

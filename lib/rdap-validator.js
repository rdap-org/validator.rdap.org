const rdapValidator = {};

export default rdapValidator;

rdapValidator.version   = '0.0.1';
rdapValidator.xhr       = null;
rdapValidator.path      = [];

rdapValidator.getPath   = ()        => rdapValidator.path.join("");
rdapValidator.setXHR    = (xhr)     => rdapValidator.xhr = xhr;
rdapValidator.checkType = (v, t)    => "undefined" !== typeof v && v.constructor.name == t;
rdapValidator.isString  = (v)       => rdapValidator.checkType(v, "String");
rdapValidator.isArray   = (v)       => rdapValidator.checkType(v, "Array");
rdapValidator.isObject  = (v)       => rdapValidator.checkType(v, "Object");
rdapValidator.isBoolean = (v)       => rdapValidator.checkType(v, "Boolean");
rdapValidator.isInteger = (v)       => rdapValidator.checkType(v, "Number") && Number.isInteger(v);

rdapValidator.pushPath = function (segment) {
    rdapValidator.path.push(segment);
};

rdapValidator.popPath = function() {
    const removed = rdapValidator.path.pop();
};

/*
 * These are taken from the RDAP JSON Values Registry
 */
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

/*
 * These are taken from the RDAP Extensions Registry
 */
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
 * see https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#properties
 */
rdapValidator.JCardPropertyTypes = [
    "SOURCE",
    "KIND",
    "XML",
    "FN",
    "N",
    "NICKNAME",
    "PHOTO",
    "BDAY",
    "ANNIVERSARY",
    "GENDER",
    "ADR",
    "TEL",
    "EMAIL",
    "IMPP",
    "LANG",
    "TZ",
    "GEO",
    "TITLE",
    "ROLE",
    "LOGO",
    "ORG",
    "MEMBER",
    "RELATED",
    "CATEGORIES",
    "NOTE",
    "PRODID",
    "REV",
    "SOUND",
    "UID",
    "CLIENTPIDMAP",
    "URL",
    "VERSION",
    "KEY",
    "FBURL",
    "CALADRURI",
    "CALURI",
    "BIRTHPLACE",
    "DEATHPLACE",
    "DEATHDATE",
    "EXPERTISE",
    "HOBBY",
    "INTEREST",
    "ORG-DIRECTORY",
    "CONTACT-URI",
    "CREATED",
    "GRAMGENDER",
    "LANGUAGE",
    "PRONOUNS",
    "SOCIALPROFILE",
    "JSPROP",
];

/**
 * https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#parameters
 */
rdapValidator.JCardParameters = [
    "LANGUAGE",
    "VALUE",
    "PREF",
    "ALTID",
    "PID",
    "TYPE",
    "MEDIATYPE",
    "CALSCALE",
    "SORT-AS",
    "GEO",
    "TZ",
    "INDEX",
    "LEVEL",
    "GROUP",
    "CC",
    "AUTHOR",
    "AUTHOR-NAME",
    "CREATED",
    "DERIVED",
    "LABEL",
    "PHONETIC",
    "PROP-ID",
    "SCRIPT",
    "SERVICE-TYPE",
    "USERNAME",
    "JSPTR",
];

/**
 * see https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#value-data-types
 */
rdapValidator.JCardValueTypes = [
    "BOOLEAN",
    "DATE",
    "DATE-AND-OR-TIME",
    "DATE-TIME",
    "FLOAT",
    "INTEGER",
    "LANGUAGE-TAG",
    "TEXT",
    "TIME",
    "TIMESTAMP",
    "UNKNOWN",
    "URI",
    "UTC-OFFSET",
];

/**
 * see https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#property-values
 */
rdapValidator.propertyValues = {
    "KIND": [
        "individual",
        "group",
        "org",
        "location",
        "application",
        "device",
    ],
    "VERSION": ["4.0"],
    "GRAMGENDER": [
        "animate",
        "common",
        "feminine",
        "inanimate",
        "masculine",
        "neuter",
    ]
};

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

/**
 * This array contains a list of all the supported RDAP server types.
 */
rdapValidator.serverTypes = {
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
 * @param {string} path
 */
rdapValidator.resultCallback = (result, message, context, path) => null;

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
    if (false === result) rdapValidator.errors++;
    rdapValidator.resultCallback(result, message, context, rdapValidator.getPath());
    return result;
};

/**
 * Initiate a test run.
 * @param {string} url
 * @param {string} type one of the values in rdapValidator.responseTypes
 * @param {string} serverType one of the values in rdapValidator.serverTypes
 */
rdapValidator.testURL = function(url, type, serverType) {

    rdapValidator.errors = 0;

    if (!rdapValidator.responseTypes.hasOwnProperty(type)) {
        rdapValidator.addResult(false, "Invalid response type '" + type + "'.");
        rdapValidator.testCompleteCallback();
        return;
    }

    if (!rdapValidator.serverTypes.hasOwnProperty(serverType)) {
        rdapValidator.addResult(false, "Invalid server type '" + serverType + "'.");
        rdapValidator.testCompleteCallback();
        return;
    }

    rdapValidator.addResult(null, "Testing URL is '" + url + "'");
    rdapValidator.addResult(null, "Response type is '" + type + "'");
    rdapValidator.addResult(null, "Server type is '" + serverType + "'");

    const xhr = new rdapValidator.xhr();

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
                rdapValidator.testResponse(xhr, url, type, serverType);

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
 * @param {string} serverType one of the values in rdapValidator.serverTypes
 */
rdapValidator.testResponse = function(xhr, url, type, serverType) {

    rdapValidator.addResult(true, "Received a response from the server.");

    rdapValidator.lastTestedResponseHeaders = xhr.getAllResponseHeaders();

    if (!rdapValidator.addResult(
        "error" == type ? xhr.status >= 400 : xhr.status < 400,
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

    rdapValidator.lastTestedResponse = record;

    rdapValidator.path = ["$"];

    if (!rdapValidator.addResult(
        rdapValidator.isObject(record),
        "Response body MUST be a JSON object."
    )) return;

    rdapValidator.pushPath(".rdapConformance");

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

        let i = 0;
        record.rdapConformance.filter((s) => s != "rdap_level_0").forEach(function(s) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.addResult(
                rdapValidator.extensions.indexOf(s) >= 0,
                "The '" + s + "' extension MUST be registered with IANA."
            );

            rdapValidator.popPath();
        });
    }

    rdapValidator.popPath();

    if (record.hasOwnProperty("notices")) {
        rdapValidator.pushPath(".notices");

        rdapValidator.addResult(
            rdapValidator.isArray(record.notices),
            "The 'notices' property MUST be an array.",
        );

        let i = 0;
        record.notices.forEach(function(notice) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.validateNoticeOrRemark(notice)

            rdapValidator.popPath();
        });

        rdapValidator.popPath();
    }

    if (rdapValidator.objectTypes.indexOf(type) >= 0) {

        rdapValidator.pushPath(".objectClassName");

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

        rdapValidator.popPath();
    }

    switch (type) {
        case "domain":
            rdapValidator.validateDomain(record, url, serverType, true);
            break;

        case "ip network":
            rdapValidator.validateIP(record, url, serverType, true);
            break;

        case "autnum":
            rdapValidator.validateASN(record, url, serverType, true);
            break;

        case "nameserver":
            rdapValidator.validateNameserver(record, url, serverType, true);
            break;

        case "entity":
            rdapValidator.validateEntity(record, url, serverType, true);
            break;

        case "help":
            rdapValidator.validateHelp(record, url, serverType);
            break;

        case "domain-search":
            rdapValidator.validateDomainSearch(record, url, serverType);
            break;

        case "nameserver-search":
            rdapValidator.validateNameserverSearch(record, url, serverType);
            break;

        case "entity-search":
            rdapValidator.validateEntitySearch(record, url, serverType);
            break;

        case "error":
            rdapValidator.validateError(record, url, serverType);
            break;

        default:
            rdapValidator.addResult(false, "not sure what to do with '" + type + "'");
    }

    rdapValidator.addResult(
        null,
        "RDAP validation completed with " + rdapValidator.errors + " error(s)."
    );
};

rdapValidator.validateDomain = function(domain, url, serverType, topmost) {

    rdapValidator.addResult(null, "validating domain object...");

    rdapValidator.validateCommonObjectProperties(domain);

    rdapValidator.pushPath(".ldhName");

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
        &&
        topmost
    ) {
        const path = new URL(url).pathname;
        const name = path.substr(1+path.lastIndexOf("/")).toLowerCase();

        rdapValidator.addResult(
            domain.ldhName.toLowerCase() === name,
            "The 'ldhName' property MUST match the domain name in the URL (" + name + ").",
            {name:domain.ldhName}
        );
    }

    rdapValidator.popPath();

    if (domain.hasOwnProperty("entities")) {
        rdapValidator.pushPath(".entities");

        if (!rdapValidator.addResult(
            rdapValidator.isArray(domain.entities),
            "The 'entities' property MUST be an array.",
            domain.entities
        )) return;

        let i = 0;
        domain.entities.forEach(function(e) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.validateEntity(e);

            rdapValidator.popPath();
        });

        rdapValidator.popPath();
    }

    if (domain.hasOwnProperty("nameservers")) {
        rdapValidator.pushPath(".nameservers");

        if (!rdapValidator.addResult(
            rdapValidator.isArray(domain.nameservers),
            "The 'nameservers' property MUST be an array.",
            domain.nameservers
        )) return;

        let i = 0;
        domain.nameservers.forEach(function(e) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.validateNameserver(e)

            rdapValidator.popPath();
        });

        rdapValidator.popPath();
    }

    if (domain.hasOwnProperty("secureDNS")) {
        rdapValidator.pushPath(".secureDNS");

        rdapValidator.validateSecureDNS(domain.secureDNS);

        rdapValidator.popPath();
    }

    if (topmost) {
        switch (serverType) {
            case "thin-gtld-registry":  return rdapValidator.validateThinGTLDDomainResponse(domain);
            case "thick-gtld-registry": return rdapValidator.validateThickGTLDDomainResponse(domain);
            case "gtld-registrar":      return rdapValidator.validateGTLDRegistrarDomainResponse(domain);
            case "rir":                 return rdapValidator.validateRIRDomainResponse(domain);
            default:                    return;
        }
    }
};

rdapValidator.validateThinGTLDDomainResponse = function(domain) {
    rdapValidator.addResult(null, "validating response for a thin gTLD registry...");

    rdapValidator.pushPath(".entities");

    if (!rdapValidator.addResult(
        domain.hasOwnProperty("entities"),
        "The 'entities' property MUST be present."
    )) return;

    if (!rdapValidator.addResult(
        1 == domain.entities.length,
        "Exactly one entity MUST be present."
    )) return;

    rdapValidator.pushPath("[0]");

    rdapValidator.validateGTLDRegistrarEntity(domain.entities[0]);

    rdapValidator.popPath();
    rdapValidator.popPath();

    rdapValidator.validateCommonGTLDDomainResponse(domain);
};

rdapValidator.validateGTLDRegistrarEntity = function(rar) {
    rdapValidator.addResult(null, "validating entity as a gTLD registrar...");

    if (rdapValidator.addResult(
        rar.hasOwnProperty("roles"),
        "The registrar entity MUST have the 'roles' property."
    )) {
        rdapValidator.pushPath(".roles");

        rdapValidator.addResult(
            rar.roles.indexOf("registrar") >= 0,
            "The entity MUST have the 'registrar' role.",
            rar.roles
        );

        rdapValidator.popPath();
    }

    rdapValidator.pushPath(".publicIds");

    if (!rdapValidator.addResult(
        rar.hasOwnProperty("publicIds"),
        "The registrar entity MUST have the 'publicIds' property."
    )) return;

    rdapValidator.pushPath("[?('IANA Registrar ID' == @.type)][0].type");

    const ids = rar.publicIds.filter((id) => "IANA Registrar ID" == id.type);
    if (!rdapValidator.addResult(
        1 === ids.length,
        "The registrar entity MUST have exactly one Public ID object with the 'IANA Registrar ID' type."
    )) return;

    rdapValidator.popPath();

    rdapValidator.pushPath("[?('IANA Registrar ID' == @.type)][0].identifier");

    rdapValidator.addResult(
        rdapValidator.isString(ids[0].identifier) && rdapValidator.isInteger(parseInt(ids[0].identifier)),
        "The 'type' property of the Public ID object MUST be a string containing an integer."
    );

    rdapValidator.popPath();

    rdapValidator.addResult(
        null,
        "This tool does not validate the IANA Registrar ID, please refer to https://www.iana.org/assignments/registrar-ids/registrar-ids.xhtml."
    );

    rdapValidator.popPath();
};

rdapValidator.validateThickGTLDDomainResponse = function(domain) {
    rdapValidator.addResult(null, "validating response for a thick gTLD registry");

    rdapValidator.pushPath(".entities");

    if (!rdapValidator.addResult(
        domain.hasOwnProperty("entities"),
        "The 'entities' property MUST be present."
    )) return;

    if (!rdapValidator.addResult(
        rdapValidator.isArray(domain.entities),
        "The 'entities' property MUST be an array."
    )) return;

    const entities = [];
    let i = 0;
    domain.entities.forEach(function(e) {
        e.roles.forEach((r) => entities[r] = i);
        i++;
    });

    rdapValidator.addResult(
        entities.hasOwnProperty("registrant"),
        "At least one entity MUST have the 'registrant' role."
    );

    rdapValidator.pushPath("[" + i + "]");
    rdapValidator.validateGTLDRegistrarEntity(domain.entities[entities["registrar"]]);

    rdapValidator.popPath();
    rdapValidator.popPath();

    rdapValidator.validateCommonGTLDDomainResponse(domain);
};

rdapValidator.validateGTLDRegistrarDomainResponse = function(domain) {
    rdapValidator.addResult(null, "validation of domain responses from gTLD registrars is a work in progress...");
};

rdapValidator.validateCommonGTLDDomainResponse = function(domain) {
    rdapValidator.addResult(null, "validating common gTLD properties...");

    rdapValidator.addResult(
        null,
        "gTLD domain validation is a work-in-progress."
    );
};

rdapValidator.validateSecureDNS = function(secureDNS) {
    rdapValidator.addResult(null, "validating 'secureDNS' object...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(secureDNS),
        "The 'secureDNS' property MUST be an object."
    )) return;      

    ["zoneSigned", "delegationSigned"].forEach(function (p) {
        rdapValidator.pushPath("." + p);

        if (secureDNS.hasOwnProperty(p)) {
            let o = {};
            o[p] = secureDNS[p];
            rdapValidator.addResult(
                rdapValidator.isBoolean(secureDNS[p]),
                "The '" + p + "' property MUST be a boolean.",
                o
            );
        }

        rdapValidator.popPath();
    });

    if (secureDNS.delegationSigned) {
        let count = 0;

        ["dsData", "keyData"].forEach(function (p) {
            rdapValidator.pushPath("." + p);

            if (secureDNS.hasOwnProperty(p)) {

                if (rdapValidator.addResult(
                    rdapValidator.isArray(secureDNS[p]),
                    "The '" + p + "' property MUST be an array.",
                )) {
                    count += secureDNS[p].length;

                    let i = 0;
                    secureDNS[p].forEach(function(v) {

                        rdapValidator.pushPath("[" + i++ + "]");

                        switch(p) {
                            case "dsData"   : rdapValidator.validateDSData(v); break;
                            case "keyData"  : rdapValidator.validateKeyData(v); break;
                        }

                        rdapValidator.popPath();
                    });

                }
            }

            rdapValidator.popPath();
        });

        rdapValidator.addResult(
            count > 0,
            "The 'secureDNS' property for a domain where delegationSigned=true MUST contain one or more values in the 'dsData' amd 'keyData' properties."
        );
    }
};

rdapValidator.validateDSData = function(dsData) {
    rdapValidator.addResult(null, "validating 'dsData' object...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(dsData),
        "Values in the 'dsData' property MUST be an object",
        dsData
    )) return;      

    ["keyTag", "algorithm", "digestType", "digest"].forEach(function(p) {

        rdapValidator.pushPath("." + p);

        if (rdapValidator.addResult(
            dsData.hasOwnProperty(p),
            "DS record object MUST have a '" + p + "' property.",
            dsData[p]
        )) {
            rdapValidator.addResult(
                ("digest" === p ? rdapValidator.isString(dsData[p]) : rdapValidator.isInteger(dsData[p])),
                "The '" + p + "' property of DS record object MUST be " + ("digest" === p ? "a string" : "an integer") + ".",
                dsData[p]
            );
        }

        rdapValidator.popPath();
    });

    if (dsData.hasOwnProperty("events")) {
        rdapValidator.pushPath(".events");

        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.events),
            "The 'events' property MUST be an array.",
        )) {
            let i = 0;
            dsData.events.forEach(function(e) {
                rdapValidator.pushPath("["  + i++ + "]");

                rdapValidator.validateEvent(e);

                rdapValidator.popPath();
            });
        }

        rdapValidator.popPath();
    }

    if (dsData.hasOwnProperty("links")) {
        rdapValidator.pushPath(".links");

        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.links),
            "The 'links' property MUST be an array.",
        )) {
            let i = 0;
            dsData.events.forEach(function(l) {
                rdapValidator.pushPath("[" + i++ + "]");
                rdapValidator.validateLink(l)
            });

        }

        rdapValidator.popPath();
    }
};

rdapValidator.validateKeyData = function(keyData) {
    rdapValidator.addResult(null, "validating 'keyData' object...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(keyData),
        "Value in the 'keyData' property is not an object",
        keyData
    )) return;      

    ["flags", "protocol", "algorithm", "publicKey"].forEach(function(p) {
        rdapValidator.pushPath("." + p);

        if (rdapValidator.addResult(
            keyData.hasOwnProperty(p),
            "KeyData object MUST have a '" + p + "' property.",
            keyData[p]
        )) {
            rdapValidator.addResult(
                ("publicKey" === p ? rdapValidator.isString(keyData[p]) : rdapValidator.isInteger(keyData[p])),
                "The '" + p + "' property of KeyData object MUST be a " + ("publicKey" === p ? "string" : "integer"),
                keyData[p]
            );
        }

        rdapValidator.popPath();
    });

    if (keyData.hasOwnProperty("events")) {

        rdapValidator.pushPath(".events");

        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.events),
            "The 'events' property MUST be an array.",
        )) {
            let i = 0;
            keyData.events.forEach(function(e) {
                rdapValidator.pushPath("[" + i++ + "]");
                rdapValidator.validateEvent(e);
                rdapValidator.popPath();
            });

        }

        rdapValidator.popPath();
    }

    if (keyData.hasOwnProperty("links")) {
        rdapValidator.pushPath(".links");

        if (rdapValidator.addResult(
            rdapValidator.isArray(dsData.links),
            "The 'links' property MUST be an array.",
        )) {
            let i = 0;
            keyData.events.forEach(function (l) {
                rdapValidator.pushPath("[" + i++ + "]");
                rdapValidator.validateLink(l);
                rdapValidator.popPath();
            });

        }

        rdapValidator.popPath();
    }
};

rdapValidator.validateEntity = function(entity, url, serverType, topmost) {
    rdapValidator.addResult(null, "validating entity...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(entity),
        "Entity MUST be an object."
    )) return;      

    rdapValidator.validateCommonObjectProperties(entity);

    rdapValidator.pushPath(".roles");

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
        let i = 0;
        entity.roles.forEach(function(role) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.addResult(
                rdapValidator.values.role.indexOf(role) >= 0,
                "Role '" + role + "' MUST be a valid RDAP value.",
                [role]
            );

            rdapValidator.popPath();
        })

    }

    rdapValidator.popPath();

    rdapValidator.pushPath(".vcardArray");

    if (
        entity.hasOwnProperty("vcardArray")
        &&
        rdapValidator.addResult(
            rdapValidator.isArray(entity.vcardArray),
            "The 'vcardArray' property MUST be an array."
        )
    ) {
        rdapValidator.pushPath("[0]");

        rdapValidator.addResult(
            "vcard" === entity.vcardArray[0],
            "The first value in the vcardArray array MUST be 'vcard'.",
            entity.vcardArray[0]
        );

        rdapValidator.popPath();

        rdapValidator.pushPath("[1]");

        rdapValidator.validateJCard(entity.vcardArray[1]);

        rdapValidator.popPath();

    }

    rdapValidator.popPath();

    ["asEventActor", "networks", "autnums"].forEach(function(p) {
        rdapValidator.pushPath("." + p);

        if (entity.hasOwnProperty(p)) {
            if (rdapValidator.addResult(
                rdapValidator.isArray(entity[p]),
                "The '" + p + "' property MUST be an array.",
                entity[p]
            )) {
                let i = 0;
                entity[p].forEach(function(v) {
                    rdapValidator.pushPath("[" + i++ + "]");

                    switch (p) {
                        case "asEventActor": return rdapValidator.validateEvent(v);
                        case "networks": return rdapValidator.validateIP(v);
                        case "autnums": return rdapValidator.validateASN(v);
                    }

                    rdapValidator.popPath();

                });
            }
        }

        rdapValidator.popPath();
    });

    if (topmost) {
        switch (serverType) {
            case "thin-gtld-registry":  return rdapValidator.validateThinGTLDEntityResponse(entity);
            case "thick-gtld-registry": return rdapValidator.validateThickGTLDEntityResponse(entity);
            case "gtld-registrar":      return rdapValidator.validateGTLDRegistrarEntityResponse(entity);
            case "rir":                 return rdapValidator.validateRIREntityResponse(entity);
            default:                    return;
        }
    }
}

rdapValidator.validateJCard = function (jcard) {
    rdapValidator.addResult(null, "validating JCard object...");

    if (!rdapValidator.addResult(
        rdapValidator.isArray(jcard),
        "jCard MUST be an array."
    )) return;      

    if (!rdapValidator.addResult(
        jcard.length > 0,
        "jCard MUST NOT be empty."
    )) return;      

    let seen = {};

    let i = 0;
    jcard.forEach(function(node) {
        rdapValidator.pushPath("[" + i++ + "]");

        if (!rdapValidator.addResult(
            rdapValidator.isArray(node),
            "Node MUST be an array."
        )) return;      

        if (!rdapValidator.addResult(
            node.length == 4,
            "Node MUST contain exactly four (4) elements."
        )) return;      

        rdapValidator.pushPath("[0]");

        if (
            rdapValidator.addResult(
                rdapValidator.isString(node[0]),
                "Node item #1 MUST be a string.",
                node[0]
            ) && rdapValidator.addResult(
                rdapValidator.JCardPropertyTypes.includes(node[0].toUpperCase()),
                "Property type MUST be present in the IANA registry.",
                node[0]
            )
        ) {
            seen[node[0].toUpperCase()] = 1;
        }

        rdapValidator.popPath();
        rdapValidator.pushPath("[1]");

        if (rdapValidator.addResult(
            rdapValidator.isObject(node[1]),
            "Node item #2 MUST be an object.",
            node[1]
        )) {
            Object.keys(node[1]).forEach(function (k) {
                rdapValidator.pushPath("[" + k + "]");

                const o = {};
                o[k] = node[1][k];

                rdapValidator.addResult(
                    rdapValidator.JCardParameters.includes(k.toUpperCase()),
                    "Parameter name MUST be present in the IANA registry",
                    o
                );

                rdapValidator.popPath();
            });
        }

        rdapValidator.popPath();
        rdapValidator.pushPath("[2]");

        if (rdapValidator.addResult(
            rdapValidator.isString(node[2]),
            "Node item #3 MUST be a string.",
            node[2]
        )) {
            rdapValidator.addResult(
                rdapValidator.JCardValueTypes.includes(node[2].toUpperCase()),
                "Value type '" + node[2] + "' MUST be present in the IANA registry.",
                node[2]
            );
        };

        if (rdapValidator.propertyValues.hasOwnProperty(node[0].toUpperCase())) {
            rdapValidator.addResult(
                rdapValidator.propertyValues[node[0].toUpperCase()].includes(node[3]),
                "Value MUST be one of: [" + rdapValidator.propertyValues[node[0].toUpperCase()].join("|") + "]",
                node[0]
            );
        }

        rdapValidator.popPath();
        rdapValidator.pushPath("[3]");

        if (
            "ADR" === node[0].toUpperCase()
            &&
            rdapValidator.addResult(
                rdapValidator.isArray(node[3]),
                "Value of ADR property MUST be an array.",
                node[3]
            )
        ) {
            rdapValidator.addResult(
                7 == node[3].length,
                "Length of the array in an ADR property MUST be exactly 7.",
                node[3]
            );
        }

        rdapValidator.popPath();
        rdapValidator.popPath();
    });

    ["VERSION", "FN"].forEach((n) => rdapValidator.addResult(
        seen.hasOwnProperty(n),
        "jCard MUST have a " + n + " property."
    ));
};

rdapValidator.validateNameserver = function(nameserver, url, serverType, topmost) {
    rdapValidator.addResult(null, "validating nameserver...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(nameserver),
        "Nameserver MUST be an object."
    )) return;      

    rdapValidator.validateCommonObjectProperties(nameserver);

    rdapValidator.pushPath(".ldhName");

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

    rdapValidator.popPath();
    rdapValidator.pushPath(".ipAddresses");

    if (
        nameserver.hasOwnProperty("ipAddresses")
        &&
        rdapValidator.addResult(
            rdapValidator.isObject(nameserver.ipAddresses),
            "The 'ipAddresses' property MUST be an object."
        )
    ) {
        ["v4", "v6"].forEach(function(t) {
            rdapValidator.pushPath("." + t);

            if (nameserver.ipAddresses.hasOwnProperty(t)) {
                rdapValidator.addResult(
                    rdapValidator.isArray(nameserver.ipAddresses[t]),
                    "The '" + t + "' property of the 'ipAddresses' property MUST be an array."
                );

                let i = 0;
                nameserver.ipAddresses[t].forEach(function(addr) {
                    rdapValidator.pushPath("[" + i++ + "]");

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

                    rdapValidator.popPath();
                });
            }

            rdapValidator.popPath();
        });
    }

    rdapValidator.popPath();

    if (topmost) {
        switch (serverType) {
            case "thin-gtld-registry":  return rdapValidator.validateThinGTLDNameServerResponse(nameserver);
            case "thick-gtld-registry": return rdapValidator.validateThickGTLDNameServerResponse(nameserver);
            case "gtld-registrar":      return rdapValidator.validateGTLDRegistrarNameServerResponse(nameserver);
            case "rir":                 return rdapValidator.validateRIRNameServerResponse(nameserver);
            default:                    return;
        }
    }
}

rdapValidator.validateLink = function(link) {
    rdapValidator.addResult(null, "validating link...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(link),
        "Link MUST be an object.",
    )) return;

    ["value", "rel", "href"].forEach(function(k) {
        rdapValidator.pushPath("." + k);

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

        rdapValidator.popPath();
    });

    ["hreflang", "title", "media", "type"].forEach(function(k) {
        rdapValidator.pushPath("." + k);

        if (link.hasOwnProperty(k)) {
            rdapValidator.addResult(
                rdapValidator.isString(link[k]),
                "Link '" + k + "' property MUST be a string.",
                link
            );
        }

        rdapValidator.popPath();
    });
};

rdapValidator.validateNoticeOrRemark = function (noticeOrRemark) {
    rdapValidator.addResult(null, "validating notice/remark...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(noticeOrRemark),
        "Notice/remark MUST be an object.",
    )) return;

    if (noticeOrRemark.hasOwnProperty("title")) {
        rdapValidator.pushPath(".title");

        rdapValidator.addResult(
            rdapValidator.isString(noticeOrRemark.title),
            "The 'title' property MUST be a string.",
            {title:noticeOrRemark.title}
        );

        rdapValidator.popPath();
    }

    rdapValidator.pushPath(".description");

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

    rdapValidator.popPath();

    if (noticeOrRemark.hasOwnProperty("type")) {
        rdapValidator.pushPath(".type");

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

        rdapValidator.popPath();
    }

    if (noticeOrRemark.hasOwnProperty("links")) {
        rdapValidator.pushPath(".links");

        rdapValidator.commonPropertyValidators.links(noticeOrRemark.links);

        rdapValidator.popPath();

    }
};

rdapValidator.validateEvent = function (event) {
    rdapValidator.addResult(null, "validating event...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(event),
        "Event MUST be an object.",
    )) return;

    ["eventAction", "eventDate"].forEach(function(k) {
        rdapValidator.pushPath("." + k);

        const o = {};
        o[k] = event[k]

        rdapValidator.addResult(
            event.hasOwnProperty(k),
            "Event MUST have the '" + k + "' property.",
            o,
        );

        rdapValidator.addResult(
            rdapValidator.isString(event[k]),
            "The '" + k + "' property MUST be a string.",
            o,
        );

        rdapValidator.popPath();
    });

    rdapValidator.pushPath(".eventAction");

    rdapValidator.addResult(
        rdapValidator.values.eventAction.indexOf(event.eventAction) >= 0,
        "The 'eventAction' property MUST be a valid JSON value.",
        {eventAction:event.eventAction}
    );

    rdapValidator.popPath();
    rdapValidator.pushPath(".eventDate");

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

    rdapValidator.popPath();

    if (event.hasOwnProperty("links")) {
        rdapValidator.pushPath(".links");

        rdapValidator.commonPropertyValidators.links(event.links);

        rdapValidator.popPath();
    }
};

rdapValidator.validatePublicId = function (publicId) {
    rdapValidator.addResult(null, "validating Public ID...");

    rdapValidator.addResult(
        rdapValidator.isObject(publicId),
        "Public ID MUST be an object.",
    );

    ["type", "identifier"].forEach(function(k) {
        rdapValidator.pushPath("." + k);
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

        rdapValidator.popPath();
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

    let i = 0;
    links.forEach(function(l) {
        rdapValidator.pushPath("[" + i++ + "]");

        rdapValidator.validateLink(l);

        rdapValidator.popPath();
    });
}

rdapValidator.commonPropertyValidators.remarks = function(remarks) {
    rdapValidator.addResult(
        rdapValidator.isArray(remarks),
        "The 'remarks' property MUST be an array.",
    );

    let i = 0;
    remarks.forEach(function(r) {
        rdapValidator.pushPath("[" + i++ + "]");

        rdapValidator.validateNoticeOrRemark(r);

        rdapValidator.popPath();
    });
}

rdapValidator.commonPropertyValidators.lang = function(lang) {
    rdapValidator.addResult(
        rdapValidator.isString(lang),
        "The 'lang' property MUST be a string.",
        {lang:lang}
    );
}

rdapValidator.commonPropertyValidators.events = function(events) {
    rdapValidator.addResult(
        rdapValidator.isArray(events),
        "The 'events' property MUST be an array.",
    );

    let i = 0;
    events.forEach(function(e) {
        rdapValidator.pushPath("[" + i++ + "]");

        rdapValidator.validateEvent(e);

        rdapValidator.popPath();
    });
}

rdapValidator.commonPropertyValidators.status = function(status) {
    rdapValidator.addResult(
        rdapValidator.isArray(status),
        "The 'status' property MUST be an array.",
    );

    let i = 0;
    status.forEach(function(s) {
        rdapValidator.pushPath("[" + i++ + "]");

        rdapValidator.addResult(
            rdapValidator.values.status.indexOf(s) >= 0,
            "Status '" + s + "' MUST be a valid status.",
            s
        );

        rdapValidator.popPath();
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

    let i = 0;
    publicIds.forEach(function(p) {
        rdapValidator.pushPath("[" + i++ + "]");

        rdapValidator.validatePublicId(p)

        rdapValidator.popPath();
    });

}

rdapValidator.validateCommonObjectProperties = function(record) {
    rdapValidator.addResult(null, "checking common object properties...");

    Object.keys(rdapValidator.commonPropertyValidators).forEach(function(name) {

        if (record.hasOwnProperty(name)) {
            rdapValidator.pushPath("." + name);

            rdapValidator.addResult(null, "checking '" + name + "' property...");

            rdapValidator.commonPropertyValidators[name](record[name]);

            rdapValidator.popPath();
        }
    });
};

rdapValidator.validateIP = function(ipNetwork, url, serverType, topmost) {

    rdapValidator.addResult(null, "validating IP network object...");

    rdapValidator.validateCommonObjectProperties(ipNetwork);

    const fields = ["startAddress", "endAddress", "ipVersion", "name", "type", "country", "parentHandle"];
    fields.forEach(function(f) {
        rdapValidator.pushPath("." + f);

        if (ipNetwork.hasOwnProperty(f)) {
            rdapValidator.addResult(
                rdapValidator.isString(ipNetwork[f]),
                "The '" + f + "' property MUST be a string."
            );

            if ("ipVersion" == f) {
                rdapValidator.addResult(
                    ["v4", "v6"].includes(ipNetwork[f]),
                    "The 'ipVersion' property MUST be either 'v4' or 'v6'."
                );
            }

            if ("country" == f) {
                rdapValidator.addResult(
                    /[A-Z]{2}/.match(ipNetwork[f]),
                    "The 'country' property MUST be a 2-character country-code."
                );
            }
        }

        rdapValidator.popPath();
    });

    if (topmost && "rir" == serverType) {
        rdapValidator.validateRIRIPNetwork(ipNetwork, url);
    }
};

rdapValidator.validateRIRASN = function(autnum, url) {
    rdapValidator.validateRIRIPNetwork(null, "validating RIR responses is a work-in-progress...");
};

rdapValidator.validateASN = function(autnum, url, serverType, topmost) {

    rdapValidator.addResult(null, "validating autnum object...");

    rdapValidator.validateCommonObjectProperties(autnum);

    ["startAutnum", "endAutnum"].forEach(function(f) {
        rdapValidator.pushPath("." + f);

        if (autnum.hasOwnProperty(f)) {
            rdapValidator.addResult(
                rdapValidator.isInteger(autnum[f]),
                "The '" + f + "' property MUST be an integer."
            );
        }

        rdapValidator.popPath();
    });

    const fields = ["name", "type", "country"];
    fields.forEach(function(f) {
        rdapValidator.pushPath("." + f);

        if (autnum.hasOwnProperty(f)) {
            rdapValidator.addResult(
                rdapValidator.isString(autnum[f]),
                "The '" + f + "' property MUST be a string."
            );

            if ("country" == f) {
                rdapValidator.addResult(
                    /[A-Z]{2}/.match(autnum[f]),
                    "The 'country' property MUST be a 2-character country-code."
                );
            }
        }

        rdapValidator.popPath();
    });

    if (autnum.hasOwnProperty("entities")) {
        rdapValidator.pushPath(".entities");

        if (rdapValidator.addResult(
            rdapValidator.isArray(autnum.entities),
            "The 'entities' property MUST be an array."
        )) {

            let i = 0;
            autnum.entities.forEach(function (e) {
                rdapValidator.pushPath("[" + i++ + "]");

                rdapValidator.validateEntity(e);

                rdapValidator.popPath();
            });
        }

        rdapValidator.popPath();
    }

    if (topmost && "rir" == serverType) {
        rdapValidator.validateRIRASN(autnum, url);
    }
};

rdapValidator.validateRIRASN = function(autnum, url) {
    rdapValidator.addResult(null, "validating RIR responses is a work-in-progress...");
};

rdapValidator.validateHelp = function(help, url, serverType) {

    rdapValidator.addResult(null, "validating help response...");

    rdapValidator.pushPath(".notices");

    if (rdapValidator.addResult(
        help.hasOwnProperty("notices"),
        "Help response MUST have a 'notices' property."
    )) {
        rdapValidator.addResult(
            help.notices.length > 0,
            "'notices' property MUST contain at least one item."
        );

        let i = 0;
        help.notices.forEach(function (n) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.validateNoticeOrRemark(n);

            rdapValidator.popPath();
        });
    }

    rdapValidator.popPath();
};

rdapValidator.validateDomainSearch = function(result, url, serverType) {

    rdapValidator.addResult(null, "validating domain search response...");

    rdapValidator.validateCommonObjectProperties(result);

    rdapValidator.pushPath(".domainSearchResults");

    if (
        rdapValidator.addResult(
            result.hasOwnProperty("domainSearchResults"),
            "Search result MUST have the 'domainSearchResults' property."
        )
        &&
        rdapValidator.addResult(
            rdapValidator.isArray(result.domainSearchResults),
            "'domainSearchResults' property MUST be an array."
        )
    ) {
        let i = 0;
        result.domainSearchResults.forEach(function (d) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.validateDomain(d, null, serverType, false);

            rdapValidator.popPath();
        });
    }

    rdapValidator.popPath();
};

rdapValidator.validateNameserverSearch = function(result, url, serverType) {

    rdapValidator.addResult(null, "validating nameserver search response...");

    rdapValidator.validateCommonObjectProperties(result);

    rdapValidator.pushPath(".nameserverSearchResults");

    if (
        rdapValidator.addResult(
            result.hasOwnProperty("nameserverSearchResults"),
            "Search result MUST have the 'nameserverSearchResults' property."
        )
        &&
        rdapValidator.addResult(
            rdapValidator.isArray(result.nameserverSearchResults),
            "'nameserverSearchResults' property MUST be an array."
        )
    ) {
        let i = 0;
        result.nameserverSearchResults.forEach(function (n) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.validateNameserver(n, null, serverType);

            rdapValidator.popPath();
        });
    }

    rdapValidator.popPath();
};

rdapValidator.validateEntitySearch = function(result, url, serverType) {

    rdapValidator.addResult(null, "validating entity search response...");

    rdapValidator.validateCommonObjectProperties(result);

    rdapValidator.pushPath(".entitySearchResults");

    if (
        rdapValidator.addResult(
            result.hasOwnProperty("entitySearchResults"),
            "Search result MUST have the 'entitySearchResults' property."
        )
        &&
        rdapValidator.addResult(
            rdapValidator.isArray(result.entitySearchResults),
            "'entitySearchResults' property MUST be an array."
        )
    ) {
        let i = 0;
        result.entitySearchResults.forEach(function (e) {
            rdapValidator.pushPath("[" + i++ + "]");

            rdapValidator.validateEntity(e, null, serverType);

            rdapValidator.popPath();
        });
    }

    rdapValidator.popPath();
};

rdapValidator.validateError = function(error, url, serverType) {
    rdapValidator.addResult(null, "validating error response...");

    rdapValidator.pushPath(".errorCode");

    if (rdapValidator.addResult(
        error.hasOwnProperty("errorCode"),
        "Error object MUST have an 'errorCode' property."
    )) {
        rdapValidator.addResult(
            rdapValidator.isInteger(error.errorCode),
            "'errorCode' property MUST be an integer."
        );
    }

    rdapValidator.popPath();

    if (error.hasOwnProperty("title")) {
        rdapValidator.pushPath(".title");

        rdapValidator.addResult(
            rdapValidator.isString(error.title),
            "'title' property MUST be a string."
        );

        rdapValidator.popPath();
    }

    if (error.hasOwnProperty("notices")) {
        rdapValidator.pushPath(".notices");

        if (rdapValidator.addResult(
            rdapValidator.isArray(error.notices),
            "'notices' property MUST be an array."
        )) {
            rdapValidator.addResult(
                error.notices.length > 0,
                "'notices' property MUST contain at least one item."
            );

            let i = 0;
            error.notices.forEach(function (n) {
                rdapValidator.pushPath("[" + i++ + "]");
                rdapValidator.validateNoticeOrRemark(n);
                rdapValidator.popPath();
            });
        }

        rdapValidator.popPath();
    }
};

rdapValidator.validateGTLDRegistrarEntityResponse = function(entity) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateGTLDRegistrarNameServerResponse = function(nameserver) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateRIRDomainResponse = function(domain) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateRIREntityResponse = function(entity) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateRIRNameServerResponse = function(nameserver) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateThickGTLDEntityResponse = function(entity) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateThickGTLDNameServerResponse = function(nameserver) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateThinGTLDEntityResponse = function(entity) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

rdapValidator.validateThinGTLDNameServerResponse = function(nameserver) {
    rdapValidator.addResult(
        null,
        "TODO"
    );
};

const rdapValidator = {};

export default rdapValidator;

/**
 * Initiate a test run.
 * @param {null|string} url
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

    rdapValidator.addMessage("Testing URL is '" + url + "'");
    rdapValidator.addMessage("Response type is '" + type + "'");
    rdapValidator.addMessage("Server type is '" + serverType + "'");

    rdapValidator.lastTestedURL             = url;
    rdapValidator.lastTestedResponseType    = type;
    rdapValidator.lastTestedServerType      = serverType;

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
 * @param {null|string} url
 * @param {string} type one of the values in rdapValidator.responseTypes
 * @param {string} serverType one of the values in rdapValidator.serverTypes
 */
rdapValidator.testResponse = function(xhr, url, type, serverType) {

    rdapValidator.path = ["$"];

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

    if (!rdapValidator.addResult(
        rdapValidator.isObject(record),
        "Response body MUST be a JSON object."
    )) return;

    rdapValidator.pushPath(".rdapConformance");

    if (rdapValidator.addResult(
        record.hasOwnProperty("rdapConformance"),
        "Record MUST have the 'rdapConformance' property."
    )) {
        rdapValidator.addResult(
            rdapValidator.isArray(record.rdapConformance),
            "The 'rdapConformance' property MUST be an array."
        );

        rdapValidator.addResult(
            record.rdapConformance.indexOf("rdap_level_0") >= 0,
            "The 'rdapConformance' property MUST contain 'rdap_level_0'."
        );

        rdapValidator.iterate(
            record.rdapConformance.filter((s) => s != "rdap_level_0"),
            (s) => rdapValidator.addResult(
                rdapValidator.extensions.indexOf(s) >= 0,
                "The '" + s + "' extension MUST be registered with IANA."
            )
        );
    }

    rdapValidator.popPath(".rdapConformance");

    if (record.hasOwnProperty("notices")) {
        rdapValidator.pushPath(".notices");

        if (rdapValidator.addResult(
            rdapValidator.isArray(record.notices),
            "The 'notices' property MUST be an array.",
        )) {
            rdapValidator.iterate(
                record.notices,
                rdapValidator.validateNoticeOrRemark
            );
        }

        rdapValidator.popPath(".notices");
    }

    if (rdapValidator.objectTypes.indexOf(type) >= 0) {

        rdapValidator.pushPath(".objectClassName");

        if (!rdapValidator.addResult(
            record.hasOwnProperty("objectClassName"),
            "Record MUST have the 'objectClassName' property."
        )) return;

        if (!rdapValidator.addResult(
            rdapValidator.isString(record.objectClassName),
            "The 'objectClassName' property MUST be a string."
        )) return;

        rdapValidator.addResult(
            type == record.objectClassName,
            "The value of the 'objectClassName' property MUST be '" + type + "'."
        );

        rdapValidator.popPath(".objectClassName");
    }

    switch (type) {
        case "domain":
            rdapValidator.validateDomain(record, url, serverType);

            switch (serverType) {
                case "thin-gtld-registry":  rdapValidator.validateThickGTLDDomainResponse(record); break;
                case "thick-gtld-registry": rdapValidator.validateThinGTLDDomainResponse(record); break;
                case "gtld-registrar":      rdapValidator.validateGTLDRegistrarDomainResponse(record); break;
                case "rir":                 rdapValidator.validateRIRDomainResponse(record); break;
            }

            break;

        case "ip network":
            rdapValidator.validateIP(record, url, serverType);

            if ("rir" == serverType) rdapValidator.validateRIRIPResponse(record);

            break;

        case "autnum":
            rdapValidator.validateASN(record, url, serverType);

            if ("rir" == serverType) rdapValidator.validateRIRASNResponse(record);

            break;

        case "nameserver":
            rdapValidator.validateNameserver(record, url, serverType);

            switch (serverType) {
                case "thin-gtld-registry":
                case "thick-gtld-registry":
                    rdapValidator.validateGTLDNameserverResponse(record);
                    break;

                case "rir":
                    rdapValidator.validateRIRNameserverResponse(record);
                    break;
            }

            break;

        case "entity":
            rdapValidator.validateEntity(record, url, serverType);

            switch (serverType) {
                case "thin-gtld-registry":
                case "thick-gtld-registry":
                     rdapValidator.validateGTLDEntityResponse(record);
                     break;

                case "rir":
                    rdapValidator.validateRIREntityResponse(record);
                    break;
            }

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

    rdapValidator.addMessage("RDAP validation completed with " + rdapValidator.errors + " error(s).");
};

/**
 * validate a domain object.
 * @param {object} domain
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateDomain = function(domain, url, serverType) {

    rdapValidator.addMessage("validating domain object...");

    rdapValidator.validateCommonObjectProperties(domain);

    if (domain.hasOwnProperty("unicodeName") && domain.hasOwnProperty("ldhName")) {
        rdapValidator.pushPath(".unicodeName");

        rdapValidator.addResult(
            rdapValidator.compareUnicode(domain.unicodeName, domain.ldhName),
            "The 'unicodeName' property '" + domain.unicodeName + "' MUST match the 'ldhName' property '" + domain.ldhName + "'."
        );

        rdapValidator.popPath(".unicodeName");
    }

    if (domain.hasOwnProperty("nameservers")) {
        rdapValidator.pushPath(".nameservers");

        if (rdapValidator.addResult(
            rdapValidator.isArray(domain.nameservers),
            "The 'nameservers' property MUST be an array."
        )) {
            rdapValidator.iterate(
                domain.nameservers,
                rdapValidator.validateNameserver
            );
        }

        rdapValidator.popPath(".nameservers");
    }

    if (domain.hasOwnProperty("secureDNS")) {
        rdapValidator.pushPath(".secureDNS");

        rdapValidator.validateSecureDNS(domain.secureDNS);

        rdapValidator.popPath(".secureDNS");
    }
};

rdapValidator.validateCommonGTLDResponse = function(response) {

    rdapValidator.pushPath(".rdapConformance");

    rdapValidator.addResult(
        response.rdapConformance.includes("icann_rdap_response_profile_1"),
        "The 'rdapConformance' array MUST include 'icann_rdap_response_profile_1'."
    );

    rdapValidator.popPath(".rdapConformance");

    if (response.hasOwnProperty("entities") && rdapValidator.isArray(response.entities)) {
        rdapValidator.pushPath(".entities");

        rdapValidator.iterate(response.entities, function(entity) {
            if (entity.hasOwnProperty("vcardArray") && rdapValidator.isArray(entity.vcardArray) && rdapValidator.isArray(entity.vcardArray[1])) {
                rdapValidator.iterate(entity.vcardArray[1], function(p) {
                    if ("ADR" == p[0].toUpperCase()) {
                        rdapValidator.pushPath("[0]");

                        if (rdapValidator.addResult(
                            Object.keys(p[1]).map((k) => k.toUpperCase()).includes("CC"),
                            "'ADR' properties of entity vCards MUST have a 'CC' parameter."
                        )) {
                            const cc = p[1][Object.keys(p[1]).filter((k) => "CC" == k.toUpperCase()).shift()];
                            rdapValidator.addResult(
                                rdapValidator.countryCodes.includes(cc),
                                "'CC' parameter '" + cc + "' MUST be a valid ISO 3166-alpha-2 code."
                            );
                        }

                        rdapValidator.popPath("[0]");
                        rdapValidator.pushPath("[3][6]");

                        rdapValidator.addResult(
                            p[3][6] == "",
                            "The last item of an 'ADR' property value MUST be empty."
                        );

                        rdapValidator.popPath("[3][6]");
                    }
                });
            }
        });
    }

    rdapValidator.popPath(".entities");
};

/**
 * validate a domain object as per the gTLD RDAP profile for a thin registry.
 */
rdapValidator.validateThinGTLDDomainResponse = function(domain) {
    rdapValidator.addMessage("validating response for a thin gTLD registry...");

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

    rdapValidator.popPath("[0]");

    rdapValidator.popPath(".entities");

    rdapValidator.validateCommonGTLDResponse(domain);
    rdapValidator.validateCommonGTLDDomainResponse(domain);
};

/**
 * validate an entity as an ICANN-accredited registrar in a response from a
 * gTLD registry or registrar server.
 */
rdapValidator.validateGTLDRegistrarEntity = function(rar) {
    rdapValidator.addMessage("validating entity as a gTLD registrar...");

    if (rdapValidator.addResult(
        rar.hasOwnProperty("roles"),
        "The registrar entity MUST have the 'roles' property."
    )) {
        rdapValidator.pushPath(".roles");

        rdapValidator.addResult(
            rar.roles.indexOf("registrar") >= 0,
            "The entity MUST have the 'registrar' role."
        );

        rdapValidator.popPath();
    }

    rdapValidator.pushPath(".publicIds");

    if (!rdapValidator.addResult(
        rar.hasOwnProperty("publicIds"),
        "The registrar entity MUST have the 'publicIds' property."
    )) return;

    rdapValidator.pushPath("[?('IANA Registrar ID' == @.type)][0]");

    rdapValidator.pushPath(".type");

    const type = "IANA Registrar ID";
    const ids = rar.publicIds.filter((id) => type == id.type);
    if (!rdapValidator.addResult(
        1 === ids.length,
        "The registrar entity MUST have exactly one Public ID object with the '" + type + "' type."
    )) return;

    rdapValidator.popPath(".type");

    rdapValidator.pushPath(".identifier");

    rdapValidator.addResult(
        rdapValidator.isString(ids[0].identifier) && rdapValidator.isInteger(parseInt(ids[0].identifier)),
        "The 'type' property of the Public ID object MUST be a string containing an integer."
    );

    rdapValidator.popPath(".identifier");

    rdapValidator.popPath();

    rdapValidator.addMessage("This tool does not validate the IANA Registrar ID, please refer to https://www.iana.org/assignments/registrar-ids/registrar-ids.xhtml.");

    rdapValidator.popPath();
};

/**
 * validate a domain object as per the gTLD RDAP profile for a thick registry.
 */
rdapValidator.validateThickGTLDDomainResponse = function(domain) {
    rdapValidator.addMessage("validating response for a thick gTLD registry");

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

    if (rdapValidator.addResult(
        entities.hasOwnProperty("registrant"),
        "At least one entity MUST have the 'registrant' role."
    )) {
        rdapValidator.pushPath("[" + i + "]");

        rdapValidator.validateGTLDRegistrarEntity(domain.entities[entities["registrar"]]);

        rdapValidator.popPath();
    }

    rdapValidator.popPath();

    rdapValidator.validateCommonGTLDResponse(domain);
    rdapValidator.validateCommonGTLDDomainResponse(domain);
};

/**
 * validate a domain object as per the gTLD RDAP profile for a registrar.
 */
rdapValidator.validateGTLDRegistrarDomainResponse = function(domain) {
    rdapValidator.addMessage("TODO: gTLD registrar domain validation");
};

/**
 * common rules for gtld-thin-registry, gtld-thick-registry and gtld-registrar.
 */
rdapValidator.validateCommonGTLDDomainResponse = function(domain) {
    rdapValidator.addMessage("TODO: common gTLD domain validation");
};

/**
 * validate the secureDNS property of a domain object.
 */
rdapValidator.validateSecureDNS = function(secureDNS) {
    rdapValidator.addMessage("validating 'secureDNS' object...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(secureDNS),
        "The 'secureDNS' property MUST be an object."
    )) return;      

    ["zoneSigned", "delegationSigned"].forEach(function (p) {
        rdapValidator.pushPath("." + p);

        if (secureDNS.hasOwnProperty(p)) {
            rdapValidator.addResult(
                rdapValidator.isBoolean(secureDNS[p]),
                "The '" + p + "' property MUST be a boolean."
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

                    rdapValidator.iterate(
                        secureDNS[p],
                        function(v) {
                            switch(p) {
                                case "dsData"   : return rdapValidator.validateDSData(v);
                                case "keyData"  : return rdapValidator.validateKeyData(v);
                            }
                        }
                    );
                }
            }

            rdapValidator.popPath();
        });

        rdapValidator.addResult(
            count > 0,
            "The 'secureDNS' property for a domain where delegationSigned=true MUST contain one or more values in the 'dsData' and 'keyData' properties."
        );
    }
};

/**
 * validate a dsData object.
 */
rdapValidator.validateDSData = function(dsData) {
    rdapValidator.addMessage("validating 'dsData' object...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(dsData),
        "Values in the 'dsData' property MUST be an object"
    )) return;      

    ["keyTag", "algorithm", "digestType", "digest"].forEach(function(p) {

        rdapValidator.pushPath("." + p);

        if (rdapValidator.addResult(
            dsData.hasOwnProperty(p),
            "DS record object MUST have a '" + p + "' property."
        )) {
            rdapValidator.addResult(
                ("digest" === p ? rdapValidator.isString(dsData[p]) : rdapValidator.isInteger(dsData[p])),
                "The '" + p + "' property of DS record object MUST be " + ("digest" === p ? "a string" : "an integer") + "."
            );
        }

        rdapValidator.popPath();
    });

    rdapValidator.validateCommonObjectProperties(dsData);
};

/**
 * validate a keyData object.
 */
rdapValidator.validateKeyData = function(keyData) {
    rdapValidator.addMessage("validating 'keyData' object...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(keyData),
        "Value in the 'keyData' property is not an object"
    )) return;      

    ["flags", "protocol", "algorithm", "publicKey"].forEach(function(p) {
        rdapValidator.pushPath("." + p);

        if (rdapValidator.addResult(
            keyData.hasOwnProperty(p),
            "KeyData object MUST have a '" + p + "' property."
        )) {
            rdapValidator.addResult(
                ("publicKey" === p ? rdapValidator.isString(keyData[p]) : rdapValidator.isInteger(keyData[p])),
                "The '" + p + "' property of KeyData object MUST be a " + ("publicKey" === p ? "string" : "integer"),
            );
        }

        rdapValidator.popPath();
    });

    rdapValidator.validateCommonObjectProperties(keyData);
};

/**
 * validate an entity.
 * @param {object} entity
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateEntity = function(entity, url, serverType) {
    rdapValidator.addMessage("validating entity...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(entity),
        "Entity MUST be an object."
    )) return;      

    rdapValidator.validateCommonObjectProperties(entity);

    rdapValidator.pushPath(".roles");

    if (
        rdapValidator.addResult(
            entity.hasOwnProperty("roles"),
            "Entity MUST have the 'roles' property."
        )
        &&
        rdapValidator.addResult(
            rdapValidator.isArray(entity.roles),
            "The 'roles' property MUST be an array."
        )
    ) {
        rdapValidator.iterate(
            entity.roles,
            (r) => rdapValidator.addResult(
                rdapValidator.values.role.indexOf(r) >= 0,
                "Role '" + r + "' MUST be a valid RDAP value."
            )
        );
    }

    rdapValidator.popPath(".roles");
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
            "The first value in the vcardArray array MUST be 'vcard'."
        );

        rdapValidator.popPath("[0]");
        rdapValidator.pushPath("[1]");

        rdapValidator.validateJCard(entity.vcardArray[1]);

        rdapValidator.popPath("[1]");

    }

    rdapValidator.popPath(".vcardArray");

    ["asEventActor", "networks", "autnums"].forEach(function(p) {
        rdapValidator.pushPath("." + p);

        if (entity.hasOwnProperty(p)) {
            if (rdapValidator.addResult(
                rdapValidator.isArray(entity[p]),
                "The '" + p + "' property MUST be an array."
            )) {
                rdapValidator.iterate(
                    entity[p],
                    function(v) {
                        switch (p) {
                            case "asEventActor":    return rdapValidator.validateEvent(v);
                            case "networks":        return rdapValidator.validateIP(v);
                            case "autnums":         return rdapValidator.validateASN(v);
                        }
                    }
                );
            }
        }

        rdapValidator.popPath("." + p);
    });
}

/**
 * validate a JCard.
 */
rdapValidator.validateJCard = function (jcard) {
    rdapValidator.addMessage("validating JCard object...");

    if (!rdapValidator.addResult(
        rdapValidator.isArray(jcard),
        "jCard MUST be an array."
    )) return;      

    if (!rdapValidator.addResult(
        jcard.length > 0,
        "jCard MUST NOT be empty."
    )) return;      

    rdapValidator.iterate(
        jcard,
        rdapValidator.validateJCardProperty
    );

    ["VERSION", "FN"].forEach((r) => rdapValidator.addResult(
        jcard.filter((n) => r.toUpperCase() === n[0].toUpperCase()).length > 0,
        "jCard MUST have a " + r + " property."
    ));
};

/**
 * validate a JCard property.
 */
rdapValidator.validateJCardProperty = function(node) {

    if (!rdapValidator.addResult(
        rdapValidator.isArray(node),
        "Node MUST be an array."
    )) return;      

    if (!rdapValidator.addResult(
        node.length == 4,
        "Node MUST contain exactly four (4) elements."
    )) return;      

    const funcs = [
        rdapValidator.validateJCardPropertyType,
        rdapValidator.validateJCardPropertyParameters,
        rdapValidator.validateJCardPropertyValueType,
        rdapValidator.validateJCardPropertyValue,
    ];

    rdapValidator.iterate(funcs, (f) => f(node));
};

/**
 * validate a JCard property type.
 */
rdapValidator.validateJCardPropertyType = function(node) {
    if (rdapValidator.addResult(
        rdapValidator.isString(node[0]),
        "Item #1 of jCard property MUST be a string."
    )) return;

    if (!node[0].toUpperCase().startsWith("X-")) {
        rdapValidator.addResult(
            rdapValidator.JCardPropertyTypes.includes(node[0].toUpperCase()),
            "Property type '" + node[0] + "' MUST be present in the IANA registry."
        );
    }
};

/**
 * validate a JCard property parameter object.
 */
rdapValidator.validateJCardPropertyParameters = function(node) {
    if (rdapValidator.addResult(
        rdapValidator.isObject(node[1]),
        "Item #2 of jCard property MUST be an object."
    )) {
        rdapValidator.iterate(
            Object.keys(node[1]),
            (k) => rdapValidator.addResult(
                rdapValidator.JCardParameters.includes(k.toUpperCase()),
                "Parameter name '" + k + "' MUST be present in the IANA registry"
            )
        );
    }
};

/**
 * validate a JCard property value type.
 */
rdapValidator.validateJCardPropertyValueType = function(node) {
    if (rdapValidator.addResult(
        rdapValidator.isString(node[2]),
        "Item #3 of jCard property MUST be a string."
    )) {
        rdapValidator.addResult(
            rdapValidator.JCardValueTypes.includes(node[2].toUpperCase()),
            "Value type '" + node[2] + "' MUST be present in the IANA registry."
        );
    };

    if (rdapValidator.propertyValues.hasOwnProperty(node[0].toUpperCase())) {
        rdapValidator.addResult(
            rdapValidator.propertyValues[node[0].toUpperCase()].includes(node[3].toUpperCase()),
            "Value MUST be one of: [" + rdapValidator.propertyValues[node[0].toUpperCase()].join("|") + "]"
        );
    }
};

/**
 * validate a property value.
 */
rdapValidator.validateJCardPropertyValue = function(node) {
    if (
        "ADR" === node[0].toUpperCase()
        &&
        rdapValidator.addResult(
            rdapValidator.isArray(node[3]),
            "Value of ADR property MUST be an array."
        )
    ) {
        rdapValidator.addResult(
            7 == node[3].length,
            "Length of the array in an ADR property MUST be exactly 7."
        );
    }
};

/**
 * validate an nameserver.
 * @param {object} nameserver
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateNameserver = function(nameserver, url, serverType) {
    rdapValidator.addMessage("validating nameserver...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(nameserver),
        "Nameserver MUST be an object."
    )) return;      

    rdapValidator.validateCommonObjectProperties(nameserver);

    rdapValidator.pushPath(".ldhName");

    if (rdapValidator.addResult(
        nameserver.hasOwnProperty("ldhName"),
        "Nameserver MUST have the 'ldhName' property."
    )) {
        rdapValidator.addResult(
            rdapValidator.isString(nameserver.ldhName),
            "The 'ldhName' property MUST be a string."
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

                rdapValidator.iterate(nameserver.ipAddresses[t],
                    function(addr) {
                        let result;
                        switch (t) {
                            case "v4":
                                result = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr); break;
                            case "v6":
                                result = /^[0-9a-f][0-9a-f:]+$/.test(addr); break;
                        }
                        rdapValidator.addResult(
                            result,
                            "The value '" + addr + "' MUST be a valid IP" + t + " address."
                        );
                    }
                );
            }

            rdapValidator.popPath();
        });
    }

    rdapValidator.popPath();
}

/**
 * validate a link.
 */
rdapValidator.validateLink = function(link) {
    rdapValidator.addMessage("validating link...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(link),
        "Link MUST be an object.",
    )) return;

    ["value", "rel", "href"].forEach(function(k) {
        rdapValidator.pushPath("." + k);

        if (rdapValidator.addResult(
            link.hasOwnProperty(k),
            "Link MUST have the '" + k + "' property."
        )) {
            rdapValidator.addResult(
                rdapValidator.isString(link[k]),
                "Link '" + k + "' property MUST be a string."
            );
        }

        rdapValidator.popPath();
    });

    ["hreflang", "title", "media", "type"].forEach(function(k) {
        rdapValidator.pushPath("." + k);

        if (link.hasOwnProperty(k)) {
            rdapValidator.addResult(
                rdapValidator.isString(link[k]),
                "Link '" + k + "' property MUST be a string."
            );
        }

        rdapValidator.popPath();
    });

    if (link.hasOwnProperty("value") && link.hasOwnProperty("href")) {
        var valueOK = false;
        var hrefOK  = false;

        try {
            const base = new URL(link.value, rdapValidator.lastTestedURL);
            valueOK = true;

            const url = new URL(link.href, base);
            hrefOK = true;

        } catch (e) {
            rdapValidator.addResult(false, e);

        }

        rdapValidator.addResult(
            valueOK,
            "The 'value' property MUST be a valid URL."
        );

        rdapValidator.addResult(
            hrefOK,
            "The 'href' property MUST be a valid URL."
        );
    }
};

/**
 * validate a notice or remark.
 */
rdapValidator.validateNoticeOrRemark = function (noticeOrRemark) {
    rdapValidator.addMessage("validating notice/remark...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(noticeOrRemark),
        "Notice/remark MUST be an object.",
    )) return;

    if (noticeOrRemark.hasOwnProperty("title")) {
        rdapValidator.pushPath(".title");

        rdapValidator.addResult(
            rdapValidator.isString(noticeOrRemark.title),
            "The 'title' property MUST be a string."
        );

        rdapValidator.popPath();
    }

    rdapValidator.pushPath(".description");

    if (rdapValidator.addResult(
        noticeOrRemark.hasOwnProperty("description"),
        "Notice/remark MUST have the 'description' property."
    )) {
        rdapValidator.addResult(
            rdapValidator.isArray(noticeOrRemark.description),
            "The 'description' property MUST be an array."
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
            "The 'type' property MUST be a string."
        );

        rdapValidator.addResult(
            rdapValidator.values.noticeAndRemarkType.indexOf(noticeOrRemark.type) >= 0,
            "The value of the'type' property MUST be a valid JSON value."
        );

        rdapValidator.popPath();
    }

    rdapValidator.validateCommonObjectProperties(noticeOrRemark);
};

/**
 * validate an event.
 */
rdapValidator.validateEvent = function (event) {
    rdapValidator.addMessage("validating event...");

    if (!rdapValidator.addResult(
        rdapValidator.isObject(event),
        "Event MUST be an object.",
    )) return;

    ["eventAction", "eventDate"].forEach(function(k) {
        rdapValidator.pushPath("." + k);

        if (
            rdapValidator.addResult(
                event.hasOwnProperty(k),
                "Event MUST have the '" + k + "' property."
            )
            &&
            rdapValidator.addResult(
                rdapValidator.isString(event[k]),
                "The '" + k + "' property MUST be a string."
            )
        ) {
            if ("eventAction" == k) {
                rdapValidator.addResult(
                    rdapValidator.values.eventAction.indexOf(event.eventAction) >= 0,
                    "The 'eventAction' property MUST be a valid JSON value."
                );

            } else if ("eventDate" == k) {
                var pass;

                try {
                    new Date(event.eventDate);
                    pass = true;

                } catch (e) {
                    pass = false;
        
                }

                rdapValidator.addResult(
                    pass,
                    "The 'eventDate' property MUST be a valid date/time."
                );
            }
        }

        rdapValidator.popPath();
    });

    rdapValidator.validateCommonObjectProperties(event);
};

/**
 * validate a Public ID.
 */
rdapValidator.validatePublicId = function (publicId) {
    rdapValidator.addMessage("validating Public ID...");

    rdapValidator.addResult(
        rdapValidator.isObject(publicId),
        "Public ID MUST be an object.",
    );

    ["type", "identifier"].forEach(function(k) {
        rdapValidator.pushPath("." + k);
        rdapValidator.addResult(
            publicId.hasOwnProperty(k),
            "Public ID MUST have the '" + k + "' property."
        );

        rdapValidator.addResult(
            rdapValidator.isString(publicId[k]),
            "The '" + k + "' property MUST be a string."
        );

        rdapValidator.popPath();
    });
};

/**
 * this object stores callback functions to validate properties that are common
 * to all object types.
 */
rdapValidator.commonPropertyValidators = {};

/**
 * validate a handle.
 */
rdapValidator.commonPropertyValidators.handle = function(handle) {
    rdapValidator.addResult(
        rdapValidator.isString(handle),
        "The 'handle' property MUST be a string."
    );
}

/**
 * validate an array of links.
 */
rdapValidator.commonPropertyValidators.links = function(links) {
    if (!rdapValidator.addResult(
        rdapValidator.isArray(links),
        "The 'links' property MUST be an array.",
    )) return;

    rdapValidator.iterate(
        links,
        rdapValidator.validateLink
    );
}

/**
 * validate an array of remarks.
 */
rdapValidator.commonPropertyValidators.remarks = function(remarks) {
    if (!rdapValidator.addResult(
        rdapValidator.isArray(remarks),
        "The 'remarks' property MUST be an array.",
    )) return;

    rdapValidator.iterate(
        remarks,
        rdapValidator.validateNoticeOrRemark
    );
}

/**
 * validate a language tag.
 */
rdapValidator.commonPropertyValidators.lang = function(lang) {
    rdapValidator.addResult(
        rdapValidator.isString(lang),
        "The 'lang' property MUST be a string."
    );
}

/**
 * validate an array of entities.
 */
rdapValidator.commonPropertyValidators.entities = function(entities) {
    if (!rdapValidator.addResult(
        rdapValidator.isArray(entities),
        "The 'entities' property MUST be an array.",
    )) return;

    rdapValidator.iterate(
        entities,
        rdapValidator.validateEntity
    );
}

/**
 * validate an array of events.
 */
rdapValidator.commonPropertyValidators.events = function(events) {
    if (!rdapValidator.addResult(
        rdapValidator.isArray(events),
        "The 'events' property MUST be an array.",
    )) return;

    rdapValidator.iterate(
        events,
        rdapValidator.validateEvent
    );
}

/**
 * validate an array of status codes.
 */
rdapValidator.commonPropertyValidators.status = function(status) {
    if (!rdapValidator.addResult(
        rdapValidator.isArray(status),
        "The 'status' property MUST be an array.",
    )) return;

    rdapValidator.iterate(
        status,
        (s) => rdapValidator.addResult(
            rdapValidator.values.status.indexOf(s) >= 0,
            "Status '" + s + "' MUST be a valid status."
        )
    );
}

/**
 * validate a port43 property.
 */
rdapValidator.commonPropertyValidators.port43 = function(port43) {
    rdapValidator.addResult(
        rdapValidator.isString(port43),
        "The 'port43' property MUST be a string."
    );
}

/**
 * validate an array of Public IDs.
 */
rdapValidator.commonPropertyValidators.publicIds = function(publicIds) {
    if (!rdapValidator.addResult(
        rdapValidator.isArray(publicIds),
        "The 'publicIds' property MUST be an array.",
    )) return;

    rdapValidator.iterate(
        publicIds,
        rdapValidator.validatePublicId
    );
}

rdapValidator.commonPropertyValidators.ldhName = function(ldhName) {
    rdapValidator.addResult(
        rdapValidator.isString(ldhName),
        "The 'ldhName' property MUST be a string."
    );
};

rdapValidator.commonPropertyValidators.unicodeName = function(unicodeName) {
    rdapValidator.addResult(
        rdapValidator.isString(unicodeName),
        "The 'unicodeName' property MUST be a string."
    );
}

/**
 * validate common object properties.
 */
rdapValidator.validateCommonObjectProperties = function(record) {
    rdapValidator.addMessage("checking common object properties...");

    Object.keys(rdapValidator.commonPropertyValidators).forEach(function(name) {

        if (record.hasOwnProperty(name)) {
            rdapValidator.pushPath("." + name);

            rdapValidator.addMessage("checking '" + name + "' property...");

            rdapValidator.commonPropertyValidators[name](record[name]);

            rdapValidator.popPath("." + name);
        }
    });
};

/**
 * validate an IP network.
 * @param {object} ipNetwork
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateIP = function(ipNetwork, url, serverType) {

    rdapValidator.addMessage("validating IP network object...");

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
};

/**
 * validate an autnum.
 * @param {object} autnum
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateASN = function(autnum, url, serverType) {

    rdapValidator.addMessage("validating autnum object...");

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
};

/**
 * validate an RIR autnum response.
 * @param {object} nameserver
 * @param {null|string} url
 */
rdapValidator.validateRIRASNResponse = function(autnum) {
    rdapValidator.addMessage("TODO: RIR autnum validation");
};

/**
 * validate a help response.
 * @param {object} help
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateHelp = function(help, url, serverType) {

    rdapValidator.addMessage("validating help response...");

    rdapValidator.pushPath(".notices");

    if (rdapValidator.addResult(
        help.hasOwnProperty("notices"),
        "Help response MUST have a 'notices' property."
    )) {
        rdapValidator.addResult(
            help.notices.length > 0,
            "'notices' property MUST contain at least one item."
        );

        rdapValidator.iterate(
            help.notices,
            rdapValidator.validateNoticeOrRemark
        );
    }

    rdapValidator.popPath();
};

/**
 * validate a domain search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateDomainSearch = function(result, url, serverType) {

    rdapValidator.addMessage("validating domain search response...");

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
        rdapValidator.iterate(
            result.domainSearchResults,
            (d) => rdapValidator.validateDomain(d, null, serverType, false)
        );
    }

    rdapValidator.popPath();
};

/**
 * validate a nameserver search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateNameserverSearch = function(result, url, serverType) {

    rdapValidator.addMessage("validating nameserver search response...");

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
        rdapValidator.validate(
            result.nameserverSearchResults,
            (n) => rdapValidator.validateNameserver(n, null, serverType)
        );
    }

    rdapValidator.popPath();
};

/**
 * validate an entity search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateEntitySearch = function(result, url, serverType) {

    rdapValidator.addMessage("validating entity search response...");

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
        rdapValidator.validate(
            result.entitySearchResults,
            (e) => rdapValidator.validateEntity(e, null, serverType)
        );
    }

    rdapValidator.popPath();
};

/**
 * validate an error response.
 * @param {object} error
 * @param {null|string} url
 * @param {string} serverType
 */
rdapValidator.validateError = function(error, url, serverType) {
    rdapValidator.addMessage("validating error response...");

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

            rdapValidator.validate(
                error.notices,
                rdapValidator.validateNoticeOrRemark
            );
        }

        rdapValidator.popPath();
    }
};

/**
 * validate an RIR domain response.
 */
rdapValidator.validateRIRDomainResponse = function(domain) {
    rdapValidator.addMessage("TODO: RIR domain validation");
};

/**
 * validate an RIR entity response.
 */
rdapValidator.validateRIREntityResponse = function(entity) {
    rdapValidator.addMessage("TODO: RIR entity validation");
};

/**
 * validate an RIR nameserver response.
 */
rdapValidator.validateRIRNameServerResponse = function(nameserver) {
    rdapValidator.addMessage("TODO: RIR nameserver validation");
};

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

/**
 * add an element to the JSON Path stack.
 */
rdapValidator.pushPath = function (segment) {
    rdapValidator.path.push(segment);
};

/**
 * TODO
 */
rdapValidator.compareUnicode = (a, b) => true;

/**
 * remove the last element from the JSON Path stack.
 * @var {?string} last if specified, the current last element is compared to this element, and if different, a warning is emitted.
 */
rdapValidator.popPath = function(last) {
    if (last !== undefined && last !== rdapValidator.path[rdapValidator.path.length - 1]) {
        console.warn("WARNING: last item in path is not '" + last + "'");
    }

    rdapValidator.path.pop();
};

/**
 * this simplifies the process of calling a validation method on every item
 * in an array, while also maintaining the correct JSON Path
 */
rdapValidator.iterate = function(array, callback) {
    let i = 0;
    array.forEach(function(item) {
        rdapValidator.pushPath("[" + i++ + "]");

        callback(item);

        rdapValidator.popPath();
    });
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
 * see https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
 */
rdapValidator.countryCodes = [
    "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT",
    "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI",
    "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
    "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
    "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
    "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK",
    "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL",
    "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
    "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR",
    "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
    "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS",
    "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
    "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
    "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP",
    "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
    "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
    "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM",
    "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF",
    "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW",
    "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
    "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

/**
 * Default result callback.
 * @param {bool} result
 * @param {string} message
 * @param {mixed} context
 * @param {string} path
 */
rdapValidator.resultCallback = (result, message, path) => null;

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
 */
rdapValidator.addResult = function(result, message) {
    if (false === result) rdapValidator.errors++;
    rdapValidator.resultCallback(result, message, rdapValidator.getPath());
    return result;
};

/**
 * Log a message by invoking the resultCallback with the provided arguments.
 * @param {string} message
 */
rdapValidator.addMessage = function(message) {
    rdapValidator.addResult(null, message);
}

const rdapValidator = {};

const self = rdapValidator;

export default rdapValidator;

/**
 * Initiate a test run.
 * @param {null|string} url
 * @param {string} type one of the values in self.responseTypes
 * @param {string} serverType one of the values in self.serverTypes
 */
self.testURL = function(url, type, serverType) {

    self.currentSpec = "rfc7480";

    self.errors = 0;

    if (!self.responseTypes.hasOwnProperty(type)) {
        self.add(false, "Invalid response type '" + type + "'.");
        self.testCompleteCallback();
        return;
    }

    if (!self.serverTypes.hasOwnProperty(serverType)) {
        self.add(false, "Invalid server type '" + serverType + "'.");
        self.testCompleteCallback();
        return;
    }

    self.msg("Testing URL is '" + url + "'");
    self.msg("Response type is '" + type + "'");
    self.msg("Server type is '" + serverType + "'");

    self.lastTestedURL              = url;
    self.lastTestedResponseType     = type;
    self.lastTestedServerType       = serverType;

    self.msg("Sending request...");

    fetch(url, self.fetchOptions).then(
        function(res) {
            self.testResponse(res, url, type, serverType);
            self.testCompleteCallback();
        },
        e => self.add(false, "Error performing HTTP request: " + e),
    );
};

/**
 * Invoked when the fetch has completed.
 * @param {Response} res
 * @param {null|string} url
 * @param {string} type one of the values in self.responseTypes
 * @param {string} serverType one of the values in self.serverTypes
 */
self.testResponse = function(res, url, type, serverType) {

    self.path = ["$"];

    self.add(true, "Received a response from the server.");

    self.lastTestedResponseHeaders = {};
    for (const pair of res.headers.entries()) {
        self.lastTestedResponseHeaders[pair[0]] = pair[1];
    }

    if (!self.add(
        "error" == type ? res.status >= 400 : res.status < 400,
        "HTTP status " + res.status + " MUST be " + ("error" == type ? "> 400 or higher" : "less than 400"),
        "error" == type ? "section-5.3" : "section-5.1",
    )) return;

    if (!self.add(
        self.lastTestedResponseHeaders["content-type"].toLowerCase().startsWith("application/rdap+json"),
        "Media type '" + self.lastTestedResponseHeaders["content-type"] + "' MUST be application/rdap+json.",
        "section-4.2",
    )) return;

    self.currentSpec = "rfc9083";

    res.json().then(
        record  => self.validateResponse(record, url, type, serverType),
        error   => self.add(false, "Response body MUST be valid JSON (parse error: " + error + ").", "name-introduction"),
    );
};

self.validateResponse = function(record, url, type, serverType) {

    self.lastTestedResponse = record;

    if (!self.add(
        self.isObject(record),
        "Response body MUST be a JSON object.",
        "section-5",
    )) return;

    self.validateRDAPConformance(record);
    self.validateObjectClassName(record, type);

    if (record.hasOwnProperty("notices")) {
        self.validateNotices(record.notices);
    }

    let name;

    switch (type) {
        case "domain":
            self.validateDomain(record, url, serverType);

            name = decodeURI((new URL(url)).pathname.split("/").pop()).normalize("NFC");

            switch (serverType) {
                case "gtld-registry":   self.validateGTLDRegistryDomain(record, name); break;
                case "gtld-registrar":  self.validateGTLDRegistrarDomain(record, name); break;
                case "rir":             self.validateRIRDomain(record, name); break;
            }

            break;

        case "nameserver":
            self.validateNameserver(record, url, serverType);

            name = decodeURI((new URL(url)).pathname.split("/").pop()).normalize("NFC");

            switch (serverType) {
                case "gtld-registry":   self.validateGTLDNameserver(record, name); break;
                case "rir":             self.validateRIRNameserver(record, name); break;
            }

            break;

        case "entity":
            self.validateEntity(record, url, serverType);

            const handle = decodeURI((new URL(url)).pathname.split("/").pop());

            switch (serverType) {
                case "gtld-registry":   self.validateGTLDEntity(record, handle); break;
                case "rir":             self.validateRIREntity(record, handle); break;
            }

            break;

        case "ip network":
            self.validateIPNetwork(record, url, serverType);

            if ("rir" == serverType) self.validateRIRIPNetwork(record);

            break;

        case "autnum":
            self.validateAutnum(record, url, serverType);

            if ("rir" == serverType) self.validateRIRAutnum(record);

            break;

        case "help":
            self.validateHelp(record, url, serverType);

            switch (serverType) {
                case "gtld-registry":   self.validateGTLDHelp(record); break;
                case "gtld-registrar":  self.validateGTLDHelp(record); break;
                case "rir":             self.validateRIRHelp(record); break;
            }

            break;

        case "domain-search":
            self.validateDomainSearch(record, url, serverType);
            break;

        case "nameserver-search":
            self.validateNameserverSearch(record, url, serverType);
            break;

        case "entity-search":
            self.validateEntitySearch(record, url, serverType);
            break;

        case "error":
            self.validateError(record, url, serverType);

            switch (serverType) {
                case "gtld-registry":   self.validateGTLDError(record); break;
                case "gtld-registrar":  self.validateGTLDError(record); break;
                case "rir":             self.validateRIRError(record); break;
            }
            break;

        default:
            self.add(false, "not sure what to do with '" + type + "'");
    }

    self.msg("RDAP validation completed with " + self.errors + " error(s).");
};

/**
 * Validate the rdapConformance property of an RDAP response.
 */
self.validateRDAPConformance = function(record) {
    self.currentSpec = "rfc9083";

    self.pushPath(".rdapConformance");

    if (self.add(
        record.hasOwnProperty("rdapConformance"),
        "Record MUST have the 'rdapConformance' property.",
        "section-4.1",
    )) {
        self.add(
            self.isArray(record.rdapConformance),
            "The 'rdapConformance' property MUST be an array.",
            "section-4.1",
        );

        self.add(
            record.rdapConformance.indexOf("rdap_level_0") >= 0,
            "The 'rdapConformance' property MUST contain 'rdap_level_0'.",
            "section-4.1",
        );
    }

    self.popPath(".rdapConformance");
};

/**
 * Validate the notices property of an RDAP response.
 */
self.validateNotices = function(notices) {
    self.currentSpec = "rfc9083";

    self.pushPath(".notices");

    if (self.add(
        self.isArray(notices),
        "The 'notices' property MUST be an array.",
        "section-4.3",
    )) {
        self.iterate(
            notices,
            self.validateNoticeOrRemark
        );
    }

    self.popPath(".notices");
};

/**
 * Validate the objectClassName property of an RDAP response.
 */
self.validateObjectClassName = function(record, type) {
    self.currentSpec = "rfc9083";

    if (self.objectTypes.indexOf(type) >= 0) {
        self.pushPath(".objectClassName");

        if (
            self.add(
                record.hasOwnProperty("objectClassName"),
                "Object MUST have the 'objectClassName' property.",
                "section-4.9"
            )
            &&
            self.add(
                self.isString(record.objectClassName),
                "The 'objectClassName' property MUST be a string.",
                "section-4.9"
            )
        ) {
            self.add(
                type == record.objectClassName,
                "The value of the 'objectClassName' property ('" + record.objectClassName + "') MUST be '" + type + "'.",
                self.objectClassNameReferences[type],
            );
        }

        self.popPath(".objectClassName");
    }
};

/**
 * Validate a domain object.
 * @param {object} domain
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateDomain = function(domain, url, serverType) {
    self.currentSpec = "rfc9083";

    self.msg("validating domain object...");

    self.validateCommonObjectProperties(domain, "domain");

    if (domain.hasOwnProperty("unicodeName") && domain.hasOwnProperty("ldhName")) {
        self.pushPath(".unicodeName");

        self.add(
            self.compareUnicode(domain.unicodeName, domain.ldhName),
            "The 'unicodeName' property '" + domain.unicodeName + "' MUST match the 'ldhName' property '" + domain.ldhName + "'.",
            "sect-3"
        );

        self.popPath(".unicodeName");
    }

    if (domain.hasOwnProperty("nameservers")) {
        self.pushPath(".nameservers");

        if (self.add(
            self.isArray(domain.nameservers),
            "The 'nameservers' property MUST be an array.",
            "section-5.3-7.6"
        )) {
            self.iterate(
                domain.nameservers,
                self.validateNameserver
            );
        }

        self.popPath(".nameservers");
    }

    if (domain.hasOwnProperty("secureDNS")) {
        self.pushPath(".secureDNS");

        self.validateSecureDNS(domain.secureDNS);

        self.popPath(".secureDNS");
    }
};

/**
 * Validate the secureDNS property of a domain object.
 */
self.validateSecureDNS = function(secureDNS) {
    self.msg("validating 'secureDNS' object...");

    if (!self.add(
        self.isObject(secureDNS),
        "The 'secureDNS' property MUST be an object."
    )) return;

    ["zoneSigned", "delegationSigned"].forEach(function (p) {
        self.pushPath("." + p);

        if (secureDNS.hasOwnProperty(p)) {
            self.add(
                self.isBoolean(secureDNS[p]),
                "The '" + p + "' property MUST be a boolean."
            );
        }

        self.popPath();
    });

    if (secureDNS.delegationSigned) {
        let count = 0;

        ["dsData", "keyData"].forEach(function (p) {
            self.pushPath("." + p);

            if (secureDNS.hasOwnProperty(p)) {

                if (self.add(
                    self.isArray(secureDNS[p]),
                    "The '" + p + "' property MUST be an array.",
                )) {
                    count += secureDNS[p].length;

                    self.iterate(
                        secureDNS[p],
                        function(v) {
                            switch(p) {
                                case "dsData"   : return self.validateDSData(v);
                                case "keyData"  : return self.validateKeyData(v);
                            }
                        }
                    );
                }
            }

            self.popPath();
        });

        self.add(
            count > 0,
            "The 'secureDNS' property for a domain where delegationSigned=true MUST contain one or more values in the 'dsData' and 'keyData' properties."
        );
    }
};

/**
 * Validate a dsData object.
 */
self.validateDSData = function(dsData) {
    self.msg("validating 'dsData' object...");

    if (!self.add(
        self.isObject(dsData),
        "Values in the 'dsData' property MUST be an object"
    )) return;

    ["keyTag", "algorithm", "digestType", "digest"].forEach(function(p) {

        self.pushPath("." + p);

        if (self.add(
            dsData.hasOwnProperty(p),
            "DS record object MUST have a '" + p + "' property."
        )) {
            self.add(
                ("digest" === p ? self.isString(dsData[p]) : self.isInteger(dsData[p])),
                "The '" + p + "' property of DS record object MUST be " + ("digest" === p ? "a string" : "an integer") + "."
            );
        }

        self.popPath();
    });

    self.validateCommonObjectProperties(dsData);
};

/**
 * Validate a keyData object.
 */
self.validateKeyData = function(keyData) {
    self.msg("validating 'keyData' object...");

    if (!self.add(
        self.isObject(keyData),
        "Value in the 'keyData' property is not an object"
    )) return;

    ["flags", "protocol", "algorithm", "publicKey"].forEach(function(p) {
        self.pushPath("." + p);

        if (self.add(
            keyData.hasOwnProperty(p),
            "KeyData object MUST have a '" + p + "' property."
        )) {
            self.add(
                ("publicKey" === p ? self.isString(keyData[p]) : self.isInteger(keyData[p])),
                "The '" + p + "' property of KeyData object MUST be a " + ("publicKey" === p ? "string" : "integer"),
            );
        }

        self.popPath();
    });

    self.validateCommonObjectProperties(keyData);
};

/**
 * Validate an entity.
 * @param {object} entity
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateEntity = function(entity, url, serverType) {
    self.msg("validating entity...");

    if (!self.add(
        self.isObject(entity),
        "Entity MUST be an object."
    )) return;

    self.validateCommonObjectProperties(entity, "entity");

    self.pushPath(".roles");

    if (
        self.add(
            entity.hasOwnProperty("roles"),
            "Entity MUST have the 'roles' property."
        )
        &&
        self.add(
            self.isArray(entity.roles),
            "The 'roles' property MUST be an array."
        )
    ) {
        self.iterate(
            entity.roles,
            (r) => self.add(
                self.values.role.indexOf(r) >= 0,
                "Role '" + r + "' MUST be a valid RDAP value."
            )
        );
    }

    self.popPath(".roles");
    self.pushPath(".vcardArray");

    if (
        entity.hasOwnProperty("vcardArray")
        &&
        self.add(
            self.isArray(entity.vcardArray),
            "The 'vcardArray' property MUST be an array."
        )
    ) {
        self.pushPath("[0]");

        self.add(
            "vcard" === entity.vcardArray[0],
            "The first value in the vcardArray array MUST be 'vcard'."
        );

        self.popPath("[0]");
        self.pushPath("[1]");

        self.validateJCard(entity.vcardArray[1]);

        self.popPath("[1]");

    }

    self.popPath(".vcardArray");

    ["asEventActor", "networks", "autnums"].forEach(function(p) {
        self.pushPath("." + p);

        if (entity.hasOwnProperty(p)) {
            if (self.add(
                self.isArray(entity[p]),
                "The '" + p + "' property MUST be an array."
            )) {
                self.iterate(
                    entity[p],
                    function(v) {
                        switch (p) {
                            case "asEventActor":    return self.validateEvent(v);
                            case "networks":        return self.validateIPNetwork(v);
                            case "autnums":         return self.validateAutnum(v);
                        }
                    }
                );
            }
        }

        self.popPath("." + p);
    });
}

/**
 * Validate a JCard.
 */
self.validateJCard = function (jcard) {
    self.msg("validating JCard object...");

    if (!self.add(
        self.isArray(jcard),
        "jCard MUST be an array."
    )) return;

    if (!self.add(
        jcard.length > 0,
        "jCard MUST NOT be empty."
    )) return;

    self.iterate(
        jcard,
        self.validateJCardProperty
    );

    ["VERSION", "FN"].forEach((r) => self.add(
        jcard.filter((n) => r.toUpperCase() === n[0].toUpperCase()).length > 0,
        "jCard MUST have a " + r + " property."
    ));
};

/**
 * Validate a JCard property.
 */
self.validateJCardProperty = function(prop) {

    if (!self.add(
        self.isArray(prop),
        "JCard property MUST be an array."
    )) return;

    if (!self.add(
        prop.length == 4,
        "JCard property MUST contain exactly four (4) elements."
    )) return;

    const funcs = [
        self.validateJCardPropertyType,
        self.validateJCardPropertyParameters,
        self.validateJCardPropertyValueType,
        self.validateJCardPropertyValue,
    ];

    self.iterate(funcs, (f) => f(prop));
};

/**
 * Validate a JCard property type.
 */
self.validateJCardPropertyType = function(prop) {
    if (self.add(
        self.isString(prop[0]),
        "Item #1 of jCard property MUST be a string."
    )) return;

    if (!property[0].toUpperCase().startsWith("X-")) {
        self.add(
            self.JCardPropertyTypes.includes(property[0].toUpperCase()),
            "Property type '" + property[0] + "' MUST be present in the IANA registry."
        );
    }
};

/**
 * Validate a JCard property parameter object.
 */
self.validateJCardPropertyParameters = function(property) {
    if (self.add(
        self.isObject(property[1]),
        "Item #2 of jCard property MUST be an object."
    )) {
        self.iterate(
            Object.keys(property[1]),
            (k) => self.add(
                self.JCardParameters.includes(k.toUpperCase()),
                "Parameter name '" + k + "' MUST be present in the IANA registry"
            )
        );
    }
};

/**
 * Validate a JCard property value type.
 */
self.validateJCardPropertyValueType = function(property) {
    if (self.add(
        self.isString(property[2]),
        "Item #3 of jCard property MUST be a string."
    )) {
        self.add(
            self.JCardValueTypes.includes(property[2].toUpperCase()),
            "Value type '" + property[2] + "' MUST be present in the IANA registry."
        );
    };

    if (self.propertyValues.hasOwnProperty(property[0].toUpperCase())) {
        self.add(
            self.propertyValues[property[0].toUpperCase()].includes(property[3].toLowerCase()),
            "Value '" + property[3] + "' MUST be one of: [" + self.propertyValues[property[0].toUpperCase()].join("|") + "]"
        );
    }
};

/**
 * Validate a property value.
 */
self.validateJCardPropertyValue = function(property) {
    if (
        "ADR" === property[0].toUpperCase()
        &&
        self.isArray(property[3])
    ) {
        self.add(
            7 == property[3].length,
            "Length of the array in an ADR property MUST be exactly 7."
        );
    }
};

/**
 * Validate an nameserver.
 * @param {object} nameserver
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateNameserver = function(nameserver, url, serverType) {
    self.msg("validating nameserver...");

    if (!self.add(
        self.isObject(nameserver),
        "Nameserver MUST be an object."
    )) return;

    self.validateCommonObjectProperties(nameserver, "nameserver");

    self.pushPath(".ldhName");

    if (self.add(
        nameserver.hasOwnProperty("ldhName"),
        "Nameserver MUST have the 'ldhName' property."
    )) {
        self.add(
            self.isString(nameserver.ldhName),
            "The 'ldhName' property MUST be a string."
        );
    }

    self.popPath();
    self.pushPath(".ipAddresses");

    if (
        nameserver.hasOwnProperty("ipAddresses")
        &&
        self.add(
            self.isObject(nameserver.ipAddresses),
            "The 'ipAddresses' property MUST be an object."
        )
    ) {
        ["v4", "v6"].forEach(function(t) {
            self.pushPath("." + t);

            if (nameserver.ipAddresses.hasOwnProperty(t)) {
                self.add(
                    self.isArray(nameserver.ipAddresses[t]),
                    "The '" + t + "' property of the 'ipAddresses' property MUST be an array."
                );

                self.iterate(nameserver.ipAddresses[t],
                    function(addr) {
                        let result;
                        switch (t) {
                            case "v4":
                                result = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr); break;
                            case "v6":
                                result = /^[0-9a-f][0-9a-f:]+$/i.test(addr); break;
                        }
                        self.add(
                            result,
                            "The value '" + addr + "' MUST be a valid IP" + t + " address."
                        );
                    }
                );
            }

            self.popPath();
        });
    }

    self.popPath();
}

/**
 * Validate a link.
 */
self.validateLink = function(link) {
    self.msg("validating link...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isObject(link),
        "Link MUST be an object.",
        "section-4.2",
    )) return;

    ["value", "rel", "href"].forEach(function(k) {
        self.pushPath("." + k);

        if (self.add(
            link.hasOwnProperty(k),
            "Link MUST have the '" + k + "' property.",
            "section-4.2",
        )) {
            self.add(
                self.isString(link[k]),
                "Link '" + k + "' property MUST be a string.",
                "section-4.2",
            );
        }

        self.popPath();
    });

    ["hreflang", "title", "media", "type"].forEach(function(k) {
        self.pushPath("." + k);

        if (link.hasOwnProperty(k)) {
            self.add(
                self.isString(link[k]),
                "Link '" + k + "' property MUST be a string.",
                "section-4.2",
            );
        }

        self.popPath();
    });

    if (link.hasOwnProperty("value") && link.hasOwnProperty("href")) {
        var valueOK = false;
        var hrefOK  = false;

        try {
            const base = new URL(link.value, self.lastTestedURL);
            valueOK = true;

            const url = new URL(link.href, base);
            hrefOK = true;

        } catch (e) {
            self.add(false, e);

        }

        self.add(
            valueOK,
            "The 'value' property MUST be a valid URL.",
            "section-4.2",
        );

        self.add(
            hrefOK,
            "The 'href' property MUST be a valid URL.",
            "section-4.2",
        );
    }

    self.currentSpec = prevSpec;
};

/**
 * Validate a notice or remark.
 */
self.validateNoticeOrRemark = function (noticeOrRemark) {
    self.msg("validating notice/remark...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isObject(noticeOrRemark),
        "Notice/remark MUST be an object.",
        "section-4.3",
    )) return;

    if (noticeOrRemark.hasOwnProperty("title")) {
        self.pushPath(".title");

        self.add(
            self.isString(noticeOrRemark.title),
            "The 'title' property MUST be a string.",
            "section-4.3",
        );

        self.popPath();
    }

    self.pushPath(".description");

    if (self.add(
        noticeOrRemark.hasOwnProperty("description"),
        "Notice/remark MUST have the 'description' property.",
        "section-4.3",
    )) {
        self.add(
            self.isArray(noticeOrRemark.description),
            "The 'description' property MUST be an array.",
            "section-4.3",
        );

        const uniqueTypes = noticeOrRemark.description
            .map((i) => i.constructor.name)
            .filter((v, i, a) => i === a.indexOf(v));

        self.add(
            1 == uniqueTypes.length && uniqueTypes[0] == "String",
            "The 'description' property MUST contain only strings.",
            "section-4.3",
        );
    }

    self.popPath(".description");

    if (noticeOrRemark.hasOwnProperty("type")) {
        self.pushPath(".type");

        self.add(
            self.isString(noticeOrRemark.type),
            "The 'type' property MUST be a string.",
            "section-4.3",
        );

        self.add(
            self.values.noticeAndRemarkType.indexOf(noticeOrRemark.type) >= 0,
            "The value of the'type' property MUST be a valid JSON value.",
            "section-4.3",
        );

        self.popPath(".type");
    }

    self.validateCommonObjectProperties(noticeOrRemark);

    self.currentSpec = prevSpec;
};

/**
 * Validate an event.
 */
self.validateEvent = function (event) {
    self.msg("validating event...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isObject(event),
        "Event MUST be an object.",
        "section-4.5",
    )) return;

    ["eventAction", "eventDate"].forEach(function(k) {
        self.pushPath("." + k);

        if (
            self.add(
                event.hasOwnProperty(k),
                "Event MUST have the '" + k + "' property.",
                "section-4.5",
            )
            &&
            self.add(
                self.isString(event[k]),
                "The '" + k + "' property MUST be a string.",
                "section-4.5",
            )
        ) {
            if ("eventAction" == k) {
                self.add(
                    self.values.eventAction.indexOf(event.eventAction) >= 0,
                    "The 'eventAction' property MUST be a valid JSON value.",
                    "section-4.5",
                );

            } else if ("eventDate" == k) {
                var pass;

                try {
                    new Date(event.eventDate);
                    pass = true;

                } catch (e) {
                    pass = false;

                }

                self.add(
                    pass,
                    "The 'eventDate' property MUST be a valid date/time.",
                    "section-4.5",
                );
            }
        }

        self.popPath();
    });

    self.validateCommonObjectProperties(event);

    self.currentSpec = prevSpec;
};

/**
 * Validate a Public ID.
 */
self.validatePublicId = function (publicId) {
    self.msg("validating Public ID...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.add(
        self.isObject(publicId),
        "Public ID MUST be an object.",
        "section-4.8",
    );

    ["type", "identifier"].forEach(function(k) {
        self.pushPath("." + k);
        self.add(
            publicId.hasOwnProperty(k),
            "Public ID MUST have the '" + k + "' property.",
            "section-4.8",
        );

        self.add(
            self.isString(publicId[k]),
            "The '" + k + "' property MUST be a string.",
            "section-4.8",
        );

        self.popPath();
    });

    self.currentSpec = prevSpec;
};

/**
 * This object stores callback functions to validate properties that are common
 * to all object types.
 */
self.commonPropertyValidators = {};

/**
 * Validate a handle.
 */
self.commonPropertyValidators.handle = function(handle) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.add(
        self.isString(handle),
        "The 'handle' property MUST be a string.",
        "section-3",
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate an array of links.
 */
self.commonPropertyValidators.links = function(links) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isArray(links),
        "The 'links' property MUST be an array.",
        "section-4.2",
    )) return;

    self.iterate(
        links,
        self.validateLink
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate an array of remarks.
 */
self.commonPropertyValidators.remarks = function(remarks) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isArray(remarks),
        "The 'remarks' property MUST be an array.",
        "section-4.3",
    )) return;

    self.iterate(
        remarks,
        self.validateNoticeOrRemark
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate a language tag.
 */
self.commonPropertyValidators.lang = function(lang) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.add(
        self.isString(lang),
        "The 'lang' property MUST be a string.",
        "section-4.4",
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate an array of entities.
 */
self.commonPropertyValidators.entities = function(entities) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isArray(entities),
        "The 'entities' property MUST be an array.",
        "section-5.3",
    )) return;

    self.iterate(
        entities,
        self.validateEntity
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate an array of events.
 */
self.commonPropertyValidators.events = function(events) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isArray(events),
        "The 'events' property MUST be an array.",
        "section-4.5",
    )) return;

    self.iterate(
        events,
        self.validateEvent
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate an array of status codes.
 */
self.commonPropertyValidators.status = function(status) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isArray(status),
        "The 'status' property MUST be an array.",
        "section-4.6",
    )) return;

    self.iterate(
        status,
        (s) => self.add(
            self.values.status.indexOf(s) >= 0,
            "Status '" + s + "' MUST be a valid status.",
            "section-10.2.2",
        )
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate a port43 property.
 */
self.commonPropertyValidators.port43 = function(port43) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.add(
        self.isString(port43),
        "The 'port43' property MUST be a string.",
        "section-4.7",
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate an array of Public IDs.
 */
self.commonPropertyValidators.publicIds = function(publicIds) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    if (!self.add(
        self.isArray(publicIds),
        "The 'publicIds' property MUST be an array.",
        "section-4.8",
    )) return;

    self.iterate(
        publicIds,
        self.validatePublicId
    );

    self.currentSpec = prevSpec;
}

self.commonPropertyValidators.ldhName = function(ldhName) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.add(
        self.isString(ldhName),
        "The 'ldhName' property MUST be a string.",
        "section-3",
    );

    self.currentSpec = prevSpec;
};

self.commonPropertyValidators.unicodeName = function(unicodeName) {
    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.add(
        self.isString(unicodeName),
        "The 'unicodeName' property MUST be a string.",
        "section-3",
    );

    self.currentSpec = prevSpec;
}

/**
 * Validate common object properties.
 */
self.validateCommonObjectProperties = function(record, type=null) {
    self.msg("checking common object properties...");

    if (null != type) {
        self.validateObjectClassName(record, type);
    }

    Object.keys(self.commonPropertyValidators).forEach(function(name) {

        if (record.hasOwnProperty(name)) {
            self.pushPath("." + name);

            self.msg("checking '" + name + "' property...");

            self.commonPropertyValidators[name](record[name]);

            self.popPath("." + name);
        }
    });
};

/**
 * Validate an IP network.
 * @param {object} ipNetwork
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateIPNetwork = function(ipNetwork, url, serverType) {
    self.msg("validating IP network object...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.validateCommonObjectProperties(ipNetwork, "ip network");

    const fields = ["startAddress", "endAddress", "ipVersion", "name", "type", "country", "parentHandle"];
    fields.forEach(function(f) {
        self.pushPath("." + f);

        if (ipNetwork.hasOwnProperty(f)) {
            self.add(
                self.isString(ipNetwork[f]),
                "The '" + f + "' property MUST be a string.",
                "section-5.4",
            );

            if ("ipVersion" == f) {
                self.add(
                    ["v4", "v6"].includes(ipNetwork[f]),
                    "The 'ipVersion' property MUST be either 'v4' or 'v6'.",
                    "section-5.4",
                );
            }

            if ("country" == f) {
                self.add(
                    /[A-Z]{2}/.match(ipNetwork[f]),
                    "The 'country' property MUST be a 2-character country-code.",
                    "section-5.4",
                );
            }
        }

        self.popPath();
    });

    self.currentSpec = prevSpec;
};

/**
 * Validate an autnum.
 * @param {object} autnum
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateAutnum = function(autnum, url, serverType) {
    self.msg("validating autnum object...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.validateCommonObjectProperties(autnum, "autnum");

    ["startAutnum", "endAutnum"].forEach(function(f) {
        self.pushPath("." + f);

        if (autnum.hasOwnProperty(f)) {
            self.add(
                self.isInteger(autnum[f]),
                "The '" + f + "' property MUST be an integer.",
                "section-5.5",
            );
        }

        self.popPath();
    });

    const fields = ["name", "type", "country"];
    fields.forEach(function(f) {
        self.pushPath("." + f);

        if (autnum.hasOwnProperty(f)) {
            self.add(
                self.isString(autnum[f]),
                "The '" + f + "' property MUST be a string.",
                "section-5.5",
            );

            if ("country" == f) {
                self.add(
                    /[A-Z]{2}/.match(autnum[f]),
                    "The 'country' property MUST be a 2-character country-code.",
                    "section-5.5",
                );
            }
        }

        self.popPath();
    });

    self.currentSpec = prevSpec;
};

/**
 * Validate an RIR autnum response.
 * @param {object} nameserver
 * @param {null|string} url
 */
self.validateRIRAutnum = function(autnum) {
    self.msg("TODO: RIR autnum validation");
};

/**
 * Validate an RIR IP network response.
 * @param {object} nameserver
 * @param {null|string} url
 */
self.validateRIRIPNetwork = function(autnum) {
    self.msg("TODO: RIR IP network validation");
};

/**
 * Validate a help response.
 * @param {object} help
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateHelp = function(help, url, serverType) {
    self.msg("validating help response...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.pushPath(".notices");

    if (self.add(
        help.hasOwnProperty("notices"),
        "Help response MUST have a 'notices' property.",
        "section-7",
    )) {
        self.add(
            help.notices.length > 0,
            "'notices' property MUST contain at least one item.",
            "section-7",
        );

        self.iterate(
            help.notices,
            self.validateNoticeOrRemark
        );
    }

    self.popPath();

    self.currentSpec = prevSpec;
};

/**
 * Validate a domain search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateDomainSearch = function(result, url, serverType) {
    self.msg("validating domain search response...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.validateCommonObjectProperties(result);

    self.pushPath(".domainSearchResults");

    if (
        self.add(
            result.hasOwnProperty("domainSearchResults"),
            "Search result MUST have the 'domainSearchResults' property.",
            "section-8",
        )
        &&
        self.add(
            self.isArray(result.domainSearchResults),
            "'domainSearchResults' property MUST be an array.",
            "section-8",
        )
    ) {
        self.iterate(
            result.domainSearchResults,
            (d) => self.validateDomain(d, null, serverType, false)
        );
    }

    self.popPath();

    self.currentSpec = prevSpec;
};

/**
 * Validate a nameserver search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateNameserverSearch = function(result, url, serverType) {
    self.msg("validating nameserver search response...");

    const prevSpec = self.currentSpec;
    self.currentSpec = "rfc9083";

    self.validateCommonObjectProperties(result);

    self.pushPath(".nameserverSearchResults");

    if (
        self.add(
            result.hasOwnProperty("nameserverSearchResults"),
            "Search result MUST have the 'nameserverSearchResults' property.",
            "section-8",
        )
        &&
        self.add(
            self.isArray(result.nameserverSearchResults),
            "'nameserverSearchResults' property MUST be an array.",
            "section-8",
        )
    ) {
        self.validate(
            result.nameserverSearchResults,
            (n) => self.validateNameserver(n, null, serverType)
        );
    }

    self.popPath();

    self.currentSpec = prevSpec;
};

/**
 * Validate an entity search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateEntitySearch = function(result, url, serverType) {

    self.msg("validating entity search response...");

    self.validateCommonObjectProperties(result);

    self.pushPath(".entitySearchResults");

    if (
        self.add(
            result.hasOwnProperty("entitySearchResults"),
            "Search result MUST have the 'entitySearchResults' property."
        )
        &&
        self.add(
            self.isArray(result.entitySearchResults),
            "'entitySearchResults' property MUST be an array."
        )
    ) {
        self.validate(
            result.entitySearchResults,
            (e) => self.validateEntity(e, null, serverType)
        );
    }

    self.popPath();
};

/**
 * Validate an error response.
 * @param {object} error
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateError = function(error, url, serverType) {
    self.msg("validating error response...");

    self.pushPath(".errorCode");

    if (self.add(
        error.hasOwnProperty("errorCode"),
        "Error object MUST have an 'errorCode' property."
    )) {
        self.add(
            self.isInteger(error.errorCode),
            "'errorCode' property MUST be an integer."
        );
    }

    self.popPath();

    if (error.hasOwnProperty("title")) {
        self.pushPath(".title");

        self.add(
            self.isString(error.title),
            "'title' property MUST be a string."
        );

        self.popPath();
    }

    if (error.hasOwnProperty("notices")) {
        self.pushPath(".notices");

        if (self.add(
            self.isArray(error.notices),
            "'notices' property MUST be an array."
        )) {
            self.add(
                error.notices.length > 0,
                "'notices' property MUST contain at least one item."
            );

            self.validate(
                error.notices,
                self.validateNoticeOrRemark
            );
        }

        self.popPath();
    }
};

/**
 * Validate common elements in all gTLD responses.
 */
self.validateCommonGTLDResponseProperties = function(response) {

    self.add(
        "https:" === (new URL(self.lastTestedURL)).protocol,
        "HTTP scheme MUST be 'https:'."
    );

    self.add(
        self.lastTestedResponseHeaders.hasOwnProperty("access-control-allow-origin"),
        "Server MUST set the 'access-control-allow-origin' header."
    );

    if (response.hasOwnProperty("rdapConformance") && self.isArray(response.rdapConformance)) {
        self.pushPath(".rdapConformance");

        [
            "icann_rdap_response_profile_1",
            "icann_rdap_technical_implementation_guide_1"
        ].forEach((s) => self.add(
            response.rdapConformance.includes(),
            "The 'rdapConformance' array MUST include '" + s + "'."
        ));

        self.iterate(
            response.rdapConformance.filter((s) => s != "rdap_level_0"),
            (s) => self.add(
                self.extensions.indexOf(s) >= 0,
                "The '" + s + "' extension MUST be registered with IANA."
            )
        );

        self.popPath(".rdapConformance");
    }

    if (response.hasOwnProperty("entities") && self.isArray(response.entities)) {
        self.pushPath(".entities");

        self.iterate(response.entities, function(entity) {
            self.pushPath(".handle");
            self.add(
                entity.hasOwnProperty("handle"),
                "Entity MUST have a 'handle' property."
            );
            self.popPath(".handle");

            if (entity.hasOwnProperty("vcardArray") && self.isArray(entity.vcardArray) && self.isArray(entity.vcardArray[1])) {
                self.pushPath(".vcardArray[1]");

                self.iterate(entity.vcardArray[1], function(p) {
                    if ("TEL" == p[0].toUpperCase()) {
                        if (self.isObject(p[1])) {
                            const k = Object.keys(p[1]).filter((k) => "TYPE" == k.toUpperCase()).shift();
                            self.add(
                                self.isString(k) && ["voice", "fax"].includes(p[1][k]),
                                "'TEL' property MUST have a 'type' parameter equal to 'voice' or 'fax'."
                            );
                        }

                    } else if ("ADR" == p[0].toUpperCase()) {
                        if (self.add(
                            Object.keys(p[1]).map((k) => k.toUpperCase()).includes("CC"),
                            "'ADR' properties of entity vCards MUST have a 'CC' parameter."
                        )) {
                            const cc = p[1][Object.keys(p[1]).filter((k) => "CC" == k.toUpperCase()).shift()];
                            self.add(
                                self.countryCodes.includes(cc),
                                "'CC' parameter '" + cc + "' MUST be a valid ISO 3166-alpha-2 code."
                            );
                        }

                        self.pushPath("[3]");

                        if (
                            self.add(
                                self.isArray(p[3]),
                                "Value of an 'ADR' property MUST be an array."
                            ) &&
                            7 == p[3].length
                        ) {
                            self.pushPath("[6]");

                            self.add(
                                p[3][6] == "",
                                "The last item of structured address in an 'ADR' property value MUST be empty."
                            );

                            self.popPath("[6]");
                        }

                        self.popPath("[3]");
                    }
                });

                self.popPath(".vcardArray[1]");
            }

            if (entity.hasOwnProperty("roles") && self.isArray(entity.roles) && entity.roles.includes("registrant")) {
                self.validategTLDRegistrantEntity(entity);
            }
        });

        self.popPath(".entities");
    }

    if (response.hasOwnProperty("events") && self.isArray(response.entities)) {
        self.pushPath(".events");

        self.add(
            response.events.filter((e) => "last update of RDAP database" == e.eventAction).length > 0,
            "The topmost object MUST include an event with an 'eventAction' property of 'last update of RDAP database'."
        );

        self.popPath(".events");
    }
};

/**
 * Validate a domain object as per the gTLD RDAP profile for a gTLD registry.
 */
self.validateGTLDRegistryDomain = function(domain, name) {
    self.msg("validating response for a gTLD registry");
    self.validateCommonGTLDResponseProperties(domain);
    self.validateCommonGTLDDomainProperties(domain, name);
};

/**
 * Validate a domain object as per the gTLD RDAP profile for a registrar.
 */
self.validateGTLDRegistrarDomain = function(domain, name) {
    self.msg("validating response for a gTLD registrar");
    self.validateCommonGTLDResponseProperties(domain);
    self.validateCommonGTLDDomainProperties(domain, name);

    self.pushPath(".entities");

    const rant = (
            domain.hasOwnProperty("entities") && self.isArray(domain.entities)
            ? domain.entities : []
    ).filter((e) =>
        self.isObject(e) &&
        e.hasOwnProperty("roles") &&
        self.isArray(e.roles) &&
        e.roles.includes("registrant")
    ).shift();

    self.add(
        self.isObject(rant),
        "Registrar domain object MUST include an entity with the 'registrant' role."
    );

    self.popPath(".entities");
};

self.validategTLDRegistrantEntity = function(rant) {
    let properties = [];
    if (
        self.isObject(rant) &&
        rant.hasOwnProperty("vcardArray") &&
        self.isArray(rant.vcardArray) &&
        self.isArray(rant.vcardArray[1])
    ) {
        properties = rant.vcardArray[1]
            .filter((p) => self.isArray(p))
            .map((p) => p[0].toUpperCase());
        // TODO
    }
};

/**
 * Common rules for gtld-registry and gtld-registrar.
 */
self.validateCommonGTLDDomainProperties = function(domain, name) {

    self.pushPath(".handle");

    self.add(
        domain.hasOwnProperty("handle"),
        "Domain object MUST have the 'handle' property."
    );

    self.popPath(".handle");

    self.validateGTLDNameProperties(domain, name);

    self.pushPath(".entities");

    if (!self.add(
        domain.hasOwnProperty("entities"),
        "The 'entities' property MUST be present."
    )) return;

    if (!self.add(
        self.isArray(domain.entities),
        "The 'entities' property MUST be an array."
    )) return;

    let registrarPresent = false;
    self.iterate(
        domain.entities,
        function (e) {
            if (
                self.isObject(e) &&
                e.hasOwnProperty("roles") &&
                self.isArray(e.roles) &&
                e.roles.includes("registrar")
            ) {
                registrarPresent = true;
                self.validateGTLDRegistrarEntity(e);
            }
        }
    );

    self.add(
        registrarPresent,
        "Domain object MUST have an entity with the 'registrar' role."
    );

    self.popPath(".entities");

    self.pushPath(".events");

    let seen = {};
    if (domain.hasOwnProperty("events") && self.isArray(domain.events)) {
        domain.events.forEach(function (e) {
            if (self.isObject(e) && e.hasOwnProperty("eventAction")) {
                seen[e.eventAction] = 1;
            }
        });
    }
    ["registration", "expiration"].forEach((e) => self.add(
        Object.keys(seen).includes(e),
        "Domain object MUST have an event with an 'eventAction' property of '" + e + "'."
    ));

    self.popPath(".events");


    self.pushPath(".status");

    self.add(
        domain.hasOwnProperty("status"),
        "Domain object MUST have a 'status' property."
    );

    self.popPath(".status");

    self.pushPath(".notices");

    if (
        self.add(
            domain.hasOwnProperty("notices"),
            "Domain object MUST have a 'notices' property."
        )
        &&
        self.isArray(domain.notices)
    ) {
        self.add(
            1 === domain.notices.filter((n) =>
                    self.isObject(n) &&
                    "Status Codes" === n.title &&
                    n.hasOwnProperty("links") &&
                    self.isArray(n.links) &&
                    n.links.filter((l) =>
                        self.isObject(l) &&
                        l.hasOwnProperty("rel") &&
                        "glossary" === l.rel &&
                        l.hasOwnProperty("href") &&
                        "https://icann.org/epp" === n.href
                    ).length > 0
            ).length,
            "Domain object MUST contain a 'Status Codes' notice containing a link with rel=glossary and href=https://icann.org/epp."
        );

        self.add(
            1 === domain.notices.filter((n) =>
                self.isObject(n) &&
                "RDDS Inaccuracy Complaint Form" === n.title &&
                n.hasOwnProperty("links") &&
                self.isArray(n.links) &&
                n.links.filter((l) =>
                    self.isObject(l) &&
                    l.hasOwnProperty("rel") &&
                    "help" === l.rel &&
                    l.hasOwnProperty("href") &&
                    "https://icann.org/wicf" === n.href
                ).length > 0
            ).length,
            "Domain object MUST contain a 'RDDS Inaccuracy Complaint Form' notice containing a link with rel=help and href=https://icann.org/wicf."
        );
    }

    self.popPath(".notices");

    self.pushPath(".nameservers");

    self.add(
        domain.hasOwnProperty("nameservers"),
        "Domain object MUST have a 'nameservers' property."
    );

    self.popPath(".nameservers");

    self.pushPath(".secureDNS");

    if (
        self.add(
            domain.hasOwnProperty("secureDNS"),
            "Domain object MUST have a 'secureDNS' property."
        )
        &&
        self.isObject(domain.secureDNS)
        &&
        self.add(
            domain.secureDNS.hasOwnProperty("delegationSigned"),
            "The 'secureDNS' property MUST have a 'delegationSigned' property."
        )
    ) {
        if (domain.secureDNS.delegationSigned) {
            self.add(
                ["keyData", "dsData"].filter((k) => domain.secureDNS.hasOwnProperty(k)).length,
                "The 'secureDNS' property MUST have a 'keyData' or 'dsData' property."
            );
        }
    }

    self.popPath(".secureDNS");
};

/**
 * Validate the ldhName and/or unicodeName properties of gTLD domain or
 * nameserver objects.
*/
self.validateGTLDNameProperties = function(object, name) {
    if (!self.isULabel(name)) {
        self.pushPath(".ldhName");

        if (self.add(
            object.hasOwnProperty("ldhName"),
            "Object MUST include an 'ldhName' property."
        )) {
            self.add(
                name.toLowerCase() === object.ldhName.toLowerCase(),
                "The 'ldhName' property MUST match the queried-for object name."
            );
        }

        self.popPath(".ldhName");

        if (/^xn--/i.test(name) && object.hasOwnProperty("unicodeName")) {
            self.pushPath(".unicodeName");
            self.msg("TODO - ensure unicodeName property matches the ldhName");
            self.popPath(".unicodeName");
        }

    } else {
        self.pushPath(".unicodeName");

        if (self.add(
            object.hasOwnProperty("unicodeName"),
            "Object MUST include an 'unicodeName' property."
        )) {
            self.add(
                name.toLowerCase() === object.unicodeName.toLowerCase(),
                "The 'unicodeName' property MUST match the queried-for object name."
            );
        }

        if (object.hasOwnProperty("ldhName")) {
            self.pushPath(".ldhName");
            self.msg("TODO - ensure ldhName property matches the unicodeName");
            self.popPath(".ldhName");
        }

        self.popPath(".unicodeName");
    }
};

/**
 * Validate an entity as an ICANN-accredited registrar in a response from a
 * gTLD registry or registrar server.
 */
self.validateGTLDRegistrarEntity = function(rar) {
    self.msg("validating entity as a gTLD registrar...");

    self.pushPath(".handle");

    self.add(
        rar.hasOwnProperty("handle"),
        "The registrar entity MUST have a 'handle' property."
    );

    self.popPath(".handle");

    self.pushPath(".publicIds");

    if (!self.add(
        rar.hasOwnProperty("publicIds"),
        "The registrar entity MUST have the 'publicIds' property."
    )) return;

    self.pushPath("[?('IANA Registrar ID' == @.type)][0]");

    self.pushPath(".type");

    const type = "IANA Registrar ID";
    const ids = rar.publicIds.filter((id) => type == id.type);
    if (!self.add(
        1 === ids.length,
        "The registrar entity MUST have exactly one Public ID object with the '" + type + "' type."
    )) return;

    self.popPath(".type");

    self.pushPath(".identifier");

    if (self.add(
        self.isString(ids[0].identifier) && self.isInteger(parseInt(ids[0].identifier)),
        "The 'type' property of the Public ID object MUST be a string containing an integer."
    )) {
        self.add(
            parseInt(ids[0].identifier) === parseInt(rar.handle),
            "The 'handle' property MUST be equal to the IANA Registrar ID."
        )
    }

    self.popPath(".identifier");

    self.popPath();

    self.msg("This tool does not validate the IANA Registrar ID, please refer to https://www.iana.org/assignments/registrar-ids/registrar-ids.xhtml.");

    self.popPath();

    self.pushPath(".entities");

    if (rar.hasOwnProperty("entities") && self.isArray(rar.entities)) {

        let abuse;
        for (var i = 0 ; i < rar.entities.length ; i++) {
            if (
                self.isObject(rar.entities[i]) &&
                rar.entities[i].hasOwnProperty("roles") &&
                self.isArray(rar.entities[i].roles) &&
                rar.entities[i].roles.includes("abuse")
            ) {
                abuse = rar.entities[i];
                break;
            }
        }

        if (self.add(
            abuse !== undefined,
            "Registrar entity object MUST have an entity with the 'abuse' role."
        )) {
            self.pushPath("[" + i + "]");

            if (
                abuse.hasOwnProperty("vcardArray") &&
                self.isArray(abuse.vcardArray) &&
                self.isArray(abuse.vcardArray[1])
            ) {
                self.pushPath(".vcardArray[1]");

                let seen = {};
                abuse.vcardArray[1].forEach((p) => seen[p[0].toUpperCase()] = 1);

                ["TEL", "EMAIL"].forEach((t) => self.add(
                    seen.hasOwnProperty(t),
                    "Registrar entity's abuse entity MUST have a '" + t + "' property."
                ));

                self.popPath(".vcardArray[1]");
            }

            self.popPath("[" + i + "]");
        }
    }

    self.popPath(".entities");

    self.pushPath(".links");

    if (
        self.add(
            rar.hasOwnProperty("links"),
            "Registrar entity MUST have a 'links' property."
        )
        &&
        self.isArray(rar.links)
    ) {
        self.msg("TODO - validate link objects once the RDAP Response Profile makes sense.")
    }

    self.popPath(".links");
};

self.validateGTLDNameserver = function(nameserver, name) {
    self.validateCommonGTLDResponseProperties(nameserver);

    if (self.isObject(nameserver)) {
        self.validateGTLDNameProperties(nameserver, name);

        if (nameserver.hasOwnProperty("entities") && self.isArray(nameserver.entities)) {
            self.pushPath(".entities");
            self.iterate(
                domain.entities,
                function (e) {
                    if (
                        self.isObject(e) &&
                        e.hasOwnProperty("roles") &&
                        self.isArray(e.roles) &&
                        e.roles.includes("registrar")
                    ) {
                        self.validateGTLDRegistrarEntity(e);
                    }
                }
            );
            self.popPath(".entities");
        }
    }
};

self.validateGTLDEntity = function(rar) {
    self.msg("Validating gTLD registrar response...");

    if (rar.hasOwnProperty("roles") && self.isArray(rar.roles)) {
        self.pushPath(".roles");

        self.add(
            rar.roles.includes("registrar"),
            "Registrar entity MUST have the 'registrar' role."
        );

        self.popPath(".roles");
    }

    if (
        rar.hasOwnProperty("vcardArray") &&
        self.isArray(rar.vcardArray) &&
        self.isArray(rar.vcardArray[1])
    ) {
        self.pushPath(".vcardArray[1]");

        let seen_types = {};
        self.iterate(
            rar.vcardArray[1],
            function (p) {
                if (self.isArray(p) && self.isString(p[1])) {
                    seen_types[p[0].toUpperCase()] = 1;

                    if ("ADR" == p[0].toUpperCase()) {
                        self.pushPath("[1]");

                        if (self.isObject(p[1])) {
                            const keys = Object.keys(p[1]).map((k) => k.toUpperCase());
                            if (self.add(
                                keys.includes("CC"),
                                "JCard 'ADR' property MUST include a 'CC' parameter."
                            )) {
                                const k = keys.filter((k) => "CC" == k.toUpperCase()).shift();
                                self.add(
                                    self.countryCodes.includes(p[1][k]),
                                    "JCard 'ADR' 'CC' parameter MUST be a valid ISO-3166-alpha2 code."
                                );
                            }

                            self.popPath("[1]");
                        }

                        if (self.isArray(p[3])) {
                            self.pushPath("[3]");

                            self.add(
                                (
                                    (
                                        self.isString(p[3][2]) &&
                                        p[3][2].length > 0
                                    ) ||
                                    (
                                        self.isArray(p[3][2]) &&
                                        p[3][2].filter((s) => s.length > 0).length > 0
                                    )
                                ),
                                "JCard 'ADR' MUST include a Street address."
                            );


                            self.add(
                                self.isString(p[3][3]) && p[3][3].length > 0,
                                "JCard 'ADR' MUST include a City."
                            );

                            self.popPath("[3]");
                        }
                    }
                }
            }
        );

        ["FN", "ADR", "TEL", "EMAIL"].forEach((p) => self.add(
            seen_types.hasOwnProperty(p),
            "Registrar entity JCard MUST contain a '" + p + "' property."
        ));

        self.popPath(".vcardArray[1]");
    }
};

self.validateGTLDHelp = function(help) {
    self.msg("validating gTLD help response...");
    self.validateCommonGTLDResponseProperties(help);
};

self.validateRIRHelp = function(help) {
    self.msg("TODO - validate RIR help response");
};

self.validateGTLDError = function(error) {
    self.msg("TODO - validate gTLD error response");
};

self.validateRIRError = function(error) {
    self.msg("TODO - validate RIR error response");
};

/**
 * Validate an RIR domain response.
 */
self.validateRIRDomain = function(domain, name) {
    self.msg("TODO: RIR domain validation");
};

/**
 * Validate an RIR entity response.
 */
self.validateRIREntity = function(entity) {
    self.msg("TODO: RIR entity validation");
};

/**
 * Validate an RIR nameserver response.
 */
self.validateRIRNameServer = function(nameserver) {
    self.msg("TODO: RIR nameserver validation");
};

self.version   = '0.0.1';
self.path      = [];

/**
 * Default options for calls to fetch().
 */
self.fetchOptions = {
    headers: {
        "accept":       "application/json",
        "user-agent":   "rdap-validator/" + self.version,
    },
    redirect: "follow",
};

self.getPath   = ()        => self.path.join("");
self.checkType = (v, t)    => "undefined" !== typeof v && v.constructor.name == t;
self.isString  = (v)       => self.checkType(v, "String");
self.isArray   = (v)       => self.checkType(v, "Array");
self.isObject  = (v)       => self.checkType(v, "Object");
self.isBoolean = (v)       => self.checkType(v, "Boolean");
self.isInteger = (v)       => self.checkType(v, "Number") && Number.isInteger(v);

/**
 * Returns true if label is an internationalized label. the label must be NFC-
 * normalized before being passed to this method.
 */
self.isULabel = function(label) {
    for (var i = 0 ; i < label.length ; i++) {
        if (label.codePointAt(label) > 126) {
            return true;
        }
    }

    return false;
};

/**
 * Add an element to the JSON Path stack.
 */
self.pushPath = function (segment) {
    self.path.push(segment);
};

/**
 * TODO
 */
self.compareUnicode = (a, b) => true;

/**
 * Remove the last element from the JSON Path stack.
 * @var {?string} last if specified, the current last element is compared to this element, and if different, a warning is emitted.
 */
self.popPath = function(last) {
    if (last !== undefined && last !== self.path[self.path.length - 1]) {
        console.warn("WARNING: last item in path is not '" + last + "'");
    }

    self.path.pop();
};

/**
 * This simplifies the process of calling a validation method on every item
 * in an array, while also maintaining the correct JSON Path
 */
self.iterate = function(array, callback) {
    let i = 0;
    array.forEach(function(item) {
        self.pushPath("[" + i++ + "]");

        callback(item);

        self.popPath();
    });
};

/*
 * These are taken from the RDAP JSON Values Registry
 */
self.values = {
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
self.extensions = [
    "arin_originas0",
    "artRecord",
    "cidr0",
    "farv1",
    "fred",
    "icann_rdap_response_profile_0",
    "icann_rdap_technical_implementation_guide_0",
    "icann_rdap_response_profile_1",
    "icann_rdap_technical_implementation_guide_1",
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
self.objectTypes = [
    "domain",
    "ip network",
    "autnum",
    "nameserver",
    "entity",
];

/**
 * See https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#properties
 */
self.JCardPropertyTypes = [
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
 * See https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#parameters
 */
self.JCardParameters = [
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
 * See https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#value-data-types
 */
self.JCardValueTypes = [
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
 * See https://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml#property-values
 */
self.propertyValues = {
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
self.responseTypes = {
    "domain": "Domain Name",
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
self.serverTypes = {
    "vanilla": "Vanilla (IETF STD 95)",
    "gtld-registry": "gTLD registry (February 2024 gTLD RDAP profile)",
    "gtld-registrar": "gTLD registrar (February 2024 gTLD RDAP profile)",
    "rir": "RIR (January 2021 NRO RDAP Profile)",
};

/**
 * See https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
 */
self.countryCodes = [
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
 * Default result callback, does nothing.
 * @param {bool} result
 * @param {string} message
 * @param {mixed} context
 * @param {string} path
 * @param {string} ref
 */
self.resultCallback = (result, message, path, ref) => null;

/**
 * Specify a callback to invoke when a result has been generated. This callback
 * will receive three arguments: a boolean pass/fail result, a message, and a
 * contextual data structure.
 */
self.setResultCallback = function(callback) {
    const prev = self.resultCallback;

    self.resultCallback = callback;

    return prev;
};

/**
 * Default result callback, does nothing.
 */
self.testCompleteCallback = function() {};

/**
 * Specify a callback to invoke when the test has finished.
 */
self.setTestCompleteCallback = function(callback) {
    const prev = self.testCompleteCallback;

    self.testCompleteCallback = callback;

    return prev;
};

/**
 * Log a result by invoking the resultCallback with the provided arguments.
 * @param {bool} result
 * @param {string} message
 * @param {string} ref
 */
self.add = function(result, message, ref) {
    if (false === result) self.errors++;
    self.resultCallback(result, message, self.getPath(), ref ? self.ref(ref) : undefined);
    return result;
};

/**
 * Log a message by invoking the resultCallback with the provided arguments.
 * @param {string} message
 */
self.msg = function(message) {
    self.add(null, message);
}

/**
 * base URL of all specifications
 */
self.referenceBase = "https://validator.rdap.org/specs/";

/**
 * path segments for specifications
 */
self.referenceURLs = {
    "rfc7480":      "vanilla/rfc7480.html",
    "rfc7481":      "vanilla/rfc7481.html",
    "rfc9082":      "vanilla/rfc9082.html",
    "rfc9083":      "vanilla/rfc9083.html",
    "rfc9224":      "vanilla/rfc9224.html",
    "rfc9537":      "vanilla/rfc9537.html",
    "feb24-rp":     "gtld/2024-02/rdap-response-profile-21feb24-en.pdf",
    "feb24-tig":    "gtld/2024-02/rdap-technical-implementation-guide-21feb24-en.pdf",
    "nro":          "rir/2021-01/nro-rdap-profile.txt",
};

/**
 * section references for particular object types
 */
self.objectClassNameReferences = {
    "entity":       "section-5.1",
    "nameserver":   "section-5.2",
    "domain":       "section-5.3",
    "ip network":   "section-5.4",
    "autnum":       "section-5.5",
};

/**
 * generate a URL given the current specification and a fragment
 */
self.ref = function(fragment, alternateSpec=null) {
    return self.referenceBase + self.referenceURLs[alternateSpec ?? self.currentSpec] + "#" + fragment;
}

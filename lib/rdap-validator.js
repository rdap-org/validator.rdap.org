const rdapValidator = {};

const self = rdapValidator;

export default rdapValidator;

self.version = '0.0.1';

/**
 * Initiate a test run.
 * @param {null|string} url
 * @param {string} type one of the values in self.responseTypes
 * @param {string} serverType one of the values in self.serverTypes
 */
self.testURL = function(url, type, serverType) {

    self.errors = 0;
    self.log = [];

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

    self.msg(`Version is ${self.version}.`);
    self.msg(`Punycode.js version is ${self.punycode.version}.`);
    self.msg(`Testing URL is '${url}.`);
    self.msg(`Response type is '${type}'.`);
    self.msg(`Server type is '${serverType}'.`);

    self.lastTestedURL              = url;
    self.lastTestedResponseType     = type;
    self.lastTestedServerType       = serverType;
    self.lastTestedObject           = null;

    self.msg("Sending request...");

    fetch(url, self.fetchOptions).then(
        function(res) {
            self.pushSpec("rfc7480");
            self.testResponse(res, url, type, serverType);
        },
        function(err) {
            self.add(
                false,
                `Error performing HTTP request: ${err}. Check the access-control-allow-origin header.`,
            );
            self.testCompleteCallback();
        },
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

    self.msg("Received a response from the server.");

    self.lastTestedResponseHeaders = {};
    for (const pair of res.headers.entries()) {
        self.lastTestedResponseHeaders[pair[0]] = pair[1];
    }

    if (!self.add(
        "error" == type ? res.status >= 400 : res.status < 400,
        `HTTP status ${res.status} MUST be ` + ("error" == type ? " 400 or higher." : "less than 400."),
        "error" == type ? "section-5.3" : "section-5.1",
    )) return;

    let mediaType = self.lastTestedResponseHeaders["content-type"];

    if (mediaType.indexOf(";") > 0) {
        mediaType = mediaType.substring(0, mediaType.indexOf(";"));
    }

    if (!self.add(
        mediaType.toLowerCase() == "application/rdap+json",
        "Media type MUST be 'application/rdap+json'.",
        "section-4.2",
    )) {
        if (!mediaType.toLowerCase().startsWith("application/json")) {
            return;
        }
    }

    self.pushSpec("rfc9083");

    res.json().then(
        function(record) {
            self.validateResponse(record, url, type, serverType);
            self.testCompleteCallback();
        },
        function(error) {
            self.add(
                false,
                `Response body MUST be valid JSON (parse error: ${error}).`,
                "section-1",
            );
            self.testCompleteCallback();
        },
    );
};

self.validateResponse = function(record, url, type, serverType) {

    self.path = ["$"];

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

            name = self.nameFromPath(url);

            self.lastTestedObject = name;

            switch (serverType) {
                case "gtld-registry":   self.validateGTLDRegistryDomain(record, name); break;
                case "gtld-registrar":  self.validateGTLDRegistrarDomain(record, name); break;
                case "rir":             self.validateRIRDomain(record, name); break;
            }

            break;

        case "nameserver":
            self.validateNameserver(record, url, serverType);

            name = self.nameFromPath(url);

            self.lastTestedObject = name;

            switch (serverType) {
                case "gtld-registry":   self.validateGTLDNameserver(record, name); break;
                case "rir":             self.validateRIRNameserver(record, name); break;
            }

            break;

        case "entity":
            self.validateEntity(record, url, serverType);

            const handle = decodeURI((new URL(url)).pathname.split("/").pop());

            self.lastTestedObject = handle;

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
    self.pushPath(".rdapConformance");

    if (
        self.add(
            record.hasOwnProperty("rdapConformance"),
            "Record MUST have the 'rdapConformance' property.",
            "section-4.1",
        )
        &&
        self.add(
            self.isArray(record.rdapConformance),
            "The 'rdapConformance' property MUST be an array.",
            "section-4.1",
        )
    ) {
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
                `The value of the 'objectClassName' property ('${record.objectClassName}') MUST be '${type}'.`,
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
    self.msg("Validating domain object...");

    self.validateCommonObjectProperties(domain, "domain");

    if (domain.hasOwnProperty("unicodeName") && domain.hasOwnProperty("ldhName")) {
        self.pushPath(".unicodeName");

        self.add(
            self.compareUnicode(domain.unicodeName, domain.ldhName),
            `The 'unicodeName' property '${domain.unicodeName}' MUST match the 'ldhName' property '${domain.ldhName}'.`,
            "sect-3"
        );

        self.popPath(".unicodeName");
    }

    if (domain.hasOwnProperty("nameservers")) {
        self.pushPath(".nameservers");

        if (self.add(
            self.isArray(domain.nameservers),
            "The 'nameservers' property MUST be an array.",
            "section-5.3"
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
    self.msg("Validating 'secureDNS' object...");

    if (!self.add(
        self.isObject(secureDNS),
        "The 'secureDNS' property MUST be an object.",
        "section-5.3",
    )) return;

    ["zoneSigned", "delegationSigned"].forEach(function (p) {
        self.pushPath("." + p);

        if (secureDNS.hasOwnProperty(p)) {
            self.add(
                self.isBoolean(secureDNS[p]),
                "The '" + p + "' property MUST be a boolean.",
                "section-5.3",
            );
        }

        self.popPath();
    });

    if (secureDNS.delegationSigned) {
        ["dsData", "keyData"].forEach(function (p) {
            self.pushPath("." + p);

            if (secureDNS.hasOwnProperty(p)) {

                if (self.add(
                    self.isArray(secureDNS[p]),
                    "The '" + p + "' property MUST be an array.",
                    "section-5.3",
                )) {
                    self.iterate(
                        secureDNS[p],
                        function(v) {
                            switch(p) {
                                case "dsData": return self.validateDSData(v);
                                case "keyData": return self.validateKeyData(v);
                            }
                        }
                    );
                }
            }

            self.popPath();
        });
    }
};

/**
 * Validate a dsData object.
 */
self.validateDSData = function(dsData) {
    self.msg("Validating 'dsData' object...");

    if (!self.add(
        self.isObject(dsData),
        "Values in the 'dsData' property MUST be an object",
        "section-5.3",
    )) return;

    ["keyTag", "algorithm", "digestType", "digest"].forEach(function(p) {

        self.pushPath("." + p);

        if (self.add(
            dsData.hasOwnProperty(p),
            "DS record object MUST have a '" + p + "' property.",
            "section-5.3",
        )) {
            self.add(
                ("digest" === p ? self.isString(dsData[p]) : self.isInteger(dsData[p])),
                `The '${p}' property of DS record object MUST be ` + ("digest" === p ? "a string" : "an integer") + ".",
                "section-5.3",
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
    self.msg("Validating 'keyData' object...");

    if (!self.add(
        self.isObject(keyData),
        "Value in the 'keyData' property is not an object",
        "section-5.3",
    )) return;

    ["flags", "protocol", "algorithm", "publicKey"].forEach(function(p) {
        self.pushPath("." + p);

        if (self.add(
            keyData.hasOwnProperty(p),
            "KeyData object MUST have a '" + p + "' property.",
            "section-5.3",
        )) {
            self.add(
                ("publicKey" === p ? self.isString(keyData[p]) : self.isInteger(keyData[p])),
                `The '${p}' property of DS record object MUST be ` + ("publicKey" === p ? "a string" : "an integer") + ".",
                "section-5.3",
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
    self.msg("Validating entity...");

    if (!self.add(
        self.isObject(entity),
        "Entity MUST be an object.",
        "section-5.1",
    )) return;

    self.validateCommonObjectProperties(entity, "entity");

    self.pushPath(".roles");

    if (
        self.add(
            entity.hasOwnProperty("roles"),
            "Entity MUST have the 'roles' property.",
            "section-5.1",
        )
        &&
        self.add(
            self.isArray(entity.roles),
            "The 'roles' property MUST be an array.",
            "section-5.1",
        )
    ) {
        self.iterate(
            entity.roles,
            (r) => self.add(
                self.values.role.indexOf(r) >= 0,
                "Role '" + r + "' MUST be a valid RDAP value.",
                "sect-10.2.4",
            )
        );
    }

    self.popPath(".roles");
    self.pushPath(".vcardArray");

    self.pushSpec("rfc7095");

    if (
        entity.hasOwnProperty("vcardArray")
        &&
        self.add(
            self.isArray(entity.vcardArray),
            "The 'vcardArray' property MUST be an array.",
            "section-3.2",
        )
    ) {
        self.pushPath("[0]");

        self.add(
            "vcard" === entity.vcardArray[0],
            "The first value in the vcardArray array MUST be 'vcard'.",
            "section-3.2",
        );

        self.popPath("[0]");

        self.validateJCard(entity.vcardArray[1]);
    }

    self.popPath(".vcardArray");

    self.popSpec("rfc7095");

    ["asEventActor", "networks", "autnums"].forEach(function(p) {
        self.pushPath("." + p);

        if (entity.hasOwnProperty(p)) {
            if (self.add(
                self.isArray(entity[p]),
                "The '" + p + "' property MUST be an array.",
                "section-5.1",
            )) {
                self.iterate(
                    entity[p],
                    function(v) {
                        switch (p) {
                            case "asEventActor": return self.validateEvent(v);
                            case "networks": return self.validateIPNetwork(v);
                            case "autnums": return self.validateAutnum(v);
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
    self.msg("Validating JCard object...");

    if (!self.add(
        self.isArray(jcard),
        "jCard MUST be an array.",
        "section-3.2",
    )) return;

    if (!self.add(
        jcard.length > 0,
        "jCard MUST NOT be empty.",
        "section-3.2",
    )) return;

    self.pushPath("[1]");

    self.iterate(
        jcard,
        self.validateJCardProperty
    );

    self.popPath("[1]");

    self.pushSpec("rfc6350");

    for (const prop of self.requiredJCardProperties) {
        const count = jcard.filter(p => self.isArray(p) && self.isString(p[0]) && p[0].toUpperCase() === prop.name).length;

        self.add(
            count > 0,
            "jCard MUST have " + self.requiredJCardPropertiesCardinality[prop.cardinality] + " '" + prop.name + "' property.",
            prop.reference,
        );
    }

    self.popSpec("rfc6350");
};

/**
 * Validate a JCard property.
 */
self.validateJCardProperty = function(prop) {

    if (!self.add(
        self.isArray(prop),
        "JCard property MUST be an array.",
        "section-3.3",
    )) return;

    if (!self.add(
        prop.length >= 4,
        "JCard property MUST not contain less than four (4) elements.",
        "section-3.3",
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
self.validateJCardPropertyType = function(property) {
    if (!self.add(
        self.isString(property[0]),
        "Item #1 of a jCard property MUST be a string.",
        "section-3.3",
    )) return;

    if (!property[0].toUpperCase().startsWith("X-")) {
        self.add(
            self.JCardPropertyTypes.includes(property[0].toUpperCase()),
            `Property type '${property[0]}' MUST be present in the IANA registry.`,
        );
    }
};

/**
 * Validate a JCard property parameter object.
 */
self.validateJCardPropertyParameters = function(property) {
    self.add(
        self.isObject(property[1]),
        "Item #2 of a jCard property MUST be an object.",
        "section-3.3",
    );
};

/**
 * Validate a JCard property value type.
 */
self.validateJCardPropertyValueType = function(property) {
    if (self.add(
        self.isString(property[2]),
        "Item #3 of a jCard property MUST be a string.",
        "section-3.3",
    )) {
        self.add(
            self.JCardValueTypes.includes(property[2].toUpperCase()),
            `Value type '${property[2]}' MUST be present in the IANA registry.`,
            "section-4"
        );
    };

    if (self.isString(property[0]) && self.propertyValues.hasOwnProperty(property[0].toUpperCase())) {
        self.add(
            self.propertyValues[property[0].toUpperCase()].includes(property[3].toLowerCase()),
            "Value '" + property[3] + "' MUST be one of: [" + self.propertyValues[property[0].toUpperCase()].join("|") + "]",
            "section-6.1.4"
        );
    }
};

/**
 * Validate a property value.
 */
self.validateJCardPropertyValue = function(property) {
    self.pushSpec("rfc6350");

    if (self.isString(property[0]) && "ADR" === property[0].toUpperCase() && self.isArray(property[3])) {
        self.add(
            7 == property[3].length,
            "Length of the array in an ADR property MUST be exactly 7.",
            "section-6.3.1",
        );

    } else if (self.isString(property[0]) && "CONTACT-URI" === property[0].toUpperCase()) {
        self.pushSpec("rfc8605");

        let url, valid;
        try {
            url = new URL(property[3]);
            valid = true;

        } catch (e) {
            valid = false;

        }

        if (self.add(
            valid,
            "Value of a CONTACT-URI property MUST be a valid URL.",
            "section-2.1",
        )) {
            self.add(
                ["mailto:", "http:", "https:"].includes(url.protocol),
                "URI MUST have the mailto:, http: or https: schemes.",
                "section-2.1",
            );
        }

        self.popSpec("rfc8605");
    }

    self.popSpec("rfc6350");
};

/**
 * Validate a nameserver.
 * @param {object} nameserver
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateNameserver = function(nameserver, url, serverType) {
    self.msg("Validating nameserver...");

    if (!self.add(
        self.isObject(nameserver),
        "Nameserver MUST be an object.",
        "section-5.2"
    )) return;

    self.validateCommonObjectProperties(nameserver, "nameserver");

    self.pushPath(".ldhName");

    if (self.add(
        nameserver.hasOwnProperty("ldhName"),
        "Nameserver MUST have the 'ldhName' property.",
        "section-5.2",
    )) {
        self.add(
            self.isString(nameserver.ldhName),
            "The 'ldhName' property MUST be a string.",
            "section-5.2"
        );
    }

    self.popPath();
    self.pushPath(".ipAddresses");

    if (
        nameserver.hasOwnProperty("ipAddresses")
        &&
        self.add(
            self.isObject(nameserver.ipAddresses),
            "The 'ipAddresses' property MUST be an object.",
            "section-5.2",
        )
    ) {
        ["v4", "v6"].forEach(function(t) {
            self.pushPath("." + t);

            if (
                nameserver.ipAddresses.hasOwnProperty(t)
                &&
                self.add(
                    self.isArray(nameserver.ipAddresses[t]),
                    "The '" + t + "' property of the 'ipAddresses' property MUST be an array.",
                    "section-5.2",
                )
            ) {
                self.iterate(nameserver.ipAddresses[t], function(addr) {
                    let result;

                    switch (t) {
                        case "v4":
                            result = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr); break;
                        case "v6":
                            result = /^[0-9a-f][0-9a-f:]+$/i.test(addr); break;
                    }

                    self.add(
                        result,
                        "The value '" + addr + "' MUST be a valid IP" + t + " address.",
                        "section-5.2",
                    );
                });
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
    self.msg("Validating link...");

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
};

/**
 * Validate a notice or remark.
 */
self.validateNoticeOrRemark = function (noticeOrRemark) {
    self.msg("Validating notice/remark...");

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

    if (
        self.add(
            noticeOrRemark.hasOwnProperty("description"),
            "Notice/remark MUST have the 'description' property.",
            "section-4.3",
        )
        &&
        self.add(
            self.isArray(noticeOrRemark.description),
            "The 'description' property MUST be an array.",
            "section-4.3",
        )
    ) {
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
            "The value of the 'type' property MUST be a valid JSON value.",
            "section-4.3",
        );

        self.popPath(".type");
    }

    self.validateCommonObjectProperties(noticeOrRemark);
};

/**
 * Validate an event.
 */
self.validateEvent = function (event) {
    self.msg("Validating event...");

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
                self.pushSpec("rfc3339");
                var pass;

                if (!self.iso8601DateTimeRegexp.test(event[k])) {
                    pass = false;

                } else {
                    try {
                        new Date(event[k]);
                        pass = true;

                    } catch (e) {
                        pass = false;

                    }
                }

                self.add(
                    pass,
                    "The 'eventDate' property MUST be a valid date/time.",
                    "section-5.6",
                );

                self.popSpec("rfc3339");
            }
        }

        self.popPath();
    });

    self.validateCommonObjectProperties(event);
};

/**
 * Validate a Public ID.
 */
self.validatePublicId = function (publicId) {
    self.msg("Validating Public ID...");

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
    self.add(
        self.isString(handle),
        "The 'handle' property MUST be a string.",
        "section-3",
    );
}

/**
 * Validate an array of links.
 */
self.commonPropertyValidators.links = function(links) {
    if (!self.add(
        self.isArray(links),
        "The 'links' property MUST be an array.",
        "section-4.2",
    )) return;

    if ("rir" == self.lastTestedServerType) self.validateRIRLinks(links);

    self.iterate(
        links,
        self.validateLink
    );
}

/**
 * Validate an array of remarks.
 */
self.commonPropertyValidators.remarks = function(remarks) {
    if (!self.add(
        self.isArray(remarks),
        "The 'remarks' property MUST be an array.",
        "section-4.3",
    )) return;

    self.iterate(
        remarks,
        self.validateNoticeOrRemark
    );
}

/**
 * Validate a language tag.
 */
self.commonPropertyValidators.lang = function(lang) {
    self.add(
        self.isString(lang),
        "The 'lang' property MUST be a string.",
        "section-4.4",
    );
}

/**
 * Validate an array of entities.
 */
self.commonPropertyValidators.entities = function(entities) {
    if (!self.add(
        self.isArray(entities),
        "The 'entities' property MUST be an array.",
        "section-5.3",
    )) return;

    self.iterate(
        entities,
        self.validateEntity
    );
}

/**
 * Validate an array of events.
 */
self.commonPropertyValidators.events = function(events) {
    if (!self.add(
        self.isArray(events),
        "The 'events' property MUST be an array.",
        "section-4.5",
    )) return;

    self.iterate(
        events,
        self.validateEvent
    );
}

/**
 * Validate an array of status codes.
 */
self.commonPropertyValidators.status = function(status) {
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
}

/**
 * Validate a port43 property.
 */
self.commonPropertyValidators.port43 = function(port43) {
    self.add(
        self.isString(port43),
        "The 'port43' property MUST be a string.",
        "section-4.7",
    );
}

/**
 * Validate an array of Public IDs.
 */
self.commonPropertyValidators.publicIds = function(publicIds) {
    if (!self.add(
        self.isArray(publicIds),
        "The 'publicIds' property MUST be an array.",
        "section-4.8",
    )) return;

    self.iterate(
        publicIds,
        self.validatePublicId
    );
}

self.commonPropertyValidators.ldhName = function(ldhName) {
    self.add(
        self.isString(ldhName),
        "The 'ldhName' property MUST be a string.",
        "section-3",
    );
};

self.commonPropertyValidators.unicodeName = function(unicodeName) {
    self.add(
        self.isString(unicodeName),
        "The 'unicodeName' property MUST be a string.",
        "section-3",
    );
}

/**
 * Validate common object properties.
 */
self.validateCommonObjectProperties = function(record, type=null) {
    self.msg("Checking common object properties...");

    if (null != type) {
        self.validateObjectClassName(record, type);
    }

    Object.keys(self.commonPropertyValidators).forEach(function(name) {

        if (record.hasOwnProperty(name)) {
            self.pushPath("." + name);

            self.msg("Checking '" + name + "' property...");

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
    self.msg("Validating IP network object...");

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
};

/**
 * Validate an autnum.
 * @param {object} autnum
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateAutnum = function(autnum, url, serverType) {
    self.msg("Validating autnum object...");

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
};

/**
 * Validate an RIR autnum response.
 * @param {object} nameserver
 * @param {null|string} url
 */
self.validateRIRAutnum = function(autnum) {
    self.pushSpec("nro");
    self.validateCommonRIRResponseProperties(autnum);
    self.msg("TODO: RIR autnum validation");
    self.popSpec("nro");
};

/**
 * Validate an RIR IP network response.
 * @param {object} nameserver
 * @param {null|string} url
 */
self.validateRIRIPNetwork = function(ipNetwork) {
    self.pushSpec("nro");
    self.validateCommonRIRResponseProperties(ipNetwork);
    self.msg("TODO: RIR IP network validation");
    self.popSpec("nro");
};

self.validateCommonRIRResponseProperties = function(object) {
    if (object.hasOwnProperty("rdapConformance") && self.isArray(object.rdapConformance)) {
        for (const token of ["nro_rdap_profile_0", "cidr0"]) {
            self.add(
                object.rdapConformance.includes(token),
                `The 'rdapConformance' property MUST contain '${token}'.`,
                "section-4.1",
            );
        }
    }

    for (const prop of ["ldhName", "unicodeName"]) {
        if (object.hasOwnProperty(prop) && self.isString(object[prop])) {
            self.add(
                object[prop].endsWith("."),
                `The '${prop}' property MUST end with a trailing dot.`,
                "section-3.1",
            );
        }
    }

    if (
        self.add(
            object.hasOwnProperty("notices"),
            "Response MUST contain a 'notices' property.",
            "section-4.3",
        )
        &&
        self.isArray(object.notices)
    ) {
        for (const rel of ["terms-of-service", "inaccuracy-report"]) {
            self.add(
                1 === object.notices.filter(n =>
                    n.hasOwnProperty("links") &&
                    self.isArray(n.links) &&
                    1 === n.links.filter(l =>
                        1 === l.hasOwnProperty("rel") &&
                        rel == l.rel
                    ).length
                ).length,
                `Response MUST contain a notice which has a link with the '${rel}' relation.`,
                "section-4.3",
            );
        }
    }
};

/**
 * Validate an array of links that appear in an RIR response.
 */
self.validateRIRLinks = function(links) {
    self.pushSpec("nro");
    self.add(
        1 === links.filter(l => l.hasOwnProperty("rel") && "self" == l.rel).length,
        "'links' array MUST contain exactly one 'self' link.",
        "section-4.2",
    )
    self.popSpec("nro");
}

/**
 * Validate a help response.
 * @param {object} help
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateHelp = function(help, url, serverType) {
    self.msg("Validating help response...");

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
};

/**
 * Validate a domain search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateDomainSearch = function(result, url, serverType) {
    self.msg("Validating domain search response...");

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
};

/**
 * Validate a nameserver search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateNameserverSearch = function(result, url, serverType) {
    self.msg("Validating nameserver search response...");

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
};

/**
 * Validate an entity search response.
 * @param {object} result
 * @param {null|string} url
 * @param {string} serverType
 */
self.validateEntitySearch = function(result, url, serverType) {

    self.msg("Validating entity search response...");

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
    self.msg("Validating error response...");

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

    self.msg("Note: IPv6 support cannot be tested by this system.");

    self.pushSpec("feb24-tig");

    self.add(
        "https:" === (new URL(self.lastTestedURL)).protocol,
        "HTTP scheme MUST be 'https:'.",
        "page=2",
    );

    self.add(
        self.lastTestedResponseHeaders.hasOwnProperty("access-control-allow-origin"),
        "Server MUST set the 'access-control-allow-origin' header.",
        "page=4",
    );

    self.popSpec("feb24-tig");

    if (response.hasOwnProperty("rdapConformance") && self.isArray(response.rdapConformance)) {
        self.pushPath(".rdapConformance");

        self.gTLDConformance.forEach(function(s) {
            self.pushSpec(s[1]);
            self.add(
                response.rdapConformance.includes(s[0]),
                "The 'rdapConformance' array MUST include '" + s[0] + "'.",
                s[2],
            );
            self.popSpec(s[1]);
        });

        self.pushSpec("feb24-rp");

        self.iterate(
            response.rdapConformance.filter((s) => s != "rdap_level_0"),
            (s) => self.add(
                self.extensions.indexOf(s) >= 0,
                "The '" + s + "' extension MUST be registered with IANA.",
                "page=2"
            )
        );

        self.popSpec("feb24-rp");

        self.popPath(".rdapConformance");
    }

    if (response.hasOwnProperty("entities") && self.isArray(response.entities)) {
        self.pushSpec("feb24-rp");

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

        self.popSpec("feb24-rp");
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
    self.pushSpec("feb24-rp");

    self.msg("Validating response for a gTLD registry");
    self.validateCommonGTLDResponseProperties(domain);
    self.validateCommonGTLDDomainProperties(domain, name);

    self.popSpec("feb24-rp");
};

/**
 * Validate a domain object as per the gTLD RDAP profile for a registrar.
 */
self.validateGTLDRegistrarDomain = function(domain, name) {
    self.pushSpec("feb24-rp");

    self.msg("Validating response for a gTLD registrar");
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

    self.popSpec("feb24-rp");
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
        "Domain object MUST have the 'handle' property.",
        "page=3",
    );

    self.popPath(".handle");

    self.validateGTLDNameProperties(domain, name);

    self.pushPath(".entities");

    if (
        self.add(
            domain.hasOwnProperty("entities"),
            "The 'entities' property MUST be present.",
            "page=4",
        )
        &&
        self.add(
            self.isArray(domain.entities),
            "The 'entities' property MUST be an array.",
            "page=4",
        )
    ) {
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
            "Domain object MUST have an entity with the 'registrar' role.",
            "page=4",
        );
    }

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
        "Domain object MUST have an event with an 'eventAction' property of '" + e + "'.",
        "page=4",
    ));

    self.popPath(".events");

    self.pushPath(".status");

    if (
        self.add(
            domain.hasOwnProperty("status"),
            "Domain object MUST have a 'status' property.",
            "page=5",
        )
        &&
        self.isArray(domain.status)
    ) {
        self.add(
            domain.status.length > 0,
            "'status' array MUST contain at least one value.",
            "page=5",
        )
    }

    self.popPath(".status");

    self.pushPath(".notices");

    if (
        self.add(
            domain.hasOwnProperty("notices"),
            "Domain object MUST have a 'notices' property.",
            "page=5",
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
                        "https://icann.org/epp" === l.href
                    ).length > 0
            ).length,
            "Domain object MUST contain a 'Status Codes' notice containing a link with rel=glossary and href=https://icann.org/epp.",
            "page=5",
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
                    "https://icann.org/wicf" === l.href
                ).length > 0
            ).length,
            "Domain object MUST contain a 'RDDS Inaccuracy Complaint Form' notice containing a link with rel=help and href=https://icann.org/wicf.",
            "page=7",
        );
    }

    self.popPath(".notices");

    self.pushPath(".nameservers");

    self.add(
        domain.hasOwnProperty("nameservers"),
        "Domain object MUST have a 'nameservers' property.",
        "page=7",
    );

    self.popPath(".nameservers");

    self.pushPath(".secureDNS");

    if (
        self.add(
            domain.hasOwnProperty("secureDNS"),
            "Domain object MUST have a 'secureDNS' property.",
            "page=7",
        )
        &&
        self.isObject(domain.secureDNS)
        &&
        self.add(
            domain.secureDNS.hasOwnProperty("delegationSigned"),
            "The 'secureDNS' property MUST have a 'delegationSigned' property.",
            "page=7",
        )
    ) {
        if (domain.secureDNS.delegationSigned) {
            self.add(
                ["keyData", "dsData"].filter((k) => domain.secureDNS.hasOwnProperty(k)).length,
                "The 'secureDNS' property MUST have a 'keyData' or 'dsData' property.",
                "page=7",
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
            "Object MUST include an 'ldhName' property.",
            "page=3",
        )) {
            self.add(
                name.toLowerCase() === object.ldhName.toLowerCase(),
                "The 'ldhName' property MUST match the queried-for object name.",
                "page=3",
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
            "Object MUST include an 'unicodeName' property.",
            "page=3",
        )) {
            self.add(
                name.toLowerCase() === object.unicodeName.toLowerCase(),
                "The 'unicodeName' property MUST match the queried-for object name.",
                "page=3",
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
    self.msg("Validating entity as a gTLD registrar...");

    self.pushPath(".handle");

    self.add(
        rar.hasOwnProperty("handle"),
        "The registrar entity MUST have a 'handle' property.",
        "page=8",
    );

    self.popPath(".handle");

    self.pushPath(".publicIds");

    if (!self.add(
        rar.hasOwnProperty("publicIds"),
        "The registrar entity MUST have the 'publicIds' property.",
        "page=4",
    )) {
        self.popPath(".publicIds");
        return;
    }

    self.popPath(".publicIds");

    self.pushPath("[?('IANA Registrar ID' == @.type)][0]");

    self.pushPath(".type");

    const type = "IANA Registrar ID";
    const ids = rar.publicIds.filter((id) => type == id.type);
    if (!self.add(
        1 === ids.length,
        "The registrar entity MUST have exactly one Public ID object with the '" + type + "' type.",
        "page=4",
    )) {
        self.popPath(".type");
        return;
    }

    self.popPath(".type");

    self.pushPath(".identifier");

    if (self.add(
        self.isString(ids[0].identifier) && self.isInteger(parseInt(ids[0].identifier)),
        "The 'type' property of the Public ID object MUST be a string containing an integer.",
        "page=4",
    )) {
        self.add(
            parseInt(ids[0].identifier) === parseInt(rar.handle),
            "The 'handle' property MUST be equal to the IANA Registrar ID.",
            "page=4",
        )
    }

    self.popPath(".identifier");

    self.popPath("[?('IANA Registrar ID' == @.type)][0]");

    self.msg("This tool does not validate the IANA Registrar ID, please refer to https://www.iana.org/assignments/registrar-ids/registrar-ids.xhtml.");

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
            "Registrar entity object MUST have an entity with the 'abuse' role.",
            "page=5",
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
                    "Registrar entity's abuse entity MUST have a '" + t + "' property.",
                    "page=5",
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
            "Registrar entity MUST have a 'links' property.",
            "page=5",
        )
        &&
        self.isArray(rar.links)
    ) {
        self.add(
            rar.links.length > 0,
            "Registrar entity 'links' property MUST contain at least one entry.",
            "page=5",
        );
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
                nameserver.entities,
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
    self.msg("Validating gTLD help response...");
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

/**
 * Default options for calls to fetch().
 */
self.fetchOptions = {
    headers:    {accept: "application/rdap+json, application/json, */*"},
    redirect:   "follow",
};

self.getPath   = ()        => self.path.join("");
self.checkType = (v, t)    => "undefined" !== typeof v && null !== v && v.constructor.name == t;
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
 * This stores the JSONPath query that identifies the value in the response that
 * is currently being validated.
 */
self.path = [];

/**
 * Add an element to the JSON Path stack.
 */
self.pushPath = function (segment) {
    self.path.push(segment);
};

/**
 * Remove the last element from the JSON Path stack.
 * @var {?string} last if specified, the current last element is compared to this element, and if different, a warning is emitted.
 */
self.popPath = function(last) {
    if (last !== undefined && last !== self.path[self.path.length - 1]) {
        console.warn("WARNING: last item in path is not '" + last + "'");
        new Error().stack.split("\n").slice(1).forEach(l => console.warn(l));
    }

    self.path.pop();
};

/**
 * This keeps track of the specification document that the response is being
 * validated against.
 */
self.specStack = [];

/**
 * Get the current specification.
 */
self.currentSpec = () => self.specStack[self.specStack.length - 1];

/**
 * Add an element to the specification stack.
 */
self.pushSpec = function(spec) {
    self.specStack.push(spec);
};

/**
 * Remove an element from the specification stack.
 */
self.popSpec = function(last) {
    if (last !== undefined && last !== self.specStack[self.specStack.length - 1]) {
        console.warn("WARNING: last item in spec stack is '" + self.currentSpec() + "' not '" + last + "'");
    }

    self.specStack.pop();
}

/**
 * Check that a unicodeName matches the corresponding ldhName
 */
self.compareUnicode = function(unicodeName, ldhName) {
    return (
        self.punycode.toASCII(unicodeName).toLowerCase() == ldhName &&
        self.punycode.toUnicode(ldhName).toLowerCase() == unicodeName.toLowerCase()
    );
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
    "gtld-registry": "gTLD registry (February 2024 gTLD RDAP profile, work-in-progress)",
    "gtld-registrar": "gTLD registrar (February 2024 gTLD RDAP profile, work-in-progress)",
    "rir": "RIR (January 2021 NRO RDAP Profile, work-in-progress)",
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

    const path = self.getPath();
    const refURL = null === result ? null : self.ref(ref);

    self.log.push([
        result,
        message,
        path,
        refURL,
    ]);

    self.resultCallback(
        result,
        message,
        path,
        refURL,
    );

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
 * Base URL of all specifications.
 */
self.referenceBase = "https://validator.rdap.org/specs/";

/**
 * Path segments for specifications.
 */
self.referenceURLs = {
    "rfc3339":      "vanilla/rfc3339.html",
    "rfc6350":      "vanilla/rfc6350.html",
    "rfc7095":      "vanilla/rfc7095.html",
    "rfc7480":      "vanilla/rfc7480.html",
    "rfc7481":      "vanilla/rfc7481.html",
    "rfc8605":      "vanilla/rfc8605.html",
    "rfc9082":      "vanilla/rfc9082.html",
    "rfc9083":      "vanilla/rfc9083.html",
    "rfc9224":      "vanilla/rfc9224.html",
    "rfc9537":      "vanilla/rfc9537.html",
    "feb24-rp":     "gtld/2024-02/rdap-response-profile-21feb24-en.pdf",
    "feb24-tig":    "gtld/2024-02/rdap-technical-implementation-guide-21feb24-en.pdf",
    "nro":          "rir/2021-01/nro-rdap-profile.txt",
};

/**
 * Section references for particular object types.
 */
self.objectClassNameReferences = {
    "entity":       "section-5.1",
    "nameserver":   "section-5.2",
    "domain":       "section-5.3",
    "ip network":   "section-5.4",
    "autnum":       "section-5.5",
};

/**
 * List of rdapConformance entries required for gTLD responses, and the
 * applicable references.
 */
self.gTLDConformance = [
    ["icann_rdap_response_profile_1", "feb24-rp", "page=2"],
    ["icann_rdap_technical_implementation_guide_1", "feb24-tig", "page=2"],
];

/**
 * Regexp used as a first-pass check that an eventDate is a valid datetime.
 */
self.iso8601DateTimeRegexp = /^\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i;

/**
 * Required JCard properties.
 */
self.requiredJCardProperties = [
    {name: "VERSION", cardinality: "1", reference: "section-6.7.9"},
    {name: "FN", cardinality: "1*", reference: "section-6.2.1"},
];

/**
 * Human-readable description of the cardinality.
 */
self.requiredJCardPropertiesCardinality = {
    "1" : "exactly one",
    "1*": "at least one",
};

/**
 * Generate a URL given the current specification and a fragment.
 */
self.ref = function(fragment, alternateSpec=null) {
    const spec = alternateSpec ? alternateSpec : self.currentSpec();

    if (!spec) {
        return null;

    } else {
        return self.referenceBase
                + self.referenceURLs[spec]
                + (fragment ? "#" + fragment : "");

    }
};

/**
 * Get a domain/nameserver name from the last segment of the path of the given
 * URL.
 */
self.nameFromPath = function(url) {
    return decodeURI((new URL(url)).pathname.split("/").pop()).normalize("NFC");
};

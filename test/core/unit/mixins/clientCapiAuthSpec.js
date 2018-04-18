/*eslint-disable */
// TODO: All tests should be run with both isTrustedDevice = true and false
describe("The Client CAPI Auth Mixin", function() {
    var appId = "Fred's App";
    var userId = "93c83ec4-b508-4a60-8550-099f9c42ec1a";
    var identityToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImN0eSI6ImxheWVyLWVpdDt2PTEiLCJraWQiOiIyOWUzN2ZhZS02MDdlLTExZTQtYTQ2OS00MTBiMDAwMDAyZjgifQ.eyJpc3MiOiI4YmY1MTQ2MC02MDY5LTExZTQtODhkYi00MTBiMDAwMDAwZTYiLCJwcm4iOiI5M2M4M2VjNC1iNTA4LTRhNjAtODU1MC0wOTlmOWM0MmVjMWEiLCJpYXQiOjE0MTcwMjU0NTQsImV4cCI6MTQxODIzNTA1NCwibmNlIjoiRFZPVFZzcDk0ZU9lNUNzZDdmaWVlWFBvUXB3RDl5SjRpQ0EvVHJSMUVJT25BSEdTcE5Mcno0Yk9YbEN2VDVkWVdEdy9zU1EreVBkZmEydVlBekgrNmc9PSJ9.LlylqnfgK5nhn6KEsitJMsjfayvAJUfAb33wuoCaNChsiRXRtT4Ws_mYHlgwofVGIXKYrRf4be9Cw1qBKNmrxr0er5a8fxIN92kbL-DlRAAg32clfZ_MxOfblze0DHszvjWBrI7F-cqs3irRi5NbrSQxeLZIiGQdBCn8Qn5Zv9s";
    var cid1 = "layer:///conversations/test1",
        cid2 = "layer:///conversations/test2",
        cid3 = "layer:///conversations/test3",
        url1 = "https://huh.com/conversations/test1",
        url2 = "https://huh.com/conversations/test2",
        url3 = "https://huh.com/conversations/test3";
    var client, requests, userIdentity2;

    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
        jasmine.addCustomEqualityTester(mostRecentEqualityTest);
        jasmine.addCustomEqualityTester(responseTest);

        client = new Layer.Core.Client({
            appId: appId,
            url: "https://huh.com"
        }).on("challenge", function() {});
        //client.sessionToken = "sessionToken";

        client.user = userIdentity = new Layer.Core.Identity({
            id: "layer:///identities/93c83ec4-b508-4a60-8550-099f9c42ec1a",
            displayName: "Frodo",
            userId: "93c83ec4-b508-4a60-8550-099f9c42ec1a"
        });

        userIdentity2 = new Layer.Core.Identity({
            id: "layer:///identities/1",
            displayName: "UserIdentity",
            userId: '1'
        });

        client.isTrustedDevice = true;

        client._clientAuthenticated();

        spyOn(client.dbManager, "_loadSyncEventRelatedData").and.callFake(function(syncEvents, callback) {callback([]);});
        spyOn(client.dbManager, "getObjects").and.callFake(function(tableName, ids, callback) {
            callback([]);
        });
        spyOn(client.dbManager, "getObject").and.callFake(function(tableName, ids, callback) {
            callback(null);
        });
        client._clientReady();
    });

    afterEach(function() {
        client.destroy();
        jasmine.clock().uninstall();
        jasmine.Ajax.uninstall();
    });

    describe("The _restoreLastUser() method", function () {
        beforeEach(function() {
            client.isTrustedDevice = true;
            client._clientAuthenticated();
        });
       it("Should return null if the localStorage data is removed", function() {
           localStorage.removeItem(Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId);
           expect(client._restoreLastUser()).toBe(null);
       });

       it("Should return null if the localStorage data is corrupted", function() {
           localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = {};
           expect(client._restoreLastUser()).toBe(null);
       });

       it("Should return an Identity", function() {
           localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
               user: {
                    id: 'layer:///identities/FrodoTheDodo',
                    user_id: 'FrodoTheDodo',
                    display_name: 'Frodo is a Dodo',
                    avatar_url: 'https://frodo-the-dodo.com'
               }
           });

           var result = client._restoreLastUser();
           expect(result).toEqual(jasmine.any(Layer.Core.Identity));
           expect(result.userId).toEqual('FrodoTheDodo');
           expect(result.displayName).toEqual('Frodo is a Dodo');
           expect(result.avatarUrl).toEqual('https://frodo-the-dodo.com');
           expect(result.isMine).toBe(true);
       });
    });


    describe("The _restoreLastSession() method", function () {
        it("Should do nothing if persistence is disabled", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                userId: 'FrodoTheDodo',
                sessionToken: 'fred',
                expires: Date.now() + 10000000
            });
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client._restoreLastSession();

            // Posttest
            expect(client.sessionToken).toEqual('');
        });

        it("Should do nothing if no data", function () {
            // Setup
            localStorage.removeItem([Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]);
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);

            // Run
            client._restoreLastSession();

            // Posttest
            expect(client.sessionToken).toEqual('');
        });

        it("Should set the sessionToken if present and not expired", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                userId: 'FrodoTheDodo',
                sessionToken: 'fred',
                expires: Date.now() + 10000000
            });
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            client.__userId = 'FrodoTheDodo';

            // Run
            client._restoreLastSession();

            // Posttest
            expect(client.sessionToken).toEqual('fred');
        });

        it("Should not set the sessionToken if present and expired but should delete it", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                userId: 'FrodoTheDodo',
                sessionToken: 'fred',
                expires: Date.now() - 100
            });
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            client.__userId = 'FrodoTheDodo';

            // Run
            client._restoreLastSession();

            // Posttest
            expect(client.sessionToken).toEqual('');
            expect(localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]).toBe(undefined);
        });

        it("Should not set the sessionToken if present and persitence disabled", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                userId: 'FrodoTheDodo',
                sessionToken: 'fred'
            });
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);
            client.__userId = 'FrodoTheDodo';

            // Run
            client._restoreLastSession();

            // Posttest
            expect(client.sessionToken).toEqual('');
        });
    });

    describe("The _hasUserIdChanged() method", function () {
        it("Should find the useId for this appId and return false if it matches the input userId", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                user: {
                    user_id: 'FrodoTheDodo',
                    id: 'layer:///identities/FrodoTheDodo'
                },
                sessionToken: '',
                expires: Date.now() + 10000000
            });

            // Run
            expect(client._hasUserIdChanged('FrodoTheDodo')).toBe(false);
        });

        it("Should return true if there is no session data", function () {
            // Setup
            localStorage.removeItem([Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]);

            // Run
            expect(client._hasUserIdChanged('FrodoTheDodo')).toBe(true);
        });

        it("Should return true if the user object is missing from the session data", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                userId: 'FrodoTheDodo',
                sessionToken: '',
                expires: Date.now() + 10000000
            });

            // Run
            expect(client._hasUserIdChanged('FrodoTheDodo')).toBe(true);
        });

        it("Should return true if there is a change in userId from the session data", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                user: {
                    user_id: 'Samwise',
                    id: 'layer:///identities/FrodoTheDodo'
                },
                sessionToken: '',
                expires: Date.now() + 10000000
            });

            // Run
            expect(client._hasUserIdChanged('FrodoTheDodo')).toBe(true);
        });
    });


    describe("The connect() method", function () {
        beforeEach(function() {
            client.isReady = false;
            client.isAuthenticated = false;
        });
        it("Should require an appId", function() {
            expect(function() {
                client.appId = '';
                client.connect();
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.appIdMissing);
            expect(Layer.Core.LayerError.ErrorDictionary.appIdMissing.length > 0).toBe(true);
        });

        it("Should call _clearStoredData if not a trusted device", function () {
            // Setup
            client.isTrustedDevice = false;
            spyOn(client, "_clearStoredData");

            // Run
            client.connect("hey");

            // Posttest
            expect(client._clearStoredData).toHaveBeenCalledWith();
        });

        it("Should call _clearStoredData if a trusted device but no userId", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_clearStoredData");

            // Run
            client.connect();

            // Posttest
            expect(client._clearStoredData).toHaveBeenCalledWith();
        });

        it("Should call _clearStoredData if a trusted device with userId but persistedSessions disabled", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_clearStoredData");
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client.connect("hey");

            // Posttest
            expect(client._clearStoredData).toHaveBeenCalledWith();
        });

        it("Should call _clearStoredData if a trusted device with userId and persistedSessions enabled but userId has changed", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_clearStoredData");
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            spyOn(client, "_hasUserIdChanged").and.returnValue(true);

            // Run
            client.connect("hey");

            // Posttest
            expect(client._clearStoredData).toHaveBeenCalledWith();
        });

        it("Should not call _clearStoredData if a trusted device with userId and persistedSessions enabled and userId has not changed", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_clearStoredData");
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            spyOn(client, "_hasUserIdChanged").and.returnValue(false);

            // Run
            client.connect("hey");

            // Posttest
            expect(client._clearStoredData).not.toHaveBeenCalled();
        });

        it("Should call _restoreLastSession if its a trustedDevice and has a userId", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_restoreLastSession");

            // Run
            client.connect("hey");

            // Posttest
            expect(client._restoreLastSession).toHaveBeenCalledWith("hey");
        });

        it("Should call _restoreLastUser and set the user with the result", function() {
            spyOn(client, "_restoreLastUser").and.returnValue(userIdentity);
            client.user = null;
            client.isTrustedDevice = true;

            // Run
            client.connect('MyUserId');

            // Posttest
            expect(client.user).toBe(userIdentity);
            expect(client._restoreLastUser).toHaveBeenCalledWith();
        });

        it("Should set the user even if _restoreLastUser returns null", function() {
            spyOn(client, "_restoreLastUser").and.returnValue(null);
            client.user = null;

            // Run
            client.connect('MyUserId');

            // Posttest
            expect(client.user).toEqual(jasmine.any(Layer.Core.Identity));
            expect(client.user.toObject()).toEqual(jasmine.objectContaining({
                userId: 'MyUserId',
                id: 'layer:///identities/MyUserId',
                url: client.url + '/identities/MyUserId',
                displayName: ''
            }));
        });

        it("Should set the user even if _restoreLastUser returns null and input userId is null", function() {
            spyOn(client, "_restoreLastUser").and.returnValue(null);
            client.user = null;

            // Run
            client.connect();

            // Posttest
            expect(client.user).toEqual(jasmine.any(Layer.Core.Identity));
            expect(client.user.userId).toEqual('');
            expect(client.user.id).toEqual('');
            expect(client.user.url).toEqual('');
            expect(client.user.displayName).toEqual('');
        });


        it("Should not call _restoreLastUser if not isTrustedDevice", function() {
            // Setup
            spyOn(client, "_restoreLastUser");
            client.isTrustedDevice = false;

            // Run
            client.connect('MyUserId');

            // Posttest
            expect(client._restoreLastUser).not.toHaveBeenCalled();
        });

        it("Should set the user even if _restoreLastUser is not called", function() {
            // Setup
            spyOn(client, "_restoreLastUser");
            client.isTrustedDevice = false;
            client.user = null;

            // Run
            client.connect('MyUserId');

            // Posttest
            expect(client.user).toEqual(jasmine.any(Layer.Core.Identity));
            expect(client.user.userId).toEqual('MyUserId');
            expect(client.user.id).toEqual('layer:///identities/MyUserId');
        });

        it("Should request a nonce if there is no sessionToken", function () {
            // Pretest
            expect(client.sessionToken).toEqual("");

            // Run
            client.connect("FrodoTheDodo");
            requests.mostRecent().response({
                status: 200
            });

            // Posttest
            expect(requests.mostRecent()).toEqual({
                url: client.url + "/nonces",
                requestHeaders: {
                    "content-type": "application/json",
                    "accept": "application/vnd.layer+json; version=3.0"
                },
                method: "POST"
            });

        });

        it("Should call _connectionResponse with the nonce response", function () {
            // Setup
            spyOn(client, "_connectionResponse");

            // Pretest
            expect(client.sessionToken).toEqual("");

            // Run
            client.connect("FrodoTheDodo");
            requests.mostRecent().response({
                status: 200
            });

            // Posttest
            expect(client._connectionResponse).toHaveBeenCalled();
        });

        it("Should call _sessionTokenRestored if token is found", function () {
            // Setup
            client.sessionToken = "sessionToken";
            expect(client.sessionToken).toEqual("sessionToken");
            spyOn(client, "_sessionTokenRestored");
            var tmp = client._connect;
            client._connect = function () { };
            client._connect = tmp;

            // Run
            client.connect("FrodoTheDodo");

            // Posttest
            expect(client._sessionTokenRestored).toHaveBeenCalledWith();
        });

        it("Should setup the expected state", function() {
            client._lastChallengeTime = 10;
            expect(client._wantsToBeAuthenticated).toEqual(false);
            client.isConnected = true;
            client.connect();
            expect(client._lastChallengeTime).toEqual(0);
            expect(client._wantsToBeAuthenticated).toEqual(true);
            expect(client.isConnected).toEqual(false);
        });

        it("Should do nothing if already authenticated", function() {
            client.isAuthenticated = true;
            spyOn(client, "_authComplete");
            client.connect();
            expect(client._authComplete).not.toHaveBeenCalled();
            jasmine.clock().tick(2);
            expect(client._authComplete).not.toHaveBeenCalled();

            // should still be chainable
            expect(client.connect()).toBe(client);
        });
    });

    describe("The connectWithSession() method", function () {
        beforeEach(function() {
            client.isConnected = client.isReady = client.isAuthenticated =  client._wantsToBeAuthenticated = false;
        });
        it("Should require an appId", function() {
            expect(function() {
                client.appId = '';
                client.connectWithSession('Frodo', 'FrodoSession');
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.appIdMissing);
            expect(Layer.Core.LayerError.ErrorDictionary.appIdMissing.length > 0).toBe(true);
        });

        it("Should throw errors if no userId or sessionToken", function () {
            expect(function () {
                client.connectWithSession('', 'sessionToken');
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.sessionAndUserRequired);

            expect(function () {
                client.connectWithSession('userId', '');
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.sessionAndUserRequired);
        });

        it("Should call _restoreLastUser and set the user with the result", function() {
            spyOn(client, "_restoreLastUser").and.returnValue(userIdentity);
            client.user = null;
            client.isTrustedDevice = true;

            // Run
            client.connectWithSession('MyUserId', 'MySession');

            // Posttest
            expect(client.user).toBe(userIdentity);
            expect(client._restoreLastUser).toHaveBeenCalledWith();
        });

        it("Should set the user even if _restoreLastUser returns null", function() {
            spyOn(client, "_restoreLastUser").and.returnValue(null);
            client.user = null;
            client.isTrustedDevice = true;

            // Run
            client.connectWithSession('MyUserId', 'MySession');

            // Posttest
            expect(client.user).toEqual(jasmine.any(Layer.Core.Identity));
            expect(client.user.toObject()).toEqual(jasmine.objectContaining({
                userId: 'MyUserId',
                id: 'layer:///identities/MyUserId',
                url: client.url + '/identities/MyUserId',
                displayName: ''
            }));
        });

        it("Should not call _restoreLastUser if not isTrustedDevice", function() {
            // Setup
            spyOn(client, "_restoreLastUser");
            client.isTrustedDevice = false;

            // Run
            client.connectWithSession('MyUserId', 'MySession');

            // Posttest
            expect(client._restoreLastUser).not.toHaveBeenCalled();
        });

        it("Should set the user even if _restoreLastUser is not called", function() {
            // Setup
            spyOn(client, "_restoreLastUser");
            client.isTrustedDevice = false;
            client.user = null;

            // Run
            client.connectWithSession('MyUserId', 'MySession');

            // Posttest
            expect(client.user).toEqual(jasmine.any(Layer.Core.Identity));
            expect(client.user.userId).toEqual('MyUserId');
            expect(client.user.id).toEqual('layer:///identities/MyUserId');
        });


        it("Should call _clearStoredData if not a trusted device", function () {
            // Setup
            client.isTrustedDevice = false;
            spyOn(client, "_clearStoredData");

            // Run
            client.connectWithSession("hey", "ho");

            // Posttest
            expect(client._clearStoredData).toHaveBeenCalledWith();
        });

        it("Should call _clearStoredData if a trusted device with userId but persistedSessions disabled", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_clearStoredData");
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client.connectWithSession('userId', 'sessionToken');

            // Posttest
            expect(client._clearStoredData).toHaveBeenCalledWith();
        });

        it("Should call _clearStoredData if a trusted device with userId and persistedSessions enabled but userId has changed", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_clearStoredData");
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            spyOn(client, "_hasUserIdChanged").and.returnValue(true);

            // Run
            client.connectWithSession('userId', 'sessionToken');

            // Posttest
            expect(client._clearStoredData).toHaveBeenCalledWith();
        });

        it("Should not call _clearStoredData if a trusted device with userId and persistedSessions enabled and userId has not changed", function () {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_clearStoredData");
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            spyOn(client, "_hasUserIdChanged").and.returnValue(false);

            // Run
            client.connectWithSession('userId', 'sessionToken');

            // Posttest
            expect(client._clearStoredData).not.toHaveBeenCalled();
        });


        it("Should call _authComplete asynchronously", function () {
            // Setup
            spyOn(client, "_authComplete");

            // Run
            client.connectWithSession('userId', 'sessionToken');
            expect(client._authComplete).not.toHaveBeenCalled();
            jasmine.clock().tick(2);

            // Posttest
            expect(client._authComplete).toHaveBeenCalledWith({ session_token: 'sessionToken' }, false);
        });

        it("Should chain", function () {
            expect(client.connectWithSession('userId', 'sessionToken')).toBe(client);
        });

        it("Should setup the expected state", function() {
            client._lastChallengeTime = 10;
            expect(client._wantsToBeAuthenticated).toEqual(false);
            client.connectWithSession('userId', 'sessionToken');
            expect(client._lastChallengeTime).toEqual(0);
            expect(client._wantsToBeAuthenticated).toEqual(true);
        });

        it("Should allow reauthentication", function() {
            client.isReady = client.isAuthenticated = false;
            client._wantsToBeAuthenticated = client.isConnected = true;
            client.sessionToken = "Fred";
            client.connectWithSession('userId', 'sessionToken');
            jasmine.clock().tick(10);

            expect(client.sessionToken).toEqual('sessionToken');
            expect(client.isAuthenticated).toBe(true);
        });

        it("Should do nothing if already authenticated", function() {
            client.isAuthenticated = true;
            spyOn(client, "_authComplete");
            client.connectWithSession('userId', 'sessionToken');
            expect(client._authComplete).not.toHaveBeenCalled();
            jasmine.clock().tick(2);
            expect(client._authComplete).not.toHaveBeenCalled();

            // should still be chainable
            expect(client.connectWithSession('userId', 'sessionToken')).toBe(client);
        });
    });

    describe("The _connectionResponse() method", function () {
        it("Should call _connectionError if success is false", function () {
            spyOn(client, "_connectionError");
            client._connectionResponse({
                success: false,
                data: "Doh!"
            });
            expect(client._connectionError).toHaveBeenCalledWith("Doh!");
        });

        it("Should call _connectionComplete if success is true", function () {
            spyOn(client, "_connectionComplete");
            client._connectionResponse({ success: true, data: "Doh!" });
            expect(client._connectionComplete).toHaveBeenCalledWith("Doh!");
        });
    });

    describe("The _connectionError() method", function () {
        it("Should trigger connected-error", function () {
            // Setup
            var response = new Layer.Core.LayerError(responses.error1);
            spyOn(client, "trigger");

            // Run
            client._connectionError(response);

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("connected-error", { error: response })
        });
    });


    describe("The _connectionComplete() method", function () {
        it("Should trigger 'connected'", function () {
            // Setup
            spyOn(client, "trigger");

            // Run
            client._connectionResponse({
                status: 200,
                success: true,
                data: { nonce: "mynonce" }
            });

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("connected");
        });

        it("Should call _authenticate", function () {
            // Setup
            spyOn(client, "_authenticate");

            // Run
            client._connectionResponse({
                status: 200,
                success: true,
                data: { nonce: "mynonce" }
            });

            // Posttest
            expect(client._authenticate).toHaveBeenCalledWith("mynonce");

        });

        it("Should set isConnected to true", function () {
            // Pretest
            expect(client.isConnected).toEqual(false);

            // Run
            client._connectionResponse({
                status: 200,
                success: true,
                data: { nonce: "mynonce" }
            });

            // Posttest
            expect(client.isConnected).toEqual(true);
        });
    });

    describe("The _authenticate() method", function () {
        it("Should do nothing if not provided with a nonce", function () {
            spyOn(client, "trigger");
            client._authenticate("");
            expect(client.trigger).not.toHaveBeenCalled();
        });

        it("Should provide the challenge event", function () {
            client.on('challenge', function() {});
            spyOn(client, "trigger");
            client._authenticate("mynonce");

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("challenge", {
                nonce: "mynonce",
                callback: jasmine.any(Function)
            });
        });

        it("Should setup the _lastChallengeTime property", function() {
            client.on('challenge', function() {});
            client._lastChallengeTime = 0;
            client._authenticate("");
            expect(client._lastChallengeTime).not.toEqual(0);
        });

        it("Should throw an error if no challenge event handler", function() {
            client.off('challenge', null, null);
            expect(function() {
                client._authenticate("mynonce");
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.eventHandlerRequired + ' \'challenge\'');
        });
    });

    describe("The answerAuthenticationChallenge() method", function () {
        it("Should fail without an identityToken", function () {
            expect(function () {
                client.answerAuthenticationChallenge();
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.identityTokenMissing);
            expect(Layer.Core.LayerError.ErrorDictionary.identityTokenMissing.length > 0).toBe(true);
        });

        it("Should accept a userId if it matches the current userId", function () {
            // Setup
            client.user.userId = "93c83ec4-b508-4a60-8550-099f9c42ec1a";

            // Run
            client.answerAuthenticationChallenge(identityToken);

            // Posttest
            expect(client.user.userId).toEqual("93c83ec4-b508-4a60-8550-099f9c42ec1a");
        });

        it("Should accept a userId if it current userId is empty", function () {
            // Setup
            client.user.__userId = '';

            // Run
            client.answerAuthenticationChallenge(identityToken);

            // Posttest
            expect(client.user.userId).toEqual("93c83ec4-b508-4a60-8550-099f9c42ec1a");
        });

        it("Should reject a userId if it fails to match the current userId", function () {
            // Setup
            client.user.__userId = "FrodoTheDodo";

            // Run
            expect(function() {
                client.answerAuthenticationChallenge(identityToken);
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.invalidUserIdChange)
            expect(Layer.Core.LayerError.ErrorDictionary.invalidUserIdChange).toEqual(jasmine.any(String));
        });

        it("Should call _setUserId", function () {
            // Pretest
            spyOn(client.user, "_setUserId");
            client.user.__userId = '';

            // Run
            client.answerAuthenticationChallenge(identityToken);

            // Posttest
            expect(client.user._setUserId).toHaveBeenCalledWith("93c83ec4-b508-4a60-8550-099f9c42ec1a");
        });

        // Will need an Identity token that contains these...
        xit("Should update displayName and avatarUrl", function () {
            // Pretest
            spyOn(client.user, "_setUserId");
            client.user.__userId = '';

            // Run
            client.answerAuthenticationChallenge(identityToken);

            // Posttest
            expect(client.user.displayName).toEqual('Test User');
            expect(client.user.avatarUrl).toEqual('https://google.com/InvalidImage.png');
        });


        it("Should set a userId with a url encoded url that is not base64", function () {
            // Pretest
            spyOn(client.user, "_setUserId");
            client.user.__userId = '';
            client.user.id = '';

            // Run
            client.answerAuthenticationChallenge("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImN0eSI6ImxheWVyLWVpdDt2PTEiLCJraWQiOiI5NGZkYzM2MC1iZWU5LTExZTUtOWMwNy0xMzdlMDAwMDAwYjAifQ.eyJpc3MiOiI1OGMxN2Y4NC1iYjFjLTExZTUtOGRiOC0wMTA0MDAwMDAwYjAiLCJwcm4iOiJIZXlIbzAwMTgzOTk2ODU4MzU1NDE5NjgiLCJpYXQiOjE0NjE3MDMzOTIsImV4cCI6MTQ2MjkxMjk5MiwibmNlIjoic0FWcERhNlM2VV9aSk9ISzVBQXRXaHRVb3ZsalpsT0U4eDV6LWdEcUdZMDVrWjk4VkdRaVlEQVJPeU9FVll2Yl9IYmtoNG9tQWU2ZXlZM0lvczlOSUEiLCJkaXNwbGF5X25hbWUiOiJIZXlIbyIsImF2YXRhcl91cmwiOiJodHRwOi8vZ29vZ2xlLmNvbS8_cT1oZXlobyJ9.JZVjR92thQR1J4p47vV7elsmTQOC3qGP_ofDc0-LJKCBvCOL0wi1I2NTvfXmiB_M0M6DjiHuPZA7-gNQY8-L3NqZs4-UmamkgK3oV3HeplDcvye7a23QfJgHDoyuluNWKERb3j8ho1UdNqihynqJjM7iYaYQfWQRgSRhYbwLAjQ");

            // Posttest
            expect(client.user._setUserId).toHaveBeenCalledWith("HeyHo0018399685835541968");
        });

        it("Should request a sessionToken", function () {
            // Setup
            spyOn(client, "xhr");

            // Run
            client.answerAuthenticationChallenge(identityToken);

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith({
                url: "/sessions",
                method: "POST",
                sync: false,
                data: {
                    "identity_token": identityToken,
                    "app_id": client.appId
                }
            }, jasmine.any(Function));
        });

        it("Should call _authResponse on completion", function () {
            // Setup
            spyOn(client, "_authResponse");
            var response = {
                status: 200,
                responseText: JSON.stringify({ doh: "a deer" })
            };

            // Run
            client.answerAuthenticationChallenge(identityToken);
            requests.mostRecent().response(response);

            // Posttest
            expect(client._authResponse).toHaveBeenCalledWith(jasmine.objectContaining({
                status: 200,
                success: true
            }), identityToken);
        });
    });

    describe("The _authResponse() method", function () {
        it("Should call _authError if success is false", function () {
            spyOn(client, "_authError");
            client._authResponse({ success: false, data: "Doh!" }, identityToken);
            expect(client._authError).toHaveBeenCalledWith("Doh!", identityToken);
        });

        it("Should call _authComplete if success is true", function () {
            spyOn(client, "_authComplete");
            client._authResponse({ success: true, data: "Doh!" }, identityToken);
            expect(client._authComplete).toHaveBeenCalledWith("Doh!", false);
        });
    });

    describe("The _authComplete() method", function () {

        it("Should set the sessionToken", function () {
            // Pretest
            expect(client.sessionToken).toEqual("");

            // Run
            client._authComplete({
                session_token: "sessionToken"
            });

            // Posttest
            expect(client.sessionToken).toEqual("sessionToken");
        });

        it("Should call _clientAuthenticated", function () {
            spyOn(client, "_clientAuthenticated");

            // Run
            client._authComplete({
                session_token: "sessionToken"
            });

            // Posttest
            expect(client._clientAuthenticated).toHaveBeenCalledWith();
        });

        it("Should write localStorage if _isPersistedSessionsDisabled is false and fromPersistence is false", function () {
            // Setup
            localStorage.removeItem([Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]);
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            client.user._setUserId("FrodoTheDodo");
            client.user.displayName = 'Frodo the Dodo';
            client.user.isFullIdentity = false;

            // Run
            client._authComplete({
                session_token: "sessionToken"
            }, false);

            // Posttest
            expect(JSON.parse(localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId])).toEqual({
                sessionToken: "sessionToken",
                user: jasmine.objectContaining({
                    user_id: "FrodoTheDodo",
                    id: "layer:///identities/FrodoTheDodo",
                    url: client.url + "/identities/FrodoTheDodo",
                    display_name: 'Frodo the Dodo'
                }),
                expires: jasmine.any(Number)
            });
        });

        it("Should ignore localStorage if _isPersistedSessionsDisabled is true", function () {
            // Setup
            localStorage.removeItem([Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]);
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);
            client.__userId = "FrodoTheDodo";

            // Run
            client._authComplete({
                session_token: "sessionToken"
            }, false);

            // Posttest
            expect(localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]).toBe(undefined);
        });

        it("Should ignore localStorage if fromPersistence is true", function () {
            // Setup
            localStorage.removeItem([Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]);
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            client.__userId = "FrodoTheDodo";

            // Run
            client._authComplete({
                session_token: "sessionToken"
            }, true);

            // Posttest
            expect(localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]).toBe(undefined);
        });

    });

    describe("The _clientAuthenticated() method", function () {
        beforeEach(function() {
            client.isConnected =  client._wantsToBeAuthenticated = true;
            client.isReady = client.isAuthenticated = false;
        });

        it("Should set isAuthenticated", function () {
            // Pretest
            expect(client.isAuthenticated).toEqual(false);

            // Run
            client._clientAuthenticated();

            // Posttest
            expect(client.isAuthenticated).toEqual(true);

        });

        it("Should trigger 'authenticated'", function () {
            // Setup
            spyOn(client, "trigger");

            // Run
            client._clientAuthenticated();

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith("authenticated");
        });

        it("Should call _clientReadyCheck but not _clientReady if not isTrustedDevice", function () {
            // Setup
            spyOn(client, "_clientReadyCheck");
            spyOn(client, "_clientReady");

            // Run
            client._clientAuthenticated();

            // Posttest
            expect(client._clientReadyCheck).toHaveBeenCalled();
            expect(client._clientReady).not.toHaveBeenCalled();
        });



        it("Should call _loadUser if isTrustedDevice is true", function() {
            // Setup
            client.isTrustedDevice = true;
            spyOn(client, "_loadUser");

            // Run
            client._clientAuthenticated();
            client.dbManager.isOpen = true;
            client.dbManager.trigger('open');

            // Posttest
            expect(client._loadUser).toHaveBeenCalledWith();
        });

        it("Should call _loadUser if isTrustedDevice is false", function() {
            // Setup
            client.isTrustedDevice = false;
            spyOn(client, "_loadUser");

            // Run
            client._clientAuthenticated();

            // Posttest
            expect(client._loadUser).toHaveBeenCalledWith();
        });
    });

    describe("The _authError() method", function () {
        it("Should trigger an error event", function () {
            // Setup
            spyOn(client, "trigger");
            var error = new Layer.Core.LayerError(responses.error1);

            // Run
            client._authError(error, identityToken);

            // Posttest
            expect(client.trigger).toHaveBeenCalledWith(
                "authenticated-error", {
                    error: error
                });
        });
    });


    describe("The _sessionTokenRestored() method", function () {

        it("Should trigger connected", function () {
            spyOn(client, "trigger");
            client._sessionTokenRestored([]);
            expect(client.trigger).toHaveBeenCalledWith("connected");
        });

        it("Should set isConnected", function () {
            expect(client.isConnected).toEqual(false);
            client._sessionTokenRestored([]);
            expect(client.isConnected).toEqual(true);
        });

        it("Should call _clientAuthenticated", function () {
            spyOn(client, "_clientAuthenticated");
            client._sessionTokenRestored([]);
            expect(client._clientAuthenticated).toHaveBeenCalledWith();
        });
    });

    describe("The logout() method", function () {
        it("Should not xhr if not authenticated", function () {
            // Setup
            client.isAuthenticated = false;
            spyOn(client, "xhr");

            // Run
            client.logout();

            // Posttest
            expect(client.xhr).not.toHaveBeenCalled();
        });

        it("Should call _resetSession even if not authenticated", function () {
            // Setup
            client.isAuthenticated = false;
            spyOn(client, "_resetSession");

            // Run
            client.logout();

            // Posttest
            expect(client._resetSession).toHaveBeenCalled();
        });

        it("Should call xhr DELETE if authenticated", function () {
            // Setup
            client.isAuthenticated = true;
            client.sessionToken = "sessionToken";
            spyOn(client, "xhr");

            // Run
            client.logout();

            // Posttest
            expect(client.xhr).toHaveBeenCalledWith({
                method: "DELETE",
                url: '/sessions/sessionToken',
                sync: false
            }, jasmine.any(Function));
        });


        it("Should call _resetSession", function () {
            // Setup
            client.isAuthenticated = true;
            spyOn(client, "_resetSession");
            spyOn(client, "xhr");

            // Run
            client.logout();

            // Posttest
            expect(client._resetSession).toHaveBeenCalledWith();
        });

        it("Should call _clearStoredData", function () {
            // Setup
            spyOn(client, "_clearStoredData").and.callFake(function(callback) {callback();});
            var spy = jasmine.createSpy('callback');

            // Run
            client.logout(spy);

            // POsttest
            expect(client._clearStoredData).toHaveBeenCalledWith(jasmine.any(Function));
            expect(spy).not.toHaveBeenCalled();
            requests.mostRecent().response({
                status: 200
            });
            expect(spy).toHaveBeenCalled();
        });

        it("Should reset _wantsToBeAuthenticated", function() {
            client._wantsToBeAuthenticated = true;
            client.logout();
            expect(client._wantsToBeAuthenticated).toBe(false);

        });
    });

    describe("The _resetSession() method", function () {


        it("Should clear the sessionToken", function () {
            client.sessionToken = "sessionToken";
            client._resetSession();
            expect(client.sessionToken).toEqual("");
        });

        it("Should clear isConnected", function () {
            client.isConnected = true;
            client._resetSession();
            expect(client.isConnected).toEqual(false);
        });

        it("Should clear isAuthenticated", function () {
            client.isAuthenticated = true;
            client._resetSession();
            expect(client.isAuthenticated).toEqual(false);
        });

        it("Should clear isReady", function () {
            client.isReady = true;
            client._resetSession();
            expect(client.isReady).toEqual(false);
        });

        it("Should trigger authenticated-expired", function () {
            spyOn(client, "trigger");
            client._resetSession();
            expect(client.trigger).toHaveBeenCalledWith("deauthenticated");
        });


    });

    describe("The appId property", function() {
        it("Should not be possible to change appIds while connected", function () {
            client.appId = "appId1";
            client.isConnected = true;
            expect(function () {
                client.appId = "appId2";
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.cantChangeIfConnected);
            expect(Layer.Core.LayerError.ErrorDictionary.cantChangeIfConnected.length > 0).toBe(true);
        });
    });

    describe("The _clearStoredData() method", function () {
        it("Should clear localStorage", function () {
            // Setup
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
                userId: 'FrodoTheDodo',
                sessionToken: 'fred',
                expires: Date.now() + 10000000
            });

            // Run
            client._clearStoredData();

            // Posttest
            expect(localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]).toBe(undefined);
        });
    });

    describe("The _loadUser() method", function() {
        beforeEach(function() {
            localStorage.removeItem(Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId);
            spyOn(client, "_clientReady");
        });

        it("Should directly call _clientReady if isFullIdentity is loaded", function() {
            // Setup
            spyOn(client.user, "_load");
            client.user.isFullIdentity = true;

            // Run
            client._loadUser();

            // Posttest
            expect(client._clientReady).toHaveBeenCalledWith();
            expect(client.user._load).not.toHaveBeenCalled();
        });

        it("Should call user._load() if isFullIdentity is false", function() {
            // Setup
            spyOn(client.user, "_load");
            client.user.isFullIdentity = false;

            // Run
            client._loadUser();

            // Posttest
            expect(client._clientReady).not.toHaveBeenCalled();
            expect(client.user._load).toHaveBeenCalledWith();
        });

        it("Should write to persistence on identities:loaded if persisted sessions is enabled", function() {
            // Setup
            client.user.isFullIdentity = false;
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(false);
            localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId] = JSON.stringify({
               user: {
                    id: 'layer:///identities/FrodoTheDodo',
                    user_id: 'FrodoTheDodo',
                    display_name: 'Frodo is a Dodo',
                    avatar_url: 'https://frodo-the-dodo.com'
               }
           });

            // Run
            client._loadUser();
            client.user.__userId = 'FrodoAlaModo';
            client.user.isFullIdentity = true;
            client.user.syncState = Layer.Constants.SYNC_STATE.SYNCED;
            client.user.trigger('identities:loaded');

            // Posttest
            expect(JSON.parse(localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]).user.user_id).toEqual('FrodoAlaModo');
        });

        it("Should not write to persistence on identities:loaded if persisted sessions is disabled", function() {
            // Setup
            client.user.isFullIdentity = false;
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client._loadUser();
            client.user.__userId = 'FrodoAlaModo';
            client.user.isFullIdentity = true;
            client.user.trigger('identities:loaded');

            // Posttest
            expect(localStorage[Layer.Constants.LOCALSTORAGE_KEYS.SESSIONDATA + client.appId]).toEqual(undefined);;
        });

        it("Should call _clientReady on identities:loaded", function() {
            // Setup
            client.user.isFullIdentity = false;
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client._loadUser();
            client.user.trigger('identities:loaded');

            // Posttest
            expect(client._clientReady).toHaveBeenCalledWith();
        });

        it("Should call _clientReady on identities:loaded-error", function() {
            // Setup
            client.user.isFullIdentity = false;
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client._loadUser();
            client.user.trigger('identities:loaded-error', {error: new Layer.Core.LayerError({})});

            // Posttest
            expect(client._clientReady).toHaveBeenCalledWith();
        });

        it("Should set user.displayName if needed on identities:loaded-error", function() {
            // Setup
            client.user.isFullIdentity = false;
            client.user.displayName = '';
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client._loadUser();
            client.user.trigger('identities:loaded-error', {error: new Layer.Core.LayerError({})});

            // Posttest
            expect(client.user.displayName).toEqual('You');
        });

        it("Should not set user.displayName if not needed on identities:loaded-error", function() {
            // Setup
            client.user.isFullIdentity = false;
            client.user.displayName = 'Me';
            spyOn(client, "_isPersistedSessionsDisabled").and.returnValue(true);

            // Run
            client._loadUser();
            client.user.trigger('identities:loaded-error', {error: new Layer.Core.LayerError({})});

            // Posttest
            expect(client.user.displayName).toEqual('Me');
        });

    });

    describe("Property Adjuster Methods", function () {


        it("Should not be possible to change user instances once connected", function () {
            client.isConnected = true;
            expect(function () {
                client.user = new Layer.Core.Identity({
                });
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.cantChangeIfConnected);
        });

        it("Should not be possible to change userIds", function () {
            expect(client.user.userId.length > 0).toBe(true);
            expect(function () {
                client.user.userId = "userId2";
            }).toThrowError(Layer.Core.LayerError.ErrorDictionary.cantChangeUserId);
        });
    });
});

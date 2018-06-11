cordova.define("cordova-plugin-yyim.YYIM", function(require, exports, module) {

        var exec = require('cordova/exec');

        var invoker = {};

        invoker.initIMSdk = function(successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "initIMSdk", [])
        };

        invoker.login = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "login", [json])
        };

        invoker.logout = function(successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "logout", [json])
        };

        invoker.fetchMessages = function(successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "fetchMessages", [])
        };

        invoker.getSettings = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "getSettings", [json])
        };

        invoker.updateSettings = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "updateSettings", [json])
        };

        invoker.setStickTop = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "setStickTop", [json])
        };

        invoker.setNoDisturb = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "setNoDisturb", [json])
        };

        invoker.deleteMessage = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "deleteMessage", [json])
        };

        invoker.deleteChat = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "deleteChat", [json])
        };

        invoker.chat = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "chat", [json])
        };

        invoker.updateMessageReaded = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "updateMessageReaded", [json])
        };

        invoker.getRecentContacts = function(successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "getRecentContacts", [])
        };

        invoker.updateUserInfo = function(json, successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "updateUserInfo", [json])
        };

        invoker.registerMessageObserver = function(successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "registerMessageObserver", [])
        };

        invoker.forwardMessage = function(json,successCallback, errorCallback) {
            exec(successCallback, errorCallback, "YYIM", "forwardMessage", [json])
        };

        module.exports = invoker;


});

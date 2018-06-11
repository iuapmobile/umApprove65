/**
 * Created by lwz on 2016/10/21.
 */
var QYZone = {
    createNewBridge: function (initparam) {
        //定义对象
        var Bridge = function () {
            // 调用企业空间原生能力
            this.callNativeApp = function(param, callback) {
                connectWebViewJavascriptBridge(param, callback);
            };

            //是否启用WPS
            this.isInstallWPS = function (param, callback) {
                connectWebViewJavascriptBridge(param, callback);
            };

            //编辑WPS
            this.editWPS = function (param, callback) {
                connectWebViewJavascriptBridge(param, callback);
            };

            var connectWebViewJavascriptBridge = function (param, callback) {
                if (window.WebViewJavascriptBridge) {
                    try {
                        window.WebViewJavascriptBridge.init(function (message, responseCallback) {
                        });
                    } catch (e) {
                    }
                    window.WebViewJavascriptBridge.send(param, callback);
                } else {
                    document.addEventListener('WebViewJavascriptBridgeReady', function () {
                        try {
                            WebViewJavascriptBridge.init(function (message, responseCallback) {
                            });
                        } catch (e) {
                        }
                        WebViewJavascriptBridge.send(param, callback);
                    }, false)
                }
            };
        };
        return new Bridge();
    }
};
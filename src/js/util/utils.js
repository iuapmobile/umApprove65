/**
 * Created by lwz on 2016/8/22.
 */
define(function() {
    return {
        ua: window.navigator.userAgent,
        getContextPath: getContextPath,
        getURLparams: getURLparams,
        isWeiXin: isWeiXin,
        weixinHideShare: weixinHideShare,
        isAndroid: isAndroid,
        isiOS: isiOS,
        getClient: getClient,
        getSuffix: getSuffix
    };
    /**
     * @description 获取当前路径的context path
     * @returns {string}
     */
    function getContextPath() {
        var origin = location.origin;
        var pathname = location.pathname;
        //var projectname = pathname.substr(0, pathname.indexOf('/', 1));
        var projectname = pathname.substr(0, pathname.indexOf('/', 0));
        return origin + projectname;
    }

    /**
     * @description 将查询字符串转换为键值对
     * @returns {{}}
     */
    function getURLparams () {
        var o = {};
        if (location.search) {
            var search_params = location.search.substr(1).split('&');
            if (search_params) {
                $.each(search_params, function (i) {
                    o[this.split('=')[0]] = decodeURIComponent(this.split('=')[1]);
                });
            }
        }
        return o;
    }

    /**
     * @description 判断是否是微信
     * @returns {boolean} true 是微信  false 不是微信
     */
    function isWeiXin() {
        return /MicroMessenger/i.test(this.ua);
    }

    /**
     * @description 微信禁止分享
     */
    function weixinHideShare(){
        function onBridgeReady(){
            WeixinJSBridge.call('hideOptionMenu');
        }

        if (typeof WeixinJSBridge == "undefined"){
            if( document.addEventListener ){
                document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
            }else if (document.attachEvent){
                document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
                document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
            }
        }else{
            onBridgeReady();
        }
    }

    /**
     * @description 判断是否是iOS
     * @returns {boolean} true 是iOS  false 不是iOS
     */
    function isiOS() {
        return !!this.ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
    }

    /**
     * @description 判断是否是Android
     * @returns {boolean} true 是Android  false 不是Android
     */
    function isAndroid() {
        return this.ua.indexOf('Android') > -1 || this.ua.indexOf('Linux') > -1;
    }

    /**
     * @description 得到当前浏览器的标识
     * @returns {string} wecaht 微信  androiod 安卓  ios iOS  other 其他
     */
    function getClient() {
        return isWeiXin() ? 'wechat' : (isAndroid() ? 'android' : (isiOS() ? 'ios' : 'other'));
    }

    /**
     * @description 修改文档标题
     * @params {string} title 文档标题
     */
    function modifyTitle(title) {
        document.title = title;
        var iframe = document.createElement('iframe'),
            body = document.body || document.getElementsByTagName('body')[0];
        iframe.src = '/favicon.ico';
        iframe.style.cssText = "border:none;width:0px;height:0px;";
        function loadEventCb () {
            setTimeout(function() {
                iframe.removeEventListener('load', loadEventCb);
                body.removeChild(iframe);
            }, 0);
        }
        iframe.addEventListener('load', loadEventCb);
        body.appendChild(iframe);
    }

    /**
     * @description 获取文件名后缀
     * @param str 文件名
     * @returns {string} 文件后缀  null，表示没有后缀
     */
    function getSuffix(str) {
        if(!str) return null;
        var pointPos = str.lastIndexOf('.'),
            suffix = '';
        if(pointPos < 0) return null;
        suffix = str.substring(pointPos + 1);
        return suffix;
    }
});
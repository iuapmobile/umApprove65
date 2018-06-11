define(["zepto", "iscroll", "dialog", "util/utils"], function ($, isc, dialog, utils) {
    var paramUser = JSON.parse(window.sessionStorage.paramUser);
    var paramData = getURLparams();
    var _iscroll;
    var alreadyInstallWPS;

    // 双良--移动审批迁移到PC端口 需要动态改变字体大小颜色 ;
    if( /Android|webOS|iPhone|iPod|BlackBerry|micromessenger/i.test(navigator.userAgent) ) {
    } else {
        try{
            $("body").append('<div class="shuangliangGoBackButton">后退</div>');
            $("body").on("click",".shuangliangGoBackButton",function(){
                history.go(-1)
            })
        }catch(error){}
    }
    
    var _util = {
        getSystem: function() {
            if(navigator.userAgent.indexOf('QYZone') > -1) { // 企业空间
                return 'QYZone';
            }
            return paramUser.system;
        },

        isNativeApp: function() {
            return (_util.getSystem() == 'qyj') || (_util.getSystem() == 'QYZone'); // 企业+ || 企业空间
        },

        /**
         * @description 判断是否安装了wps
         */
        isAlreadyInstallWPS: function() {
            $('#loding').show();
            var bridge;
            if(_util.getSystem() == 'qyj') {
                bridge = QYJ.createNewBridge();
                bridge.isInstallWPS({}, function (result) {
                    $('#loding').hide();
                    if (result.flag == "0") {
                        alreadyInstallWPS = result.result.alreadyInstallWPS;
                    }
                    _chart.initBindEvent();
                });
            } else if(_util.getSystem() == 'QYZone') {
                bridge = QYZone.createNewBridge();
                bridge.isInstallWPS(JSON.stringify({'function': 'isAlreadyInstallWPS'}), function(result) {
                    $('#loding').hide();
                    if(typeof result === 'string') {
                        result = JSON.parse(result);
                    }
                    if(result.error_code == '0') {
                        if(result.data && result.data.isAlreadyInstallWps == '1') {
                            alreadyInstallWPS = 'YES';
                        }
                    }
                    _chart.initBindEvent();
                });
            }
        },

        /**
         * @description 将形如 123 KB 的文件大小表示为字节标识
         * @param {String} filesize 形如123 KB 的文件大小表示
         * @returns {*} 字节表示的文件大小
         */
        fileSize2Bytes: function (filesize) {
            var result = /^\s*(\d+(?:\.\d+)?)\s*([kmgt]?b)\s*$/i.exec(filesize);
            if (result && result[2]) {
                switch (result[2].toLowerCase()) {
                    case 'b':
                        return result[1];
                        break;
                    case 'kb':
                        return result[1] * 1024;
                        break;
                    case 'mb':
                        return result[1] * 1024 * 1024;
                        break;
                    case 'gb':
                        return result[1] * 1024 * 1024 * 1024;
                        break;
                    case 'tb':
                        return result[1] * 1024 * 1024 * 1024 * 1024;
                        break;
                    default:
                        return filesize;
                        break;
                }
            } else {
                return filesize;
            }
        }
    };

    var _chart = {
        /**
         * 报错时提示
         */
        show_error: function (message) {
            var window_height = document.documentElement.clientHeight;
            var _top = (window_height) * 0.33;
            var error_data = $('<div class="error-none" style="padding-top:' + _top + 'px;">'
                + '<table width="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $("#pictrue").html("").append(error_data);
            //$(".batch_mode").css("display","none");
        },

        /**
         *初始化
         */
        init: function () {
            alreadyInstallWPS = "NO";
            _chart.lightAppMultilingual();
            if (isWeiXin()) {
                _chart.weixinHideShare();//微信禁止分享
            }
            //_chart.initHeightStyle();
            _chart.getContent();//获取正文内容
            if(_util.isNativeApp()) {
                _util.isAlreadyInstallWPS();
            } else {
                _chart.initBindEvent();
            }
        },
        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {
            //首先设置title
            var $body = $('body');
            document.title = eval("OAbillContentLang." + paramUser.lang + ".pageTitle");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);
            //然后设置页面显示的汉字
            for (var i in eval("OAbillContentLang." + paramUser.lang + ".pageContent")) {
                //i即属性名字ok,close
                console.log("key===" + i + ",value==" + eval("OAbillContentLang." + paramUser.lang + ".pageContent." + i));
                $("." + i).html(eval("OAbillContentLang." + paramUser.lang + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("OAbillContentLang." + paramUser.lang + ".pagePlaceHoder")) {
                //i即属性名字ok,close
                console.log("placeholder key===" + i + ",value==" + eval("OAbillContentLang." + paramUser.lang + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("OAbillContentLang." + paramUser.lang + ".pagePlaceHoder." + i));
            }
        },
        //微信禁止分享
        weixinHideShare: function () {
            function onBridgeReady() {
                WeixinJSBridge.call('hideOptionMenu');
            }

            if (typeof WeixinJSBridge == "undefined") {
                if (document.addEventListener) {
                    document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
                } else if (document.attachEvent) {
                    document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
                    document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
                }
            } else {
                onBridgeReady();
            }
        },
        /**
         *加载样式
         */
        initHeightStyle: function () {
            var _width = $(window).width();
            var _height = $(window).height();
            $("body").width(_width).height(_height);
        },
        /**
         *加载数据
         */
        getContent: function () {
            var param = {};
            //"1"表示HTML,"2"表示图片,"3"表示非HTML
            if (paramData.contenttype == "1") {//获取非HTML正文接口
                //alert("1---HTML")
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    contenttype: paramData.contenttype,
                    getHTMLContent: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        statuscode: paramData.statuscode,
                        statuskey: paramData.statuskey,
                        id: paramData.mainbodyid,
                        downflag: paramData.downflag
                    }
                };
                //获取正文数据
                _chart.downloadContent(param);

            } else if (paramData.contenttype == "2") {//获取图片正文接口
                //alert("2---图片")
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    contenttype: paramData.contenttype,
                    getPicContent: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        id: paramData.mainbodyid,
                        sizetype: "1"
                    }
                };

                //获取正文数据
                _chart.downloadContent(param);

            } else if (paramData.contenttype == "3") {//获取HTML正文接口
                //alert("3---非HTML")
                var filename = paramData.fillename;
                //首先显示列表
                $("#notHtmlContent").show();
                $("#notHtmlContent_img1")[0].className = 'annex_img' + utils.getSuffix(filename) || 'png';
                $("#notHtmlContent_name1").text(filename);
                $("#notHtmlContent_size1").text('(' + paramData.filesize + ')');

                //alert('&fillename=' + paramData.fillename + '&filesize=' + paramData.filesize);

            } else {//无正文内容
                _chart.show_error('当前页面无正文');//'无正文内容'
            }
            //alert("3333");
            //var urlParse = contextPath()+"/download/fileoa?maurl=" + paramUser.maurl + "&param=" + JSON.stringify(param);
            //window.location.href = urlParse;
        },

        /**
         * 下载正文详情
         */
        downloadContent: function (param) {
            $("#loding").show();

            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdatafiledownload?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    $("#loding").hide();
                    console.log(JSON.stringify(result));
                    result = eval('(' + result + ')');
                    if (result.code == "0") {
                        try {
                            //处理结果
                            var getHTMLContent = result.jsonDatas.getHTMLContent[0];
                            if (getHTMLContent.flag == "0") {
                                if (paramData.contenttype == "1") {//HTML
                                    $("body").html(result.jsonDatas.getHTMLContent[0].contentStr)
                                } else if (paramData.contenttype == "2") {
                                    //图片
                                    $("body").html("<img src='data:image/png;base64," + result.jsonDatas.getPicContent[0].contentStr + "'/>");
                                } else {//非HTML

                                }

                            } else {
                                if (getHTMLContent.des != null && getHTMLContent.des != undefined) {
                                    _chart.show_error(getHTMLContent.des);
                                } else {
                                    _chart.show_nodata("当前页面无正文");
                                }

                            }

                        } catch (e) {
                            _chart.show_error("当前页面无正文");
                            $("#loding").hide();
                        }
                    } else {
                        if (result.desc != null && result.desc != undefined) {
                            _chart.show_error(result.desc);
                        } else {
                            _chart.show_nodata("当前页面无正文");
                        }
                    }


                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    _chart.show_error(eval("OAbillContentLang." + paramUser.lang + ".pageMessage.Error"));//"调用接口失败"
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },

        /**
         * @description 下载附件并使用wps打开
         * @param param {object} 下载附件使用的参数
         * @param filename {string} 下载的附件名
         * @param isEdit {boolean} true 可编辑，false 不可编辑
         */
        editFileWithWPS: function(param, filename, isEdit) {
            $('#loding').show();
            var url = contextPath() + "/download/fileOAQyjDownload?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    //转圈去除
                    $("#loding").hide();
                    result = eval('(' + result + ')');
                    console.log("OA文件下载返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        dialog.log(result.desc);
                        console.log(result.desc);
                    } else {
                        var getMessageAttachment = result.jsonDatas.getMainBodyContent[0];
                        if (getMessageAttachment.flag == "0") {
                            var bridge, initparam;
                            if(_util.getSystem() == 'qyj') {
                                initparam = {
                                    'fileDate': getMessageAttachment.contentStr,
                                    'fileName': filename
                                };
                                bridge = QYJ.createNewBridge();
                            } else if(_util.getSystem() == 'QYZone') {
                                initparam = JSON.stringify({
                                    "function": "editFileWithWPS",
                                    "parameters": {
                                        "fileDate": getMessageAttachment.contentStr,
                                        "fileName": filename,
                                        "fileBytes": paramData.filesize,
                                        "isReadOnly": isEdit ? '0' : '1'
                                    }
                                });
                                bridge = QYZone.createNewBridge();
                            }
                            bridge.editWPS(initparam, function (result) {
                                if(typeof result === 'string') {
                                    result = JSON.parse(result);
                                }
                                var successFlag;
                                if (_util.getSystem() == 'qyj') {
                                    successFlag = result.flag;
                                } else if (_util.getSystem() == 'QYZone') {
                                    successFlag = result.error_code;
                                }
                                if (successFlag == "0") { // 正文没有配置为不可编辑
                                    if(isEdit) {
                                        _chart.saveWPSEditFile(result, paramData.mainbodyid, getMessageAttachment);
                                    }
                                } else {
                                    dialog.log(result.des || result.desc);
                                }
                            });
                            //调用Bridge方法，调用端上的接口
                        } else {
                            dialog.log(getMessageAttachment.des);
                        }
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },

        /**
         * 保存WPS编辑的文件
         *
         */
        saveWPSEditFile: function (result, fileid, messageAttachment) {
            $("#loding").hide();
            var data; // 企业+ || 企业空间
            if(_util.getSystem() == 'qyj') {
                data = result.result;
            } else if(_util.getSystem() == 'QYZone') {
                data = result.data[0];
            }
            var paramSave = {
                serviceid: "oa_co_ssoservice",
                usercode: paramUser.ucode,
                token: paramUser.oatoken,
                reUpload: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    fileid: fileid,
                    filesize: data.fileBytes,
                    content: data.fileDate,
                    bamodule: messageAttachment.bamodule === undefined ? null : messageAttachment.bamodule,
                    sysid: messageAttachment.sysid === undefined ? null : messageAttachment.sysid
                }
            };
            $("#loding").show();
            $.ajax({
                type: "post",
                url: contextPath() + "/umapp/reqdata?radom=" + Math.random(),
                //async : true,
                data: JSON.stringify(paramSave),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    result = eval('(' + result + ')');
                    if (result.code != "0") {
                        dialog.log(result.desc);
                        console.log(result.desc);
                    } else {
                        var reUpload;
                        try {
                            reUpload = result.jsonDatas.reUpload[0];
                        } catch(e) {
                            reUpload = result.jsonDatas.oaFileDownload[0];
                        }
                        if (reUpload.flag == "0") {
                            dialog.log("文件保存成功");
                        } else {
                            if (reUpload.des != undefined) {
                                dialog.log(reUpload.des);
                            } else {
                                dialog.log("文件保存失败");
                            }
                        }
                    }
                    //转圈去除
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },

        /**
         *事件绑定
         */
        initBindEvent: function () {
            $("#notHtmlContent").unbind().on('click', function () {
                var filename = paramData.fillename,
                    fileid = paramData.mainbodyid,
                    filesize = paramData.filesize,
                    filets = paramData.filets,
                    param = {
                        serviceid: "oa_sp63_ispservice",
                        usercode: paramUser.ucode,
                        token: paramUser.oatoken,
                        contenttype: paramData.contenttype,
                        interfacename:"getMainBodyContent",
                        getMainBodyContent: {
                            groupid: paramUser.groupid,
                            userid: paramUser.userid,
                            taskid: paramData.taskid,
                            statuscode: paramData.statuscode,
                            statuskey: paramData.statuskey,
                            id: fileid,
                            downflag: paramData.downflag
                    }
                };

                //根据文件类型来决定用不用企业+插件来进行打开
                var pointCoordinate = filename.lastIndexOf(".");
                var suffix = filename.substring(pointCoordinate + 1); //文件后缀取得
                var compatibleSuffix = suffix ? "doc,docx,xls,xlsx,txt".indexOf(suffix.toLowerCase()) : -1; // 是否可以用wps编辑
                //0,0的时候，才表示当前为第一个页签的
                var pageBtnArray = window.sessionStorage.pageBtnArray;
                var pageClickedCode = window.sessionStorage.pageClickedCode;
                var isUnhandled = (pageBtnArray == "0,0") && (pageClickedCode == "ishandled,unhandled");
                var isEdit = isUnhandled && (paramData.isedit != 'N');
                //直接调用后台取得附件内容
                var urlParse = contextPath() + "/download/fileoa?maurl=" + paramUser.maurl
                    + "&fileName=" + encodeURIComponent(filename)
                    + "&tokenstr=" + encodeURI(paramUser.oatoken)
                    + "&param=" + encodeURI(JSON.stringify(param))
                    + "&fileid=" + encodeURIComponent(fileid);
                if(_util.getSystem() == 'QYZone') {
                    if(/^yes$/i.test(alreadyInstallWPS) && compatibleSuffix > -1) {
                        _chart.editFileWithWPS(param, filename, isEdit);
                    } else {
                        var downloadParam = JSON.stringify({
                            "function": "fileBrowser",
                            "parameters": {
                                "fid": fileid,
                                "filename": filename,
                                "fileext": suffix,
                                "file_down_url": urlParse,
                                "filesize": _util.fileSize2Bytes(filesize) || filesize,
                                "fts": filets
                            }
                        });
                        var bridge = QYZone.createNewBridge();
                        bridge.callNativeApp(downloadParam, function (result) {
                            bridge = null;
                        });
                    }
                    return false;
                }
                if(!_util.isNativeApp() || !isEdit || alreadyInstallWPS != 'YES' || compatibleSuffix < 0) { // 非企业+或企业空间 || 非待办单据 || 不可编辑单据 || 未安装wps || 文件类型不能用wps打开
                    delete param['token'];
                    window.location.href = urlParse;
                    return false;
                }
                _chart.editFileWithWPS(param, filename, isEdit);
            });
        },
        /**
         * 数据长度为0时，提示无数据
         */
        show_nodata: function (message) {
            var window_height = document.documentElement.clientHeight;
            var _height = window_height - 95 - 148 - 15;
            var _top = _height * 0.5;
            var _bottom = _height * 0.5;
            var no_data = $('<div class="error-none" style="padding-top:' + _top + 'px;height:100%; padding-bottom:' + _bottom + 'px;">'
                + '<table width="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="nodata_img" src="images/no_data.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $("#order_bill").html("").append(no_data);
            $("#order_bill").css("margin-top", "0px");
        },

    }


    return _chart;

});

/**
 * 解析URL攜帶的?之後的參數，轉換為對象，返回之
 * @param location
 * @returns
 */
var getURLparams = function () {
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
};
//判断为微信浏览器
function isWeiXin() {
    var ua = window.navigator.userAgent.toLowerCase();
    if (ua.match(/MicroMessenger/i) == 'micromessenger') {
        return true;
    } else {
        return false;
    }
};
/**
 * 获取URL的contextPath
 * @param
 * @returns
 */
var contextPath = function () {
    var origin = window.location.protocol + '//' + window.location.host;
    var pathname = location.pathname;
	//var projectname = pathname.substr(0, pathname.indexOf('/', 1));
	var projectname = pathname.substr(0, pathname.indexOf('/', 0));
    return origin + projectname;
};


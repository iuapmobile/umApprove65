define(["zepto","iscroll","dialog","swiper"],function ($, isc, dialog, swiper) {
    var _swiper;
    var alreadyInstallWPS = "NO";
    var paramData = getURLparams();	//上个页面传过来的参数
    var paramUser = JSON.parse(window.sessionStorage.paramUser);
    var _iscroll;

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
        /**
         * @description 是否是企业空间
         * @returns {boolean} true 是; false 否
         */
        isQYZone: function () {
            return /QYZone/i.test(navigator.userAgent);
        },

        /**
         * @description 根据文件名获取文件后缀
         * @param fileName 文件名
         * @returns {string} 文件后缀
         */
        getFilePostfix: function (fileName) {
            if(fileName === undefined || fileName === null) return "";
            return fileName.substring(fileName.lastIndexOf('.') + 1);
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
        },

        /**
         * @description 获取附件格式
         * @param fileType 文件扩展名
         * @returns {String} 附件格式的标识
         */
        getFileExt: function (fileType) {
            var ext = '-1';
            if (/^jpg|jpeg|bmp|psd|gif|png|tiff$/i.test(fileType)) {
                ext = '7';
            } else if (/^doc|docx|wps|dps|wpt$/i.test(fileType)) {
                ext = '0';
            } else if (/^pdf$/i.test(fileType)) {
                ext = '4';
            } else if (/^pot|potx|ppt|pptx|dpt|pps|ppsx$/i.test(fileType)) {
                ext = '1';
            } else if (/^xls|xlsx$/.test(fileType)) {
                ext = '2';
            } else if (/^txt$/.test(fileType)) {
                ext = '3';
            } else if (/^rar|zip$/.test(fileType)) {
                ext = '5';
            } else if (/^avi|rmvb|rm|asf|divx|mpg|mpeg|mpe|wmv|mp4|mkv|vob|flv$/.test(fileType)) {
                ext = '6';
            } else if (/^mp3|wav$/.test(fileType)) {
                ext = '8';
            }
            return ext;
        }
    };

    var _annex = {

        /**
         * 数据长度为0时，提示无数据
         */
        show_nodata: function (message) {
            var window_height = document.documentElement.clientHeight;
            var _height = window_height - 148;
            var _top = _height * 0.5;
            var _bottom = _height * 0.5;
            var no_data = $('<div class="error-none" style=" padding-top:' + _top + 'px;height:100%;  padding-bottom:' + _bottom + 'px;">'
                + '<table width="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="nodata_img" src="images/no_data.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $(".annex_data_list").html("").append(no_data);
            //$(".batch_mode").css("display","none");
        },
        /**
         * 报错时提示
         */
        show_error: function (message) {
            var window_height = document.documentElement.clientHeight;
            var _height = window_height - 148;
            var _top = _height * 0.5;
            var _bottom = _height * 0.5;
            var no_data = $('<div class="error-none" style=" padding-top:' + _top + 'px;height:100%;  padding-bottom:' + _bottom + 'px;">'
                + '<table width="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $(".annex_data_list").html("").append(error_data);
            //$(".batch_mode").css("display","none");
        },

        /**
         *初始化
         */
        init: function () {

            var _this = this;
            _annex.lightAppMultilingual();
            if (isWeiXin()) {
                _annex.weixinHideShare();//微信禁止分享
            }
            _annex.initHeightStyle();
            if (window.sessionStorage.messageAttachmentList != undefined && window.sessionStorage.messageAttachmentList != "") {
                _annex.initData();
            } else {
                //当数据为空时，显示数据为空提示
                $("#loding").hide();//隐藏加载中图标
                _annex.show_nodata(eval("annexLang." + paramUser.lang + ".pageMessage.annexIsNullInfo"));	//附件列表为空
            }
        },
        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {
            //首先设置title
            var $body = $('body');
            document.title = eval("annexLang." + paramUser.lang + ".pageTitle");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);
            //然后设置页面显示的汉字
            for (var i in eval("annexLang." + paramUser.lang + ".pageContent")) {
                //i即属性名字ok,close
                console.log("key===" + i + ",value==" + eval("annexLang." + paramUser.lang + ".pageContent." + i));
                $("." + i).html(eval("annexLang." + paramUser.lang + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("annexLang." + paramUser.lang + ".pagePlaceHoder")) {
                //i即属性名字ok,close
                console.log("placeholder key===" + i + ",value==" + eval("annexLang." + paramUser.lang + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("annexLang." + paramUser.lang + ".pagePlaceHoder." + i));
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
            var _height = $(window).height();
            $(".annex_list").height(_height);
        },
        /**
         *弹性滚动
         */
        initIScroll: function () {
            if (typeof(_iscroll) != "undefined") {
                _iscroll.destroy();
            }
            _iscroll = new iScroll('annex_list', {scrollbarClass: 'myScrollbar'});
        },
        /**
         *加载数据
         */
        initData: function () {
            $("#loding").show();
            var messageAttachmentList = window.sessionStorage.messageAttachmentList;
            messageAttachmentList = eval("(" + window.sessionStorage.messageAttachmentList + ")");
            var attachstructlist = messageAttachmentList.jsonDatas.getMessageAttachmentList[0].attachstructlist;

            //不为空则显示列表
            if (attachstructlist) {
                //NC65的层级还要更深一些，所以此处适配NC65
                if (paramUser.ncversion == "NC65" || paramUser.ncversion == "NC63") {
                    var list = [],
                        flag = false;   // 是否有下一层分组
                    for (var i = 0, len = attachstructlist.length; i < len; i++) {
                        var groupItem = attachstructlist[i].attachmentgrouplist;
                        if (groupItem) {
                            flag = true;
                            list = list.concat(groupItem);
                        }
                    }
                    flag ? (attachstructlist = list) : void(0);
                }

                console.log("attachstructlist===" + attachstructlist);
                if(!attachstructlist || !attachstructlist.length) {
                    //当数据为空时，显示数据为空提示
                    $("#loding").hide();//隐藏加载中图标
                    _annex.show_nodata(eval("annexLang." + paramUser.lang + ".pageMessage.annexIsNullInfo"));	//附件列表为空
                    return false;
                }

                $(".annex_data_list").html("");
                var imgIndex = 0;

                //循环显示每一条数据
                for (i = 0, len = attachstructlist.length; i < len; i++) {
                    var fileName, fileType, downflag, fileid, filets, filesize, attachmentSysType;
                    var attachItem = attachstructlist[i];
                    if (attachItem.filename) {//NC单据，filename
                        fileName = attachItem.filename;// 文件名
                        downflag = attachItem.downflag; //下载方:0 流方式 1;XML包装数据
                        attachmentSysType = "NC"; //加入NC标识
                    } else {//OA单据，
                        fileName = attachItem.fillename;// 文件名
                        downflag = "0";
                        attachmentSysType = "OA"; // 加入OA标识
                    }
                    fileid = attachItem.fileid;//fileid
                    filets = attachItem.filets || '';//filets
                    filesize = attachItem.filesize;
                    fileType = _util.getFilePostfix(fileName).toLowerCase();

                    var _class = "annex_imgdefault",
                        imgDownload = "download",
                        regexp = /^(?:docx?|xlsx?|pptx?|pdf|txt|(jpe?g|png|bmp|gif)|html?|mp[34]|log)$/i,
                        matchArr = regexp.exec(fileType);
                    if(matchArr) {  // 匹配上述类型
                        _class = "annex_img" + fileType;
                        if(matchArr[1]) {   // 匹配图片
                            imgDownload = "imgload";
                            imgIndex++;
                        } else {
                            imgIndex = 0;
                        }
                    }
                    console.log("fileName=== " + fileName + ",fileType===" + fileType);

                    var _tableList = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style=" background:#fff;" >' +
                        '<tr>' +
                        '<td width="10%"></td>' +
                        '<td width="90%"></td>' +
                        '</tr>' +
                        '<tr id="tr_' + i + '" data-fileid="' + fileid + '" data-filename="' + fileName + '" data-downflag="' + downflag + '" data-filets="' + filets + '" data-filesize="' + filesize + '" data-attachmentSysType="' + attachmentSysType + '" class="' + imgDownload + '" data-imgIndex="' + imgIndex + '">' +
                        '<td align="right" valign="middle"><div class="' + _class + '"></div></td>';
                    if (fileName.length < 15) {
                        _tableList += '<td><span class="click_gray" style="float:left;line-height:38px;word-break: break-all; word-wrap:break-word;color:#000000;width:70%;vertical-align:middle;">' + fileName + '</span>&nbsp;&nbsp;';
                    } else {
                        _tableList += '<td><span class="click_gray" style="float:left;line-height:18px;word-break: break-all; word-wrap:break-word;color:#000000;width:70%;vertical-align:middle;">' + fileName + '</span>&nbsp;&nbsp;';
                    }

                    if (filesize != 0) {
                        _tableList += '<span class="nc_color" style="font-size:12px;">(' + filesize + ')</span>';
                    }

                    _tableList += '<span id="downLoading_' + i + '" style="display:none;padding-top:10px;"><img src="images/waiting.gif" class="downLoadingImg" width="16px"></span></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td></td>' +
                        '<td style="border-bottom:#e9e9e9 solid 1px;" class="lastTd"></td>' +
                        '</tr>' +
                        '</table>';

                    $(".annex_data_list").append(_tableList);

                    if (i == len - 1) {
                        _annex.initIScroll();
                        _annex.initBindEvent();
                        //_annex.initSwiper();
                    }
                }
            } else {
                //当数据为空时，显示数据为空提示
                $("#loding").hide();//隐藏加载中图标
                _annex.show_nodata(eval("annexLang." + paramUser.lang + ".pageMessage.annexIsNullInfo"));	//附件列表为空
                return false;
            }
            $("#loding").hide();//隐藏加载中图标
            console.log(JSON.stringify(messageAttachmentList));

        },

        /**
         *事件绑定
         */
        initBindEvent: function () {

            $(".download,.imgload").unbind().on("click", function () {
                //点击显示加载图标,IOS
                if (paramUser.client == "ios" && !_util.isQYZone()) {
                    //先取得点钱点击事件的ID
                    var idIndex = $(this).attr("id").substring(3, $(this).attr("id").length);
                    //显示加载图标
                    $("#downLoading_" + idIndex).show();
                }
                //取值下载
                var _this = $(this);
                _annex.downloadAnnex(_this, function () {
                	if (paramUser.client == "ios" && !_util.isQYZone()) {
                        $("#downLoading_" + idIndex).hide();
                    }
                });
            });
        },

        downloadAnnex: function (clickItem, callback) {
            var fileid = clickItem.attr("data-fileid"),
                filename = clickItem.attr("data-filename"),
                downflag = clickItem.attr("data-downflag"),
                filets = clickItem.attr('data-filets'),
                filesize = clickItem.attr('data-filesize'),
                attachmentSysType = clickItem.attr('data-attachmentSysType'),
                fileType = _util.getFilePostfix(filename).toLowerCase(), // 文件类型
                param = null,
                urlParse = "";
            if (/^nc$/i.test(attachmentSysType)) {   // NC
                param = {
                    serviceid: "sp63_ispservice",
                    token: paramUser.token,
                    usercode: paramUser.ucode,
                    getMessageAttachment: {
                        groupid: paramUser.groupid,
                        usrid: paramUser.userid,
                        fileid: fileid,
                        downflag: downflag,
                        startposition: ""
                    }
                };

                filename = filename.replace(/\s+/g, "");
                //直接调用后台取得附件内容
                urlParse = contextPath() + "/download/file/" + filename + "?maurl=" + paramUser.maurl
                    + "&fileName=" + encodeURIComponent(filename)
                    + "&tokenstr=" + encodeURI(paramUser.token)
                    + "&usercode=" + encodeURIComponent(paramUser.ucode)
                    + "&groupid=" + encodeURIComponent(paramUser.groupid)
                    + "&usrid=" + encodeURIComponent(paramUser.userid)
                    + "&fileid=" + encodeURIComponent(fileid)
                    + "&filets=" + encodeURIComponent(filets)
                    + "&downflag=" + encodeURIComponent(downflag)
                    + "&startposition=";

                // // 友空间 不重复下载
                // if (_util.isQYZone()) { // 企业空间
                //     var downloadParam = JSON.stringify({
                //         "function": "fileBrowser",
                //         "parameters": {
                //             "fid": fileid,
                //             "filename": filename,
                //             "fileext": fileType,
                //             "file_down_url": urlParse,
                //             "filesize": _util.fileSize2Bytes(filesize) || filesize,
                //             "fts": filets
                //         }
                //     });
                //     var bridge = QYZone.createNewBridge();
                //     bridge.callNativeApp(downloadParam, function (result) {
                //         bridge = null;
                //         if ("function" === typeof callback) {
                //             callback();
                //         }
                //     });
                //     return;
                // }

            } else {
                param = {
                    serviceid: "oa_sp63_ispservice",
                    usercode: paramUser.ucode,
                    interfacename: "getMessageAttachment",
                    getMessageAttachment: {
                        groupid: paramUser.groupid,
                        usrid: paramUser.userid,
                        fileid: fileid,
                        downflag: downflag,
                        startposition: ""
                    }
                };
                //直接调用后台取得附件内容
                urlParse = contextPath() + "/download/fileoa?maurl=" + paramUser.maurl
                    + "&fileName=" + encodeURIComponent(filename)
                    + "&tokenstr=" + encodeURI(paramUser.oatoken)
                    + "&param=" + encodeURI(JSON.stringify(param))
                    + "&fileid=" + encodeURIComponent(fileid)
                    + "&filets=" + encodeURIComponent(filets);

                if (_util.isQYZone()) {	// 企业空间
                    var downloadParam = JSON.stringify({
                        "function": "fileBrowser",
                        "parameters": {
                            "fid": fileid,
                            "filename": filename,
                            "fileext": fileType,
                            "file_down_url": urlParse,
                            "filesize": _util.fileSize2Bytes(filesize) || filesize,
                            "fts": filets
                        }
                    });
                    var bridge = QYZone.createNewBridge();
                    bridge.callNativeApp(downloadParam, function (result) {
                        bridge = null;
                        if ("function" === typeof callback) {
                            callback();
                        }
                    });
                    return;
                }
            }
            // 如果是微信、不是ios（主要是android）、并且文件后缀为jpg走以下逻辑，否则走原来的下载逻辑
            if (isWeiXin() && paramUser.client != "ios" && checkImgType(fileType)) {
                _annex.showPicture(urlParse);
            } else {
                clickItem.find('.click_gray').css({color:'#777'});
                setTimeout(function(){
                    window.location.href = urlParse;
                },200)
            }
            if ("function" === typeof callback) {
                callback();
            }
        },
        
        /**
         * 保存WPS编辑的文件
         *
         */
        saveWPSEditFile: function (result, fileid) {
            $(".downLoadingImg").hide();
            var paramSave = {
                serviceid: "oa_co_ssoservice",
                usercode: paramUser.ucode,
                token: paramUser.oatoken,
                reUpload: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    fileid: fileid,
                    filesize: result.result.fileBytes,
                    content: result.result.fileDate,
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
                        var reUpload = result.jsonDatas.reUpload[0];
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
         * @description 展示图片
         * @param urlParse 图片链接
         */
        showPicture: function (urlParse) {
            $("#loding").show();

            var _picture_next = $('<div id="charFlow_picture_next"><img id="img_weixin" src=' + urlParse + '/></div>');

            $("#annex_list").hide();
            $("#pictrue")
                .show()
                .append(_picture_next)
                .unbind().on('click', function (event) {
                $("#charFlow_picture_next").remove();
                $('#pictrue').hide();
                $('#annex_list').show();
            });

            $("#img_weixin").unbind().on('load', function () {
                //图片加载完成，居中
                var window_height = $(window).height();//浏览器当前文档的高度
                var img_height = $('#charFlow_picture_next').height();
                var padValue = (window_height - img_height) / 2;
                //alert(window_height  + '  ' + img_height  + '  ' + padValue);
                //iscroll缩放滑动
                if (padValue < 0) {
                    padValue = 0;
                }
                $('#charFlow_picture_next').css('padding-top', padValue + 'px').css('padding-bottom', padValue + 'px');

                if (typeof(_iscroll) != "undefined") {
                    _iscroll.destroy();
                }
                _iscroll = new iScroll('pictrue', {
                    scrollbarClass: 'myScrollbar',
                    checkDOMChanges: true,
                    zoom: true,
                    scrollX: true,
                    scrollY: true,
                    mouseWheel: true,
                    wheelAction: 'zoom',
                    zoomMax: 4
                });

                $("#loding").hide();
            });
        },

        /**
         *图片浏览
         */
        initSwiper: function () {
            //销毁swiper重新创建
            if (typeof(_swiper) != 'undefined') {
                _swiper.destroy();
            }
            //$(".swiper-wrapper").attr("style","").html("");
            _swiper = new Swiper('.swiper-container', {
                spaceBetween: 30,
                slidesPerView: 'auto',
                onSlideChangeStart: function (swiper) {
                    var index = swiper.activeIndex;
                },
                onClick: function (swiper) {
                    $(".swiper-container").hide(300);
                },
                onTouchEnd: function (swiper, event) {

//							 var offset=$(".swiper-slide-active").offset();
//							 console.log(offset.left);
//							 if(offset.left>80){
//								 //
//								 console.log("向右滑动");
//							 }else if(offset.left<-80){
//								 console.log("向左滑动");
//							 }
                }
            });
        }
    };

    return _annex;
});

//判断是否 图片格式
function checkImgType(filetype) {
    return /^(?:jpe?g|png|bmp|gif)$/i.test(filetype);
}
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
    return /MicroMessenger/i.test(ua);
}
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

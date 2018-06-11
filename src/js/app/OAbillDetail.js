define(["zepto", "iscroll", "dialog"], function ($, isc, dialog) {
    //判断浏览器类型
    var u = navigator.userAgent, app = navigator.appVersion;
    var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1; //android终端或者uc浏览器
    var isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    //var client = isWeiXin() ? "wechat" : (isiOS ? "ios" : (isAndroid ? "android" : "other"));

    var paramUser = JSON.parse(window.sessionStorage.paramUser);
    var paramData = getURLparams();
    var topHeight = 0;
//	console.log(JSON.stringify(paramUser));
//	console.log(paramData.taskid);

    var detailData, _iscroll, loadNumber = 0;


    // 华衍水务 点击图片跳转im ;
    var goIm_psid = "" ;
    // console.error(decodeURIComponent(paramData['imTitle']));
    $('body').on('goImEvent','.webview_GoIm_img',function(){
        var obj = document.querySelector('.webview_GoIm_img')["imData"] ;

        var usercode = obj.usercode ;
        var taskid = paramData.taskid ;
        var paramUser = JSON.parse(window.sessionStorage.paramUser);
        var appkey = paramUser.appkey ;
        var domain = paramUser.domain ;
        var isOA = true ;
        var imTitle = decodeURIComponent(paramData['imTitle']);
        uapmobile.goIm(usercode,taskid,appkey,domain,goIm_psid,isOA,imTitle);
    })

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
    
    // 是否关联表单
    var isASS = false ;
    if( paramData.associateform == 'associateform' ){
        isASS = true ;
    }

    var _util = {
        //计算文件大小，并返回
        calcFileSize: function (fileSize) {
            var rtnStr = "0B";
            //小于1024时候,显示B
            if (fileSize < 1024) {
                rtnStr = fileSize + "B";
            } else if (fileSize >= 1024 && fileSize < 1024 * 1024) {
                rtnStr = (fileSize / 1024).toFixed(2) + "KB";
            } else {
                rtnStr = (fileSize / 1024 / 1024).toFixed(2) + "MB";
            }
            return rtnStr;
        }
    };

    var _bill_detail = {
        init: function () {
            // 基础配置
            _bill_detail.lightAppMultilingual();//多语化
            if (isWeiXin()) {
                _bill_detail.weixinHideShare();//微信禁止分享
            }
            _bill_detail.initListHeight();

            // 其他
            _bill_detail.initTaskFlowChart();// 是否有流程图 ;
            _bill_detail.initTaskBillContent();//获取正文类型 ;
            _bill_detail.initMessageAttachmentList();//附件列表 ;
            // if( isASS==false ){
                _bill_detail.initAssociatedForm();// 是否关联表单 ;
            // };

            // 展示
            if( isASS==false ){
                _bill_detail.initOperator(); //单据任务操作 
            }
            _bill_detail.initTaskDetails();	//任务详情
            _bill_detail.initApproveDetail();//查询审批历史
           
        },
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
            $("#order_bill").html("").append(no_data).show();
            $("#order_bill").css("margin-top", "0px");
        },
        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {

            //首先设置title
            var $body = $('body');
            document.title = eval("billDetailLang." + paramUser.lang + ".pageTitle");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);
            //然后设置页面显示的汉字
            for (var i in eval("billDetailLang." + paramUser.lang + ".pageContent")) {
                //i即属性名字ok,close
//					console.log("key===" + i + ",value==" + eval("billDetailLang." + paramUser.lang + ".pageContent." + i));
                $("." + i).html(eval("billDetailLang." + paramUser.lang + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("billDetailLang." + paramUser.lang + ".pagePlaceHoder")) {
                //i即属性名字ok,close
//					console.log("placeholder key===" + i + ",value==" + eval("billDetailLang." + paramUser.lang + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("billDetailLang." + paramUser.lang + ".pagePlaceHoder." + i));
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
         * 计算高度
         */
        initListHeight: function () {
            var width = $(window).width();
            var height = $(window).height();
            if (paramData.statuskey == "submit") {
                loadNumber++;
                $("#dillDetail").height(height);
            } else {
                $("#dillDetail").height(height - 50);
            }
        },
        /**
         * 任务详情接口
         */
        initTaskDetails: function () {
            $("#loding").show();//显示加载中图标
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getTaskBill: {//getNC63TaskList  //getTaskList
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                }
            };

            console.log("传入参数：" + JSON.stringify(param));


            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
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
                    result = eval('(' + result + ')');
                    console.log("返回数据：" + JSON.stringify(result));
                    if (result.code != "0") {
//		   		    		console.log(result.desc);
                        if (result.desc == null) {
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.detailfailedLoad"));//"单据详情信息加载失败"
                        } else {
                            dialog.log(result.desc);
                        }
                    } else {
                        var taskBill = result.jsonDatas.getTaskBill;
                        var flag = result.jsonDatas.getTaskBill[0].flag;
                        var des = result.jsonDatas.getTaskBill[0].des;
                        if (flag != "0") {
//		   		    			console.log(des);
                            _bill_detail.show_nodata(des || eval("billDetailLang." + paramUser.lang + ".pageMessage.detailfailedLoad"));
                            $("#taskAction").hide();
                            $("#loding,.order_rows").hide();//显示加载中图标
                            $("#dillDetail").css("height", "100%");
                            return;
                        } else {

                        // *** 单据类型 设置头部 ;1
                            if(taskBill[0]){
                                var billtypename = taskBill[0].billtypename ;
                                if(billtypename){
                                   YKJ_CHANGE_TITLE( billtypename )
                                }
                            };

                            var billtypename = result.jsonDatas.getTaskBill[0].billtypename;
                            $("title").text(billtypename);
                            //首先设置title
                            var $body = $('body');
                            document.title = billtypename;
                            // hack在微信等webview中无法修改document.title的情况
                            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
                            $iframe.on('load', function () {
                                setTimeout(function () {
                                    $iframe.off('load').remove();
                                }, 0);
                            }).appendTo($body);

                            if (taskBill.length <= 0) {
                                $("#loding").hide();
                                console.log("单据详情信息加载失败");
                                dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.detailfailedLoad"));//"单据详情信息加载失败"
                                return;
                            }
                            var body = taskBill[0].taskbill.body;
                            var head = taskBill[0].taskbill.head;
                            if (taskBill[0].flag != "0") {
                                console.log(taskBill[0].des);
                                dialog.log(taskBill[0].des);
                            } else {
                                //头部单据详情处理
                                if (head.length > 0) {
                                    // 渲染表头
                                    var headList = head[0].tabContent.billItemData;
                                    loadHead(headList);
                                }
                                //数据列表信息处理
                                if (body.length > 0) {
                                    window.sessionStorage.bodys = JSON.stringify(body);
                                    for (var i = 0; i < body.length; i++) {
                                        if (i == 0) {
                                            $(".documentdetail_tab").append($('<li><a href="javascript:void(0);" class="line" data-index="' + i + '">' + body[i].tabName + '</a></li>'));
                                        } else {
                                            $(".documentdetail_tab").append($('<li><a href="javascript:void(0);" data-index="' + i + '">' + body[i].tabName + '</a></li>'));
                                        }
                                    }

                                    // 添加可以搜索表体的输入框 !!!
                                    initSearchFun( $(".documentdetail_tab"));

                                    //加载tabNav滑动效果
                                    initNavTabIscrioll(body);

                                    // 渲染表体
                                    var bodyList = body[0].tabContent;
                                    loadBody(bodyList);
                                }
                            }
                        }
                    }
                    $("#loding").hide();//显示加载中图标
                    loadNumber++;
                    _bill_detail.initIScroll();//加载弹性
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });

            /*
                搜索事件
            */
            function initSearchFun( documentdetail_tab ){
                documentdetail_tab.after($('<div class="search_detail_body_input_wrap"><input type="placeholder" placeholder="输入内容搜索表体"/></div>'));
                $('body').on('input','.search_detail_body_input_wrap',function(e){
                    var val = e.target.value ;
                    try{
                        clearTimeout(documentdetail_tab.timer)
                        documentdetail_tab.timer = setTimeout( function(){
                            // 小于30条
                            if( $('.bodyList').length ){
                                $('.bodyList').hide() ;
                                $('.bodyList').each(function(k,item){
                                    var text = $(item).text() ;
                                    if( text.indexOf(val)>-1 ){
                                        $(item).show()
                                    }
                                })
                            };
                            // 大于30条
                            if( $('.bill_detail').length ){ 
                                $('.bill_detail').hide() ;
                                $('.bill_detail').each(function(k,item){
                                    var text = $(item).text() ;
                                    if( text.indexOf(val)>-1 ){
                                        $(item).show()
                                    }
                                })
                            };
                        },250)
                    }catch(e){}
                })
            }


            /**
             * 加载多页签滑动效果
             */
            function initNavTabIscrioll(body) {
                //计算滑动总距离
                var navTab = $("#navTab ul li");
                var _ulWidth = 0;
                for (var i = 0; i < navTab.length; i++) {
                    var _w = $("#navTab ul li a").eq(i).html().length * 15;//
                    _ulWidth += (_w);
                }
                $("#navTab").width($(window).width()).find("ul").width(_ulWidth + 15);
                var startStatus = false, endStatus = true;
                //生成多页签滑动效果
                var myScroll = new iScroll('navTab', {
                    vScroll: false,
                    hScrollbar: false,
                    vScrollbar: false,
                    onScrollEnd: function () {
                        //判断前，后滚动状态
                        if (this.x == 0) {
                            startStatus = false;
                        } else if (this.x == this.maxScrollX) {
                            endStatus = false;
                        } else {
                            startStatus = true;
                            endStatus = true;
                        }
                    }
                });
                //点击页签滚动效果
                $("#nav li").on("click", function (e) {
                    var _this = $(this);
                    $('.search_detail_body_input_wrap input').val('');
                    $("#nav a").removeClass("line");
                    _this.find("a").addClass("line");
                    var _widht = $(window).width() / 2;
                    //点击左侧
                    if (e.pageX < _widht) {
                        if (startStatus) {
                            myScroll.scrollTo(-100, 0, 500, 50);
                        }
                    } else {
                    //点击右侧
                        if (endStatus) {
                            myScroll.scrollTo(100, 0, 500, 50);
                        }
                    }
                    var _index = _this.index();
                    var bodyList = body[_index].tabContent;
                    // 渲染表体
                    loadBody(bodyList);
                });
            }

            //加载头部数据
            function loadHead(headList) {
                for (var i = 0; i < headList.length; i++) {
                    var item, showName;
                    for (var key in headList[i]) {
                        if (key.split("itemShowName").length == 2) {
                            item = key.split("itemShowName")[0];
                            showName = key.split("itemShowName")[0] + "itemShowName";
                            break;
                        }
                    }
                    var itemName = eval('headList[i]["' + showName + '"]');
                    //console.log("itemName == " + itemName + ",typeof(eval('headList[i].'+item))====" + typeof(eval('headList[i].'+item)));
                    //根据值的类型再次进行分解
                    var itemValueType = typeof(eval('headList[i]["' + item + '"]'));
                    var itemValue = "";//typeof(eval('headList[i].'+item))=="undefined"?"":eval('headList[i].'+item);
//		    				console.log(JSON.stringify(headList[i]));
                    //如果值类型为对象，则处理如果后再进行赋值
                    if (itemValueType == "object") {
                        //对象时候，要区分是日期还是金额
                        //日期
                        var dataYearFlag = typeof(eval('headList[i]["' + item + '"]["year"]'));
                        if (dataYearFlag != "undefined") {
                            var millis = eval('headList[i]["' + item + '"]["millis"]');
                            var newTime = new Date(millis); //就得到普通的时间了
                            var year = newTime.getFullYear();
                            var month = (newTime.getMonth() + 1).toString().length == 1 ? ("0" + parseInt(newTime.getMonth() + 1)) : (newTime.getMonth() + 1);
                            var day = newTime.getDate().toString().length == 1 ? ("0" + newTime.getDate()) : newTime.getDate();
                            var hours = newTime.getHours().toString().length == 1 ? ("0" + newTime.getHours()) : newTime.getHours();
                            var minutes = newTime.getMinutes().toString().length == 1 ? ("0" + newTime.getMinutes()) : newTime.getMinutes();
                            var seconds = newTime.getSeconds().toString().length == 1 ? ("0" + newTime.getSeconds()) : newTime.getSeconds();
                            itemValue = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
                        }
                        //金额
                        var moneyDoubleFalg = typeof(eval('headList[i]["' + item + '"]["double"]'));
                        if (moneyDoubleFalg != "undefined") {
                            itemValue = eval('headList[i]["' + item + '"]["double"]').toFixed(Math.abs(eval('headList[i]["' + item + '"]["power"]')));
                        }
                        //text的对象
                        var textFalg = typeof(eval('headList[i]["' + item + '"]["text"]'));
                        if (textFalg != "undefined") {
                            itemValue = eval('headList[i]["' + item + '"]["text"]');
                        }
                    } else {
                        //否则直接赋值
                        itemValue = itemValueType == "undefined" ? "" : eval('headList[i]["' + item + '"]');
                    }
                    var orderLi;
                    if (headList[i]['fileid'] && headList[i]['contenttype']) { // 附件类型
                        orderLi = $('<li>' + itemName + '：<span class="content-annex" data-filesize="' + headList[i].filesize + '" data-contenttype="' + headList[i].contenttype + '" data-fileid="' + headList[i].fileid + '">' + itemValue + '</span><li>');
                        orderLi.unbind().on('click', 'span', function () {
                            /* 模拟OA附件内容，直接跳转到annex.html附件页面 */
                            var fileidArr = $(this).attr('data-fileid').split(','),
                                filenameArr = $(this).text().split(','),
                                filesizeArr = $(this).attr('data-filesize').split(',').map(function (elem) {
                                    return _util.calcFileSize(elem);
                                }),
                                len = fileidArr.length,
                                attachmentList = {
                                    "code": "0",
                                    "desc": "执行成功",
                                    "jsonDatas": {
                                        "getMessageAttachmentList": [
                                            {
                                                "des": "获取附件列表成功",
                                                "flag": 0,
                                                "count": "0",
                                                "attachstructlist": []
                                            }
                                        ]
                                    },
                                    "data": null
                                },
                                attachmentContent = attachmentList.jsonDatas.getMessageAttachmentList[0];
                            attachmentContent.count = len;
                            for (i = 0; i < len; i++) {
                                attachmentContent['attachstructlist'].push({
                                    fillename: filenameArr[i],
                                    fileid: fileidArr[i],
                                    filletype: filenameArr[i].substring(filenameArr[i].lastIndexOf('.') + 1),
                                    filesize: filesizeArr[i]
                                });
                            }
                            window.sessionStorage.messageAttachmentList = JSON.stringify(attachmentList);
                            /* 模拟OA附件内容结束 */
                            window.location.href = 'annex.html';
                        });
                    } else {
                        orderLi = $('<li>' + itemName + '：<span>' + itemValue + '</span></li>');
                    }
                    //var orderLi = $('<li>' + itemName + '：<span>' + itemValue + '</span></li>');
                    $("#order_open").append(orderLi);
                }
            }

            //加载列表数据
            function loadBody(bodyList) {
                //console.log(JSON.stringify(bodyList));
                $(".bodyList,.order_rows_title,#orderLisy").remove();
                if (typeof(bodyList) == "undefined") {

                    var countList = $('<div class="order_rows_title" id="orderRows" style="margin-bottom:16px;">' +
                        '<span>' + eval("billDetailLang." + paramUser.lang + ".pageMessage.rowInfo") + '(<font style="color:#329fd0;">0</font>)条</span>' +
                        '</div>');
                    $("#order_bill").append(countList).show();
                    if (_iscroll && typeof _iscroll.refresh === 'function') {
                        _iscroll.refresh();
                    }
                    return;
                }
                $("#billName").show();
                //小于等于5条数据时候，直接显示详情
                if (bodyList.length <= 30) {
                    for (var i = 0; i < bodyList.length; i++) {
                        var itemData = bodyList[i].billItemData;
                        var _orderP = $('<p><span class="number">' + (i + 1) + '</span></p>');
                        var _orderUl = $('<ul class="order_open bodyList"></ul>');
                        _orderUl.append(_orderP);
                        for (var j = 0; j < itemData.length; j++) {
                            if (itemData[j].digest == false) {
                                var item, showName;
                                for (var key in itemData[j]) {
                                    if (key.split("itemShowName").length == 2) {
                                        item = key.split("itemShowName")[0];
                                        showName = key.split("itemShowName")[0] + "itemShowName";
                                        break;
                                    }
                                }
                                var itemName = eval('itemData[j]["' + showName + '"]');
                                //console.log("itemName == " + itemName + "item== " + item);
                                //根据值的类型再次进行分解
                                var itemValueType = typeof(eval('itemData[j]["' + item + '"]'));
                                var itemValue = "";//typeof(eval('itemData[j].'+item))=="undefined"?"":eval('itemData[j].'+item);
                                //如果值类型为对象，则处理如果后再进行赋值
                                if (itemValueType == "object") {
                                    //对象时候，要区分是日期还是金额
                                    //日期
                                    var dataYearFlag = typeof(eval('itemData[j]["' + item + '"]["year"]'));
                                    if (dataYearFlag != "undefined") {
                                        var millis = eval('itemData[j]["' + item + '"]["millis"]');
                                        var newTime = new Date(millis); //就得到普通的时间了
                                        var year = newTime.getFullYear();
                                        var month = (newTime.getMonth() + 1).toString().length == 1 ? ("0" + parseInt(newTime.getMonth() + 1)) : (newTime.getMonth() + 1);
                                        var day = newTime.getDate().toString().length == 1 ? ("0" + newTime.getDate()) : newTime.getDate();
                                        var hours = newTime.getHours().toString().length == 1 ? ("0" + newTime.getHours()) : newTime.getHours();
                                        var minutes = newTime.getMinutes().toString().length == 1 ? ("0" + newTime.getMinutes()) : newTime.getMinutes();
                                        var seconds = newTime.getSeconds().toString().length == 1 ? ("0" + newTime.getSeconds()) : newTime.getSeconds();
                                        itemValue = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
                                        //itemValue = eval('headList[i].'+item + ".year") + "-" + eval('headList[i].'+item + ".month") + "-" + eval('headList[i].'+item + ".day");
                                    }
                                    //金额
                                    var moneyDoubleFalg = typeof(eval('itemData[j]["' + item + '"]["double"]'));
                                    if (moneyDoubleFalg != "undefined") {
                                        itemValue = eval('itemData[j]["' + item + '"]["double"]').toFixed(Math.abs(eval('itemData[j]["' + item + '"]["power"]')));
                                    }
                                    //text的对象
                                    var textFalg = typeof(eval('itemData[j]["' + item + '"]["text"]'));
                                    if (textFalg != "undefined") {
                                        itemValue = eval('itemData[j]["' + item + '"]["text"]');
                                    }

                                } else {
                                    //console.log("item===" + item.indexOf("."));
                                    //否则直接赋值
                                    itemValue = itemValueType == "undefined" ? "" : eval('itemData[j]["' + item + '"]');
                                }
                                var orderLi = $('<li>' + itemName + '：<span>' + itemValue + '</span></li>');
                                _orderUl.append(orderLi);
                            }

                        }
                        $("#order_bill").append(_orderUl).show();
                    }
                } else {
//			   			console.log(JSON.stringify(bodyList));
                    window.sessionStorage.bodyList = JSON.stringify(bodyList);
                    var countList = $('<div class="order_rows_title" id="orderRows">' +
                        '<span>' + eval("billDetailLang." + paramUser.lang + ".pageMessage.rowInfo") + '(<font style="color:#329fd0;">' + bodyList.length + '</font>)条</span>' +
                        '<div class="sq_count"><i class="sq"></i></div><div class="zk_count" style="display:none;"><i class="zk"></i></div>' +
                        '</div>');
                    var orderLisy = $('<div id="orderLisy"></div>');
                    $("#order_bill").append(countList).append(orderLisy).show();

                    for (var i = 0; i < bodyList.length; i++) {
                        var showName = [];
                        var itemData = bodyList[i].billItemData;
                        for (var j = 0; j < itemData.length; j++) {
                            if (itemData[j].digest) {
                                var itemShowName, item;
                                for (var key in itemData[j]) {
                                    if (key.split("itemShowName").length == 2) {
                                        itemShowName = key.split("itemShowName")[0] + "itemShowName";
                                        item = key.split("itemShowName")[0];
                                    }
                                }
//					   					showName.push(eval("itemData[j]."+itemShowName));
                                //根据值的类型再次进行分解
                                var itemValueType = typeof(eval('itemData[j]["' + item + '"]'));
                                var itemValue = "";//typeof(eval('itemData[j].'+item))=="undefined"?"":eval('itemData[j].'+item);
                                //如果值类型为对象，则处理如果后再进行赋值
                                if (itemValueType == "object") {
                                    //对象时候，要区分是日期还是金额
                                    //日期
                                    var dataYearFlag = typeof(eval('itemData[j]["' + item + '"]["year"]'));
                                    if (dataYearFlag != "undefined") {
                                        var millis = eval('itemData[i]["' + item + '"]["millis"]');
                                        var newTime = new Date(millis); //就得到普通的时间了
                                        var year = newTime.getFullYear();
                                        var month = (newTime.getMonth() + 1).toString().length == 1 ? ("0" + parseInt(newTime.getMonth() + 1)) : (newTime.getMonth() + 1);
                                        var day = newTime.getDate().toString().length == 1 ? ("0" + newTime.getDate()) : newTime.getDate();
                                        var hours = newTime.getHours().toString().length == 1 ? ("0" + newTime.getHours()) : newTime.getHours();
                                        var minutes = newTime.getMinutes().toString().length == 1 ? ("0" + newTime.getMinutes()) : newTime.getMinutes();
                                        var seconds = newTime.getSeconds().toString().length == 1 ? ("0" + newTime.getSeconds()) : newTime.getSeconds();
                                        itemValue = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
                                        //itemValue = eval('headList[i].'+item + ".year") + "-" + eval('headList[i].'+item + ".month") + "-" + eval('headList[i].'+item + ".day");
                                    }
                                    //金额
                                    var moneyDoubleFalg = typeof(eval('itemData[j]["' + item + '"]["double"]'));
                                    if (moneyDoubleFalg != "undefined") {
                                        itemValue = eval('itemData[j]["' + item + '"]["double"]').toFixed(Math.abs(eval('itemData[j]["' + item + '"]["power"]')));
                                    }
                                    //text的对象
                                    var textFalg = typeof(eval('itemData[j]["' + item + '"]["text"]'));
                                    if (textFalg != "undefined") {
                                        itemValue = eval('itemData[j]["' + item + '"]["text"]');
                                    }

                                } else {
                                    //否则直接赋值
                                    itemValue = itemValueType == "undefined" ? "" : eval('itemData[j]["' + item + '"]');
                                }
                                showName.push(itemValue);
                            }
                        }
                        var show1 = typeof(showName[0]) == "undefined" ? "" : showName[0];
                        var show2 = typeof(showName[1]) == "undefined" ? "" : showName[1];
                        var show3 = typeof(showName[2]) == "undefined" ? "" : showName[2];
                        var show4 = typeof(showName[3]) == "undefined" ? "" : showName[3];
                        var tr1 = '<tr>' +
                            '<td rowspan="2" width="7%" valign="top" align="right"><span class="bill_name">' + (i + 1) + '.</span></td>' +
                            '<td width="55%"><span class="bill_name">' + show1 + '</span></td>' +
                            '<td width="38%" align="right"><span class="bill_number bill_numbermargin">' + show2 + '</span></td>' +
                            '</tr>';
                        var tr2 = '<tr>' +
                            '<td><span class="bill_number">' + show3 + '</span></td>' +
                            '<td align="right"><span class="bill_number bill_numbermargin">' + show4 + '</span></td>' +
                            '</tr>';
                        if (typeof(showName[2]) == "undefined") {
                            tr2 = "";
                        }
                        var orderList = $('<div class="bill_detail" data-index=' + i + '>' +
                            '<table width="100%" border="0" cellspacing="0" cellpadding="0">' +
                            '<tr><td></td><td></td><td></td></tr>' + tr1 + tr2 +
                            '<tr>' +
                            '<td style="border-bottom:#e9e9e9 solid 1px;"></td>' +
                            '<td style="border-bottom:#e9e9e9 solid 1px;"></td>' +
                            '<td style="border-bottom:#e9e9e9 solid 1px;"></td>' +
                            '</tr>' +
                            '</table>' +
                            '</div>');
                        $("#orderLisy").append(orderList);
                    }
                    $(".sq_count,.zk_count").on("click", function () {
                        var _class = $(this).attr("class");
                        if (_class == "sq_count") {
                            $(".sq_count").hide();
                            $(".zk_count").show().css("display", "block");
                            $("#orderLisy").hide();
                            $("#orderRows").addClass("order_rows_zk");
                        } else {
                            $(".sq_count").show();
                            $(".zk_count").hide();
                            $("#orderLisy").show();
                            $("#orderRows").removeClass("order_rows_zk");
                        }
                    });
                }
                if (_iscroll && typeof _iscroll.refresh === 'function') {
                    _iscroll.refresh();
                }
                _bill_detail.bindEvent();
            }
        },
        /**
         * 单据列表加载
         */
        bindEvent: function () {



            //任务列表显示详情页面
            $(".bill_detail").unbind().on("click", function () {
                var lineIndex = $("#nav .line").attr("data-index");
                var index = $(this).attr("data-index");
                window.location.href = "billDetailSubitem.html?index=" + (parseInt(index) + 1) + "&lineIndex=" + lineIndex;

            });

        },

        /**
         *获取正文类型
         */
        initTaskBillContent: function () {
            //调用正文接口
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getMainBody: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey
                }
            };

            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                async: true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    console.log("正文返回参数：" + result);
                    result = eval('(' + result + ')');
                    //解析正文数据
                    try {
                        if (result.jsonDatas.getMainBody[0].contenttype) {//如果正文存在
                            var mainBody = result.jsonDatas.getMainBody[0];
                            $("#firstLineInfoUl").show();
                            $("#zhenWen").show();
                            //正文参数
                            paramData.mainbodyid = mainBody.mainbodyid;//正文id
                            paramData.downflag = "0";//mainBody.downflag;//
                            paramData.contenttype = mainBody.contenttype;//正文类型，"1"表示HTML,"2"表示图片, "3"表示非HTML

                            paramData.fillename = mainBody.fillename;//文件名
                            paramData.filesize = mainBody.filesize;//文件大小
                            paramData.isedit = mainBody.isedit; // 是否可编辑
                            paramData.filets = mainBody.filets; // 时间戳
                        } else {//正文不存在，不显示在页面
                            console.warn("无正文数据");
                            $("#zhenWen").hide();
                        }

                        //加载样式处理
                        $("#loding").hide();
                    } catch (e) {
                        //加载样式处理
                        $("#loding").hide();
                        console.error(e);
                        $("#zhenWen").hide();
                    }


                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {

                    console.log("正文接口调用失败，正文不显示");

                    //加载样式处理
                    $("#loding").hide();
                }
            });

            //跳转到正文页面
            $(".order_document_ul li").on("click", function () {
                var id = $(this).attr("id");
                if (id == "zhenWen") {
                    var mainbodyid = paramData.mainbodyid || "";
                    window.location.href = "OAbillContent.html?statuskey=" + paramData.statuskey + '&statuscode=' + paramData.statuscode + '&taskid=' + paramData.taskid
                        + '&mainbodyid=' + paramData.mainbodyid + '&downflag=' + paramData.downflag + '&contenttype=' + paramData.contenttype
                        + '&fillename=' + paramData.fillename + '&filesize=' + paramData.filesize + '&isedit=' + paramData.isedit + '&filets=' + paramData.filets;
                }else if(id=='goFlowChart'){
                    window.location.href = "OAflowChart.html?statuskey=" + paramData.statuskey + '&statuscode=' + paramData.statuscode + '&taskid=' + paramData.taskid;
                }else if (id == "goAssociatedForm") {
                    window.location.href = "associatedForm.html"
                }
            });
            //点击查看附件列表页面，事件绑定
            $(".attachmentNumber").on("click", function () {
                window.location.href = "annex.html";
            });


        },

        
        // 判断是否存在流程图
        initTaskFlowChart:function(){

            var param={
                serviceid:"oa_sp63_ispservice",
                token:paramUser.oatoken,
                usercode:paramUser.ucode,
                getTaskFlowChart:{
                    groupid:paramUser.groupid,
                    userid:paramUser.userid,
                    taskid:paramData.taskid,
                    //statuscode:paramData.statuscode,
                    //statuskey:paramData.statuskey,
                    //picid:"",
                    //width:"100",
                    //height:"100"
                }
              };

            var url=contextPath()+"/umapp/reqdata?radom=" + Math.random();

             $.ajax({
                    type:"post",
                    url : url,
                    //async : true,
                    data:JSON.stringify(param),
                    beforeSend: function(XMLHttpRequest) {
                           XMLHttpRequest.setRequestHeader("maurl",paramUser.maurl);
                    },
                    contentType:'application/json;charset=utf-8',
                    success: function(result){
                        result = eval('(' + result + ')'); 
                        console.log(result) 
                        if(result==""||typeof(result)=="undefined"){
                            console.log("no 流程图");
                        }else{

                            try{
                                if(!result.jsonDatas){ return };
                                if(!result.jsonDatas.getTaskFlowChart){ return };
                                if(result.code!="0"){
                                     console.log("no 流程图");
                                }else{
                                    var jsonData = result.jsonDatas.getTaskFlowChart[0];
                                    if((!jsonData)||jsonData.flag == '1'){
                                         console.log("no 流程图");
                                    }else{
                                        // really ;
                                        _img=result.jsonDatas.getTaskFlowChart[0].pic;
                                        if(Object.prototype.toString.call(_img) === '[object Array]') {
                                            _img = btoa(String.fromCharCode.apply(null, new Uint8Array(_img))); // 转换为Base64;
                                            $('#goFlowChart').show() ;
                                        }
                                    } //really ;;
                                }
                            }catch(e){}
                            
                        }
                    },
                    error : function(XMLHttpRequest, textStatus, errorThrown) {
                        console.log("no 流程图");
                    }
                 });                    
        },
        // 是否关联表单
        initAssociatedForm:function(){
            var param={
                serviceid:"oa_sp63_ispservice",
                token:paramUser.oatoken,
                usercode:paramUser.ucode,
                getAssociateFormList:{
                    groupid:paramUser.groupid,
                    userid:paramUser.userid,
                    taskid:paramData.taskid
                }
              };
            var url=contextPath()+"/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type:"post",
                url : url,
                //async : true,
                data:JSON.stringify(param),
                beforeSend: function(XMLHttpRequest) {
                       XMLHttpRequest.setRequestHeader("maurl",paramUser.maurl);
                },
                contentType:'application/json;charset=utf-8',
                success: function(result){
                    result = eval('(' + result + ')'); 
                    try{
                        if(result.code==0){
                            console.log('关联表单数据')
                            console.log(result);

                            if(result.jsonDatas && result.jsonDatas.getAssociateFormList && result.jsonDatas.getAssociateFormList.length ){
                                var list = result.jsonDatas.getAssociateFormList[0];
                                var arr = list.associateformlist ;
                                if(!arr || !arr.length){ return };
                                console.error( arr )
                                // 存在 关联表单情况 , 存到内存 ;
                                $('#goAssociatedForm').show() ;
                                var obj = {
                                    list:arr,
                                    href:location.href
                                }
                                window.localStorage.setItem('associateForm',JSON.stringify( obj ));
                            }
                        }
                    }catch(e){
                        console.log(e)
                    }
                },
                error : function(XMLHttpRequest, textStatus, errorThrown) {
                    console.log("no 关联表单");
                }
            }); 
        },


        /**
         * 操作项控制
         */
        initOperator: function () {

            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getTaskAction: {
                    groupid: paramUser.groupid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,

                }
            };

            //console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
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
                    result = eval('(' + result + ')');
                    //console.log("返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        console.log(result.desc);
                        if (result.desc == "" || result.desc == null) {
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.inquirefailedLoad"));//"查询动作列表加载失败"
                        } else {
                            dialog.log(result.desc);
                        }
                    } else {
                        var taskAction = result.jsonDatas.getTaskAction;
                        if (taskAction.length > 0) {

                            if (taskAction[0].flag != "0") {
                                console.log(taskAction[0].des);
                                dialog.log(taskAction[0].des);
                            } else {
//			   		 			console.log(JSON.stringify(taskAction));
                                //查看hint值，以判断预算部分是否进行
                                paramData.hint = taskAction[0].hint;

                                var flag = taskAction[0].flag;
                                var des = taskAction[0].des;
                                if (flag != "0") {
                                    console.log(des);
                                    dialog.log(des);
                                } else {
                                    var actionstructlist = taskAction[0].actionstructlist;
                                    if (typeof(actionstructlist) == "undefined" || actionstructlist == "") {
//				   		 				_bill_detail.show_nodata(des);
                                        $("#taskAction").hide();
                                        return;
                                    }
                                    if (actionstructlist.length < 4) {
                                        for (var i = 0; i < actionstructlist.length; i++) {
                                            var code = actionstructlist[i].code;

                                            if (code == 'doNothing') {
                                                return false;
                                            }

                                            var _li;
                                            if (code == "doAgree") {
                                                _li = '<li><a href="javascript:void(0);" class="font_bold"><i class="approval"></i><span class="approveLabel1">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doDisAgree") {
                                                _li = '<li><a href="javascript:void(0);"><i class="no_approval"></i><span class="notApproveLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doReject") {
                                                _li = '<li><a href="javascript:void(0);"><i class="reject"></i><span class="dismissedLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else {
                                                _li = '<li><a href="javascript:void(0);"><i class="default"></i><span class="dismissedLabel">' + _bill_detail.substrLength(actionstructlist[i].name, 4) + '</span></a></li>';
                                            }
                                            var actionUl = $('<ul class="task_detail" data-actflag=' + actionstructlist[i].actflag + ' data-code=' + actionstructlist[i].code + '>' + _li + '</ul>');
                                            $("#taskAction").prepend(actionUl);
                                        }
                                    } else {
                                        for (var i = 0; i < 3; i++) {
                                            var code = actionstructlist[i].code;
                                            var _i;
                                            (i < 2) ? _i = '' : _i = '<i class="other"></i>';
                                            var _li;
                                            if (code == "doAgree") {
                                                _li = '<li><a href="javascript:void(0);" class="font_bold"><i class="approval"></i><span class="approveLabel1">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doDisAgree") {
                                                _li = '<li><a href="javascript:void(0);"><i class="no_approval"></i><span class="notApproveLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doReject") {
                                                _li = '<li><a href="javascript:void(0);"><i class="reject"></i><span class="notApproveLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else {
                                                _li = '<li><a href="javascript:void(0);"><span class="dismissedLabel">' + _i + '' + actionstructlist[i].name + '</span></a></li>';
                                            }
                                            if (i < 2) {
                                                var actionUl = $('<ul class="task_detail" data-actflag=' + actionstructlist[i].actflag + ' data-code=' + actionstructlist[i].code + '>' + _li + '</ul>');
                                                $("#taskAction").prepend(actionUl);
                                            } else if (i == 2) {
                                                var _top;
                                                if (actionstructlist.length == 6) {
                                                    _top = "195";
                                                } else if (actionstructlist.length == 5) {
                                                    _top = "152";
                                                } else if (actionstructlist.length == 4) {
                                                    _top = "110";
                                                }
                                                var actionUl = $('<ul class="task_detail border_lfrt">' +
                                                    '<li><a href="javascript:void(0);"><span class="dismissedLabel">' +
                                                    '<div class="task_other" style="display:none;top:-' + _top + 'px; " id="task_other"><div class="task_other_point"></div></div></div><i class="other"></i>其他</span></a>' +
                                                    '</li>' +
                                                    '</ul>');
                                                $("#taskAction").prepend(actionUl);
                                            }
                                        }
                                        //其他项
                                        for (var j = 2; j < actionstructlist.length; j++) {
                                            var taskDiv = $('<div class="task_other_list" data-actflag=' + actionstructlist[i].actflag + ' data-code=' + actionstructlist[j].code + '>' + actionstructlist[j].name + '</div>');
                                            $("#task_other").append(taskDiv);
                                        }
                                        //其他项显示
                                        $("#task_other").parents("ul").on("click", function () {
                                            var _this = $("#task_other").css("display");
                                            (_this == "none") ? $("#task_other").show() : $("#task_other").hide();
                                        });
                                        $("#dillDetail").on("click", function () {
                                            $("#task_other").hide();
                                        });
                                    }
                                    //审批动作
                                    $(".task_other_list,.task_detail").not($(".border_lfrt")).on("click", function () {
                                        var obj = $(this);
                                        //有值提示处理
                                        if (paramData.hint != "" && paramData.hint != undefined) {
                                            dialog.confirm(paramData.hint + "是否继续?", function () {
                                                //跳转到审批页面
                                                window.location.href = "OAdoAction.html?statuskey=" + paramData.statuskey + '&statuscode=' + paramData.statuscode + '&taskid=' + paramData.taskid
                                                    + "&code=" + obj.attr("data-code") + "&codeName=" + $(this).text() + "&actflag=" + obj.attr("data-actflag");

                                            });
                                        } else {
                                            //跳转到审批页面
                                            window.location.href = "OAdoAction.html?statuskey=" + paramData.statuskey + '&statuscode=' + paramData.statuscode + '&taskid=' + paramData.taskid
                                                + "&code=" + obj.attr("data-code") + "&codeName=" + $(this).text() + "&actflag=" + obj.attr("data-actflag");

                                        }
                                    });
                                }
                            }
                        }
                    }
                    loadNumber++;
                    _bill_detail.initIScroll();//加载弹性

                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },
        /**
         * 审批历史操作
         */
        initApproveDetail: function () {
            var _thisId;
            (paramData.statuskey == "submit") ? _thisId = "content" : _thisId = "content2";
            $("#" + _thisId).show();
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                contenttype: "detail",
                ncversion: paramUser.ncversion,
                usercode: paramUser.ucode,
                getApprovedDetail: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    startline: 1,
                    count: 20
                }
            };

            //console.log("传入参数：" + JSON.stringify(param));
            var result_getApproveDetail = {};
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
                    result = eval('(' + result + ')');
                    //console.log("返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        console.log(result.desc);
                        if (result.desc == "" || result.desc == null) {
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.historyfailedLoad"));//"审批历史加载失败"
                        } else {
                            dialog.log(result.desc);
                        }
                    } else {

                        var approvedDetail = result.jsonDatas.getApprovedDetail;
                        if (approvedDetail.length > 0) {
//			   		    	console.log(JSON.stringify(result.jsonDatas.getApprovedDetail[0]));
                            var flag = result.jsonDatas.getApprovedDetail[0].flag;
                            var des = result.jsonDatas.getApprovedDetail[0].des;
                            if (flag != "0") {
                                dialog.log(des);
                            } else {
                                var billList = result.jsonDatas.getApprovedDetail[0];
                                var makername = billList.makername;
                                if (billList.makername != undefined && makername.length > 5) {
                                    makername = makername.substring(0, 5) + "...";
                                }
                                var firstNote = "";
                                if (paramUser.ncversion == "NC65") {
                                    firstNote = billList.flowhistory == null ? "" : billList.flowhistory[0].advice
                                } else {
                                    firstNote = (billList.approvehistorylinelist == null || billList.approvehistorylinelist.length <= 0) ? "" : billList.approvehistorylinelist[0].note
                                }
                                firstNote = firstNote == null ? "" : firstNote; // 防止出现null/undefined的情况
                                var _section = $('<section data-psnid=' + billList.psnid + '>' +
                                    '<span class="point-time point-yellow"></span><span class="greenline"></span>' +
                                    '<aside>' +
                                    '<div class="brief">' +
                                    '<div class="left_jt"></div>' +
                                    '<p class="text-yellow"><a href="javascript:void(0);" class="handlername" data-psnid=' + billList.psnid + '>' + makername + '</a><span>' + billList.submitdate + '</span></p>' +
                                    '<p class="text-time"><font class="submitLabelInfo">发起人</font><span>' + firstNote + '</span></p>' +
                                    '</div>' +
                                    '</aside>' +
                                    '</section>');
                                $("#" + _thisId + " article").append(_section);
                                var linelist = paramUser.ncversion == "NC65" ? billList.flowhistory : billList.approvehistorylinelist;
                                if (linelist != null && linelist != "" && typeof(linelist) != "undefined") {
                                    for (var i = 1; i < linelist.length; i++) {
                                        var pointStyle, lineStyle, fontStyle;
                                        var actonName = paramUser.ncversion == "NC65" ? (linelist[i].actionname == undefined ? "" : linelist[i].actionname) : (linelist[i].action == undefined ? "" : linelist[i].action);
                                        var time = paramUser.ncversion == "NC65" ? (linelist[i].time == undefined ? "" : linelist[i].time) : (linelist[i].handledate == undefined ? "" : linelist[i].handledate);//linelist[i].time : linelist[i].handledate;
                                        var note = paramUser.ncversion == "NC65" ? (linelist[i].advice == undefined ? "" : linelist[i].advice) : (linelist[i].note == undefined ? "" : linelist[i].note);//linelist[i].advice : linelist[i].handledate;
                                        var psnid = paramUser.ncversion == "NC65" ? (linelist[i].personlist == undefined ? "" : linelist[i].personlist[0].ownerId) : (linelist[i].psnid == undefined ? "" : linelist[i].psnid);//linelist[i].advice : linelist[i].handledate;

                                        if (actonName) {
                                            if ((actonName.indexOf("不") >= 0) || (actonName.indexOf("驳") >= 0)) {
                                                pointStyle = "point-time3";
                                                lineStyle = "redline";
                                                fontStyle = "text-time2";
                                            } else {
                                                pointStyle = "point-time2";
                                                lineStyle = "greenline";
                                                fontStyle = "text-time";
                                            }

                                            var alert;
                                            if (i == (linelist.length - 1)) {
                                                alert = '<span class="' + pointStyle + ' point-yellow"></span>';
                                            } else {
                                                alert = '<span class="' + pointStyle + ' point-yellow"></span><span class="' + lineStyle + '"></span>';
                                            }
                                            var handlername = linelist[i].handlername;//linelist[i].personlist[0].ownerName;
                                            if (paramUser.ncversion == 'NC65') {
                                                handlername = linelist[i].personlist == undefined ? "" : linelist[i].personlist[0].ownerName;
                                            }
                                            if (handlername && handlername.length > 5) {
                                                handlername = handlername.substring(0, 5) + "...";
                                            }
                                            var _section = '<section>' +
                                                alert +
                                                '<aside>' +
                                                '<div class="brief">' +
                                                '<div class="left_jt"></div>';
                                            if (linelist[i].handwriteflag == "Y") {
                                                _section += '<p class="text-yellow"><a href="javascript:void(0);" class="handlername" data-psnid=' + psnid + '>' + handlername + '</a>&nbsp;&nbsp;<a href="javascript:void(0)" data-mark="' + linelist[i].markStr + '" class="handWrite">手写查看</a><span>' + time + '</span></p>';
                                            } else {
                                                _section += '<p class="text-yellow"><a href="javascript:void(0);" class="handlername" data-psnid=' + psnid + '>' + handlername + '</a><span>' + time + '</span></p>';
                                            }

                                            _section += '<p class="' + fontStyle + '">' + actonName + '<span>' + note + '</span></p>' +
                                                '</div>' +
                                                '</aside>' +
                                                '</section>';
                                            $("#" + _thisId + " article").append(_section);
                                        }

                                        // summer 显示当前审批人
                                        if( isSummer && !actonName && linelist[i].personlist ){
                                            (function(){

                                                var handlername = linelist[i].handlername;//linelist[i].personlist[0].ownerName;
                                                if (paramUser.ncversion == 'NC65') {
                                                    handlername = linelist[i].personlist == undefined ? "" : linelist[i].personlist[0].ownerName;
                                                }
                                                if( handlername ){
                                                    var _section = '<section>' +
                                                        '<span class="point-time"></span>'+
                                                        '<aside>' +
                                                        '<div class="brief">' +
                                                        '<div class="left_jt"></div>';
             
                                                        _section += '<p class="text-yellow"><a href="javascript:void(0);" class="handlername" data-psnid=' + psnid + '>' + handlername + '</a></p>'+
                                                        '</div>' +
                                                        '</aside>' +
                                                        '</section>';
                                                    $("#" + _thisId + " article").append(_section);
                                                }

                                            }())
                                        }
                                    }
                                }
                                //人员详细信息
                                $(".handlername").unbind().on("click", function () {
                                    var psnid = $(this).attr("data-psnid");
                                    _bill_detail.initPsnDetail(psnid);
                                });

                                //手写信息
                                $(".handWrite").unbind().on("click", function () {
                                    var markStr = $(this).attr("data-mark");
                                    window.sessionStorage.handWriteDataHistory = markStr;
                                    window.sessionStorage.historyFlag = "y";
                                    //页面跳转
                                    var url = window.location.href;
                                    var urlparam = url.split("?")[1];
                                    window.location.href = "OAHandWrite.html?" + urlparam;
                                });
                            }
                        }
                    }
                    loadNumber++;
                    _bill_detail.initIScroll();//加载弹性
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },
        /**
         * 查询附件列表
         */
        initMessageAttachmentList: function () {

            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getMessageAttachmentList: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey
                }
            };
            //console.log("传入参数：" + JSON.stringify(param));

            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
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

                    result = eval('(' + result + ')');
                    //console.log("查询附件列表 返回JSON数据串为：" + JSON.stringify(result));
                    //显示文件数目
                    if (result.code == "0" && result.jsonDatas.getMessageAttachmentList[0].flag == "0") {
                        $("#firstLineInfoUl").show();
                        $(".attachmentNumber").html("<span>" + eval("billDetailLang." + paramUser.lang + ".pageMessage.accessory") + "（" + result.jsonDatas.getMessageAttachmentList[0].count + "）</span>");
                        $(".attachmentNumber").show();
                        //附件列表保存到本地，用于下一个页面使用
                        window.sessionStorage.messageAttachmentList = JSON.stringify(result);
                    } else {
                        console.warn("无附件数据");
                        window.sessionStorage.messageAttachmentList = "";
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
         * 查询列表
         */
        initPersonList: function (type) {
            var param;
            //同意审批人列表
            if (type == "doAgree") {
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    getAssignPsnList: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        isagree: "Y",
                        startline: 1,
                        count: 25,
                        condition: ""
                    }
                };
                //不同意审批人列表
            } else if (type == "doDisAgree") {
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    getAssignPsnList: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        isagree: "N",
                        startline: 1,
                        count: 25,
                        condition: ""
                    }
                };
                //驳回人列表
            } else if (type == "doReject") {
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    getRejectNodeList: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        startline: 1,
                        count: 25,
                        condition: ""
                    }
                };
                //人员列表
            } else {
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    getUserList: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        startline: 1,
                        count: 25,
                        condition: ""
                    }
                };
            }

            //console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
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
                    result = eval('(' + result + ')');
                    //console.log("查询指派人员列表 返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        console.log(result.desc);
                        if (result.desc == null) {
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.designeeListfailed"));//"指派人员列表加载失败"
                        } else {
                            dialog.log(result.desc);
                        }
                    } else {
                        var userList;
                        //审批人列表
                        if (type == "doAgree" || type == "doDisAgree") {
                            userList = result.jsonDatas.getAssignPsnList;
                            //驳回人列表
                        } else if (type == "doReject") {
                            userList = result.jsonDatas.getRejectNodeList;
                            //人员列表
                        } else {
                            userList = result.jsonDatas.getUserList;
                        }
                        if (userList.length > 0) {
                            if (userList[0].flag != "0") {
                                if (userList[0].des == null) {
                                    dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.designeeListfailed"));//"指派人员列表加载失败"
                                } else {
                                    dialog.log(userList[0].des);
                                }
                            } else {
                                var list = userList[0].psnstructlist;
                                if (list == "" || typeof(list) == "undefined") {
                                    $("#showUserList").hide();
                                    $(".assign_people_ul li").eq(1).text(eval("billDetailLang." + paramUser.lang + ".pageMessage.noFingerSentInfo"));//"无指派人"
                                    $(".assign_people").hide();
                                } else {
                                    $(".assign_people").show();
                                    $("#showUserList").show();
                                }
                                $("#userList .contact_person_count").html("");
                                for (var i = 0; i < list.length; i++) {
                                    var _person;
                                    var personName = _bill_detail.substrLength(list[i].name, 12);

                                    if (i == 0) {
                                        _person = $('<div class="contact_person selectPerson" data-code="' + list[i].code + '" data-id="' + list[i].id + '"><span>' + personName + '</span><i></i></div>');
                                    } else {
                                        _person = $('<div class="contact_person" data-code="' + list[i].code + '" data-id="' + list[i].id + '"><span>' + personName + '</span></div>');
                                    }

                                    $("#userList .contact_person_count").append(_person);
                                }

                            }
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
         * 获得人员详细信息
         */
        initPsnDetail: function (psnid) {
            // 华衍水务 跳转地址传递psid
            goIm_psid = psnid ;

            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getPsnDetail: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    psnid: psnid
                }
            };
            //console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
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
                    result = eval('(' + result + ')');
                    //console.log("返回数据：" + JSON.stringify(result));
                    var code = result.code;
                    var desc = result.desc;
                    if (code != "0") {
                        console.log(desc);
                        dialog.log("获取用户信息失败");
                    } else {
                        var psnDetail = result.jsonDatas.getPsnDetail;
                        if (psnDetail.length > 0) {
                            var flag = result.jsonDatas.getPsnDetail[0].flag;
                            var des = result.jsonDatas.getPsnDetail[0].des;
                            var pdes = result.jsonDatas.getPsnDetail[0].pdes;
                            var pname = result.jsonDatas.getPsnDetail[0].pname;
                            var contactinfolist = result.jsonDatas.getPsnDetail[0].contactinfolist;
                            if (flag != "0") {
                                console.log(des);
                                dialog.log("获取用户信息失败");
                            } else {
                                
                                // 华衍水务 链接im 图片显示隐藏 ;
                                var style = "display:none" ;
                                try {
                                    if( isSummer ){
                                       style = "display:block" ;
                                    }
                                }catch(e){}

                                //清空变量
                                $("#personInfo").html("");
                                $("#link").html("");
                                var personInfoLabel = result.jsonDatas.getPsnDetail[0].pname;//+'&nbsp;' + result.jsonDatas.getPsnDetail[0].pdes;
                                personInfoLabel = _bill_detail.substrLength(personInfoLabel, 12);
                                var link = $('<div class="link" id="link">' +
                                    '<ul class="link_ul">' +
                                    '<li class="name">' + eval("billDetailLang." + paramUser.lang + ".pageMessage.personInfo") + '</li>' +//人员信息
                                    '<li class="number"><span>' + personInfoLabel + '</span> <img style="'+style+'" src="images/imim.png" class="webview_GoIm_img"/></li>' +
                                    '</ul>');

                                var infoList = '';
                                for (var i = 0; i < contactinfolist.length; i++) {
                                    var propvalue = contactinfolist[i].propvalue;
                                    //判断是电话还是邮件属性
                                    var propnameShow = "";
                                    if (propvalue.indexOf("@") >= 0) {
                                        propnameShow = '<li class="number"><span><a href="mailto:' + contactinfolist[i].propvalue + '">' + contactinfolist[i].propvalue + '</a></span></li>'
                                    } else {
                                        //电话
                                        propnameShow = '<li class="number"><span><a href="tel:' + contactinfolist[i].propvalue + '">' + contactinfolist[i].propvalue + '</a></span></li>';
                                        /*if(/^1[3|4|5|7|8]\d{9}$/.test(contactinfolist[i].propvalue)) { //手机，显示发短信和打电话
                                         propnameShow = '<li class="number"><span><a href="javascript:void(0);">'+contactinfolist[i].propvalue+'</a></span><a href="tel:'+contactinfolist[i].propvalue+'" class="tel_call"></a><a href="sms://'+contactinfolist[i].propvalue+'" class="sms_call"></a></li>';
                                         } else if(/^(\(\d{3,4}\)|\d{3,4}-|\s)?\d{7,14}$/.test(contactinfolist[i].propvalue)) { //固话，只显示打电话
                                         propnameShow = '<li class="number"><span><a href="tel:'+contactinfolist[i].propvalue+'">'+contactinfolist[i].propvalue+'</a></span><a href="tel:'+contactinfolist[i].propvalue+'" class="tel_call"></a></li>';
                                         }*/
                                    }
                                    infoList += '<ul class="link_ul">' +
                                        '<li class="name">' + contactinfolist[i].propname + '</li>' + propnameShow +
                                        '</ul>';
                                }
                                //批接信息
                                link.append(infoList);
                                link.append('<div  class="im_go" style="background:transparent;width:100%;position:absolute;top:0;height:46px;z-index:999"></div>');
                                link.append($('<div class="link_cancel" id="closeLink">' + eval("billDetailLang." + paramUser.lang + ".pageMessage.cancelLabel") + '</div>'));//取消
                                link.append('</div>');
                                $("#personInfo").append(link).show();


                                // 华衍水务绑定信息 ;
                                document.querySelector('.webview_GoIm_img')['imData'] = result.jsonDatas.getPsnDetail[0] ;
                                try {
                                    if( isSummer ){
                                        $(".im_go").unbind().on("click", function () {
                                            $('.webview_GoIm_img').trigger('goImEvent');
                                        });
                                    }
                                }catch(e){}

                                //事件绑定
                                $(".link_cancel").unbind().on("click", function () {
                                    $("#personInfo").hide();
                                });
                            }
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
         * 参数：str需要截取的字符串
         * 功能：若str长度大于等于28则截取前28个字符，若字符串str长度小于28则后面补上空格凑足28位
         * 返回：28位的字符串
         */
        substrLength: function (str, len) {
            var str_len = 0;
            var res_str = '';
            if (str) {
                var i = 0;
                for (i = 0; i < str.length; i++) {
                    if (_bill_detail.isAZaz09(str[i])) {//字符为0-9、a-z、A-Z
                        str_len++;
                    } else {
                        str_len += 2;
                    }
                    if (str_len >= 2 * len) {
                        break;
                    }

                }
                console.log("i==" + i + ",len==" + len);
                if (i < len) {//字符串不足
                    res_str = str.substr(0, i);
                } else {//字符串过长，截取，加...
                    res_str = str.substr(0, i);
                    res_str += '...';
                }
            }

            return res_str;
        },
        /**
         * 判断字符是否为0-9、a-z、A-Z，是返回true,否返回false
         * 传入参数：一个字符char_c
         */
        isAZaz09: function (char_c) {
            var Regx = /^[A-Za-z0-9]*$/;
            if (Regx.test(char_c)) {
                return true;
            }
            else {
                return false;
            }
        },
        /**
         * 加载iscroll
         */
        initIScroll: function () {

            //在ios上沿用原来的iscroll效果,在andriod下就不加载iscroll效果，因为andriod不适用iscroll滑动效果也不错。
            if (loadNumber == 5 && isiOS) {

                // 注销 iscroll ;
                return ;
                
                if (typeof(_iscroll) != "undefined") {
                    _iscroll.destroy();
                }
                _iscroll = new iScroll('dillDetail', {
                    scrollbarClass: 'myScrollbar',
                    hScroll: true,
                    vScroll: true,
                    probeType: 3,
                    bounce: true,
                    momentum: true,
                    zoom: false,
                    scrollX: true,
                    scrollY: true,
                    mouseWheel: true,
                    wheelAction: 'zoom',
                    onRefresh: function () {
                        var _y = this.y;
                        srocllEvent(_y);
                    },
                    onScrollMove: function () {

                        var _y = this.y;
                        srocllEvent(_y);

                    },
                    onScrollEnd: function () {
                        var _y = this.y;
                        srocllEvent(_y);
                    }
                });
                _iscroll.refresh();
            }
        }
    };
    return _bill_detail;
});


//滚动单据明细固定顶部
function srocllEvent(_y) {
    
    // 禁止头部跟随 ;
    return ;

    try {
        var navTabTop = $("#navTab").offset().top;
        var billNameTop = $("#billName").offset().top;
        var billNameHeigth = $("#billName").height();
        var number = (navTabTop - billNameTop);
        var navHeight = $("#navTab").height();
        $("#navTabHeight").height(navHeight);
        var navTabHeightTop = $("#navTabHeight").offset().top;
        if (navTabTop < 0) {
            if (number == billNameHeigth) {
                $("#navTab").addClass("nav-wrapper-fixed");
                $("#navTabHeight").show();
                topHeight = -_y;
                $("#navTab").css("top", topHeight);
            } else {
                topHeight = -_y;
                $("#navTab").css("top", topHeight);
            }
        } else {
            if (navTabHeightTop > 0) {
                $("#navTab").removeClass("nav-wrapper-fixed");
                $("#navTabHeight").hide();
            } else {
                topHeight = -_y;
                $("#navTab").css("top", topHeight);
            }
        }
    } catch(e) {

    }
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
/**
 * 当驳回、改派、加签...时
 * 根据搜索框内容，过滤人员列表
 */
var searchUserList = function (value) {

    var $userList = $('#userList').find('.contact_person').find('span');//获取人员列表
    //$userList.closest('.contact_person').css('display', 'block');

    $userList.each(function (index, elem) {

        $(this).closest('.contact_person').css('display', 'block');
    })

    $userList.each(function (index, elem) {

        if ($(this).text().indexOf(value) == -1) {//含有该搜索字符串
            $(this).closest('.contact_person').css('display', 'none');
        }
    })
};



/**
 * @description 友空间 , 修改标题文档 ;;
 */
function YKJ_CHANGE_TITLE(title){

    connectWebViewJavascriptBridge(function(YonYouJSBridge) {
        try{
            YonYouJSBridge.init(function(message, responseCallback) {});
            var data = {
                'function': 'configNavBar',
                parameters: {
                    centerItems: [
                        {
                            title: title,
                            hideShadowImage:0
                        }
                    ]
                }
            };
            YonYouJSBridge.send(JSON.stringify(data), function(responseData) {});
        }catch(e){}
    }) ;
}
// 友空间换头 ;;;
function connectWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) {
        callback(WebViewJavascriptBridge);
    } else {
        document.addEventListener('WebViewJavascriptBridgeReady', function() {
            callback(WebViewJavascriptBridge);
        }, false);
    }
}

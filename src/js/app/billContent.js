define(["zepto", "iscroll", "dialog", "components/Confirm"], function ($, isc, dialog, Confirm) {
    var paramUser = JSON.parse(window.sessionStorage.paramUser);
    var paramData = getURLparams();
    var loadingHideNumber = 0;
    var _iscroll, table_width, table_height;
    //判断浏览器类型
    var u = navigator.userAgent, app = navigator.appVersion;
    var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1; //android终端或者uc浏览器
    var isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    var client = isiOS ? "ios" : (isAndroid ? "android" : "other");

    // 华衍水务 判断是不是summer浏览器打开
    var ua = window.navigator.userAgent ;
    window.isSummer=false ;
    if( ua.indexOf('SummerBrowser')!=-1 ){
        isSummer = true ;
    };

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
    
    var _chart = {
        /**
         *初始化
         */
        init: function () {
            //设备横屏竖屏事件
            window.addEventListener("onorientationchange" in window ? "orientationchange" : "resize", _chart.orienta, false);
            _chart.lightAppMultilingual();
            if (isWeiXin()) {
                _chart.weixinHideShare();//微信禁止分享
            }
            _chart.initHeightStyle();
            _chart.initTaskBillContent();
            _chart.initOperator();	//单据任务操作

        },
        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {
            //首先设置title
            var $body = $('body');
            document.title = eval("billContentLang." + paramUser.lang + ".pageTitle");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);
            //然后设置页面显示的汉字
            for (var i in eval("billContentLang." + paramUser.lang + ".pageContent")) {
                //i即属性名字ok,close
                console.log("key===" + i + ",value==" + eval("billContentLang." + paramUser.lang + ".pageContent." + i));
                $("." + i).html(eval("billContentLang." + paramUser.lang + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("billContentLang." + paramUser.lang + ".pagePlaceHoder")) {
                //i即属性名字ok,close
                console.log("placeholder key===" + i + ",value==" + eval("billContentLang." + paramUser.lang + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("billContentLang." + paramUser.lang + ".pagePlaceHoder." + i));
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
            $("#pictrue").width(_width).height(_height);
        },
        verticalFunction: function () {
            var contain = document.getElementById('pictrue');
            var cheight = document.body.clientHeight;
            var body = document.getElementsByTagName('body').item(0);
            var hw = window.innerWidth;
            var hh = window.innerHeight;

            if (window.orientation == 180 || window.orientation == 0) {
                body.style.width = hh + 'px';
                body.style.height = cheight + 'px';
                body.style.webkitTransform = body.style.transform = 'rotateZ(90deg)';
            } else {


            }
        },
        /**
         *单据全貌
         */
        initTaskBillContent: function () {

            var param = {
                serviceid: "sp63_fileservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getTaskBillContent: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey
                }
            };
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $("#loding").show();
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
//					    	console.log("返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        $("#taskAction").hide();
                        _chart.show_nodata(eval("billContentLang." + paramUser.lang + ".pageMessage.noBillContent"));//'无单据全貌'
                        //dialog.log(result.desc);
                        console.log(result.desc);
                    } else {
                        var flag = result.jsonDatas.getTaskBillContent[0].flag;
                        var des = result.jsonDatas.getTaskBillContent[0].des;

                        if (flag != "0") {
                            $("#taskAction").hide();
                            _chart.show_error(des);
                            //dialog.log(des);
                            console.log(des);
                        } else {
                            if (result.jsonDatas.getTaskBillContent[0].htmlcontent != undefined
                                && result.jsonDatas.getTaskBillContent[0].htmlcontent.length != 0) {
                                var htmlname = result.jsonDatas.getTaskBillContent[0].htmlcontent[0].htmlname;
                                var htmlfile = result.jsonDatas.getTaskBillContent[0].htmlcontent[0].htmlfile;
                                /*if(Object.prototype.toString.call(htmlfile) === '[object Array]') {
                                    htmlfile = String.fromCharCode.apply(null, new Uint8Array(htmlfile));
                                    htmlfile = btoa(htmlfile);
                                }*/
                                var billinfo = utf8to16(base64decode(htmlfile));

                                console.log(billinfo);

//						    			$("body").html(billinfo);
                                $(".document_detail div").html(billinfo);

                                // summer去掉96px不换行
                                if( isSummer ){
                                    $(".document_detail table td").css("width", "").removeAttr("width");
                                    // $(".document_detail table td").removeAttr("font-size").css("font-size", "96px");
                                }else{
                                    $(".document_detail table td").css("width", "").removeAttr("width").attr("nowrap", "nowrap");
                                    $(".document_detail table td").removeAttr("font-size").css("font-size", "96px");
                                }

//						    			_chart.verticalFunction();	
                                //ios和andorid分开进行
                                if (client == "ios") {
                                    _chart.initBindEvent();
                                } else {
                                    _chart.changeTableStyle();
                                }

                                loadingHideNumber++;

                                if (loadingHideNumber > 1) {
                                    $("#loding").hide();
                                }

                            } else {
                                $("#taskAction").hide();
                                _chart.show_nodata(eval("billContentLang." + paramUser.lang + ".pageMessage.noBillContent"));//'无单据全貌'
                            }

                        }
                    }
                    $("#loding").hide();

                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#taskAction").hide();
                    _chart.show_error(eval("billContentLang." + paramUser.lang + ".pageMessage.failure"));//'执行函数失败'
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });

        },
        orienta: function () {

            if (window.orientation == 180 || window.orientation == 0) {
                _chart.changeTableStyle();
                return;
            }
            if (window.orientation == 90 || window.orientation == -90) {
                _chart.changeTableStyle();
            }
        },

        /**
         *根据屏幕宽度，动态是表格居中
         */
        changeTableStyle: function () {

            //$(".document_detail div").html(billinfo);
            //每次还原表格缩放
            $(".document_detail div>table").css({
                "transform": "scale(" + 1 + ")",
                "-ms-transform": "scale(" + 1 + ")", //IE 9
                "-moz-transform": "scale(" + 1 + ")", //Firefox
                "-webkit-transform": "scale(" + 1 + ")", //Safari and Chrome
                "-o-transform": "scale(" + 1 + ")" //Opera
            });

            setTimeout(function() {
                _chart.initHeightStyle();
                var _width = $(window).width();
                var _height = $(window).height();
                var _top = 0;

                $('.document_detail div>table').each(function (index, element) {
                    var table_height = $(this).height();
                    var table_width = $(this).width();
                    var scale_num = _width / table_width;
                    var left = -(table_width * 0.5 * (1 - scale_num));
                    var top = -((table_height) * 0.5 * (1 - scale_num)) + _top;
                    $(element).css({
                        "transform": "scale(" + scale_num + ")",
                        "-ms-transform": "scale(" + scale_num + ")", //IE 9
                        "-moz-transform": "scale(" + scale_num + ")", //Firefox
                        "-webkit-transform": "scale(" + scale_num + ")", //Safari and Chrome
                        "-o-transform": "scale(" + scale_num + ")", //Opera
                        "position": "absolute",
                        "left": left + "px",
                        "top": top + "px"
                    });
                    _top = _top + $(this).height();
                });
                $("#pictrue div").height(_top).css('padding-bottom', '20px');

                if (typeof(_iscroll) != "undefined") {
                    _iscroll.destroy();
                }
                _iscroll = new iScroll('pictrue', {
                    zoom: true,
                    scrollX: true,
                    scrollY: true,
                    mouseWheel: true,
                    wheelAction: 'zoom',
                    zoomMax: 4
                });

                document.addEventListener('touchmove', function (e) {
                    e.preventDefault();
                }, false);
            }, 250);

        },
        /**
         *事件绑定，ios专用
         */
        initBindEvent: function () {

            //$(".document_detail div").html(billinfo);
            /*
             //每次还原表格缩放
             $(".document_detail div>table").css({
             "transform":"scale("+ 1 +")",
             "-ms-transform":"scale("+ 1 +")", //IE 9
             "-moz-transform":"scale("+ 1 +")", //Firefox
             "-webkit-transform":"scale("+ 1 +")", //Safari and Chrome
             "-o-transform":"scale("+ 1 +")" //Opera
             });

             _chart.initHeightStyle();*/
            var _width = $(window).width();
            var _height = $(window).height();
            var _widthArray = [];
            /*var table_height = $(".document_detail div>table").height();
             var table_width = $(".document_detail div>table").width();*/
            var scale_num = 1;
            var fate = 1;
            var _top = 0;
            $(".document_detail div>table").each(function (index, elem) {
                fate = 1;
                var table_height = $(this).height();
                var table_width = $(this).width();
                while (true) {
                    scale_num = (_width / table_width) * fate;
                    //var left = -(280-(_width-200)*0.38);
                    //var left = -((table_width-_width)*0.5 - (_width-table_width*scale_num)*0.5);
                    var left = -(table_width * 0.5 * (1 - scale_num));
                    //var top = -((table_height-table_height*scale_num)*0.2 + _height*0.13)
                    var top = -((table_height) * 0.5 * (1 - scale_num)) + _top;
                    $(this).css({
                        "transform": "scale(" + scale_num + ")",
                        "-ms-transform": "scale(" + scale_num + ")", //IE 9
                        "-moz-transform": "scale(" + scale_num + ")", //Firefox
                        "-webkit-transform": "scale(" + scale_num + ")", //Safari and Chrome
                        "-o-transform": "scale(" + scale_num + ")", //Opera
                        "position": "absolute",
                        "left": left + "px",
                        "top": top + "px"
                    });

                    var tableHeight = $(this).height();
                    var tableWidth = $(this).width();
                    console.log("fate=== " + fate + ", scale_num===" + scale_num + ",winHeight=== " + _height + ", table height===" + tableHeight);
                    fate += 0.5;
                    if (tableHeight >= (_height / ($(".document_detail div>table").length) * 0.1)) {
                        _top += tableHeight;
                        _widthArray.push(tableWidth);
                        break;
                    }
                }
            });
            var divHeight = _top;
            var divWidth = Math.max.apply(null, _widthArray);
            $("#pictrue div").height(divHeight);
            $("#pictrue div").width(divWidth);

            // if (typeof(_iscroll) != "undefined") {
            //     _iscroll.destroy();
            // }
            // _iscroll = new iScroll('pictrue', {
            //     scrollbarClass: 'myScrollbar',
            //     checkDOMChanges: true,
            //     zoom: true,
            //     scrollX: true,
            //     scrollY: true,
            //     mouseWheel: true,
            //     wheelAction: 'zoom',
            //     zoomMax: 5
            // });

            // document.addEventListener('touchmove', function (e) {
            //     e.preventDefault();
            // }, false);
        },

        /**
         * 操作项控制
         */
        initOperator: function () {
            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getTaskAction: {
                    groupid: paramUser.groupid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,

                }
            };

            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $("#loding").show();
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
//	   		    	console.log("返回JSON数据串为：" + JSON.stringify(result));
//	   		    	return;

                    if (result.code != "0") {
                        console.log(result.desc);
                        if (result.desc == "" || result.desc == null) {
                            dialog.log(eval("billContentLang." + paramUser.lang + ".pageMessage.inquirefailedLoad"));//"查询动作列表加载失败"
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
                                //		   		 			console.log(JSON.stringify(taskAction));
                                var flag = taskAction[0].flag;
                                var des = taskAction[0].des;
                                if (flag != "0") {
                                    console.log(des);
                                    dialog.log(des);
                                } else {

                                    var actionstructlist = taskAction[0].actionstructlist;
                                    if (typeof(actionstructlist) == "undefined" || actionstructlist == "") {
                                        //			   		 				_chart.show_nodata(des);
                                        $("#taskAction").hide();
                                        return;
                                    }
                                    if (actionstructlist.length < 4) {
                                        for (var i = 0; i < actionstructlist.length; i++) {
                                            var code = actionstructlist[i].code;
                                            var _li;
                                            if (code == "doAgree") {
                                                _li = '<li><a href="javascript:void(0);" class="font_bold"><i class="approval"></i><span class="approveLabel1">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doDisAgree") {
                                                _li = '<li><a href="javascript:void(0);"><i class="no_approval"></i><span class="notApproveLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doReject") {
                                                _li = '<li><a href="javascript:void(0);"><i class="reject"></i><span class="dismissedLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else {
                                                _li = '<li><a href="javascript:void(0);"><i class="default"></i><span class="dismissedLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            }

                                            var actionUl = $('<ul class="task_detail" data-code=' + actionstructlist[i].code + '>' + _li + '</ul>');
                                            $("#taskAction").prepend(actionUl);
                                        }
                                    } else {
                                        for (var i = 0; i < 3; i++) {
                                            var code = actionstructlist[i].code;
                                            var _li;
                                            if (code == "doAgree") {
                                                _li = '<li><a href="javascript:void(0);" class="font_bold"><i class="approval"></i><span class="approveLabel1">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doDisAgree") {
                                                _li = '<li><a href="javascript:void(0);"><i class="no_approval"></i><span class="notApproveLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else if (code == "doReject") {//驳回
                                                _li = '<li><a href="javascript:void(0);"><i class="reject"></i><span class="notApproveLabel">' + actionstructlist[i].name + '</span></a></li>';
                                            } else {
                                                _li = '<li><a href="javascript:void(0);"><span class="dismissedLabel"><i class="other"></i>' + actionstructlist[i].name + '</span></a></li>';
                                            }
                                            if (i < 2) {
                                                var actionUl = $('<ul class="task_detail" data-code=' + actionstructlist[i].code + '>' + _li + '</ul>');
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
                                            var taskDiv = $('<div class="task_other_list" data-code=' + actionstructlist[j].code + '>' + actionstructlist[j].name + '</div>');
                                            $("#task_other").append(taskDiv);
                                        }
                                        //其他项显示
                                        $("#task_other").parents("ul").on("click", function () {
                                            var _this = $("#task_other").css("display");
                                            if (_this == "none") {
                                                $("#task_other").show();
                                            } else {
                                                $("#task_other").hide();
                                            }
                                        });
                                        $("#pictrue").on("click", function () {
                                            $("#task_other").hide();
                                        });
                                    }
                                    //审批动作
                                    $(".task_other_list,.task_detail").not($(".border_lfrt")).on("click", function () {
                                        var code = $(this).attr("data-code");
                                        $("#shenpi span").text($(this).text()).parent().attr("data-code", code);
                                        $(".assign_text").attr("placeholder", $(this).text());
                                        $("#task_other").hide();
                                        //同意，不同意
                                        if (code == "doAgree" || code == "doDisAgree") {
                                            $(".assignToLabel").text(eval("billContentLang." + paramUser.lang + ".pageMessage.assignToLabel"));//"指派给:"
                                            $(".assign_people_ul li").eq(1).text(eval("billContentLang." + paramUser.lang + ".pageMessage.assignPersonLabel"));//"请选择指派对象"
                                            //驳回
                                        } else if (code == "doReject") {
                                            $(".assignToLabel").text(eval("billContentLang." + paramUser.lang + ".pageMessage.refusalToLabel"));//"驳回给:"
                                            $(".assign_people_ul li").eq(1).text(eval("billContentLang." + paramUser.lang + ".pageMessage.refusalPersonLabel"));//"请选择驳回对象"
                                            //改派
                                        } else if (code == "doReassign") {
                                            $(".assignToLabel").text(eval("billContentLang." + paramUser.lang + ".pageMessage.reassignmentToLabel"));//"改派给:"
                                            $(".assign_people_ul li").eq(1).text(eval("billContentLang." + paramUser.lang + ".pageMessage.reassignmentPersonLabel"));//"请选择改派人员"
                                            //价签
                                        } else if (code == "doAddApprove") {
                                            $(".assignToLabel").text(eval("billContentLang." + paramUser.lang + ".pageMessage.assignToLabel"));//"指派给:"
                                            $(".assign_people_ul li").eq(1).text(eval("billContentLang." + paramUser.lang + ".pageMessage.addPersonLabel"));//"请选择加签人"
                                        }
                                        $("#assign").show();
                                        //默认先隐藏人员列表
                                        $(".assign_people").hide();

                                        if (code != "doBack") {
                                            _chart.initPersonList(code); //查询人员列表
                                        }
                                    });
                                }
                            }
                        }
                    }
                    loadingHideNumber++;
                    if (loadingHideNumber > 1) {
                        $("#loding").hide();
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
                    serviceid: "sp63_ispservice",
                    token: paramUser.token,
                    usercode: paramUser.ucode,
                    getAssignPsnList: {
                        groupid: paramUser.groupid,
                        usrid: paramUser.userid,
                        taskid: paramData.taskid,
                        isagree: "Y",
                        startline: 1,
                        count: 999,
                        condition: ""
                    }
                };
                //不同意审批人列表
            } else if (type == "doDisAgree") {
                param = {
                    serviceid: "sp63_ispservice",
                    token: paramUser.token,
                    usercode: paramUser.ucode,
                    getAssignPsnList: {
                        groupid: paramUser.groupid,
                        usrid: paramUser.userid,
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
                    serviceid: "sp63_ispservice",
                    token: paramUser.token,
                    usercode: paramUser.ucode,
                    getRejectNodeList: {
                        groupid: paramUser.groupid,
                        usrid: paramUser.userid,
                        taskid: paramData.taskid,
                        startline: 1,
                        count: 25,
                        condition: ""
                    }
                };
                //人员列表
            } else {
                param = {
                    serviceid: "sp63_ispservice",
                    token: paramUser.token,
                    usercode: paramUser.ucode,
                    getUserList: {
                        groupid: paramUser.groupid,
                        usrid: paramUser.userid,
                        taskid: paramData.taskid,
                        startline: 1,
                        count: 25,
                        condition: ""
                    }
                };
            }


            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $("#loding").show();
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
//	   		    	console.log("查询指派人员列表 返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        console.log(result.desc);
                        if (result.desc == null) {
                            dialog.log(eval("billContentLang." + paramUser.lang + ".pageMessage.designeeListfailed"));//"指派人员列表加载失败"
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
                                    dialog.log(eval("billContentLang." + paramUser.lang + ".pageMessage.designeeListfailed"));//"指派人员列表加载失败"
                                } else {
                                    dialog.log(userList[0].des);
                                }

                            } else {
                                var list = userList[0].psnstructlist;
                                if (list == "" || typeof(list) == "undefined") {
                                    $("#showUserList").hide();
                                    $(".assign_people_ul li").eq(1).text(eval("billContentLang." + paramUser.lang + ".pageMessage.noFingerSentInfo"));//"无指派人"
                                    $(".assign_people").hide();
                                } else {
                                    $(".assign_people").show();
                                    $("#showUserList").show();
                                }
                                $("#userList .contact_person_count").html("");
                                for (var i = 0, len = list.length; i < len; i++) {
                                    var _person,
                                        personName,
                                        item = list[i],
                                        id = item.id,
                                        name = item.name,
                                        code = item.code;
                                    personName = name + (code ? " (" + code + ")" : "");
                                    if (i == 0) {
                                        _person = $('<div class="contact_person selectPerson" data-code="' + code + '" data-id="' + id + '"><i></i><span>' + personName + '</span></div>');
                                        $(".assign_people_ul li").eq(1).text(personName);
                                    } else {
                                        _person = $('<div class="contact_person" data-code="' + code + '" data-id="' + id + '"><span>' + personName + '</span></div>');
                                    }
                                    $("#userList .contact_person_count").append(_person);
                                }
                                //加载事件
                                initOperatorEvent(type);

                            }
                        }
                    }
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });

            /** 审批动作事件绑定*/
            function initOperatorEvent(type) {
                // 搜索指派人员事件
                $('#search_input').unbind().on("keydown", function (event) {
                    if(event.keyCode === 13) {
                        // 未来可加入人员搜索的功能
                        event.preventDefault();
                        return false;
                    }
                });
                //审批和取消按钮
                $("#closeShenpi,#shenpi").unbind().on("click", function () {
                    if ($(this).attr("id") == "closeShenpi") {
                        $("#assign").hide();
                    } else {
                        $("#assign").hide();
                        //转圈去除
                        $("#loding").show();
                        var code = $(this).attr("data-code");
                        _chart.initDoAction(code);
                    }
                });
                //在指派列表中选择指派人，选中指派人
                $("#userList").unbind().on("click", ".contact_person", function () {
                    if (type == "doAddApprove") {
                        //将人员列表中选中图标都清除，给选中行加上选中图标   多选
                        if ($(this).find("i").length == 0) {
                            $(this).prepend("<i></i>").addClass("selectPerson");
                        } else {
                            $(this).removeClass("selectPerson").find("i").remove();
                        }
                    } else {
                        $(".contact_person").removeClass("selectPerson").find("i").remove();
                        $(this).prepend("<i></i>").addClass("selectPerson");
                    }
                });
                //指派人选择
                $("#userListCancal,#userListSure,#showUserList").unbind().on("click", function () {
                    var _this = $(this);
                    if (_this.attr("id") == "userListCancal") {			//取消指派人
                        $("#userList").hide();
                        $("#assign_count").show();
                    } else if (_this.attr("id") == "showUserList") {     //点击加号---弹出指派列表
                        //隐藏当前弹出框，显示指派列表弹出框
                        $("#assign_count").hide();
                        $("#userList").show();
                    } else {
                        var person1 = $(".selectPerson").eq(0).find("span").text();
                        var person2 = $(".selectPerson").eq(1).find("span").text();
                        var personInfo;
                        if ($(".selectPerson").length > 2) {
                            personInfo = person1 + "," + person2 + ",...";
                        } else if ($(".selectPerson").length == 0) {
                            personInfo = eval("billContentLang." + paramUser.lang + ".pageMessage.noFingerSentInfo");
                        } else if ($(".selectPerson").length == 1) {
                            personInfo = person1;
                        } else {
                            personInfo = person1 + "," + person2;
                        }
                        $(".assign_people_ul li").eq(1).text(personInfo);
                        //alert($(".selectPerson").length);
                        $("#userList").hide();
                        $("#assign_count").show();
                    }
                });
            }


        },
        /**
         * 审批动作
         */
        initDoAction: function (code) {

            //调用单据审批之前，需要验证是否需要相应的是批权限
            var paramCheck = {
                serviceid: "sp63_ispservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getPermByUserCode: {
                    usercode: paramUser.ucode,
                    dsName: "",
                    funcode: "A02002"
                }
            };
            //alert(JSON.stringify(paramCheck));
            $("#loding").show();
            $.ajax({
                type: "POST",
                url: contextPath() + "/umapp/reqdata?radom=" + Math.random(),
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(paramCheck),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                success: function (checkResult) {
                    //alert(checkResult.code);
                    //{"code":"0","desc":"执行成功","jsonDatas":{"getPermByUserCode":"0"}}
                    //执行成功
                    if (checkResult.code == "0") {
                        //有审批权限
                        if (checkResult.jsonDatas.getPermByUserCode == "0") {
                            //在此处，需要检查当前用户是否有费用，此次同步调用
                            /*
                        	$.ajax({
                                type: "GET",
                                url: contextPath() + "/checkfee/checkIsFee?domain=" + paramUser.domain + "&appkey=" + paramUser.appkey + "&ucode=" + paramUser.ucode + "&t=" + new Date().getTime(),
                                dataType: "json",
                                contentType: "application/json",
                                beforeSend: function (XMLHttpRequest) {
                                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                                    XMLHttpRequest.setRequestHeader("userid", paramUser.userid);
                                    XMLHttpRequest.setRequestHeader("username", paramUser.username);
                                },
                                success: function (result) {
                                    result = eval('(' + result + ')');
                                    if (result.code == "1") {
                                        dialog.log(eval("billContentLang." + paramUser.lang + ".pageMessage.noFeeInfo"));//"移动审批已欠费，请联系管理员"
                                        $("#loding").hide();//隐藏加载中图标
                                        return false;
                                    }
                                    //执行审批动作
                                    _chart.doActionFun(code);
                                    $("#loding").hide();
                                },
                                error: function (XMLHttpRequest, textStatus, errorThrown) {
                                    $("#loding").hide();//显示加载中图标
                                    dialog.log(eval("billContentLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//"网络连接失败，请您检查网络后重试"
                                }
                            });
                            */
                            //执行审批动作
                            _chart.doActionFun(code);
                            $("#loding").hide();
                        } else {
                            //转圈去除
                            $("#loding").hide();
                            dialog.log(eval("billContentLang." + paramUser.lang + ".pageMessage.notAuthedInfo"));//"您使用的是免费版本，无法使用审批功能，若要进行审批操作，请联系管理员"
                        }
                    } else {
                        //转圈去除
                        $("#loding").hide();
                        dialog.log(checkResult.desc);
                    }
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();
                    dialog.log(eval("billContentLang." + paramUser.lang + ".pageMessage.failure") + textStatus + ",errorthrown==" + errorThrown);//'执行函数失败'
//	   				console.log('执行函数失败' + textStatus + ",errorthrown==" + errorThrown);
                }
            });

        },

        /**
         * @description 根据审批类型和预算控制（可选）构造审批参数
         * @param {string} code 审批类型，如驳回、同意、不同意等
         * @param {object} [budgetCtrl] budgetCtrl 可选，预算控制参数，包含已处理的预算控制数组和待处理的预算控制
         * @param {object} [paramBody] paramBody 可选，上一次使用的参数，在此基础上增加/更新预算控制即可
         * @returns {object} 审批参数
         */
        createActionParam: function(code, budgetCtrl, paramBody) {
            var ResumeExceptionResult = [];
            if(budgetCtrl) {
                budgetCtrl.ResumeExceptionResult.push(budgetCtrl.ResumeExceptionType);
                ResumeExceptionResult = budgetCtrl.ResumeExceptionResult;
                if(paramBody) {
                    paramBody.doAction.actiondes[0].ResumeExceptionResult = ResumeExceptionResult;
                    return paramBody;
                }
            }
            var userids = [];
            var dataList = $(".selectPerson");
            if (dataList.length > 0) {
                for (var i = 0; i < dataList.length; i++) {
                    userids.push($(".selectPerson").eq(i).attr("data-id"));
                }
            }

            var approveNote = $(".assign_text").val() == "" ? $(".assign_text").attr("placeholder") : $(".assign_text").val(); //批语
            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                doAction: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    actiondes: [{
                        statuscode: paramData.statuscode,
                        statuskey: paramData.statuskey,
                        taskid: paramData.taskid,
                        actioncode: code,
                        note: approveNote + '(' + eval("billContentLang." + paramUser.lang + ".pageMessage.approveByQyjInfo") + ')',//"(来自移动端)"
                        actionstage: "0",
                        ResumeExceptionResult: ResumeExceptionResult
                    }]
                }
            };
            if(code == "doReject") {
                param.doAction.actiondes[0].rejectmarks = userids;
            } else if(code == "doAddApprove" && paramUser.ncversion == "NC65") {
                param.doAction.actiondes[0].bsignalusers = userids;
            } else {
                param.doAction.actiondes[0].userids = userids;
            }
            return param;
        },

        /**
         * @description 审批单据
         * @param {string} code 审批类型，如驳回、同意、不同意等
         * @param {object} [budgetCtrl] budgetCtrl 可选，预算控制参数，包含已处理的预算控制数组和待处理的预算控制
         * @param {object} [paramBody] paramBody 可选，上一次使用的参数，在此基础上增加/更新预算控制即可
         */
        doActionFun: function (code, budgetCtrl, paramBody) {
            var param = _chart.createActionParam(code, budgetCtrl, paramBody),
                taskid = paramData.taskid,
                url = contextPath() + "/umapp/approve?radom=" + Math.random();
            $("#loding").show();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                    XMLHttpRequest.setRequestHeader("domain", paramUser.domain);
                    XMLHttpRequest.setRequestHeader("client", paramUser.client);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    result = eval('(' + result + ')');
                    console.log("返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        dialog.log(result.desc);
                        console.log(result.desc);
                    } else {
                        var entity = result.jsonDatas.doAction[0],
                            flag = entity.flag,
                            des = entity.des;
                        if (flag == "1") {
                            dialog.log(des);
                        } else {
                            $("#assign").hide();
                            var budgetCtrl = entity[taskid];
                            // 无预算控制字段 || 无预算控制类型 || 已经处理的预算控制，均视为审批通过
                            if(!budgetCtrl || !budgetCtrl.ResumeExceptionType || budgetCtrl.ResumeExceptionResult.indexOf(budgetCtrl.ResumeExceptionType) > -1) {
                                dialog.log(des, function () {
                                    
                                    // 从审批中心进入 , 调回审批中心 ;
                                    var url = paramData['callbackurl']; 
                                    if( url ){
                                        url = decodeURIComponent(url);
                                        window.location.href = url ;
                                        return ;
                                    }
                                    window.location.href = "billList.html?" + window.sessionStorage.urlparam;
                                }, 2000);
                            } else {
                                var ResumeExceptionMsg = budgetCtrl.ResumeExceptionMsg || eval("billContentLang." + paramUser.lang + ".pageMessage.budgetCtrl"),
                                    confirm = new Confirm(eval("billContentLang." + paramUser.lang + ".pageContent.budgetCtrlTitle"), ResumeExceptionMsg, function() {
                                        _chart.doActionFun(code, budgetCtrl, param);
                                    });
                                confirm.show();
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
         * 数据长度为0时，提示无数据
         */
        show_nodata: function (message) {
            var window_height = document.documentElement.clientHeight;
            var window_width = document.documentElement.clientWidth;
            var _top = (window_height) * 0.33;
            var _height = window_height - _top;
            var no_data = $('<div class="error-none" style="padding-top:' + _top + 'px;' + 'height:' + _height + 'px;">'
                + '<table width="' + window_width + 'px" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="nodata_img" src="images/no_data.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');

            $(".document_detail div").html("").append(no_data);

        },
        /**
         * 报错时提示
         */
        show_error: function (message) {
            var window_height = document.documentElement.clientHeight;
            var window_width = document.documentElement.clientWidth;
            var _top = (window_height) * 0.33;
            var _height = window_height - _top;
            var error_data = $('<div class="error-none" style="padding-top:' + _top + 'px;' + 'height:' + _height + 'px;">'
                + '<table width="' + window_width + 'px" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $(".document_detail div").html("").append(error_data);

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
                    if (_chart.isAZaz09(str[i])) {//字符为0-9、a-z、A-Z
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
        }

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
 * base64解码
 * @param {Object} str
 */
function base64decode(str) {
    if(Object.prototype.toString.call(str) === '[object Array]') {
        // return String.fromCharCode.apply(null, new Uint8Array(str)); // 转换为html字符串
        
        var u8a = new Uint8Array(str);
        
        var CHUNK_SZ = 0x8000;
        var c = [];
        for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
            c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
        }
        return c.join(""); // 转换为html字符串
    }
    var base64DecodeChars = new Array(-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1);
    var c1, c2, c3, c4;
    var i, len, out;
    len = str.length;
    i = 0;
    out = "";
    while (i < len) {
        /* c1 */
        do {
            c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
        }
        while (i < len && c1 == -1);
        if (c1 == -1)
            break;
        /* c2 */
        do {
            c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
        }
        while (i < len && c2 == -1);
        if (c2 == -1)
            break;
        out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));
        /* c3 */
        do {
            c3 = str.charCodeAt(i++) & 0xff;
            if (c3 == 61)
                return out;
            c3 = base64DecodeChars[c3];
        }
        while (i < len && c3 == -1);
        if (c3 == -1)
            break;
        out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));
        /* c4 */
        do {
            c4 = str.charCodeAt(i++) & 0xff;
            if (c4 == 61)
                return out;
            c4 = base64DecodeChars[c4];
        }
        while (i < len && c4 == -1);
        if (c4 == -1)
            break;
        out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
    }
    return out;
}

function utf8to16(str) {
    var out, i, len, c;
    var char2, char3;
    out = "";
    len = str.length;
    i = 0;
    while (i < len) {
        c = str.charCodeAt(i++);
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                // 0xxxxxxx
                out += str.charAt(i - 1);
                break;
            case 12:
            case 13:
                // 110x xxxx 10xx xxxx
                char2 = str.charCodeAt(i++);
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx 10xx xxxx 10xx xxxx
                char2 = str.charCodeAt(i++);
                char3 = str.charCodeAt(i++);
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }
    return out;
}
/**
 * 当驳回、改派、加签...时
 * 根据搜索框内容，过滤人员列表
 */
function searchUserList(value) {

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
}
//判断为微信浏览器
function isWeiXin() {
    var ua = window.navigator.userAgent.toLowerCase();
    if (ua.match(/MicroMessenger/i) == 'micromessenger') {
        return true;
    } else {
        return false;
    }
}





define(["zepto", "iscroll", "dialog", "components/loginForm", "components/ContactInfo", "components/Confirm"], function ($, isc, dialog, loginForm, ContactInfo, Confirm) {

    var paramUser = "";
    //上个页面传过来的参数
    var paramData = getURLparams();

    var clientParam = "";
    //移动client判断
    //判断浏览器类型
    var u = navigator.userAgent, app = navigator.appVersion;
    var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1; //android终端或者uc浏览器
    var isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    var client = isWeiXin() ? "wechat" : (isiOS ? "ios" : (isAndroid ? "android" : "other"));
    paramData.client = client;

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
        uapmobile.goIm(usercode , taskid,appkey,domain,goIm_psid);
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
    
    var topHeight = 0;
    var detailData, _iscroll, loadNumber = 0;
    var continueFlag = true;
    //默认值赋值
    if (paramData.statuskey == "{statuskey}") {
        paramData.statuskey = "ishandled";
    }
    if (paramData.statuscode == "{statuscode}") {
        paramData.statuscode = "unhandled";
    }
    //alert(paramData.statuskey + ",statuscode===" + paramData.statuscode);
    var _bill_detail = {
        init: function () {
            if (paramData.actiontype === 'oapush') {
                var OADetailUrl = window.location.href.replace('detail.html', 'OADetail.html');
                window.location.replace(OADetailUrl);
                return false;
            }

            _bill_detail.iscrollArrayInit = {   // 参与构建页面的操作完成标志
                'initTaskBillContent': 0,
                'initTaskFlowChart': 0,
                'initOperator': 0,
                'initTaskDetails': 0,
                'initApproveDetail': 0,
                'initMessageAttachmentList': 0
            };
            Object.seal(_bill_detail.iscrollArrayInit); // 不可扩展，也不能删除已有属性

            _bill_detail.lightAppMultilingual();//多语化
            if (isWeiXin()) {
                _bill_detail.weixinHideShare();//微信禁止分享
            }
            //根据参数取得maurl
            //_bill_detail.initMaurl();
            //取得用户的登录信息以便调用接口开始业务
            _bill_detail.initUserParamData();
            //业务开始
            if (continueFlag) {
                _bill_detail.initListHeight();
                _bill_detail.initParamSet();//单据项目配置
                _bill_detail.initOperator();	//单据任务操作
                _bill_detail.initTaskBillContent();//单据全貌
                _bill_detail.initTaskFlowChart();//流程图
                _bill_detail.initTaskDetails();	//任务详情
                _bill_detail.initApproveDetail();//查询审批历史
                _bill_detail.initMessageAttachmentList();//附件列表
            }
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
        
        /**
         * @description 通过doamin和userid请求云平台用户登录数据
         * @param {object} user 用户信息对象
         */
        getUserInfoFromCloud: function (user) {
            $.ajax({
                type: "GET",
                async: false,
                url: contextPath() + '/umapp/getUserInfoFromCloud?domain=' + user.domain + "&userid=" + user.userid + '&t=' + Math.random(),//参数拼接
                dataType: "json",
                success: function (result) {
                    result = eval("(" + result + ")");
                    if (result.flag == "0"&&result.data.loginsysinfo != undefined) {
                         var loginSysInfoJSON = JSON.parse(result.data.loginsysinfo);
                         if(user.nctoken==undefined){
                          	user.nctoken= user.ncversion=="NC65"?loginSysInfoJSON.NC65.nctoken==undefined?loginSysInfoJSON.OA.token:loginSysInfoJSON.NC65.nctoken
                          			    :loginSysInfoJSON.NC.nctoken==undefined?loginSysInfoJSON.OA.token:loginSysInfoJSON.NC.nctoken;
                          }  
                         if(user.ucode==undefined){
                         	user.ucode= user.ncversion=="NC65"?loginSysInfoJSON.NC65.ucode==undefined?loginSysInfoJSON.OA.ucode:loginSysInfoJSON.NC65.ucode
                         			    :loginSysInfoJSON.NC.ucode==undefined?loginSysInfoJSON.OA.ucode:loginSysInfoJSON.NC.ucode;
                         }
                         if(user.groupid==undefined){
                         	user.groupid= user.ncversion=="NC65"?loginSysInfoJSON.NC65.groupid==undefined?loginSysInfoJSON.OA.groupid:loginSysInfoJSON.NC65.groupid
                         			    :loginSysInfoJSON.NC.groupid==undefined?loginSysInfoJSON.OA.groupid:loginSysInfoJSON.NC.groupid;
                         }                       
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();//隐藏加载中图标
                }
            });
            return user;
        },
        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {
            var lang = get_lang();
            //首先设置title
            var $body = $('body');
            document.title = eval("billDetailLang." + lang + ".pageTitle");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);
            //然后设置页面显示的汉字
            for (var i in eval("billDetailLang." + lang + ".pageContent")) {
                //i即属性名字ok,close
//					console.log("key===" + i + ",value==" + eval("billDetailLang." + paramUser.lang + ".pageContent." + i));
                $("." + i).html(eval("billDetailLang." + lang + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("billDetailLang." + lang + ".pagePlaceHoder")) {
                //i即属性名字ok,close
//					console.log("placeholder key===" + i + ",value==" + eval("billDetailLang." + paramUser.lang + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("billDetailLang." + lang + ".pagePlaceHoder." + i));
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
         *审批项设置
         */
        initParamSet: function () {
            //客户端配置数据
            //查询---light_ydsp_clientparam
            var param3 = {
                domainkey: paramData.domain
            };
            $.ajax({
                type: "POST",
                url: "/ncapprove/clientparam/search?t=" + new Date().getTime(),
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(param3),
                success: function (result) {
                    console.log("执行成功，返回数据为：result====" + JSON.stringify(result));
                    //alert(JSON.stringify(result));
                    var user = {};
                    if (result.flag == "0") {
                        var params = {};
                        //如果单据基本参数有设置，则赋值
                        if (result.data.length > 0 && result.data[0] != "") {
                            params.isapprovecheck = result.data[0].isapprovecheck;//是否启用批量审批批语检查 y启用 n禁用
                        }

                        if (window.localStorage) {
                            window.sessionStorage.clientParam = JSON.stringify(params);
                        }

                        clientParam = params;

                    } else {
                        _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.failure"));//'调用接口失败'
                        return;
                    }
                }
            });
        },
        //根据Userid取得用户信息
        initUserParamData: function () {
            var params = {
                userid: paramData.userid + paramData.domain,
                logininfo:paramData.code
            };
            console.log("userid===" + JSON.stringify(params));
            $.ajax({
                type: "POST",
                async: false,
                url: contextPath() + "/loginparam/search?t=" + new Date().getTime(),
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(params),
                success: function (rtnData) {
                    console.log("取得用户信息为：" + JSON.stringify(rtnData));
                    if (rtnData.flag == "0") {
                        //解析公共数据
                        if (rtnData.data.length > 0) {
                            _bill_detail.getCommonData(rtnData.data[0].logininfo);
                        } else {    // 已经注销，重新登录
                            _bill_detail.initMaurl();   // 获取maurl
                            $('#dillDetail').hide();
                            loginForm.show(contextPath(), paramData.maurl, "", function(err) {
                                dialog.log(err);
                            }, function(result) {
                                $('#dillDetail').show();
                                loginForm.hide();
                                _bill_detail.init();
                            });
                        }
                    } else {
                        _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.detailfailedLoad"));//单据详情信息加载失败
                        return false;
                    }
                    //登录成功时候
                    $("#loding").hide();//隐藏加载中图标
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();//隐藏加载中图标
                    //console.log('执行函数失败' + textStatus + ",errorthrown==" + errorThrown);
                    _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.networkfailedInfo"));//网络连接失败，请您检查网络后重试
                }
            });
        },
        /**
         * 获取公共参数，本页面和其他页面都需要的
         * 如token,ucode,domain等
         */
        getCommonData: function (urlparam) {
            //是否解析的标识
            var initUrlParam = true;
            try {
                //判断urlparam是否为空
                if (urlparam == "" || urlparam == undefined) {
                    //本地网页调试刷新用代码
                    if (window.sessionStorage.pageBtnArray) {
                        window.sessionStorage.pageBtnArray = '';
                        window.sessionStorage.pageHeaderBtn = '';//pageHeaderBtn[pageIndex] = headerBtnIndex
                        window.sessionStorage.pageFirstIn = '';
                    }
                    //为空取local保存的值
                    urlparam = window.sessionStorage.urlparam;
                    if (urlparam == "") {
                        _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.resultNull"));//'获取公共参数为空'
                    }
                } else {
                    //判断下是否调用后台解析登陆
                    if (window.sessionStorage.urlparam == urlparam && window.sessionStorage.paramUser) {
                        //直接加载数据
                        paramUser = JSON.parse(window.sessionStorage.paramUser);
                    }
                    window.sessionStorage.urlparam = urlparam;//保存参数值
                }
            } catch (e) {
                //_bill_detail.show_nodata('请关闭手机无痕模式进行浏览');
                dialog.log(eval("billDetailLang." + get_lang() + ".pageMessage.closeIncogMode"));//"请关闭手机无痕模式进行浏览"
                return;
            }

            //alert("urlparam===" + urlparam);
            if (initUrlParam) {
                $.ajax({
                    type: "GET",
                    async: false,
                    url: contextPath() + '/umapp/init?client=' + client + "&" + urlparam + '&t=' + Math.random(),//参数拼接
                    dataType: "json",
                    success: function (result) {
                        console.log(JSON.stringify(result));
                        var user = {};
                        //alert(result.flag);
                        if (result) {
                            if (result.flag == "0") {
                                if (result.data.foot) {
                                    //初始化数据
                                    _bill_detail.initLocalData(result);
                                    //隐藏加载中图标
                                    $("#loding").hide();
                                } else {
                                    _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.failure"));//'调用接口失败'
                                    continueFlag = false;
                                    $("#loding").hide();//隐藏加载中图标
                                }

                            } else {
                                $("#loding").hide();//隐藏加载中图标
                                _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.failure"));//'执行函数失败'
                                continueFlag = false;
                                return;
                            }
                        } else {
                            $("#loding").hide();//隐藏加载中图标
                            _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.failure"));//'调用接口失败'
                        }

                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        //alert(XMLHttpRequest + ",textStatus==" + textStatus);
                        $("#loding").hide();//隐藏加载中图标
                        _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.networkfailedInfo"));//'网络连接失败，请您检查网络后重试'
                        //dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//网络连接失败，请您检查网络后重试
                        return false;
                    }
                });
            }
        },
        /*
         * 将公共参数存储到本地，方便其他页面获取
         * 用于给本地存储赋值
         */
        initLocalData: function (result) {
            //参数赋值
            var user = {};
            /* user.maurl="http://10.1.72.135:8080";//result.data.body.url;
             user.userid="00014D10000000001SB3";//result.data.foot.userid;
             user.ucode="pad2";//result.data.foot.ucode;
             */
            user.maurl = paramData.maurl == undefined ? result.data.body.url : paramData.maurl;
            user.userid = result.data.foot.userid == undefined ? window.sessionStorage.userid : result.data.foot.userid;//'1002A210000000001XLB'
            user.ucode = result.data.foot.ucode;
            user.ncversion = result.data.body.nc_version || 'NC63';

            user.uname = result.data.foot.uname;
            user.domain = result.data.head.domain;
            user.appkey = result.data.head.appkey;
            if(result.data.head.system =="qyj" && result.data.body.dataSourceSystem=="NC+OA"){
                user = _bill_detail.getUserInfoFromCloud(user);
              }
            //取得token
           if(!user.token) user.token = result.data.foot.token || result.data.foot.nctoken;
           if(!user.groupid) user.groupid = result.data.foot.groupid || result.data.foot.pk_group;

            user.client = client;
            user.lang = get_lang();
            //console.log(JSON.stringify(user));
            //MA设置单据类型
            //html5调用本地存储
            if (window.localStorage) {
                //记录字符串对象
                window.sessionStorage.paramUser = JSON.stringify(user);
                //解密后放入本地大变量中去
                paramUser = JSON.parse(window.sessionStorage.paramUser);

            } else {
                $("#loding").hide();//隐藏加载中图标
                _bill_detail.show_nodata(eval("billDetailLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//'浏览器版本过低，请换用高版本再试'
                //dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.updateBrowser"));//'浏览器版本过低，请换用高版本再试'
                return;
            }
        },

        //查找相应的ma地址
        initMaurl: function () {
            var params = {
                domain: paramData.domain,
                appkey: paramData.appkey,
            };
            $.ajax({
                type: "POST",
                async: false,
                url: contextPath() + "/wechat/getmaurl?t=" + new Date().getTime(),
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(params),
                success: function (rtnData) {
                    rtnData = eval("(" + rtnData + ")");
                    console.log(rtnData.flag + ",rtnData.url==" + rtnData.data.url);
                    if (rtnData.flag == "0") {
                        if (rtnData.data.url != undefined) {
                            paramData.maurl = rtnData.data.url;
                        } else {
                            _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.getMafailure"));//取得相应的MA地址失败
                            continueFlag = false;
                            return false;
                        }

                        console.log("取得相应的MA地址为：" + JSON.stringify(paramData));
                    } else {
                        _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.getMafailure"));//取得相应的MA地址失败
                        return false;
                    }
                    //登录成功时候
                    $("#loding").hide();//隐藏加载中图标
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();//隐藏加载中图标
                    //console.log('执行函数失败' + textStatus + ",errorthrown==" + errorThrown);
                    _bill_detail.show_nodata(eval("billDetailLang." + get_lang() + ".pageMessage.networkfailedInfo"));//网络连接失败，请您检查网络后重试
                }
            });
        },

        /**
         * 计算高度
         */
        initListHeight: function () {
            var width = $(window).width();
            var height = $(window).height();
            if (paramData.statuskey == "submit") {
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
                serviceid: "sp63_ispservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getTaskBill: {//getNC63TaskList  //getTaskList
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                }
            };
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
//		   		    	console.log(JSON.stringify(result));
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
                            _bill_detail.show_nodata(des);
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
                                    var data = head[0] ;
                                    readHead( data ) ;
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
                    /*loadNumber++;
                    _bill_detail.initIScroll();//加载弹性*/
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });

            _bill_detail.iscrollArrayInit.initTaskDetails = 1;
            _bill_detail.initIScroll();//加载弹性


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
                    var _w = $("#navTab ul li").eq(i).width();
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

                    if(_iscroll && _iscroll.refresh) {
                        _iscroll.refresh();
                    }
                });
            }

            //加载头部之前处理 ;
            function readHead( data ){
                var headList = data.tabContent.billItemData;
                var hasHeadList = false ; //是否存在多表头
                window.headObj = {} ;
                       headObj[ data.tabName ] = [] ; //默认分组

                for (var i = 0; i < headList.length; i++) {
                    var each = headList[i] ;
                    var item, showName;
                    for ( var key in each ) {
                        if (key.split("itemShowName").length == 2) {
                            item = key.split("itemShowName")[0];
                            showName = key.split("itemShowName")[0] + "itemShowName";
                            break;
                        }
                    };
                    var itemName = eval('headList[i]["' + showName + '"]');

                    // 存在多表头 构造表头数组 ;
                    if( itemName.indexOf('#')!= -1 ){
                        !hasHeadList? hasHeadList=true : null ;

                        var name_ = itemName.split('#')[1]
                        if( !headObj[name_] ){
                            headObj[name_] = [] ;
                        }
                        // 过滤#
                        each[showName] = itemName.split('#')[0]
                        headObj[name_].push(each)
                    }else{
                        headObj[ data.tabName ].push(each)
                    }
                };
                console.log(headObj)

                if(!hasHeadList){
                  // 没有多表头正常显示
                    loadHead( headObj[ data.tabName ] ) ;
                }else{
                  // 存在多表头 显示表头 ;
                    for( var key in headObj ){
                        $('.head_tab').append( $('<li>').html(key) )
                    }
                    // 表头事件绑定 ;
                    $('body').on('click','.head_tab li',function(){
                        $('.head_tab .active').removeClass('active');
                        $(this).addClass('active') ;

                        var list = window.headObj[ $(this).html() ] ;
                        loadHead(list)
                    })
                    $('.head_tab').show() ;
                    // 触发第一个点击事件 ;
                    $('.head_tab li').eq(0).trigger('click')
                }
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
                    var orderLi = $('<li>' + itemName + '：<span>' + itemValue + '</span></li>');
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
                    $("#order_bill").append(countList);

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
                            if (itemData[j].digest == true) {
                                continue;
                            }
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
                        $("#order_bill").append(_orderUl);
                    }
                } else {
//			   			console.log(JSON.stringify(bodyList));
                    window.sessionStorage.bodyList = JSON.stringify(bodyList);
                    var countList = $('<div class="order_rows_title" id="orderRows">' +
                        '<span>' + eval("billDetailLang." + paramUser.lang + ".pageMessage.rowInfo") + '(<font style="color:#329fd0;">' + bodyList.length + '</font>)条</span>' +
                        '<div class="sq_count"><i class="sq"></i></div><div class="zk_count" style="display:none;"><i class="zk"></i></div>' +
                        '</div>');
                    var orderLisy = $('<div id="orderLisy"></div>');
                    $("#order_bill").append(countList).append(orderLisy);

                    for (var i = 0, listLen=bodyList.length; i < listLen; i++) {
                        var showName = [];
                        var itemData = bodyList[i].billItemData;
                        for (var j = 0, dataLen=itemData.length; j < dataLen; j++) {
                            if (itemData[j].digest) {
                                var itemShowName, item;
                                for (var key in itemData[j]) {
                                    if (key.split("itemShowName").length == 2) {
                                        itemShowName = key.split("itemShowName")[0] + "itemShowName";
                                        item = key.split("itemShowName")[0];
                                        break;
                                    }
                                }
                                var itemName = itemData[j][itemShowName];
                                itemName = itemName ? (itemName + ":") : "";
//				   					showName.push(eval("itemData[j]."+itemShowName));
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
                                showName.push(itemName + itemValue);
                            }
                        }
                        var show1 = typeof(showName[0]) == "undefined" ? "" : showName[0];
                        var show2 = typeof(showName[1]) == "undefined" ? "" : showName[1];
                        var show3 = typeof(showName[2]) == "undefined" ? "" : showName[2];
                        var show4 = typeof(showName[3]) == "undefined" ? "" : showName[3];
                        var tr1 = '<tr>' +
                            '<td rowspan="2" width="7%" valign="top" align="right"><span class="bill_name">' + (i + 1) + '.</span></td>' +
                            '<td width="55%" class="bill_name">' + show1 + '</td>' +
                            '<td width="38%" align="right"  class="bill_number bill_numbermargin">' + show2 + '</td>' +
                            '</tr>';
                        var tr2 = '<tr>' +
                            '<td class="bill_number">' + show3 + '</td>' +
                            '<td align="right" class="bill_number bill_numbermargin">' + show4 + '</td>' +
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
         *加载数据
         */
        initTaskFlowChart: function () {
            var param = {
                serviceid: "sp63_fileservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getTaskFlowChart: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    picid: "",
                    width: "100",
                    height: "100"
                }
            };
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
                    result = eval('(' + result + ')');
// 					    	console.log(JSON.stringify(result));
                    var isShowFlag = true;
                    if (result == "" || typeof(result) == "undefined") {
                        console.log("流程图加载失败");
                        isShowFlag = false;
                    } else {
                        if (result.code != "0") {
                            console.log(result.desc);
                            isShowFlag = false;
                        } else {
                            var jsonData = result.jsonDatas.getTaskFlowChart[0];
                            if ((!jsonData) || jsonData.flag == '1') {
                                isShowFlag = false;
                            } else {
                                $("#goFlowChart").show();
                                $("#firstLineInfoUl").show();
                            }
                        }
                    }

                    if (!isShowFlag) {
                        console.log("流程图加载失败");
                        $("#goFlowChart").hide();
                    }

                    /*loadNumber++;
                    _bill_detail.initIScroll();//加载弹性*/
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    //加载样式处理
                    $("#loding").hide();
                    $("#goFlowChart").hide();
                }
            });
            _bill_detail.iscrollArrayInit.initTaskFlowChart = 1;
            _bill_detail.initIScroll();//加载弹性
        },

        /**
         *单据全貌
         */
        initTaskBillContent: function () {
            //跳转到流程图
            $(".order_document_ul li").on("click", function () {
                var id = $(this).attr("id");
                if (id == "goFlowChart") {
                    window.location.href = "billFlowChart.html?statuskey=" + paramData.statuskey + '&statuscode=' + paramData.statuscode + '&taskid=' + paramData.taskid;
                } else if (id == "goTaskBill") {
                    var gourl = "billContent.html?statuskey=" + paramData.statuskey + '&statuscode=' + paramData.statuscode + '&taskid=' + paramData.taskid;
                    // 从审批中心进入 , 调回审批中心 ;
                    if( paramData['callbackurl'] ){
                        gourl += ('&callbackurl='+paramData['callbackurl']) ;
                    }
                    window.location.href = gourl ;
                }
            });

            //点击查看附件列表页面，事件绑定
            $(".attachmentNumber").on("click", function () {
                window.location.href = "annex.html";
            });

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
                    result = eval('(' + result + ')');
// 						    	console.log("返回JSON数据串为：" + JSON.stringify(result));
                    var isShowFlag = true;
                    if (result.code != "0") {
                        console.log(result.desc);
                        isShowFlag = false;
                    } else {
                        var flag = result.jsonDatas.getTaskBillContent[0].flag;
                        var des = result.jsonDatas.getTaskBillContent[0].des;
                        $("#goTaskBill").show();
                        $("#firstLineInfoUl").show();
                        if (flag != "0") {
                            isShowFlag = false;
                        } else {
                            $("#goTaskBill").show();
                            $("#firstLineInfoUl").show();
                        }
                    }
                    if (!isShowFlag) {
                        console.log("单据全貌不需要显示");
                        $("#goTaskBill").hide();
                    }

                    /*loadNumber++;
                    _bill_detail.initIScroll();//加载弹性*/
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    console.log("单据全貌不需要显示");
                    $("#goTaskBill").hide();
                    //加载样式处理
                    $("#loding").hide();
                    $("#goTaskBill").hide();
                }
            });
            _bill_detail.iscrollArrayInit.initTaskBillContent = 1;
            _bill_detail.initIScroll();//加载弹性
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
            $.ajax({
                type: "post",
                url: url,
                async : false,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    result = eval('(' + result + ')');
//		   		    	console.log("返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        console.log(result.desc);
                        var desc = result.desc || eval("billDetailLang." + paramUser.lang + ".pageMessage.inquirefailedLoad");
                        if(desc.indexOf("User session expired") >=0 || desc.indexOf("invalid secrity token") >=0) { // 重新登录
                            $('#dillDetail').hide();
                            loginForm.show(contextPath(), paramUser.maurl, "", function(err) {
                                dialog.log(err);
                            }, function(result) {
                                $('#dillDetail').show();
                                loginForm.hide();
                                _bill_detail.init();
                            });
                        } else {
                            dialog.log(desc);
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
                                            var actionUl = $('<ul class="task_detail" data-code=' + actionstructlist[i].code + '>' + _li + '</ul>');
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
                                        if (paramData.hint != "") {
                                            dialog.confirm(paramData.hint + "是否继续?", function () {
                                                _bill_detail.popOutApproveWindow(obj);
                                            });
                                        } else {
                                            //否则直接执行
                                            _bill_detail.popOutApproveWindow(obj);
                                        }
                                    });
                                }
                            }
                        }
                    }
                    /*loadNumber++;
                    _bill_detail.initIScroll();//加载弹性*/

                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
            _bill_detail.iscrollArrayInit.initOperator = 1;
            _bill_detail.initIScroll();//加载弹性
        },
        //弹出审批的窗口
        popOutApproveWindow: function (obj) {
            var code = obj.attr("data-code");
            $("#shenpi span").text(obj.text()).parent().attr("data-code", code);
            $(".assign_text").attr("placeholder", obj.text());
            if (clientParam.isapprovecheck == "y") {
                $(".assign_text").attr("placeholder", eval("billDetailLang." + paramUser.lang + ".pageMessage.assignInputLabel"));//"请输入审批意见");
            }

            $("#task_other").hide();
            //同意，不同意
            if (code == "doAgree" || code == "doDisAgree") {
                $(".assignToLabel").text(eval("billDetailLang." + paramUser.lang + ".pageMessage.assignToLabel"));//"指派给:"
                $(".assign_people_ul li").eq(1).text(eval("billDetailLang." + paramUser.lang + ".pageMessage.assignPersonLabel"));//"请选择指派对象"
                //驳回
            } else if (code == "doReject") {
                $(".assignToLabel").text(eval("billDetailLang." + paramUser.lang + ".pageMessage.refusalToLabel"));//"驳回给:"
                $(".assign_people_ul li").eq(1).text(eval("billDetailLang." + paramUser.lang + ".pageMessage.refusalPersonLabel"));//"请选择驳回对象"
                //改派
            } else if (code == "doReassign") {
                $(".assignToLabel").text(eval("billDetailLang." + paramUser.lang + ".pageMessage.reassignmentToLabel"));//"改派给:"
                $(".assign_people_ul li").eq(1).text(eval("billDetailLang." + paramUser.lang + ".pageMessage.reassignmentPersonLabel"));//"请选择改派人员"
                //价签
            } else if (code == "doAddApprove") {
                $(".assignToLabel").text(eval("billDetailLang." + paramUser.lang + ".pageMessage.assignToLabel"));//"指派给:"
                $(".assign_people_ul li").eq(1).text(eval("billDetailLang." + paramUser.lang + ".pageMessage.addPersonLabel"));//"请选择加签人"
            }
//		 			$("#assign").show();
//		 			//默认先隐藏人员列表
//		 			$(".assign_people").hide();
            if (code != "doBack") {
                _bill_detail.initPersonList(code); //查询人员列表
            } else {
                $("#assign").show();
                $(".assign_people").hide();
            }
            //加载事件
            _bill_detail.initOperatorEvent(code);

        },
        /**
         * 审批历史操作
         */
        initApproveDetail: function () {
            var _thisId;
            (paramData.statuskey != "ishandled") ? _thisId = "content" : _thisId = "content2";
            $("#" + _thisId).show();
            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getApprovedDetail: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    startline: 1,
                    count: 20
                }
            };
            var result_getApproveDetail = {};
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
//	   		    	console.log("返回JSON数据串为：" + JSON.stringify(result));
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
                                /*if (billList.makername != undefined && makername.length > 5) {
                                    makername = makername.substring(0, 5) + "...";
                                }*/
                                var linelist = billList.approvehistorylinelist,
                                    pointStyle = "",
                                    lineStyle = "",
                                    fontStyle = "",
                                    isListFull = linelist && linelist.length;
                                if(!isListFull) {
                                    pointStyle = ' point-gray';
                                    lineStyle = ' line-gray';
                                    fontStyle = ' text-gray';
                                }
                                var _section = $('<section data-psnid=' + billList.psnid + '>' +
                                    '<span class="point-time'+ pointStyle + '"></span><span class="contentline' + lineStyle + '"></span>' +
                                    '<aside>' +
                                    '<div class="brief">' +
                                    '<div class="left_jt"></div>' +
                                    '<p class="text-yellow">' + makername + '<span>' + billList.submitdate + '</span></p>' +
                                    '<p class="text-time' + fontStyle + '"><font class="submitLabelInfo">提交人</font><span>' + billList.billtypename + '</span></p>' +
                                    '</div>' +
                                    '</aside>' +
                                    '</section>');
                                $("#" + _thisId + " article").append(_section);
                                if (isListFull) {
                                    for (var i = 0, len=linelist.length; i < len; i++) {
                                        var action = linelist[i].action;
                                        if ((action.indexOf("不") >= 0) || (action.indexOf("驳") >= 0)) {
                                            pointStyle = " point-red";
                                            lineStyle = " line-red";
                                            fontStyle = " text-red";
                                        }  else if(action == '待审') { // 适配杭州绿城
                                            pointStyle = " point-gray";
                                            lineStyle = " line-gray";
                                            fontStyle = " text-gray";
                                        } else {
                                            pointStyle = lineStyle = fontStyle = '';
                                        }
                                        var alert;
                                        if (i == (linelist.length - 1)) {
                                            alert = '<span class="point-time' + pointStyle + '"></span>';
                                        } else {
                                            alert = '<span class="point-time' + pointStyle + '"></span><span class="contentline' + lineStyle + '"></span>';
                                        }
                                        var handlername = linelist[i].handlername;
                                        /*if (handlername.length > 5) {
                                            handlername = handlername.substring(0, 5) + "...";
                                        }*/
                                        var _section = $('<section data-psnid=' + linelist[i].psnid + '>' +
                                            alert +
                                            '<aside>' +
                                            '<div class="brief">' +
                                            '<div class="left_jt"></div>' +
                                            '<p class="text-yellow">' + handlername + '<span>' + linelist[i].handledate + '</span></p>' +
                                            '<p class="text-time' + fontStyle + '">' + action + '<span>' + (typeof(linelist[i].note) == "undefined" ? "" : linelist[i].note) + '</span></p>' +
                                            '</div>' +
                                            '</aside>' +
                                            '</section>');
                                        $("#" + _thisId + " article").append(_section);
                                    }
                                }
                                //人员详细信息
                                $("#" + _thisId + " section").on("click", function () {
                                    var psnid = $(this).attr("data-psnid");
                                    _bill_detail.initPsnDetail(psnid);
                                });
                            }
                        }
                    }
                    /*loadNumber++;
                    _bill_detail.initIScroll();//加载弹性*/
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
            _bill_detail.iscrollArrayInit.initApproveDetail = 1;
            _bill_detail.initIScroll();//加载弹性
        },

        /**
         * 查询附件列表
         */
        initMessageAttachmentList: function () {
            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getMessageAttachmentList: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                }
            };
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
//	   		    	console.log("查询附件列表 返回JSON数据串为：" + JSON.stringify(result));
                    //显示文件数目
                    if (result.code == "0" && result.jsonDatas.getMessageAttachmentList[0].flag == "0") {
                        $("#firstLineInfoUl").show();
                        $(".attachmentNumber").html("<span>" + eval("billDetailLang." + paramUser.lang + ".pageMessage.accessory") + "（" + result.jsonDatas.getMessageAttachmentList[0].count + "）</span>");
                        $('.attachmentNumber').show();
                        //附件列表保存到本地，用于下一个页面使用
                        window.sessionStorage.messageAttachmentList = JSON.stringify(result);
                    } else {
                        window.sessionStorage.messageAttachmentList = "";
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
            _bill_detail.iscrollArrayInit.initMessageAttachmentList = 1;
            _bill_detail.initIScroll();//加载弹性
        },
        /**
         * 查询列表
         */
        initPersonList: function (type) {
            var _person = "",
                personName = "";
            _bill_detail.loadPersonList(type, 300, "", function (list) {
                if (list == "" || typeof(list) == "undefined") {
                    $("#showUserList").hide();
                    $(".assign_people_ul li").eq(1).text(eval("billDetailLang." + paramUser.lang + ".pageMessage.noFingerSentInfo"));//"无指派人"
                    $("#assign").show();
                    $(".assign_people").hide();
                } else {
                    $("#assign").show();
                    $(".assign_people").show();
                    $("#showUserList").show();
                }
                $("#userList .contact_person_count").html("");
                for (var i = 0, len = list.length; i < len; i++) {
                    var item = list[i],
                        id = item.id,
                        name = item.name,
                        code = item.code;
                    personName = name + (code ? ' (' + code + ')' : '');
                    _person += '<div class="contact_person" data-code="' + code + '" data-id="' + id + '"><span>' + personName + '</span></div>';
                }
                $("#userList .contact_person_count").html(_person);
            }, function (err) {
                $("#assign").show();
                $(".assign_people").hide();
                if (err) {
                    dialog.log(err);
                }
            });
        },
        /**
         * 根据条件查询人员列表
         * @param type 审批类型，如同意、驳回等
         * @param count 请求的个数
         * @param condition 查询条件，按照人员的code或name进行模糊查询
         * @param successfulCb 成功回调，参数为分组完成的人员列表
         * @param failureCb 失败回调，参数为错误描述
         */
        loadPersonList: function (type, count, condition, successfulCb, failureCb) {
            var param,
                list,
                userList;
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
                        count: count || 25,
                        condition: condition || ""
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
                        count: count || 25,
                        condition: condition || ""
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
                        count: count || 25,
                        condition: condition || ""
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
                        count: count || 25,
                        condition: condition || ""
                    }
                };
            }
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
                    console.log("查询指派人员列表 返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        if (typeof failureCb === 'function') {
                            result.desc ? failureCb(result.desc) : failureCb(eval("billDetailLang." + paramUser.lang + ".pageMessage.designeeListfailed"));//提示返回错误信息或提示"指派人员列表加载失败"
                        }
                    } else {
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
                        if (!userList || !userList.length || userList[0].flag != "0") { //均视为失败
                            if (typeof failureCb === 'function') {
                                (userList[0].des) ? failureCb(userList[0].des) : failureCb(eval("billDetailLang." + paramUser.lang + ".pageMessage.designeeListfailed")); // 提示“返回的描述信息”或提示"指派人员列表加载失败"
                            }
                        } else {
                            list = userList[0].psnstructlist;
                            if (typeof successfulCb === 'function') {
                                successfulCb(list);
                            }
                        }
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                    if (typeof failureCb === 'function') {
                        failureCb(textStatus);
                    }
                }
            });
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
                                        dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.noFeeInfo"));//"移动审批已欠费，请联系管理员"
                                        $("#loding").hide();//隐藏加载中图标
                                        return false;
                                    }
                                    //执行审批动作
                                    _bill_detail.doActionFun(code);
                                },
                                error: function (XMLHttpRequest, textStatus, errorThrown) {
                                    $("#loding").hide();//显示加载中图标
                                    dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//"网络连接失败，请您检查网络后重试"
                                }
                            });
                            */
                        	//执行审批动作
                            _bill_detail.doActionFun(code);
                        } else {
                            //转圈去除
                            $("#loding").hide();
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.notAuthedInfo"));//"您使用的是免费版本，无法使用审批功能，若要进行审批操作，请联系管理员"
                        }
                    } else {
                        //转圈去除
                        $("#loding").hide();
                        dialog.log(checkResult.desc);
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();
                    dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.failure") + textStatus + ",errorthrown==" + errorThrown);//'执行函数失败'
//	   				console.log('执行函数失败' + textStatus + ",errorthrown==" + errorThrown);
                }
            });
        },
        /** 审批动作事件绑定*/
        initOperatorEvent: function (type) {
            $('#search_input').unbind().on('keydown', function (event) {
                var searchkey = $(this).val().trim(),
                    isSelected, // 是否添加进入列表的标志
                    personName, //人员姓名
                    _person; // 待插入人员
                if (event.keyCode == 13) {
                    if (searchkey != "" && _bill_detail.stripscript(searchkey)) {
                        dialog.log("请去掉特殊字符");
                        event.preventDefault();
                        return false;
                    }
                    $(this).blur();
                    _bill_detail.loadPersonList(type, 100000, searchkey, function (list) { // 此处写100,000只是为了确保请求全部人员
                        $('#userList .contact_person_count .contact_person').hide(); // 先隐藏已有人员列表
                        if (!list || !list.length) {
                            event.preventDefault();
                            return false;
                        }
                        list.forEach(function (item) {
                            isSelected = false;
                            $("#userList .contact_person_count .contact_person").each(function (index, value) { // 重复的人员直接显示，不插入
                                if (value.dataset.id == item.id) {
                                    $(value).show();
                                    isSelected = true;
                                }
                            });
                            if (!isSelected) { // 未重复的人员进行插入
                                var id = item.id,
                                    name = item.name,
                                    code = item.code;
                                personName = name + (code ? ' (' + code + ')' : '');
                                _person = $('<div class="contact_person" data-code="' + code + '" data-id="' + id + '"><span>' + personName + '</span></div>');
                                $("#userList .contact_person_count").prepend(_person);
                            }
                        });
                    }, function (err) {
                        if (err) {
                            dialog.log(err);
                        }
                    });
                    event.preventDefault();
                    return false;
                }
            });
            //审批和取消按钮
            $("#closeShenpi,#shenpi").unbind().on("click", function () {
                if ($(this).attr("id") == "closeShenpi") {
                    $("#assign").hide();
                } else {
                    //根据后台配置进行必须输入检查
                    if (clientParam.isapprovecheck == "y") {
                        if ($(".assign_text").val() == "") {
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.assignMustInputLabel"));//"批语不能为空,请输入");
                            $(".assign_text").focus();
                            return false;
                        }
                    }
                    //指派人必须选择才能提交，当然必须在必须输入的基础上才行
                    var dataList = $(".selectPerson");
                    if (dataList.length <= 0 && $(".assign_people").css("display") != "none") {
                        if (type == "doReject") {
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.refusalPersonLabel"));//"请选择驳回对象,请输入");
                        } else if (type == "doAgree") {
                            dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.assignPersonLabel"));//"请选择指派对象,请输入");
                        }
                        $(".assign_text").focus();
                        return false;
                    }

                    $("#assign").hide();
                    //转圈去除
                    $("#loding").show();
                    var code = $(this).attr("data-code");
                    _bill_detail.initDoAction(code);
                }
            });
            //在指派列表中选择指派人，选中指派人
            $("#userList").unbind().on("click", ".contact_person", function () {
                if (type == "doAddApprove" || type == "doAgree") {
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
                    $("#search_input").val('');//清空输入框
                } else {
                    var person1 = $(".selectPerson").eq(0).find("span").text();
                    var person2 = $(".selectPerson").eq(1).find("span").text();
                    var personInfo;
                    if ($(".selectPerson").length > 2) {
                        personInfo = person1 + "," + person2 + ",...";
                    } else if ($(".selectPerson").length == 0) {
                        personInfo = eval("billDetailLang." + paramUser.lang + ".pageMessage.noFingerSentInfo");
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
                        note: approveNote + '(' + eval("billDetailLang." + paramUser.lang + ".pageMessage.approveByQyjInfo") + ')',//"(来自移动端)"
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
            var param = _bill_detail.createActionParam(code, budgetCtrl, paramBody),
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
                        if (flag == "0") {
                            $("#assign").hide();
                            var budgetCtrl = entity[taskid];
                            // 无预算控制字段 || 无预算控制类型 || 已经处理的预算控制，均视为审批通过
                            if(!budgetCtrl || !budgetCtrl.ResumeExceptionType || budgetCtrl.ResumeExceptionResult.indexOf(budgetCtrl.ResumeExceptionType) > -1) {
                                dialog.log('操作成功', function () {
                                    if (isWeiXin()) {//如果是微信里，直接关闭微信浏览器，返回微信公众号
                                        var url = paramData['callbackurl']; 
                                        if( url ){
                                            url = decodeURIComponent(url);
                                            window.location.href = url ;
                                        }else {
                                            WeixinJSBridge.call('closeWindow');
                                        }
                                    } else {
                                        // 从审批中心进入 , 调回审批中心 ;
                                        var url = paramData['callbackurl']; 
                                        if( url ){
                                            url = decodeURIComponent(url);
                                            window.location.href = url ;
                                        }else {
                                            // 友空间关闭当前webview
                                            try {
                                                connectWebViewJavascriptBridge(function(YonYouJSBridge){
                                                    var data = {'function': 'closePage'} ;
                                                        YonYouJSBridge.send(JSON.stringify(data), function(responseData){});
                                                });
                                            } catch(e){};
                                        }
                                    }
                                }, 2000);
                            } else {
                                var ResumeExceptionMsg = budgetCtrl.ResumeExceptionMsg || eval("billDetailLang." + paramUser.lang + ".pageMessage.budgetCtrl"),
                                    confirm = new Confirm(eval("billDetailLang." + paramUser.lang + ".pageContent.budgetCtrlTitle"), ResumeExceptionMsg, function() {
                                        _bill_detail.doActionFun(code, budgetCtrl, param);
                                    });
                                confirm.show();
                            }
                        } else {
                            dialog.log(des || eval("billDetailLang." + paramUser.lang + ".pageMessage.failure"));//执行函数失败
                        }
                    }
                    //转圈去除
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                    dialog.log(eval("billDetailLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//"网络连接失败，请您检查网络后重试"
                }
            });
        },
        /**
         * 获得人员详细信息
         */
        initPsnDetail: function (psnid) {
            // 华衍水务 跳转链接 psid ;
            goIm_psid = psnid ;

            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getPsnDetail: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    psnid: psnid
                }
            };

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
//	   		    	console.log(JSON.stringify(result));
                    var code = result.code;
                    var desc = result.desc;
                    if (code != "0") {
                        console.log(desc);
                        dialog.log(desc);
                    } else {
                        var psnDetail = result.jsonDatas.getPsnDetail;
                        if (psnDetail && psnDetail.length) {
                            var contactInfo = psnDetail[0];
                            if (contactInfo.flag == '0') {
                                var personInfo = new ContactInfo(contactInfo, function () {
                                    personInfo = null;  // 回收内存
                                });
                                personInfo.show();

                                // 华衍水务插入图片 ;
                                var style = "display:none" ;
                                try {
                                    if( isSummer ){
                                       style = "display:block" ;
                                    }
                                }catch(e){}
                                $('.popup td').each(function(k,v){
                                    var str = $(v).html() ;
                                    if( str.indexOf('姓名')!=-1 ){
                                        var img = $('<img style="'+style+';margin-top:0px" src="images/imim.png" class="webview_GoIm_img"/>') ;
                                            img.get(0)["imData"] = contactInfo ;
                                       $(v).next().append( img )
                                    }
                                })

                               // 华衍水务事件绑定
                                $('.popup').append('<div  class="im_go" style="background:transparent;width:100%;position:absolute;top:37px;height:46px;z-index:999"></div>');
                                try {
                                    if( isSummer ){
                                        $(".im_go").unbind().on("click", function () {
                                            $('.webview_GoIm_img').trigger('goImEvent');
                                        });
                                    }
                                }catch(e){}
                            }
                        }
                        /*if (psnDetail.length > 0) {
                            var flag = result.jsonDatas.getPsnDetail[0].flag;
                            var des = result.jsonDatas.getPsnDetail[0].des;
                            var pdes = result.jsonDatas.getPsnDetail[0].pdes;
                            var pname = result.jsonDatas.getPsnDetail[0].pname;
                            var contactinfolist = result.jsonDatas.getPsnDetail[0].contactinfolist;
                            if (flag != "0") {
                                console.log(des);
                                dialog.log(des);
                            } else {
                                //清空变量
                                $("#personInfo").html("");
                                $("#link").html("");
                                var personInfoLabel = result.jsonDatas.getPsnDetail[0].pname + '&nbsp;' + result.jsonDatas.getPsnDetail[0].pdes;

                                personInfoLabel = _bill_detail.substrLength(personInfoLabel, 12);

                                var link = $('<div class="link" id="link">' +
                                    '<ul class="link_ul">' +
                                    '<li class="name">' + eval("billDetailLang." + paramUser.lang + ".pageMessage.personInfo") + '</li>' +//人员信息
                                    '<li class="number"><span>' + personInfoLabel + '</span></li>' +
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
                                        propnameShow = '<li class="number"><span><a href="tel:' + contactinfolist[i].propvalue + '">' + contactinfolist[i].propvalue + '</a></span></li>'
                                    }
                                    infoList += '<ul class="link_ul">' +
                                        '<li class="name">' + contactinfolist[i].propname + '</li>' + propnameShow +
                                        '</ul>';
                                }
                                //批接信息
                                link.append(infoList);
                                link.append($('<div class="link_cancel" id="closeLink">' + eval("billDetailLang." + paramUser.lang + ".pageMessage.cancelLabel") + '</div>'));//取消
                                link.append('</div>');
                                $("#personInfo").append(link).show();
                                //事件绑定
                                $(".link_cancel").unbind().on("click", function () {
                                    $("#personInfo").hide();
                                });
                            }
                        }*/
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
         * 判断字符串中是否有非法字符
         * @param str 待检验字符串
         * @returns {boolean} true:含有非法字符 false:不含非法字符
         */
        stripscript: function (str) {
            var pattern = /^[\w\u4e00-\u9fa5]+$/gi;
            if (pattern.test(str)) {
                // console.log("false");
                return false;
            }
            // console.log("true");
            return true;
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
            if(!isiOS) return;  // iOS使用iScroll
            var flag = _bill_detail.iscrollArrayInit;
            for(var attr in flag) {
                if(flag[attr] == 0) return; // 界面还未稳定
            }

            if (typeof(_iscroll) != "undefined") {
                try{ _iscroll.destroy() }catch(e){};
            }

            // 注销 iscroll ;
            return ;

            $('#loding').show();

            setTimeout(function() {
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
                $('#loding').hide();
            }, 1000);
        }
    };
    return _bill_detail;
});


//滚动单据明细固定顶部
function srocllEvent(_y) {

    // 禁止头部跟随 ;
    return ;

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
    if (ua.match(/MicroMessenger/i) == 'micromessenger') {
        return true;
    } else {
        return false;
    }
}

/**
 * 获取URL的contextPath
 * @returns
 */
var contextPath = function () {
    var origin = window.location.protocol + '//' + window.location.host;
    var pathname = location.pathname;
	//var projectname = pathname.substr(0, pathname.indexOf('/', 1));
	var projectname = pathname.substr(0, pathname.indexOf('/', 0));
    return origin + projectname;
};


//取得浏览器语言，用于多语系判断
var get_lang = function () {
    var lang = "en";
    var navLang;//系统语言标识
    var type = navigator.appName;
    if (type == "Netscape") {
        navLang = navigator.language;
    }
    else {
        navLang = navigator.userLanguage;
    }
    //alert(navLang);
    if (navLang == "zh-cn" || navLang == "zh-CN") {//中文简体
        lang = "zh";
    } else if (navLang == "zh-tw" || navLang == "zh-TW" || navLang == "zh-hk" || navLang == "zh-HK") {//中文繁体（包括香港繁体和台湾繁体）
        lang = "tw";
    }
    //alert(lang);
    return lang;
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
// 初始化webview
function connectWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) {
        callback(WebViewJavascriptBridge);
    } else {
        document.addEventListener('WebViewJavascriptBridgeReady', function() {
            callback(WebViewJavascriptBridge);
        }, false);
    }
}

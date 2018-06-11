define(["zepto", "iscroll", "dialog"], function ($, isc, dialog) {

    //配置参数
    var paramUser, clientParam, searchParam;
    //全局变量
    var _iscroll, loadStatus, querytype, spStatus, billStatus;

    //全局变量---动态获取数据
    //---按钮数组
    var pagesCode = [];//页脚页标识
    var pagesName = [];//页脚页签名
    var buttonsCode = [];//页头按钮标识 buttonsCode[headerBtnIndex]
    var buttonsName = [];//页头按钮
    var pageIndex = 0;//当前点击的是第几页，从0开始
    var pageHeaderBtn = [];//pageHeaderBtn[pageIndex] = headerBtnIndex
    var headerBtnIndex = 0;//当前页头点击的是第几个按钮，从0开始
    //---单据列表数组
    var NC_billsArray = [];//NC单据数组
    var OA_billsArray = [];//OA单据数组
    var billsArray = [];//单据数组
    var count = 25;//每次加载单据数目
    var currentCountId = 0;//每条的id编号
    var noBill = false;
    var pageFirstIn = [];
    var OA_NC_getBillList_flag = 0;//当数据来源NC+OA时，2表示调用OA和NC完成

    var releaseKey = false;//标记拉动是否释放，默认false,释放true,只有释放后才能更新页面数据
    var downLoadKey = false;//下拉加载数据可用true,禁用false
    var upLoadKey = false;//上拉加载数据可用true,禁用false
    var mark_i = 0;//标识是否第一次开始下拉，第一次不用转动箭头\

    //屏幕高度
    window_height = $(window).height();

    //判断浏览器类型
    var u = navigator.userAgent, app = navigator.appVersion;
    var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1; //android终端或者uc浏览器
    var isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    var client = isWeiXin() ? "wechat" : (isiOS ? "ios" : (isAndroid ? "android" : "other"));
    setCookie("test", "get_lang()");
    //alert("cookie测试用===" + getCookie("mobileMac"));

    // 双良--移动审批迁移到PC端口 需要动态改变字体大小颜色 ;
    if( /Android|webOS|iPhone|iPod|BlackBerry|micromessenger/i.test(navigator.userAgent) ) {
    } else {
        try{
            var style = " #header span{ color:#222;} #footer span{color:#222;} ";
            $('head').append($('<style>').html(style)) ;
        }catch(error){}
    }


    //上个页面传过来的参数
    var paramData = getURLparams();
    //是否解析的标识
    var firstLoginFlag = "true";

    var _util = {
        /**
         * @description 修改文档标题
         */
        modifyDocTitle: function(title) {
            var $body = $('body');
            document.title = title;
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);
        },
        isEsnSuite: function () {
            var url = window.location.href;
            var urlParam = url.split('?')[1];
            var rs = false;
            $("#loding").show();
            $.ajax({
                type: 'GET',
                async: false,
                url: contextPath() + '/umapp/gethead?1=1&' + urlParam + '&t=' + Math.random(),
                dataType: 'json',
                success: function (result) {
                    console.log('i判断是否在空间打开 sEsnSuite--- ' + JSON.stringify(result));
                    console.log("--")
                    $("#loding").hide();
                    if (result.flag == '0') {
                        if (result.data && result.data.head) {
                            rs = result.data.head.system == 'esnsuite';
                        }
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();
                }
            });
            return rs;
        },

        /**
         * @description 处理单据类型
         * @param categorylist {*} null或单据类型数据
         */
        handleCategory: function(categorylist) {
            if(!categorylist || !categorylist.length) { // 不存在单据类型
                $('#billCategory').hide();
                return;
            }
            $('#billCategory')
                .show()
                .unbind().on('click', function() {
                    if($(this).hasClass('hasClicked')) {
                        $('.popover').hide();
                        $(this).removeClass('hasClicked');
                    } else {
                        $('.popover').show();
                        $(this).addClass('hasClicked');
                    }
                });
            $('#indexPage').unbind().on('click', function(event) {
                $('#billCategory').removeClass('hasClicked');
                $('.popover').hide();
            });
            var categoriesHtml = "";
            for(var i=0,len=categorylist.length; i<len; i++) {
                var category = categorylist[i];
                categoriesHtml += "<div class='task_other_list' data-category='" + category.categoryid + "'>" + category.categoryname + "</div>";
            }
            $(".scroll-content")
                .html('')
                .html(categoriesHtml)
                .unbind().on('click', '.task_other_list', function(event) {
            // $(".scroll-content .task_other_list").unbind().on('click', function(event) {
                    $('#billCategory').removeClass('hasClicked');
                    var category = $(this).attr('data-category');
                    window.sessionStorage.setItem('category', category);
                    var categoryName = $(this).html();
                    categoryName = categoryName.substring(0, categoryName.indexOf('('));
                    window.sessionStorage.setItem('categoryName', categoryName);
                    $('.popover').hide();

                    _util.modifyDocTitle(categoryName);
                    _billList.getBillList(pagesCode[pageIndex], buttonsCode[headerBtnIndex], 1);
                });
        },

        /**
         * @description 判断element是否可见
         * @param {HTMLElement || Zepto Element} element DOM元素或Zepto元素
         * @returns {*} true 可见; false 不可见; null 非DOM元素或Zepto元素
         */
        isVisible: function(element) {
            if(!element) throw new Error("element should be HTMLElement or Zepto Element");
            if(element.nodeName) { // HTMLElement
                element = $(element);
            }
            return element.css('display')!='hidden' && element.css('visibility')!='hidden' && element.height()>0;
        }
    };

    //微信标识
    var isWeiXinFlag = isWeiXin()||_util.isEsnSuite();

    var _billList = {

// vvv1
        login: function () {
            //初始化多语言
            _billList.lightAppMultilingual();
            if (isWeiXin()) {
                _billList.weixinHideShare();//微信禁止分享
            }
            //页面进来就要清楚到之前手写内容
            window.sessionStorage.handWriteData = "";
            //初始化页面高度样式
            //_billList.initHeightStyle();
            //绑定事件
            //_billList.initBindEvent();
            //加载中图标
            $('iframe').css('display', 'none');
            //加载中图标
            $("#loding").show();
            //接入第三方时候，验证失败提示信息
            if (paramData.errorInfo != undefined && paramData.errorInfo != "") {
                _billList.body_showError(paramData.errorInfo);//"授权信息"
                $("#loding").hide();
                return false;
            }

            //从前页面传递过来的参数
            if (isWeiXinFlag) {//isWeiXin()
                var url = window.location.href;
                var urlparam = url.split("?")[1];

                try {
                    //判断urlparam是否为空
                    if (urlparam == "" || urlparam == undefined) {
                        //为空取local保存的值
                        urlparam = window.sessionStorage.urlparam;
                    } else {
                        window.sessionStorage.urlparam = urlparam;//保存参数值
                    }
                } catch (e) {
                    $("#loding").hide();//隐藏加载中图标
                    dialog.log(eval("billListLang." + get_lang() + ".pageMessage.closeIncogMode"));//"请关闭手机无痕模式进行浏览"
                    //_billList.show_error('请关闭手机无痕模式进行浏览');
                    return;
                }

                //保存head的值，后期与微信绑定的时候使用
                var allParam = urlparam.split("&");

                for (var i = 0; i < allParam.length; i++) {
                    var param = allParam[i].split("=");
                    var paramName = param[0];
                    var paramValue = param[1];
                    if (paramName == "head") {
                        $("#headStr").val(paramValue);
                        break;
                    }
                }
                //alert("129---firstLoginFlag=" + firstLoginFlag);
                //先调用接口解析后台返回的数据
                $.ajax({
                    type: "GET",
                    async: true,
                    url: contextPath() + "/umapp/init?1=1&client=" + client + "&firstLoginFlag=" + firstLoginFlag + "&" + urlparam + '&t=' + Math.random(),//参数拼接
                    dataType: "json",
                    success: function (result) {
                        console.log("第一次解析之后返回值班为：===" + JSON.stringify(result));
                        var user = {};
                        if (result.flag == "0") {
                            //看看用户信息是否为空，如果不为空则进行显示数据,否则让用户去登录
                            var localStorageExtrainfo = window.sessionStorage.extrainfo;
                            //解绑标识
                            var unBindFlag = window.sessionStorage.unBindFlag;

                            //记录下当前结果集
                            window.sessionStorage.firstWechatLoginResult = JSON.stringify(result);
                            //看看是否之前绑定过
                            console.log("localStorageExtrainfo===" + localStorageExtrainfo + ",result.data.foot.extrainfo==" + result.data.foot.extrainfo);
                            if ((result.data.foot.extrainfo == undefined && (localStorageExtrainfo == undefined || localStorageExtrainfo == "")) || unBindFlag == "true") {
                                //微信第一次登录进来时候执行，用于打开登录页面并提供绑定等信息
                                _billList.wechatFirstLogin(result);
                                $("#loding").hide();//隐藏加载中图标
                            } else {
                                //打开任务列表
                                //拆分result.data.foot.extrainfo
                                var extrainfo = result.data.foot.extrainfo == undefined ? localStorageExtrainfo : result.data.foot.extrainfo;
                                if (extrainfo.indexOf(",") > 0) {
                                    window.sessionStorage.userid = extrainfo.split(",")[0];
                                    window.sessionStorage.ucode = extrainfo.split(",")[1];
                                    //console.log(window.sessionStorage.userid);
                                }
                                //显示列表数据
                                $("#loginPage").hide();
                                $("#indexPage").show();
                                //这个时候，要取得已经登录的信息再次
                                _billList.initUserParamData(window.sessionStorage.userid, result.data.head.domain);
                                //_billList.GoTaskList();
                            }
                        } else {
                            $("#loding").hide();//隐藏加载中图标
                            _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.Error"));//'调用接口失败'
                            //dialog.log(eval("billListLang." + get_lang() + ".pageMessage.Error"));
                            return false;
                        }

                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        $("#loding").hide();//隐藏加载中图标
                        _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.networkfailedInfo"));//'网络连接失败，请您检查网络后重试'
                        //dialog.log(eval("billListLang." + get_lang() + ".pageMessage.networkfailedInfo"));//"网络连接失败，请您检查网络后重试"
                    }
                });
            } else {
                _billList.GoTaskList();
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
        //微信第一次登录进来时候执行，用于打开登录页面并提供绑定等信息
        wechatFirstLogin: function (result) {
            $("#loginPage").show();
            $("#indexPage, #billListSearch, #billCategory").hide();

            //首先设置title
            var $body = $('body');
            document.title = eval("billListLang." + get_lang() + ".pageTitleLogin");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);

            //然后设置页面显示的汉字
            $(".loginLabel").html(eval("billListLang." + get_lang() + ".pageContent.loginLabel"));
            //再设置页面中的placeholder中的汉字
            //i即属性名字ok,close
            $(".username_text").attr("placeholder", eval("billListLang." + get_lang() + ".pagePlaceHoder.username_text"));
            $(".password_text").attr("placeholder", eval("billListLang." + get_lang() + ".pagePlaceHoder.password_text"));

            if(!result) {
                result = window.sessionStorage.firstWechatLoginResult;
                result = result ? JSON.parse(result) : void(0);
            } else if(typeof result === 'string') {
                result = JSON.parse(result);
            }

            $("#username,#userpass").unbind().on("keydown", function (event) {
                if (event.keyCode == 13) {
                    $(this).blur();
                    //调用登录接口
                    _billList.loginBindRtnFunction(result, window.sessionStorage.urlparam);
                }
            });

            $("#login").unbind().on("click", function () {
                //调用登录接口
                _billList.loginBindRtnFunction(result, window.sessionStorage.urlparam);
            });
        },

// vvv2
        //打开任务列表
        GoTaskList: function () {
            $("#headStr").val("");
            $("#loginPage").hide();
            $("#indexPage").show();
            //从前页面传递过来的参数
            var url = window.location.href;
            var urlparam = url.split("?")[1];

            _billList.getCommonData(urlparam, "init");
        },
        /**
         * 获取公共参数，本页面和其他页面都需要的
         * 如token,ucode,domain等
         */
        getCommonData: function (urlparam, type) {
            //是否解析的标识
            var initUrlParam = true;
            //加上第三方接入才行
            if (window.sessionStorage.urlparam != undefined && window.sessionStorage.urlparam != "" && paramData.thirdflag == undefined) {
                firstLoginFlag = "false";
            }

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
                        _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.resultNull"));//'获取公共参数为空'
                    }
                } else {

                    //仅仅初次的值才会记录
                    if (type == "init") {
                        window.sessionStorage.urlparam = urlparam;//保存参数值
                    }
                }
            } catch (e) {
                //_billList.show_error('请关闭手机无痕模式进行浏览');
                dialog.log(eval("billListLang." + get_lang() + ".pageMessage.closeIncogMode"));//"请关闭手机无痕模式进行浏览"
                return;
            }

            //alert("urlparam===" + urlparam);
            if (initUrlParam) {
                $.ajax({
                    type: "GET",
                    async: true,
                    url: contextPath() + '/umapp/init?client=' + client + "&firstLoginFlag=" + firstLoginFlag + "&" + urlparam + '&t=' + Math.random(),//参数拼接
                    dataType: "json",
                    success: function (result) {

                        console.log("解密字符串  " , result.data);
                        console.log("---")
                        var user = {};
                        //alert(result.flag);
                        if (result) {
                            if (result.flag == "0") {
                                if (result.data.foot) {



                                    //初始化数据
                                    _billList.initLocalData(result);
                                    //异步记录登录信息
                                    _billList.loginParamInfoSave(result.data.foot.userid + result.data.head.domain, urlparam);




                                } else {
                                    _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.Error"));//'调用接口失败'
                                    $("#loding").hide();//隐藏加载中图标
                                }

                            } else {
                                $("#loding").hide();//隐藏加载中图标
                                _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.funcError"));//'执行函数失败'
                                return;
                            }
                        } else {
                            $("#loding").hide();//隐藏加载中图标
                            _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.Error"));//'调用接口失败'
                        }

                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        //alert(XMLHttpRequest + ",textStatus==" + textStatus);
                        $("#loding").hide();//隐藏加载中图标
                        _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.networkfailedInfo"));//'网络连接失败，请您检查网络后重试'
                        //dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//网络连接失败，请您检查网络后重试
                        return false;
                    }
                });
            }
        },


// vvv3
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
            user.maurl = result.data.body.url;
            user.userid = result.data.foot.userid == undefined ? window.sessionStorage.userid : result.data.foot.userid;//'1002A210000000001XLB'
            user.ucode = result.data.foot.ucode == undefined ? window.sessionStorage.ucode : result.data.foot.ucode;
            user.ncversion = result.data.body.nc_version == undefined || result.data.body.nc_version == "" ? "NC63" : result.data.body.nc_version;

            user.uname = result.data.foot.uname;
            user.domain = result.data.head.domain;
            user.appkey = result.data.head.appkey;
            user.system = result.data.head.system;
            //如果确定userid没有情况下，直接到登录页面
            if (result.data.foot.userid == undefined && window.sessionStorage.userid == undefined) {
                //微信第一次登录进来时候执行，用于打开登录页面并提供绑定等信息
                _billList.wechatFirstLogin(result);
                $("#loding").hide();
                return;
            }

            //加入数据源系统标识,默认NC
            user.dataSourceSystem = result.data.body.dataSourceSystem == undefined ? "NC" : result.data.body.dataSourceSystem;
            //测试时候使用
            if (result.data.foot.dataSourceSystem != undefined) {
                user.dataSourceSystem = result.data.foot.dataSourceSystem;
            }
            //取得token只有系统为qyj的才去惠商云上获取用户信息
            if (user.dataSourceSystem == "NC+OA"&& user.system == "qyj") {
                //这种情况下，调用云平台直接去的保存在云平台的用户登录信息
                 user = _billList.getUserInfoFromCloud(user);
                if(!user.nctoken) user.nctoken = result.data.foot.nctoken;
                // if(!user.oatoken) user.oatoken = result.data.foot.token == undefined ? result.data.foot.oatoken : result.data.foot.token;
                if(!user.oatoken) user.oatoken = result.data.foot.token == undefined ? result.data.foot.oatoken==undefined?result.data.foot.nctoken:result.data.foot.oatoken : result.data.foot.token ;
                if(!user.groupid) user.groupid = result.data.foot.pk_group == undefined ? result.data.foot.groupid : result.data.foot.pk_group;
            } else if (user.dataSourceSystem == "NC+OA") {
               if(!user.nctoken) user.nctoken = result.data.foot.nctoken;
               if(!user.oatoken) user.oatoken = result.data.foot.token == undefined ? result.data.foot.oatoken==undefined?result.data.foot.nctoken:result.data.foot.oatoken : result.data.foot.token ;
               if(!user.groupid) user.groupid = result.data.foot.pk_group == undefined ? result.data.foot.groupid : result.data.foot.pk_group;
           } else if (user.dataSourceSystem == "OA") {
                user.oatoken = result.data.foot.token == undefined ? result.data.foot.oatoken : result.data.foot.token;
                user.groupid = result.data.foot.pk_group == undefined ? result.data.foot.groupid : result.data.foot.pk_group;
            } else {
                user.nctoken = result.data.foot.token == undefined ? result.data.foot.nctoken : result.data.foot.token;
                user.groupid = result.data.foot.pk_group == undefined ? result.data.foot.groupid : result.data.foot.pk_group;
            }
            //两个token都表示NC部分使用
            user.token = user.nctoken;
            user.client = client;
            user.lang = get_lang();
            console.log("处理后的user",user);
            console.log("---")


            var params = {},
                clientParamInfo = result.data.foot.clientParamInfo;
            //如果单据基本参数有设置，则赋值
            if (clientParamInfo && clientParamInfo[0]) {
                params.isbatchapprove = clientParamInfo[0].isbatchapprove; //是否启用批量审批 Y启用 N禁用
                params.isdisagree = clientParamInfo[0].isdisagree || 'Y'; //是否启用不批准操作 Y启用 N禁用
                params.isapprovecheck = clientParamInfo[0].isapprovecheck; //是否启用批量审批批语检查 y启用 n禁用
            }
            //MA设置单据类型
            var search = {};
            //search.billTypeInfo=result.data.foot.billTypeInfo;
            //将获取到的值赋给页面
            search.billTypeInfo = "";//rtnData.jsonDatas.getSPBillType[0].data.billtypelist;

            //html5调用本地存储
            if (window.localStorage) {
                //console.log(window.sessionStorage.task);
//                   window.sessionStorage.task=0;//任务列表默认显示状态
//                   window.sessionStorage.approved=0;//单据列表默认显示状态
                //记录字符串对象
                window.sessionStorage.paramUser = JSON.stringify(user);
                window.sessionStorage.clientParam = JSON.stringify(params);
                window.sessionStorage.searchParam = JSON.stringify(search);


                paramUser = JSON.parse(window.sessionStorage.paramUser);
                clientParam = JSON.parse(window.sessionStorage.clientParam);
                searchParam = JSON.parse(window.sessionStorage.searchParam);

                loadStatus = true,
                    querytype = (typeof(window.sessionStorage.task) == "undefined" ? 0 : window.sessionStorage.task),
                    spStatus = true;
                billStatus = false;




             // *** 主方法 !!!
                _billList.init();

                //window.location.href="html/html/task_list.html";
//                   alert(window.sessionStorage.paramUser);
            } else {
                $("#loding").hide();//隐藏加载中图标
                _billList.show_error(eval("billListLang." + paramUser.lang + ".pageMessage.updateBrowser"));//'浏览器版本过低，请换用高版本再试'
                //dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.updateBrowser"));//'浏览器版本过低，请换用高版本再试'
                return;
            }
        },
        /**
         * 通过doamin和userid请求云平台用户登录数据
         */
        getUserInfoFromCloud: function (user) {
            $.ajax({
                type: "GET",
                async: false,
                url: contextPath() + '/umapp/getUserInfoFromCloud?domain=' + user.domain + "&userid=" + user.userid + '&t=' + Math.random(),//参数拼接
                dataType: "json",
                success: function (result) {
//                  result = {"data":{"loginsysinfo":"{\"OA\":{\"groupcode\":\"0001\",\"pk_psndoc\":\"1001A110000000001RZY\",\"isEnable\":\"true\",\"username\":\"陈人聪\",\"sessiontoken\":\"000001586ae13f6ca7795246d4f3482e432ce7f8c7ea747e9d580c02\",\"token\":\"AAABWGrhP2yneVJG1PNILkMs5%2FjH6nR%2BnVgMAg%3D%3D\",\"status\":\"0000\",\"uname\":\"陈人聪\",\"userid\":\"1001A1100000000059C0\",\"groupname\":\"网宿科技股份有限公司\",\"groupid\":\"0001A1100000000007Q4\",\"ucode\":\"chenrc\"},\"NC\":{\"pkfieldName\":\"pk_obj\",\"isopen\":\"Y\",\"isEnable\":\"true\",\"attributeNames\":[\"systype\",\"isopen\",\"pk_obj\",\"ts\",\"token\",\"uname\",\"userid\",\"upwd\",\"pk_group\",\"nctoken\",\"strts\",\"isenable\",\"ucode\",\"dr\"],\"status\":0,\"tableName\":\"maportal_reguser\",\"uname\":\"陈人聪\",\"dirty\":false,\"userid\":\"1001A1100000000059C0\",\"pk_group\":\"0001A1100000000007Q4\",\"nctoken\":\"AAABWGrhOXwM5%2F2tnmPMY8iy%2BuRLzZdbHQ2t%2F%2Bys2MwYv5ViTo6CRoh4aAhq%2BdlDgguoAb95BBvz%0AW4RE3l4agTv1roMlu3pDt%2BZx%2F8E8fghPPMkf0%2F9rHV88lpg%3D\",\"upwd\":\"nc1234\",\"ucode\":\"chenrc\",\"dr\":0}}"},"desc":"成功","flag":"0"};
                    result = eval("(" + result + ")");
                    if (result.flag == "0") {
                        if(!result.data || !result.data.loginsysinfo) return;

                       console.log("if  NC+OA  通过doamin和userid请求云平台用户登录数据== " , JSON.parse(result.data.loginsysinfo));

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
                        if(user.oatoken==undefined){
                            user.oatoken= loginSysInfoJSON.OA.token==undefined?user.ncversion=="NC65"?loginSysInfoJSON.NC65.nctoken:loginSysInfoJSON.NC.nctoken
                                         :loginSysInfoJSON.OA.token;
                        }
                      
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();//隐藏加载中图标
                }
            });
            return user;
        },


// vvv4
        /**
         *初始化
         */
        init: function () {

            //轻应用多语处理方法
            for (var i in eval("billListLang." + paramUser.lang + ".pageContent")) {
                //i即属性名字ok,close
                //console.log("key===" + i + ",value==" + eval("billListLang." + paramUser.lang + ".pageContent." + i));
                $("#" + i).html(eval("billListLang." + paramUser.lang + ".pageContent." + i));
            }
            //记住上次操作的按钮组
            if (window.sessionStorage.pageBtnArray && window.sessionStorage.pageBtnArray != '') {//当本地window.sessionStorage.pageBtnArray存在
                var pageBtnArray = window.sessionStorage.pageBtnArray;
                pageIndex = pageBtnArray.split(",")[0];//当前点击的是第几页，从0开始
                headerBtnIndex = pageBtnArray.split(",")[1];//当前页头点击的是第几个按钮，从0开始
                console.log('pageIndex= '+pageIndex+"     headerBtnIndex= "+headerBtnIndex)
                pageHeaderBtn = window.sessionStorage.pageHeaderBtn;//pageHeaderBtn[pageIndex] = headerBtnIndex
                console.log("pageHeaderBtn===" + pageHeaderBtn);
                pageHeaderBtn = pageHeaderBtn.split(",");
                //记录是否第一次进入页面变量
                pageFirstIn = window.sessionStorage.pageFirstIn;
                pageFirstIn = pageFirstIn.split(",");
                console.log("pageFirstIn===" + pageFirstIn);
                console.log("---")
            }

            OA_NC_getBillList_flag = 0;////OA+NC标志，2表示两个类型列表接口都调用完,初始化值为0
            var _this = this;
            //_billList.lightAppMultilingual();
            //初始化页面参数

            _billList.initStyle();// 样式
            _billList.initParamSet();// 不同终端显示不同
            _billList.initPageButton(); //*** 头部和底部按钮 ;
            _billList.bindEvent(); 

        },

        /**
         *加载样式
         */
        initStyle: function () {
            var _width = $(window).width();
            var _height = $(window).height();
            $("#nc_list").height(_height - 90);
            $("#logout_box").css("right", "-48px");
            $("#in_out_btn").removeClass('logoutBox_open');

            //判断进来时 状态
            if (querytype != 0) {
                $(".top_nav_ul li").eq(1).addClass("select").siblings().removeClass("select");
                var sliderWidth = $(".line_bottom").width();
                $(".line_bottom").css({"margin-left": sliderWidth});
            }

            //判断是否是微信打开的，若是微信打开的显示侧边栏的注销按钮
            $(".batch_mode").show();
            $(".nc_select_all").hide();

        },

// vvv5
        /**
         * 动态获取按钮
         */
        initPageButton: function () {
            // 1
            _billList.getFooterBtn();//获取页脚按钮数据
            // 2
            _billList.getHeaderBtn(pagesCode[pageIndex]);//调用接口获取页头按钮

            pageFirstIn[pageIndex] = false;
        },
        /**
         * 调用获取页脚按钮函数
         */
        getFooterBtn: function () {

            if (paramUser.dataSourceSystem.indexOf("OA") == -1) {//没有OA的情况
                var param4 = {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid
                }
                _billList.getDataByAjax('getTaskStatusList', param4, 'getTaskStatusListSuccessFunction', false);
            } else {
                var param4 = {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid
                }
                _billList.get_OA_DataByAjax('getTaskStatusList', param4, 'getTaskStatusListSuccessFunction', false);
            }

        },
        /**
         * 调用getTaskStatusList接口成功的回调函数
         * 参数：result---getTaskStatusList接口返回数据
         * 功能：将接口返回的页脚按钮存入全局数组pagesCode，pagesName
         */
        getTaskStatusListSuccessFunction: function (result) {
            if (result.code == "0") {
                //清空页脚按钮数组
                pagesCode.splice(0, pagesCode.length);
                pagesName.splice(0, pagesName.length);
                var footbtns = result.jsonDatas.getTaskStatusList[0].list;
                for (var i = 0; i < footbtns.length; i++) {
                    pagesCode[i] = footbtns[i].id;
                    pagesName[i] = footbtns[i].name;
                }

                //------------------------------------------------------------
                $('#footer').html('').addClass('footer');
                var pagesNum = pagesCode.length;


                for (var i = 0; i < pagesNum; i++) {
                    //每一页在页脚创建一个button
                    var button = '<ul class="footer_ul" id="' + pagesCode[i] + '">'
                        + '<li class="img"><a href="javascript:void(0);" class="' + pagesCode[i] + '"></a></li>'
                        + '<li class="name"><span class="taskLabel">' + pagesName[i] + '</span></li>'
                        + '</ul> ';

                    //将button加入.footer中
                    $('#footer').append(button);
                }

                $('.footer_ul').css('width', 100 / pagesNum + '%');
                //pageIndex = 0;//当前选中第0个页面
                //初始化显示第一个页面---将页脚第一个图标和标识变成点击的样式
                console.log("pagesCode[pageIndex]====" + pagesCode[pageIndex]);
                var $firstPage = $('#footer').children('.footer_ul').eq(pageIndex);
                $firstPage.find('.img a').removeClass(pagesCode[pageIndex]).addClass(pagesCode[pageIndex] + '_hover');
                $firstPage.find('.name').addClass('color_style');
                //-----------------------------------------------------------------------
                $('#scroller').html('');
                for (var i = 0; i < pagesCode.length; i++) {
                    var table_page = '<div id="' + pagesCode[i] + '" style=" background:#fff;display:none;">'
                        + '<table width="100%" cellpadding="0" cellspacing="0" border="0">'
                        + '<tbody></tbody>'
                        + '</table></div>';
                    $('#scroller').append(table_page);
                }
                $("#" + pagesCode[pageIndex]).css('display', 'block').siblings('div').not('#upLoading,#downLoading').css('display', 'none');

                //pageHeaderBtn[pageIndex] = headerBtnIndex
                for (var i = 0; i < pagesCode.length; i++) {
                    console.log("pageHeaderBtn[i]===" + pageHeaderBtn[i]);
                    if (pageHeaderBtn[i] == undefined) {
                        pageHeaderBtn[i] = 0;
                    }
                }
            } else {
                //报错
                _billList.errorDealFunction(result);
            }
        },

        /**
         * 调用获取页头按钮函数
         */
        getHeaderBtn: function (_pagecode) {
            if (paramUser.dataSourceSystem.indexOf("OA") == -1) {//没有OA的情况
                var param4 = {
                    status: _pagecode//我的任务
                }
                _billList.getDataByAjax('getTaskButtonList', param4, 'getTaskButtonListSuccessFunction', false);

            } else {
                var param4 = {
                    status: _pagecode//_pagecode//我的任务
                }
                _billList.get_OA_DataByAjax('getTaskButtonList', param4, 'getTaskButtonListSuccessFunction', false);

            }
        },
        // 代办 和 已办 是从这里返回的 !!!! ;
        /**
         * 调用getTaskStatusList接口成功的回调函数
         * 参数：result---getTaskStatusList接口返回数据
         * 功能：将接口返回的页脚按钮存入全局数组pagesCode，pagesName
         */
        getTaskButtonListSuccessFunction: function (result) {
         
            $("#loding").hide();//隐藏加载中图标
            if (result.code == "0") {
                //清空页头按钮数组
                buttonsCode.splice(0, buttonsCode.length);
                buttonsName.splice(0, buttonsName.length);
                //为页头按钮数组负值
                var headerbtns = result.jsonDatas.getTaskButtonList[0].statusstructlist;
                for (var i = 0; i < headerbtns.length; i++) {
                    buttonsCode[i] = headerbtns[i].statuscode;
                    buttonsName[i] = headerbtns[i].statusname;
                }
 



                _billList.initheaderBtn();
            }
        },
// vvv6
        /**
         * 根究当前页面序号pageIndex，初始化页面页头的按钮
         */
        initheaderBtn: function () {
            //当前页面页头的按钮数组
            var len = buttonsName.length;

            $('#header').html('').addClass('header');//首先将页头清空,并加入样式
            $('#header_line').remove();
            for (var i = 0; i < len; i++) {
                var btn = '<li><span class="' + buttonsCode[i] + '">' + buttonsName[i] + '</span></li>';
                $('#header').append(btn);
            }
            $('#header li').css('width', 100 / len + '%');

            //初始化---选择页头第一个按钮
            //$('#header li').eq(0).addClass('select').siblings().removeClass('select');
            //headerBtnIndex = 0;//同时初始化点击页头第一个按钮
            //pageHeaderBtn[pageIndex] = headerBtnIndex;

            //页头按钮下的蓝线
            var line = '<p class="line_bottom2" id="header_line"></p>';
            $('#header').after(line);
            try {
                pageHeaderBtn = window.sessionStorage.pageHeaderBtn.split(",");
            } catch (e) {
                pageHeaderBtn = [0, 0, 0];
            }
            //pageHeaderBtn = pageHeaderBtn.split(",");

            var pageBtnIndex = pageHeaderBtn[pageIndex];
              headerBtnIndex = pageHeaderBtn[pageIndex];//将当前页头按钮记住
            $('#header_line').css('width', '20%').css('left', (pageBtnIndex * (100 / len) + (100 / len - 20) * 0.5) + '%');
            $('#header li').eq(pageBtnIndex).addClass('select').siblings().removeClass('select');


            console.log("pageIndex==== " + pageIndex + ",headerBtnIndex==" + headerBtnIndex + ",pageBtnIndex===" + pageBtnIndex + ",pageFirstIn[pageIndex]===" + pageFirstIn[pageIndex]);
            //alert(pageFirstIn[pageIndex] == true);
            //alert("pageFirstIn[pageIndex] == undefined==" + pageFirstIn[pageIndex] == undefined);
            if (pageFirstIn[pageIndex] == true || pageFirstIn[pageIndex] == 'true' || pageFirstIn[pageIndex] == undefined || headerBtnIndex == 0) {
            //当第一次进入,调用页头按钮数据，获取页头第一个按钮对应的单据列表

                pageFirstIn[pageIndex] = false;
                //点击获取该页单据列表
                console.log("loaddingdate===" + pagesCode[pageIndex] + ",buttonsCode[headerBtnIndex]===" + buttonsCode[headerBtnIndex]);




                _billList.getBillList(pagesCode[pageIndex], buttonsCode[headerBtnIndex], 1);
                //_billList.initData();
            } else {
            //显示上次页头点击的按钮

                var pageBtnIndex = pageHeaderBtn[pageIndex];
                //$('#header_line').css('width', (100/len)*0.6 + '%').css('left', (pageBtnIndex*(100/len)+(100/len)*0.2)+'%');
                $('#header_line').css('width', '20%').css('left', (pageBtnIndex * (100 / len) + (100 / len - 20) * 0.5) + '%');
                $('#header li').eq(pageBtnIndex).addClass('select').siblings().removeClass('select');

                if ($("#" + pagesCode[pageIndex]).find('tr.bill').length == 0) {//当数据为空时再加载一次数据，修改本地刷新，企业家本地缓存
                    /*for(var i=0; i<pageFirstIn.length; i++){
                     pageFirstIn[i] = true;
                     }
                     pageFirstIn[pageIndex] = false;*/




                    _billList.getBillList(pagesCode[pageIndex], buttonsCode[headerBtnIndex], 1);
                    //_billList.initData();
                }
            }

        },
        /**
         * 调用获取页头按钮函数
         */
        getBillList: function (_pagesCode, _buttonsCode, startline) {
            var param;
            //标识清零
            OA_NC_getBillList_flag = 0;

            noBill = false;//返回单据数目为0
            var now = new Date();

            //清空单据列表数组
            if (billsArray) {
                billsArray.splice(0, billsArray.length);
            }

            var NC_startline = 1;
            var OA_startline = 1;
            //下拉加载更多时
            //alert("getBillList")
            if (!startline) {
                var NC_currentBillSum = $('#' + pagesCode[pageIndex]).find('.bill[data-system="NC"]').length;//获取页面当前NC单据数目
                var OA_currentBillSum = $('#' + pagesCode[pageIndex]).find('.bill[data-system="OA"]').length;//获取页面当前OA单据数目
                console.log("NC_currentBillSum = " + NC_currentBillSum + "; OA_currentBillSum = " + OA_currentBillSum);

                NC_startline = NC_currentBillSum + 1;
                OA_startline = OA_currentBillSum + 1;

            }
            //适配NC，获取NC数据列表
            if (paramUser.dataSourceSystem.indexOf("NC") != -1) {
                //alert("NC列表")
                param = {
                    groupid: paramUser.groupid,//'0001A210000000001JRL'
                    usrid: paramUser.userid,//paramUser.userid  //1002A210000000001XLB
                    date: now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate(),//"2016-03-02"
                    statuskey: _pagesCode,//"ishandled"
                    statuscode: _buttonsCode,//"unhandled"
                    startline: NC_startline,//从1开始
                    count: count,//每次获取25条
                    category: window.sessionStorage.getItem('category') || ""
                };
                //适配NC65
                if (paramUser.ncversion == "NC65") {
                    _billList.getDataByAjax('getTaskList65', param, 'get_NC_TaskListSuccessFunction', true);
                } else {
                    _billList.getDataByAjax('getTaskList', param, 'get_NC_TaskListSuccessFunction', true);
                }
            }
            //适配OA，获取OA数据列表
            if (paramUser.dataSourceSystem.indexOf("OA") != -1) {//OA的情况
                //alert("OA列表")
                param = {
                    groupid: paramUser.groupid,//'0001A210000000001JRL'
                    userid: paramUser.userid,//paramUser.userid  //1002A210000000001XLB
                    date: now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate(),//"2016-03-02"
                    statuskey: _pagesCode,//"ishandled"
                    statuscode: _buttonsCode,//"unhandled"
                    condition: "",
                    startline: OA_startline,//从1开始
                    count: count,//每次获取25条
                    category: window.sessionStorage.getItem('category') || ""
                };
                //适配NC65
                if (paramUser.ncversion == "NC65") {
                    _billList.get_OA_DataByAjax('getTaskList65', param, 'get_OA_TaskListSuccessFunction', true);
                } else {
                    _billList.get_OA_DataByAjax('getTaskList', param, 'get_OA_TaskListSuccessFunction', true);
                }
            }
            //alert('页脚：'+_pagesCode + ' 页头：'+_buttonsCode+'数据');
            //两个列表合并数组

        },
// vvv7
        /**
         * 调用getTaskStatusList接口成功的回调函数
         * 参数：result---get_NC_TaskListSuccessFunction  NC接口返回数据
         * 功能：将接口返回的页脚按钮存入全局数组pagesCode，pagesName
         */
        get_NC_TaskListSuccessFunction: function (result) {

            //OA+NC标志，2表示两个类型列表接口都调用完
            OA_NC_getBillList_flag += 1;
            if (result.code == "0") {
                //清空NC单据列表数组
                if (NC_billsArray) {
                    NC_billsArray.splice(0, NC_billsArray.length);
                }
                var array = result.jsonDatas.getTaskList || result.jsonDatas.getTaskList65,
                    categorylist = array[0].categorylist;


            // 单据类型 ;;; 
                _util.handleCategory(categorylist);

                //将获取到单据列表赋给NC单据数组
                NC_billsArray = array[0].taskstructlist || [];
                
                billsArray = billsArray.concat(NC_billsArray);
                //billsArray = result.jsonDatas.getTaskList[0].taskstructlist;




                //渲染数据调用函数提取
                _billList.initDataCalledFun();
            } else {
                // 只是NC时失败，显示错误信息
                $("#loding").hide();
                if (paramUser.dataSourceSystem != 'NC+OA') {
                    _billList.show_error(result.desc);
                }
                return false;
            }
        },
        /**
         * 调用接口成功的回调函数
         * 参数：result---get_OA_TaskListSuccessFunction  OA接口返回数据
         * 功能：将接口返回的页脚按钮存入全局数组pagesCode，pagesName
         */
        get_OA_TaskListSuccessFunction: function (result) {
            //OA+NC标志，2表示两个类型列表接口都调用完
            OA_NC_getBillList_flag += 1;
            if (result.code == "0") {
                //清空OA单据列表数组
                if (OA_billsArray) {
                    OA_billsArray.splice(0, OA_billsArray.length);
                }
                var array =  result.jsonDatas.getTaskList65 || result.jsonDatas.getTaskList;
                //将获取到单据列表赋给OA单据数组
                OA_billsArray = array[0].taskstructlist || [];
                if(upLoadKey && OA_billsArray.length < count) {
                    //如果OA单据返回的数据小于请求数据的时候，表明再次上拉仍然返回相同数据，此时不将返回的OA列表合并到billsArray
                    //这么处理是为了迎合OA接口返回数据特点，现在如果加载数据完毕，OA列表接口仍然会返回相同的数据
                    $('#loding').hide();
                } else {
                    //从接口获取单据列表值
                    billsArray = billsArray.concat(OA_billsArray);
                }




                //渲染数据调用函数提取
                _billList.initDataCalledFun();
            } else {
                $('#loding').hide();
                // 只是OA时失败，显示错误信息
                if (paramUser.dataSourceSystem != 'NC+OA') {
                    _billList.show_error(result.desc);
                }
                return false;
            }
        },
// vvv8 ;
        //如上函数的调用函数，在OA+NC的时候要等两个都调用完毕才渲染数据
        initDataCalledFun: function () {
            //NC+ OA的时候，全部调用完毕的时候，才进行数据渲染
            if (paramUser.dataSourceSystem == 'NC+OA') {
                if (OA_NC_getBillList_flag == "2") {
                    $("#loding").hide();



                    _billList.initDataWhenDataBack();
                }
            } else {
                $("#loding").hide();



                _billList.initDataWhenDataBack();
            }
        },
        /**
         * 渲染数据调用函数提取
         *
         */
        initDataWhenDataBack: function () {
            if (billsArray.length == 0) {
                noBill = true;//返回单据数目为0
            }
            if (upLoadKey) {
                if (noBill) {//当获取单据为空时
                    $('#' + pagesCode[pageIndex]).find('#upLoading').find('img').attr('src', '').css('display', 'none');
                    $('#' + pagesCode[pageIndex]).find('#upLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.alreadyAllDataInfo"));//'加载完成'
                } else {



                    // 上啦加载 !!!;
                    _billList.addData();

                    setTimeout(function () {
                        $('#' + pagesCode[pageIndex]).find('#upLoading').find('img').attr('src', 'images/up-vector.png').css('display', 'block');
                        $('#' + pagesCode[pageIndex]).find('#upLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.upLoadMoreInfo"));//'上拉更多'
                    }, 500);
                }

                upLoadKey = false;
            } else {



                // 初次渲染 下拉刷新 !!! ;
                _billList.initData();
            }
        },
// vvv9 ;
        /**
         *将查询出来的数据，单据列表保存在全局变量billsArray
         * 功能：将数组显示在页面上
         */
        addData: function () {

            _billList.dataToHtml();
            //列表高度增加，需重新初始化滑动iscroll
            _billList.initIScroll();

        },
        /**
         * 初次加载单据列表数据，或者下拉刷新页面
         */
        initData: function () {
            //首先清空单据列表
            $('#' + pagesCode[pageIndex]).find('tbody').html('');
            //$('#upLoading').remove();
            if (billsArray) {
                if ($('#scroller').find('#downLoading').length == 0) {
                    var downRefresh = '<div class="showbox" id="downLoading" style="display:block;">'
                        + '<div class="loadingWord">'
                        + '<img src="images/down-vector.png">'
                        + '<span class="loading_text downRefreshLable">下拉刷新</span>'
                        + '</div></div>';
                    $('#scroller').prepend(downRefresh);
                }

                if (billsArray.length == 0) {//当前单据列表为空
                    _billList.show_nodata(eval("billListLang." + get_lang() + ".pageMessage.noBillsCurrentPage"));//'当前列表无单据'
                    //控制批量部分的显示和隐藏
                    if (isWeiXinFlag) {
                        $("#batchLabel").hide();
                        $(".batch_mode_open").css("width", "60px");
                        $(".batch_mode_open .text").css("width", "40px");
                        $(".batch_mode_open .text a").css("border-left", "none").show();
                    } else {
                        $(".batch_mode").hide();
                    }
                } else {//当单据列表不为空

                    _billList.dataToHtml();//将单据列表数组中的数据转换成html,加入页面

                    if (billsArray.length >= count) {//当初始获取单据列表数目小于count,说明没有更多单据了
                        if ($('#' + pagesCode[pageIndex]).find('#upLoading').length != 0) {

                            $('#' + pagesCode[pageIndex]).find('#upLoading').remove();
                        }
                        //在列表最后一行加上‘上拉更多’
                        var up_more_div = '<div class="showbox" id="upLoading" style="display:block;"><div class="loadingWord"><img src="images/up-vector.png"><span class="loading_text">' + (eval("billListLang." + get_lang() + ".pageMessage.upLoadMoreInfo")) + '</span></div></div>';
                        //$('#scroller').append(up_more_div);
                        $('#' + pagesCode[pageIndex]).append(up_more_div);

                    } else {
                        $('#' + pagesCode[pageIndex]).find('#upLoading').remove();
                    }


                }

                //列表可滑动
                //1.为iscroll框赋高度
                var header_height = $('#header').height();
                var footer_height = $('#footer').height();
                //var wrapper_height = window_height - header_height - footer_height;
                var wrapper_height = window_height - footer_height;
                $('#wrapper').css('height', wrapper_height);
                _billList.initIScroll();

            } else {
                _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.resultNull"));//'接口返回为null'
            }



            _billList.billClickEvent();//点击单据时绑定事件
        },
// vvv10 ;
        /**
         * 将单据列表数组中的数据转换成html,加入页面
         */
        dataToHtml: function () {

            var _width = $(window).width();
            //console.log("window _width====" + (parseInt(2 * _width) * 0.95 - 20));
            var rightWidth = parseInt(2 * _width) * 0.95 - 20;
            //console.log("window rightWidth====" + rightWidth);
            var split8PartWidth = Math.floor(rightWidth / 16);
            var fontNumEach = Math.floor(split8PartWidth * 12 / 15);

            NC_billsArray = NC_billsArray.map(function(bill) {
                bill['data-system'] = 'NC';
                return bill;
            });
            OA_billsArray = OA_billsArray.map(function(bill) {
                bill['data-system'] = 'OA';
                return bill;
            });
            var listArray = NC_billsArray.concat(OA_billsArray);
            if(NC_billsArray.length && OA_billsArray.length) { // NC和OA单据共存时，混合排序
                listArray = listArray.sort(function (previous, next) {
                    var nextDate = new Date(next.date.replace(/\s/, 'T'));
                    var previousDate = new Date(previous.date.replace(/\s/, 'T'));
                    return nextDate - previousDate;
                });
            }
            var pointFlagHtml = "",
                oneBill = "";
            if (pagesCode[pageIndex] == "ishandled" && buttonsCode[headerBtnIndex] == "unhandled") { // 只有“我的任务”-“待办”需要蓝点
                pointFlagHtml = '<div class="nc_radius"></div>';
                $(".batch_mode").show();
            } else {
                pointFlagHtml = '<div></div>';
                $(".batch_mode").hide();
                $(".batch_mode_open").hide();
            }
            for(var i=0, len=listArray.length; i<len; i++) {
                if(listArray[i]['data-system'] == 'OA') { // OA单据
                    oneBill += '<tr><td></td><td></td></tr>'
                        + '<tr class="bill"  id="billRowId_' + currentCountId + '" data-system="OA" data-taskid="' + listArray[i].taskid + '">'
                        + '<td width="5%" align="right" valign="top"><!--<div class="nc_radius"></div>--></td>'
                        + '<td>'
                        + '<span class="nc_name" nameStr="'+listArray[i].title+'" data-system="OA" data-taskid="' + listArray[i].taskid + '">' + _billList.substrLength(listArray[i].title, fontNumEach) + '<!--字数进行限制超过28个字用...显示--><span class="nc_color nc_margin">' + listArray[i].date.substr(5, 11) + '</span></span>'
                        + '</td>'
                        + '</tr>'
                        + '<tr>'
                        + '<td></td>'
                        + '<td style="border-bottom:#e9e9e9 solid 1px;"></td>'
                        + '</tr>';
                } else if(listArray[i]['data-system'] == 'NC') { // NC单据
                    oneBill += '<tr><td></td><td></td></tr>'
                        + '<tr class="bill" id="billRowId_' + currentCountId + '"  data-system="NC" data-taskid="' + listArray[i].taskid + '">'
                        + '<td width="5%" align="right" valign="top">' + pointFlagHtml + '</td>'
                        + '<td>'
                        + '<span class="nc_name" nameStr="'+listArray[i].title+"，提交日期为"+listArray[i].date+'" data-system="NC" data-taskid="' + listArray[i].taskid + '">' + _billList.substrLength(listArray[i].title, fontNumEach) + '<!--字数进行限制超过28个字用...显示--><span class="nc_color nc_margin">' + listArray[i].date.substr(5, 11) + '</span></span>'
                        + '</td>'
                        + '</tr>'
                        + '<tr>'
                        + '<td></td>'
                        + '<td style="border-bottom:#e9e9e9 solid 1px;"></td>'
                        + '</tr>';
                }
                currentCountId++;
            }
            $('#' + pagesCode[pageIndex]).find('tbody').append(oneBill);
            //处理滑动条固定位置
            if (upLoadKey && currentCountId > count && _iscroll) {
                _iscroll.refresh();
                var thisId = currentCountId - count - 1;
                console.log("thisId===" + thisId);
                setTimeout(function() {
                    _iscroll.scrollToElement(document.getElementById('billRowId_' + thisId), 0);   //页面初始化显示最后一条数据
                }, 25);
            }
            //var currentBillSum = $('#billList').find('.bill').length;
            //var currentBillSum = $('#' + pagesCode[pageIndex]).find('.bill').length;
            //console.log('增加：'+ billsArray.length + '  一共：'+ currentBillSum);
        },
        /**
         *弹性滚动
         */
        initIScroll: function () {
            if (typeof(_iscroll) != "undefined") {
                _iscroll.destroy();
            }
            releaseKey = false;//标记拉动是否释放，默认false,释放true,只有释放后才能更新页面数据
            downLoadKey = false;//下拉加载数据可用true,禁用false
            upLoadKey = false;//上拉加载数据可用true,禁用false
            mark_i = 0;//标识是否第一次开始下拉，第一次不用转动箭头

            _iscroll = new iScroll('wrapper', {
                scrollbarClass: 'myScrollbar',
                checkDOMChanges: true,
                //开始滚动时回调
                onScrollMove: function () {
                    ////console.log(this.y);
                    var _y = this.y;//下拉距离
                    var _max = (this.maxScrollY) * (-1);//最大的下拉距离,负值
                    //console.log('_y:'+_y+'  _max:' + _max+' mark_i:'+mark_i);

                    //页头---下拉刷新
                    if (_y > 0 && _y < 40) {//显示'下拉刷新'
                        if (mark_i > 0) {
                            //$('#downLoading').find('img').animate({transform:'rotate(-0deg)'},200);
                            $('#downLoading').find('img').animate({
                                'transform': 'rotate(-0deg)',
                                '-ms-transform': 'rotate(-0deg)',
                                '-moz-transform': 'rotate(-0deg)',
                                '-webkit-transform': 'rotate(-0deg)',
                                '-o-transform': 'rotate(-0deg)'
                            }, 200);
                        }
                        //$('#downLoading').find('img').attr('src', 'images/down-vector.png');
                        $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.downRefresh"));//'下拉刷新'
                        releaseKey = false;
                    } else if (_y >= 40) {
                        mark_i++;
                        //$('#downLoading').find('img').animate({transform:'rotate(180deg)'},200);
                        $('#downLoading').find('img').animate({
                            'transform': 'rotate(180deg)',
                            '-ms-transform': 'rotate(180deg)',
                            '-moz-transform': 'rotate(180deg)',
                            '-webkit-transform': 'rotate(180deg)',
                            '-o-transform': 'rotate(180deg)'
                        }, 200);

                        //$('#downLoading').find('img').attr('src', 'images/up-vector.png');
                        $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.releaseUpdate"));//'释放更新'
                        releaseKey = true;
                        downLoadKey = true;
                    } else if ((-_y) > _max) {//_max
                        //页脚---上拉加载更多
                        //alert('上拉刷新');
                        //$('#upLoading').find('.loading_text').html('上拉更多');
                        releaseKey = true;
                        upLoadKey = true;
                    }

                },
                vScrollbar: false,
                //手离开屏幕时回调
                onTouchEnd: function () {
                    ////console.log('手离开屏幕：' + this.y);
                    if (releaseKey) {//手释放了

                    // *** 下拉刷新数据
                        if (downLoadKey) {
                            //下拉刷新，开始id为0开始
                            currentCountId = 0;
                            OA_NC_getBillList_flag = 0;////OA+NC标志，2表示两个类型列表接口都调用完,初始化值为0
                            $('#scroller').css('top', '39px');
                            $('#downLoading').find('img').attr('src', 'images/waiting.gif');
                            $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.loadingInfo"));//'加载中...'



                            //获取新数据，显示在页面上
                            _billList.getBillList(pagesCode[pageIndex], buttonsCode[headerBtnIndex], 1);
                            ////console.log('刷新页面数据');
                            //_billList.initData();
                            downLoadKey = false;
                        }

                    // *** 上拉加载更多数据
                        if (upLoadKey) {
                            OA_NC_getBillList_flag = 0;////OA+NC标志，2表示两个类型列表接口都调用完,初始化值为0
                            $('#' + pagesCode[pageIndex]).find('#upLoading').find('img').attr('src', 'images/waiting.gif').css('display', 'block');
                            $('#' + pagesCode[pageIndex]).find('#upLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.loadingInfo"));//'加载中...'



                            //获取新数据，显示在页面上
                            _billList.getBillList(pagesCode[pageIndex], buttonsCode[headerBtnIndex]);
                        }
                        releaseKey = false;

                    }

                    //不论是否刷新数据，都要隐藏loading栏---页头
                    setTimeout(function () {
                        $('#scroller').css('top', '-1px');
                        mark_i = 0;
                        $('#downLoading').find('img').attr('src', 'images/down-vector.png');
                        //$('#downLoading').find('img').css('transform','rotate(0deg)');
                        $('#downLoading').find('img').css({
                            'transform': 'rotate(0deg)',
                            '-ms-transform': 'rotate(0deg)',
                            '-moz-transform': 'rotate(0deg)',
                            '-webkit-transform': 'rotate(0deg)',
                            '-o-transform': 'rotate(0deg)'
                        });
                        $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.downRefresh"));//'下拉刷新'
                    }, 500);
                }
            });
            //处理滑动条固定位置
            // 从详情页面进入列表时应该重新定位到此条详情附近的位置
            var clickedYPos = window.sessionStorage.clickedYPos;
            if(clickedYPos && _iscroll) {
                _iscroll.refresh();
                setTimeout(function() {
                    _iscroll.scrollTo(0, Number(clickedYPos));
                    window.sessionStorage.clickedYPos = '';
                }, 25);
            }
            if (currentCountId > count) {
                var thisId = currentCountId - count;
                console.log("thisId===" + thisId);
                //_iscroll.scrollToElement(document.querySelector('#billRowId_' + thisId));   //页面初始化显示最后一条数据
            }
        },



// vvv11 ;
        /**
         * 绑定页面事件
         */
        bindEvent: function () {
            _billList.logoutEvent();//微信侧边栏注销按钮事件
            _billList.headerBtnClick();//为页头按钮绑定点击事件
            _billList.PageBtnClick();//为点击页脚按钮绑定点击事件
            _billList.billClickEvent();//点击单据时绑定事件
            _billList.billSearchClick();//查询按钮绑定
        },
        /**
         * 查询按钮事件绑定
         */
        billSearchClick: function () {
            $("#billListSearch").unbind().on('click', function () {
                //pagesCode[pageIndex], buttonsCode[headerBtnIndex]
                console.log("show bygBillSearch page, pagecode = " + pagesCode[pageIndex] + ",buttonsCode == " + buttonsCode[headerBtnIndex]);
                //单击事件处理，页面直接跳转
                window.location.href = 'billSearch.html?pagesCode=' + pagesCode[pageIndex] + '&buttonsCode=' + buttonsCode[headerBtnIndex];
            });
        },
        /*
         * 微信注销按钮事件
         */
        logoutEvent: function () {
            //点击侧栏收缩展开按钮
            $("#in_out_btn").unbind().on('click', function () {
                if ($(this).hasClass('logoutBox_open')) {//已展开，点击收缩
                    $("#logout_box").animate({
                        right: "-48px"
                    }, 200);
                    $("#in_out_btn").removeClass('logoutBox_open');
                } else {//已收缩，点击展开
                    $("#logout_box").animate({
                        right: "0px"
                    }, 200);
                    $("#in_out_btn").addClass('logoutBox_open');
                }

            });

            //点击注销事件
            $("#wxLogout").unbind().on('click', function () {
                /**
                 * 带有"确定"和"取消"的弹出框
                 * info:提示信息
                 * callback:点击确定按钮后执行的函数
                 */
                dialog.confirm("确定退出登录吗？", _billList.logoutFuction)


            });
        },
        /*
         * 注销动作
         */
        logoutFuction: function () {
            if (window.sessionStorage.firstWechatLoginResult) {
                var LoginResultData = eval('(' + window.sessionStorage.firstWechatLoginResult + ')');
                if (LoginResultData.data.foot) {//当微信登陆用户信息存在时
                    console.log("unbindFunction===" + "userid=" + LoginResultData.data.foot.userid + "  ucode=" + LoginResultData.data.foot.ucode)
                    _billList.unbindFunction(LoginResultData.data.foot.userid, LoginResultData.data.foot.ucode);
                } else {
                    dialog.log("LoginResultData.data.foot is undefine");
                }
            } else {
                alert("window.sessionStorage.firstWechatLoginResult is undefine");
            }
        },
        /**
         * 点击单据时绑定事件
         * 跳转到单据详情页，将taskid传到单据详情页
         */
        billClickEvent: function () {
            $('#scroller').unbind().on('click', '.nc_name', function (event) {
                if(_util.isVisible($('.popover'))) { // 如果类别选择框存在，隐藏
                    $('.popover').hide();
                    return false;
                }
                for (var i = 0; i < pagesCode.length; i++) {
                    pageFirstIn[i] = true;
                }
                //调用取得列表之前记录当前操作按钮组
                window.sessionStorage.pageBtnArray = pageIndex + "," + pageHeaderBtn[pageIndex];
                window.sessionStorage.pageHeaderBtn = pageHeaderBtn;
                window.sessionStorage.pageFirstIn = pageFirstIn;

                var taskid = $(this).attr('data-taskid');
                var dataSystem = $(this).attr('data-system');//单据来源系统，"NC"/"OA"

                //点击记录一下当前页面和头部标识
                window.sessionStorage.pageClickedCode = pagesCode[pageIndex] + "," + buttonsCode[headerBtnIndex];
                window.sessionStorage.clickedYPos = _iscroll ? _iscroll.y : 0;  // 记录当前点击单据的y轴位置

                // 点击的时候把标题详细信息储存早storage中 , im跳转时需要标题 ;
                var imTitle = encodeURIComponent($(this).attr('nameStr')) ;
                if (dataSystem == "NC") {//NC表单，跳到NC表单详情
                    window.location.href = 'billDetail.html?statuskey=' + pagesCode[pageIndex] + '&statuscode=' + buttonsCode[headerBtnIndex] + '&taskid=' + taskid+'&imTitle='+imTitle;
                } else {//OA表单，跳到OA表单详情
                    window.location.href = 'OAbillDetail.html?statuskey=' + pagesCode[pageIndex] + '&statuscode=' + buttonsCode[headerBtnIndex] + '&taskid=' + taskid+'&imTitle='+imTitle;
                }
            });
        },
        /**
         * 点击页头按钮样式变化
         */
        headerBtnClick: function () {
            $('#header').on('click', 'li', function () {
                //切换时候，开始id为0开始
                currentCountId = 0;
                var $this = $(this);
                var index = $this.index();
                //点击改变按钮样式
                $this.addClass('select').siblings().removeClass('select');

                //$('#wrapper').find('.error-none').remove();
                //下面蓝线运动
                var len = $this.siblings().length + 1;
                var target_left = index * (100 / len) + (100 / len - 20) * 0.5;//
                //_iscroll.refresh();
                $('#scroller').css('transform', 'translate(0px, 0px)');//切换时，设置scroll部分初始未滑动
                //为全局变量，点击页头第几个按钮负值，从0开始
                headerBtnIndex = index;
                pageHeaderBtn[pageIndex] = headerBtnIndex;
                $('#header_line').animate({left: target_left + '%'}, 200);

                //调用取得列表之前记录当前操作按钮组
                window.sessionStorage.pageBtnArray = pageIndex + "," + pageHeaderBtn[pageIndex];
                window.sessionStorage.pageHeaderBtn = pageHeaderBtn;
                window.sessionStorage.pageFirstIn = pageFirstIn;

                //批量审批显示控制
                if (pagesCode[pageIndex] == "ishandled" && buttonsCode[headerBtnIndex] == "unhandled") {
                    $(".batch_mode").show();
                } else {
                    $(".batch_mode").hide();
                    //也要控制头部的变化
                    $(".nc_select_all").hide();
                    $("#header").css("margin-top", "0px").show();
                }

                window.sessionStorage.setItem('category', '');
                _util.modifyDocTitle("移动审批");
                //点击获取该页单据列表
                _billList.getBillList(pagesCode[pageIndex], buttonsCode[headerBtnIndex], 1);
            });

            //批量模式，普通模式切换
            $(".batch_mode,.batch_mode_open .img,.batch_mode_open .text .batchLabel").unbind().on("click", function () {
                var _this = $(this);
                var _class = _this.attr("class");

                var left = $(".batch_mode_open .text").width();
                //弹出切换卡
                if (_class == "batch_mode") {
                    _this.hide();
                    $(".batch_mode_open").show().animate({right: '0'}, 300);
                    //收起切换卡
                } else if (_class == "img") {
                    var left = $(".batch_mode_open .text").width();
                    $(".batch_mode_open").animate({right: "-" + left + "px"}, 300, "swing", function () {
                        $(".batch_mode_open").hide();
                        $(".batch_mode").show();
                    });
                    //切换 批量、普通模式
                } else {
                    $(".nc_select li").eq(0).text(eval("billListLang." + paramUser.lang + ".pageMessage.allChoiseLabel"));//"全选"
                    //显示
                    $(".nc_select_all").show();
                    var _text = $(".batch_mode_open .text .batchLabel");
                    if (_text.text() == eval("billListLang." + paramUser.lang + ".pageMessage.batchLabel")) {//"批量模式"
                        billStatus = true;
                        $(".nc_radius").attr("class", "radioclass").parent().animate({width: '15%'}, 200);
                        $(".header").eq(0).animate({"margin-top": '-40px'}, 200);
                        _text.text(eval("billListLang." + paramUser.lang + ".pageMessage.commonLabel"));//'普通模式'
                        _billList.bindBillEvent();//加载批量模式事件
                        $("#header_line").hide();//隐藏线条
                    } else {
                        billStatus = false;
                        $(".radioclass,.radio_on").attr("class", "nc_radius").parent().animate({width: '7%'}, 200);
                        $(".header").eq(0).animate({"margin-top": '0px'}, 200);
                        _text.text(eval("billListLang." + paramUser.lang + ".pageMessage.batchLabel"));//'批量模式'
                        $("#header_line").show();//隐藏线条
                    }
                    $(".batch_mode_open").animate({right: "-" + left + "px"}, 300, "swing", function () {
                        $(".batch_mode_open").hide();
                        $(".batch_mode").show();
                    });
                }
            });
        },
        /**
         * 批量模式事件绑定
         */
        bindBillEvent: function () {
            console.log("绑定开始");
            //选择审批项
            $(".radioclass,.radio_on").unbind().on("click", function () {
                var _this = $(this);
                (_this.attr("class") == "radioclass") ? _this.attr("class", "radio_on") : _this.attr("class", "radioclass");
                var allRadio = $(".nc_name").length;
                var selectRadio = $(".radio_on").length;

                if (selectRadio == 0) {
                    $(".nc_select li").eq(0).text(eval("billListLang." + paramUser.lang + ".pageMessage.allChoiseLabel"));//"全选"
                    $(".nc_select li").eq(1).removeClass("colur_blue");
                } else if (allRadio == selectRadio) {
                    $(".nc_select li").eq(0).text(eval("billListLang." + paramUser.lang + ".pageMessage.cancelAllChoiseLabel"));//"取消全选"
                } else {
                    $(".nc_select li").eq(0).text(eval("billListLang." + paramUser.lang + ".pageMessage.allChoiseLabel") + "(" + selectRadio + "/" + allRadio + ")");//全选("+selectRadio+"/"+allRadio+")
                    $(".nc_select li").eq(1).addClass("colur_blue");
                }
            });
            console.log("绑定结束");
            //全选 取消全选   审批
            $(".nc_select li").unbind().on("click", function () {
                var _this = $(this);
                //全选 取消全选
                if (_this.index() == 0) {
                    var sp = $(".nc_select li").eq(1);
                    //(_this.text()!="取消全选")?$(".radioclass").attr("class","radio_on")&&_this.text("取消全选")&&sp.addClass("colur_blue"):$(".radio_on").attr("class","radioclass")&&_this.text("全选")&&sp.removeClass("colur_blue");
                    (_this.text() != eval("billListLang." + paramUser.lang + ".pageMessage.cancelAllChoiseLabel")) ? $(".radioclass").attr("class", "radio_on") && _this.text(eval("billListLang." + paramUser.lang + ".pageMessage.cancelAllChoiseLabel")) && sp.addClass("colur_blue") : $(".radio_on").attr("class", "radioclass") && _this.text(eval("billListLang." + paramUser.lang + ".pageMessage.allChoiseLabel")) && sp.removeClass("colur_blue");
                    //审批
                } else {
                    if (_this.attr("class") != "colur_blue") {
                        //alert("请选择审批项");
                        dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.notchoiseInfo"));//"尚未选择审批单据,请选择单据后重试"
                    } else {
                        $("#loding").show();//显示加载中图标
                        //用户点击的时候进行判断
                        //调用单据审批之前，需要验证是否需要相应的是批权限
                        _billList.initDoAction();
                    }
                }
            });
        },
        //审批按键（批准、不批准、驳回）的单击事件
        popfunction: function () {
            //dialog.confirm("你确定进行批量审批吗？",_task_list.billApproval);
            $("#billSp").show();
            $("#batchSp_text").val("");
            var selectRadio = $(".radio_on").length;
            $(".batch_approval .select span").text(eval("billListLang." + paramUser.lang + ".pageMessage.batchApprove") + '[' + selectRadio + eval("billListLang." + paramUser.lang + ".pageMessage.billsLabel") + ']');
            //初始化操作按键
            $("#closeBillSp,#bpz,#bh,#pz").unbind().on("click", function () {
                var id = $(this).attr("id");
                var type;
                if (id == "closeBillSp") {
                    $("#billSp").hide();
                    $("#batchSp_text").val("");
                    return;
                } else if (id == "bpz") {
                    type = "doDisAgree";
                } else if (id == "bh") {
                    type = "doReject";
                } else if (id = "pz") {
                    type = "doAgree";
                }
                $("#billSp").hide();
                //$("#batchSp_text").val("");
                _billList.doActionFun(type);
            });
        },
        //执行审批动作
        doActionFun: function (code) {
            var userids = [""];
            var billApprovalList = [];      //审批任务列表
            var dataList = $(".radio_on");

            //批语
            var approveNote = $("#batchSp_text").val() == "" ? $("#batchSp_text").attr("placeholder") : $("#batchSp_text").val();
            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.nctoken,
                usercode: paramUser.ucode,
                doActionList: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    actiondes: []
                }
            };

            if (code == "doReject") {
                for (var i = 0; i < dataList.length; i++) {
                    var taskid = dataList.eq(i).parents("tr").attr("data-taskid");
                    //批量审批参数拼接
                    param.doActionList.actiondes[i] = {
                        statuscode: "unhandled",
                        statuskey: "ishandled",
                        taskid: taskid,
                        actioncode: code,
                        note: approveNote + '(' + eval("billListLang." + paramUser.lang + ".pageMessage.approveByQyjInfo") + ')',//"(来自移动端)"
                        actionstage: "0",
                        rejectmarks: userids
                    };
                }
            } else {
                for (var i = 0; i < dataList.length; i++) {
                    var taskid = dataList.eq(i).parents("tr").attr("data-taskid");
                    //批量审批参数拼接
                    param.doActionList.actiondes[i] = {
                        statuscode: "unhandled",
                        statuskey: "ishandled",
                        taskid: taskid,
                        actioncode: code,
                        note: approveNote + '(' + eval("billListLang." + paramUser.lang + ".pageMessage.approveByQyjInfo") + ')',//"(来自移动端)"
                        actionstage: "0",
                        userids: userids
                    };
                }
            }
            console.log("请求参数为：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/approve?radom=" + Math.random();
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
                    console.log("批量审批返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        dialog.log(result.desc || '批量审批失败');
                        console.log(result.desc);
                    } else {

                        try {
                            var resultList = result.jsonDatas.doActionList[0];
                            var errorItemsArray = [], // 出错单据的暂存数组
                                errorTips; // 出错信息字符串
                            var flag = resultList.flag;
                            var des = resultList.des;
                            if (flag != "0") {
                                dialog.log(des || '批量审批失败');
                            } else {
                                $("#assign").hide();
                                for(var i in resultList) {
                                    if(resultList.hasOwnProperty(i) && resultList[i].flag && resultList[i].flag != '0') {
                                        errorItemsArray.push(i);
                                    }
                                }
                                if(errorItemsArray.length) {
                                    errorTips = '单据';
                                    errorItemsArray.forEach(function(item) {
                                        errorTips += item + '、';
                                    });
                                    errorTips = errorTips.substring(0, errorTips.length - 1) + '审批失败';
                                }
                                dialog.log(errorTips || '审批成功', function () {
                                    window.location.reload(true);
                                }, 2000);
                            }
                        } catch (e) {
                            dialog.log('批量审批失败');
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
         * 审批动作
         */
        initDoAction: function () {
            //调用单据审批之前，需要验证是否需要相应的是批权限
            var paramCheck = {
                serviceid: "sp63_ispservice",
                token: paramUser.nctoken,
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
                                        dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.noFeeInfo"));//"移动审批已欠费，请联系管理员"
                                        $("#loding").hide();//隐藏加载中图标
                                        return false;
                                    }
                                    //执行审批动作
                                    _billList.popfunction();
                                    $("#loding").hide();//隐藏加载中图标
                                },
                                error: function (XMLHttpRequest, textStatus, errorThrown) {
                                    $("#loding").hide();//显示加载中图标
                                    dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//"网络连接失败，请您检查网络后重试"
                                }
                            });
                            */
                            //执行审批动作
                            _billList.popfunction();
                            $("#loding").hide();//隐藏加载中图标
                        } else {
                            //转圈去除
                            $("#loding").hide();
                            dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.notAuthedInfo"));//"您使用的是免费版本，无法使用审批功能，若要进行审批操作，请联系管理员"
                        }
                    } else {
                        //转圈去除
                        $("#loding").hide();
                        if (checkResult.desc != undefined && checkResult.desc != "") {
                            dialog.log(checkResult.desc);
                        } else {
                            dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.notAuthedInfo"));//"您使用的是免费版本，无法使用审批功能，若要进行审批操作，请联系管理员"
                        }

                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();
                    dialog.log(eval("billListLang." + paramUser.lang + ".pageMessage.funcError") + textStatus + ",errorthrown==" + errorThrown);//'执行函数失败'
//                  console.log('执行函数失败' + textStatus + ",errorthrown==" + errorThrown);
                }
            });
        },
        /**
         * @description 配置项设置
         */
        initParamSet: function () {
            var _batch_mode = $(".batch_mode"),
                isOA = paramUser.dataSourceSystem.indexOf("OA") >= 0,
                regexp = /^Y$/i,
                isBatchApprove = regexp.test(clientParam.isbatchapprove),
                isDisAgree = regexp.test(clientParam.isdisagree);

            if(isBatchApprove && !isDisAgree) {    // 批量审批没有"不批准"的操作
                $('#bpz').remove();
                $('#pz,#bh').css('width', '50%');
            }

            if (isWeiXinFlag) { // 微信登录，最起码得有注销
                if (isBatchApprove && !isOA) {
                    if (querytype != 0) {
                        _batch_mode.hide();
                    } else {
                        $(".batch_mode_open").css("width", "128px");
                        $(".batch_mode_open .text").css("width", "108px");
                        $(".batch_mode_open .text a").show();   // 注销
                    }
                } else {
                    $("#batchLabel").hide();
                    $(".batch_mode_open").css("width", "60px");
                    $(".batch_mode_open .text").css("width", "40px");
                    $(".batch_mode_open .text a").css("border-left", "none").show();    // 注销
                }
            } else {
                $("#wxLogout").hide();  // 非微信，没有注销
                if(isBatchApprove && !isOA) {
                    if (querytype != 0) {
                        _batch_mode.hide();
                    } else {
                        $(".batch_mode_open").css("width", "98px");
                        $(".batch_mode_open .text").css("width", "78px");
                    }
                } else {
                    _batch_mode.remove();
                }
            }
        },


        /**
         * 页脚按钮点击改变样式
         */
        PageBtnClick: function () {

            //页脚
            $('#footer').on('click', '.footer_ul', function (event) {
                window.sessionStorage.setItem('category', '');
                _util.modifyDocTitle("移动审批");
                //切换时候，开始id为0开始
                currentCountId = 0;
                //获取
                var $this = $(this);
                var index = $this.index();//获取点击的按钮的序号，从0开始
                if (index != pageIndex) { //点击的是其他tab，强制到达其他tab页面的第一个页面，并刷新
                    window.sessionStorage.pageBtnArray = pageIndex + "," + 0;
                    window.sessionStorage.pageHeaderBtn = "0,0,0";
                } else { //调用取得列表之前记录当前操作按钮组
                    window.sessionStorage.pageBtnArray = pageIndex + "," + pageHeaderBtn[pageIndex];
                    window.sessionStorage.pageHeaderBtn = pageHeaderBtn;
                }
                window.sessionStorage.pageFirstIn = pageFirstIn;
                pageIndex = index;//当前页面变化

                //批量审批显示控制
                if (pagesCode[pageIndex] == "ishandled" && buttonsCode[headerBtnIndex] == "unhandled") {
                    $(".batch_mode").show();
                } else {
                    $(".batch_mode").hide();
                    //也要控制头部的变化
                    $(".nc_select_all").hide();
                    $("#header").css("margin-top", "0px").show();
                }
                //_iscroll.refresh();
                $('#scroller').css('transform', 'translate(0px, 0px)');//切换时，设置scroll部分初始未滑动
                //$('#wrapper').find('.error-none').remove();
                for (var i = 0; i < pagesCode.length; i++) {
                    var child = $('#footer').children('.footer_ul').eq(i);
                    if (i != index) {
                        //其他兄弟按钮置灰
                        child.find('.img a').removeClass(pagesCode[i] + '_hover').addClass(pagesCode[i]);
                        child.find('.name').removeClass('color_style');
                    } else {
                        //将点击的按钮改变样式
                        child.find('.img a').removeClass(pagesCode[i]).addClass(pagesCode[i] + '_hover');
                        child.find('.name').addClass('color_style');

                        //显示本页table,隐藏其他页面table
                        $("#" + pagesCode[pageIndex]).css('display', 'block').siblings('div').not('#upLoading,#downLoading').css('display', 'none');

                        /*var currentBillSum = $('#'+ pagesCode[pageIndex]).find('.bill').length;
                         if(currentBillSum == 0){
                         //初始化该页面页头按钮
                         _billList.getHeaderBtn(pagesCode[pageIndex]);//调用接口获取页头按钮
                         }*/
                        _billList.getHeaderBtn(pagesCode[pageIndex]);//调用接口获取页头按钮


                    }
                }

            });

        },








        errorDealFunction: function (resultJson) {
            $("#loding").hide();
            //微信中运行的时候,登录token非法的时候
            var loginResult = eval("(" + window.sessionStorage.firstWechatLoginResult + ")");
            //
            if (isWeiXinFlag && (resultJson.desc == "invalid secrity token" || resultJson.desc.indexOf("User session expired") >= 0) && loginResult != undefined && loginResult != "") {
                //微信第一次登录进来时候执行，用于打开登录页面并提供绑定等信息
                _billList.wechatFirstLogin(loginResult);
            } else {
                //当数据源为NC+OA时，且单据列表中单据数为0时,显示报错
                var NC_currentBillSum = $('#' + pagesCode[pageIndex]).find('.bill[data-system="NC"]').length;//获取页面当前NC单据数目
                var OA_currentBillSum = $('#' + pagesCode[pageIndex]).find('.bill[data-system="OA"]').length;//获取页面当前OA单据数目

                if (paramUser.dataSourceSystem == 'NC+OA' && NC_currentBillSum == 0 && OA_currentBillSum == 0 && OA_NC_getBillList_flag == 2) {
                    //_billList.show_error(resultJson.desc);//'调用接口失败'
                    _billList.show_nodata(eval("billListLang." + get_lang() + ".pageMessage.noBillsCurrentPage"));//'当前列表无单据'
                }
                if (paramUser.dataSourceSystem != 'NC+OA') {
                    _billList.show_error(resultJson.desc);//'调用接口失败'
                }
            }
            return false;
        },
        /**
         * ajax调用接口获取数据
         * 参数：接口名，参数
         * 返回值：返回数据
         */
        getDataByAjax: function (methodName, paramsObj, successCallBack, asyncValue) {

            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.nctoken,
                usercode: paramUser.ucode
            };

            eval("param." + methodName + "=" + JSON.stringify(paramsObj) + ";");

            console.log(methodName + "传入参数：" + JSON.stringify(param));
            //调用Ajax方法
            _billList.doAjax(param, successCallBack, asyncValue);
        },
        /**
         * ajax调用接口获取数据
         * 参数：接口名，参数
         * 返回值：返回数据
         */
        get_OA_DataByAjax: function (methodName, paramsObj, successCallBack, asyncValue) {

            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,//"AAABU3lW7q4xqK%2BdKVEd0JvKRWWGgWeYHjA0FRMHHF4xPFmaAAABU3lW7q4%3D"
                usercode: paramUser.ucode
            };

            eval("param." + methodName + "=" + JSON.stringify(paramsObj) + ";");

            console.log( methodName + "传入参数：" + JSON.stringify(param));
            //调用Ajax方法
            _billList.doAjax(param, successCallBack, asyncValue);
        },
        /**
         * @description 调用Ajax方法
         * @param param 传入参数
         * @param successCallBack 调用Ajax成功时回调函数
         * @param asyncValue 是否异步调用
         */
        doAjax: function (param, successCallBack, asyncValue) {

            $("#loding").show();
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                data: JSON.stringify(param),
                async: asyncValue,
                dataType: 'text/plain',
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
   
                    console.log("返回JSON数据串为：" + JSON.stringify(result));
                    console.log("---")
                    //转化为json
                    var resultJson = eval('(' + result + ')');
                    //成功的时候
                    /*if(resultJson.code == "0"){//执行成功
                     //执行公共参数
                     try{*/
                    eval("_billList." + successCallBack + "(" + result + ")");

                    /*}catch(exceptionStr){
                     //console.log("执行失败~" + exceptionStr);
                     $("#loding").hide();
                     _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.Error"));//'调用接口失败'
                     }
                     }else{
                     $("#loding").hide();
                     //微信中运行的时候,登录token非法的时候
                     var loginResult = eval("(" + window.sessionStorage.firstWechatLoginResult + ")");
                     if(isWeiXinFlag && resultJson.desc=="invalid secrity token" && loginResult  != undefined && loginResult != ""){
                     //微信第一次登录进来时候执行，用于打开登录页面并提供绑定等信息
                     _billList.wechatFirstLogin();
                     //事件绑定
                     //当ios点击按键Go时或安卓点击前往按键（都是回车键），等同点击登录按钮，调用登录函数
                     $("#username,#userpass").unbind().on("keydown",function(event){
                     if(event.keyCode == 13){
                     $(this).blur();
                     //调用登录接口
                     _billList.loginBindRtnFunction(loginResult,window.sessionStorage.urlparam);
                     }
                     });

                     $("#login").unbind().on("click",function(){
                     //调用登录接口
                     _billList.loginBindRtnFunction(loginResult,window.sessionStorage.urlparam);
                     });
                     }else{
                     //当数据源为NC+OA时，且单据列表中单据数为0时,显示报错
                     var NC_currentBillSum = $('#'+ pagesCode[pageIndex]).find('.bill[data-system="NC"]').length;//获取页面当前NC单据数目
                     var OA_currentBillSum = $('#'+ pagesCode[pageIndex]).find('.bill[data-system="OA"]').length;//获取页面当前OA单据数目

                     if(paramUser.dataSourceSystem == 'NC+OA' && NC_currentBillSum == 0 && OA_currentBillSum == 0 && OA_NC_getBillList_flag == 2){
                     //_billList.show_error(resultJson.desc);//'调用接口失败'
                     _billList.show_nodata('当前列表为空');//'调用接口失败'
                     }
                     if(paramUser.dataSourceSystem != 'NC+OA'){
                     _billList.show_error(resultJson.desc);//'调用接口失败'
                     }
                     }
                     return false;
                     }
                     //加载样式处理
                     $("#loding").hide();*/

                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    ////console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                    _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.funcError"));//'执行函数失败'
                }
            });
        },



        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {

            var title = window.sessionStorage.getItem("categoryName") || eval("billListLang." + get_lang() + ".pageTitle");
            _util.modifyDocTitle(title);

            YKJ_CHANGE_TITLE(title)

            //然后设置页面显示的汉字
            for (var i in eval("billListLang." + get_lang() + ".pageContent")) {
                //i即属性名字ok,close
//              //console.log("key===" + i + ",value==" + eval("billListLang." + get_lang() + ".pageContent." + i));
                $("." + i).html(eval("billListLang." + get_lang() + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("billListLang." + get_lang() + ".pagePlaceHoder")) {
                //i即属性名字ok,close
//              //console.log("placeholder key===" + i + ",value==" + eval("billListLang." + get_lang() + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("billListLang." + get_lang() + ".pagePlaceHoder." + i));
            }
        },
        //微信登录的接口
        loginBindRtnFunction: function (result, urlparam) {
            //加载中图标
            $("#loding").show();
            var username = $("#username").val();
            var userpass = $("#userpass").val();
            if (username != "" && userpass != "") {
                //此时调用后台登录，并绑定微信号
                var params = {
                    action: "logintoother",
                    param: {
                        ucode: username,
                        upwd: userpass,
                        logintype: "NC"
                    }
                };
                $.ajax({
                    type: "POST",
                    //async:false,
                    url: contextPath() + "/wechat/login?" + urlparam + "&t=" + new Date().getTime(),
                    dataType: "json",
                    contentType: "application/json",
                    data: JSON.stringify(params),
                    beforeSend: function (XMLHttpRequest) {
                        XMLHttpRequest.setRequestHeader("maurl", result.data.body.url);
                        XMLHttpRequest.setRequestHeader("head", $("#headStr").val());
                    },
                    success: function (rtnData) {
                        console.log("微信登录结果：rtnData==" + JSON.stringify(rtnData));
                        if (rtnData.code == "0") {
                            //执行绑定函数，异步执行
                            if (result.data.foot.ucode != "" && isWeiXinFlag) {
                                _billList.bindFunction(rtnData, result.data.foot.ucode, username);
                            }

                            //如果第三方登录登录标识有值时候，进行第三方绑定
                            if (result.data.foot.bindFlag != undefined && result.data.foot.bindFlag == "true") {
                                _billList.bindThirdFunction(rtnData, username, rtnData.data.userid, result.data.foot.ticket);
                            }

                            if (isWeiXinFlag) {
                                //此时，记录extrainfo到本地
                                window.sessionStorage.extrainfo = rtnData.data.userid + "," + username;
                                window.sessionStorage.unBindFlag = "false";
                            }

                            //显示列表数据
                            $("#loginPage").hide();
                            $("#indexPage").show();

                            //userid赋值
                            window.sessionStorage.userid = rtnData.data.userid;
                            //登录成功的时候，显示数据去
                            _billList.initUserParamData(window.sessionStorage.userid, result.data.head.domain);
                        } else {
                            //登录成功时候
                            $("#loding").hide();//隐藏加载中图标
                            //_billList.show_error('登录失败，请重试');
                            dialog.log(rtnData.desc);//登录失败，请重试
                            //显示列表数据
                            $("#loginPage").show();
                            $("#indexPage, #billListSearch, #billCategory").hide();
                        }

                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        $("#loding").hide();//隐藏加载中图标
                        ////console.log('执行函数失败' + textStatus + ",errorthrown==" + errorThrown);
                        _billList.show_error(eval("billListLang." + get_lang() + ".pageMessage.networkfailedInfo"));//网络连接失败，请您检查网络后重试
                    }
                });
            } else {
                dialog.log(eval("billListLang." + get_lang() + ".pageMessage.usernamePwdNotEmpty"));//用户名密码不能为空
                $("#loding").hide();//隐藏加载中图标
                return false;
            }
        },
        /**
         * 绑定微信接口
         */
        bindThirdFunction: function (rtnData, ucode, userid, ticket) {
            $.ajax({
                type: "POST",
                async: true,
                url: "/ncapprove/public/bind?t=" + new Date().getTime(),
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify({ucode: ucode}),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("userid", userid);
                    XMLHttpRequest.setRequestHeader("pk_group", rtnData.data.loginsysinfo.NC.pk_group);
                    XMLHttpRequest.setRequestHeader("nctoken", rtnData.data.nctoken);
                    XMLHttpRequest.setRequestHeader("ticket", ticket);
                },
                success: function (rtnData) {
                    console.log("第三方账户绑定成功");
                }
            });
        },
        /**
         * 绑定微信接口
         */
        bindFunction: function (result, ucode, useraccount) {
            $.ajax({
                type: "POST",
                async: true,
                url: contextPath() + "/wechat/bind?t=" + new Date().getTime(),
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify({
                    ucode: ucode,
                    extrainfo: result.data.userid + "," + useraccount
                }),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("userid", result.data.userid);
                    XMLHttpRequest.setRequestHeader("head", $("#headStr").val());
                },
                success: function (rtnData) {
                    console.log("微信账户绑定成功" + rtnData);
                    //console.log("微信账户绑定成功");
                }
            });
        },
        /*
         * 解绑微信接口
         */
        unbindFunction: function (userid, ucode) {
            $("#loding").show();
            $.ajax({
                type: "POST",
                async: true,
                url: contextPath() + "/wechat/unbind?t=" + new Date().getTime(),
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify({
                    ucode: paramUser.ucode,
                    extrainfo: ''
                }),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("userid", paramUser.userid );
                    XMLHttpRequest.setRequestHeader("head", $("#headStr").val());
                },
                success: function (rtnData) {
                    console.log("解绑微信" + rtnData);
                    _billList.weichatLogout();

                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    _billList.weichatLogout();
                }
            });

        },
        //解绑
        weichatLogout: function () {
            $("#loding").hide();
            //解绑刷新问题
            window.sessionStorage.unBindFlag = "true";
            //微信中运行的时候,登录token非法的时候
            var loginResult = eval("(" + window.sessionStorage.firstWechatLoginResult + ")");
            //微信第一次登录进来时候执行，用于打开登录页面并提供绑定等信息
            $("#username").val("");//清空用户名和密码
            $("#userpass").val("");
            _billList.wechatFirstLogin(loginResult);
        },
        //根据Userid取得用户信息
        initUserParamData: function (userid, domain) {
            var params = {
                userid: userid + domain,
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
                            _billList.getCommonData(rtnData.data[0].logininfo, "notInit");
                        } else {
                            _billList.wechatFirstLogin(JSON.parse(window.sessionStorage.firstWechatLoginResult));   // 打开登录页面
                            $("#loding").hide();//隐藏加载中图标
                            return false;
                        }
                    } else {
                        dialog.log(eval("billListLang." + get_lang() + ".pageMessage.failure"));//登录失败，请重试
                        //登录成功时候
                        $("#loding").hide();//隐藏加载中图标
                    }

                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();//隐藏加载中图标
                    //console.log('执行函数失败' + textStatus + ",errorthrown==" + errorThrown);
                    _billList.show_nodata(eval("billListLang." + get_lang() + ".pageMessage.networkfailedInfo"));//网络连接失败，请您检查网络后重试
                }
            });
        },
        /**
         * 判断字符是否为0-9、a-z、A-Z，是返回true,否返回false
         * 传入参数：一个字符char_c
         */
        isAZaz09: function (char_c) {
            var reg = /^[\u4E00-\u9FA5]+$/;
            if (!reg.test(char_c)) {
                //console.log("char_c=== " + char_c + " 不是中文");
                return true;
            }
            //console.log("char_c=== " + char_c + " 是中文");
            return false;
        },
        /**
         * 参数：str需要截取的字符串
         * 功能：若str长度大于等于28则截取前28个字符，若字符串str长度小于28则后面补上空格凑足28位
         * 返回：28位的字符串
         */
        substrLength: function (str, len) {
            var str_len = 0;
            var res_str = str;
            var cut_pos = len;
            var cut_pos_add_flag = true;
            var cut_pos_length = 2 * cut_pos;
            if (str) {
                var i = 0;
                for (i = 0; i < str.length; i++) {
                    if (_billList.isAZaz09(str[i])) {//字符为0-9、a-z、A-Z
                        str_len++;
                        if ('w' == str[i] || 'W' == str[i]) {
                            str_len++;
                        }
                    } else {
                        str_len += 2;
                    }
                    if (str_len >= 2 * len && cut_pos_add_flag) {
                        cut_pos = i;
                        cut_pos_length = str_len;
                        cut_pos_add_flag = false;
                    }
                }
                //console.log("str== " + str.length + ",len==" + len + ",str_len==" + str_len + ",cut_pos==" + cut_pos);
                if (str_len > cut_pos_length) {//字符串过长，截取，加...
                    res_str = str.substr(0, cut_pos);
                    res_str += '...';
                }
            }

            return res_str;
        },
        /**
         * 数据长度为0时，提示无数据
         */
        show_nodata: function (message) {
            $('#wrapper').find('.error-none').remove();
            $('#' + pagesCode[pageIndex]).find('#upLoading').remove();
            var window_height = document.documentElement.clientHeight;
            var window_width = document.documentElement.clientWidth;
            var _top = (window_height - 39 - 50) * 0.33;
            var _height = window_height - _top;
            var no_data = $('<div class="error-none" style="padding-top:' + _top + 'px;' + 'height:' + _height + 'px;">'
                + '<table width="' + window_width + 'px" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="nodata_img" src="images/no_data.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            if (pagesCode[pageIndex]) {
                $("#" + pagesCode[pageIndex]).find('tbody').html("").append(no_data);//#billList tbody  //.nc_list
            } else {
                $('#scroller').html("").append(no_data);
            }
            //$('#wrapper').append(no_data);

            //$(".batch_mode").css("display","none");
        },
        /**
         * 报错时提示
         */
        show_error: function (message) {
            $('#wrapper').find('.error-none').remove();
            $('#' + pagesCode[pageIndex]).find('#upLoading').remove();
            var window_height = document.documentElement.clientHeight;
            var window_width = document.documentElement.clientWidth;
            var _top = (window_height - 39 - 50) * 0.33;
            var _height = window_height - _top;
            var error_data = $('<div class="error-none" style="padding-top:' + _top + 'px;' + 'height:' + _height + 'px;">'
                + '<table width="' + window_width + 'px" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            if (pagesCode[pageIndex]) {
                $("#" + pagesCode[pageIndex]).find('tbody').html("").append(error_data);
            } else {//当后台服务停了，pagesCode[pageIndex]还不存在时
                $('#scroller').html("").append(error_data);
            }
            //$('#wrapper').append(error_data);

            //$(".batch_mode").css("display","none");
        },
        /**
         * 整体报错时提示
         */
        body_showError: function (message) {
            var window_height = document.documentElement.clientHeight;
            var _top = (window_height - 29 - 50) * 0.33;
            var error_data = $('<div class="error-none" style="padding-top:' + _top + 'px;">'
                + '<table width="100%" height="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $("body").html("").append(error_data);
            //$(".batch_mode").css("display","none");
        },
        /**
         * 操作登录的用户信息
         */
        loginParamInfoSave: function (userid, loginInfo) {
            var param = {
                userid: userid,
                logininfo: loginInfo
            };
            $.ajax({
                type: "POST",
                async: true,
                url: contextPath() + '/loginparam/save?t=' + Math.random(),//参数拼接
                dataType: "json",
                data: JSON.stringify(param),
                contentType: "application/json",
                success: function (result) {
                    console.log("操作登录的用户信息       " , JSON.stringify(result));
                    console.log("---")
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log("记录loginparam失败");
                }
            });
        }

    };


    return _billList;
});
/**
 * 获取URL的contextPath
 * @returns
 */
function contextPath() {
    var origin = window.location.protocol + '//' + window.location.host;
    var pathname = location.pathname;
	//var projectname = pathname.substr(0, pathname.indexOf('/', 1));
	var projectname = pathname.substr(0, pathname.indexOf('/', 0));
    return origin + projectname;
}
/**
 * 判断是否默认选项
 */
function checkUndefined(arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == "" || typeof(arr[i]) == "undefined" || arr[i] == null) {
            return true;
        }
    }
    return false;
}


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
//  ////console.log("您的浏览器语言是：" + get_lang());
var setCookie = function (name, value) {
    var Days = 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + Days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + escape(value) + ";expires=" + exp.toGMTString();
};
var getCookie = function (name) {
    var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg))
        return unescape(arr[2]);
    else
        return null;
};
//判断为微信浏览器
function isWeiXin() {
    var ua = window.navigator.userAgent.toLowerCase();
    return /micromessenger/i.test(ua);
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

